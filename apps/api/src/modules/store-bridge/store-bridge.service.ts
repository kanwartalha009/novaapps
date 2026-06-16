import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma as prismaSingleton } from "@nova/database";
import { PRISMA } from "../../prisma/prisma.module";
import { encryptSecret, decryptSecret } from "../../common/crypto";
import { EntitlementsService } from "../entitlements/entitlements.service";

const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";
/** Per-store rate budget (in-process; production = Redis). */
const RATE_LIMIT = Number(process.env.NOVA_BRIDGE_RATE_PER_MIN ?? 120);
const rate = new Map<string, { count: number; resetAt: number }>();

/**
 * Spec: docs/03-modules/store-bridge.md (ADR-009, I-13). The ONLY path from a Tool to a store.
 * Tools never hold raw Shopify tokens — they call the scoped, audited, rate-limited GraphQL proxy.
 */
@Injectable()
export class StoreBridgeService {
  private readonly log = new Logger(StoreBridgeService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: typeof prismaSingleton,
    private readonly entitlements: EntitlementsService,
  ) {}

  // ─── OAuth broker (mint per-store offline token) ────────────────
  private signState(storeId: string): string {
    const mac = createHmac("sha256", process.env.NOVA_BRIDGE_SECRET ?? "").update(storeId).digest("hex");
    return `${storeId}.${mac}`;
  }
  private verifyState(state: string): string | null {
    const [storeId, mac] = state.split(".");
    if (!storeId || !mac) return null;
    const expected = createHmac("sha256", process.env.NOVA_BRIDGE_SECRET ?? "").update(storeId).digest("hex");
    const a = Buffer.from(mac), b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b) ? storeId : null;
  }

  /** Build the Shopify authorize URL for the Nova Store Bridge app (agency authorizes per store). */
  async authorizeUrl(agencyId: string, storeId: string): Promise<{ url: string }> {
    const store = await this.prisma.store.findFirst({ where: { id: storeId, agencyId } });
    if (!store) throw new NotFoundException("Store not found for this agency");
    const clientId = process.env.SHOPIFY_BRIDGE_CLIENT_ID ?? "";
    const scopes = (process.env.NOVA_BRIDGE_SCOPES ?? "read_products").replace(/\s+/g, "");
    const redirect = `${process.env.NOVA_API_PUBLIC ?? "http://localhost:4000/v1"}/bridge/oauth/callback`;
    const url =
      `https://${store.shopDomain}/admin/oauth/authorize?client_id=${clientId}` +
      `&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirect)}` +
      `&state=${encodeURIComponent(this.signState(storeId))}`;
    return { url };
  }

  /** OAuth callback — exchange code for an OFFLINE token, encrypt + store, record granted scopes (F9). */
  async handleCallback(shop: string, code: string, state: string) {
    const storeId = this.verifyState(state);
    if (!storeId) throw new UnauthorizedException("Invalid OAuth state");
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store || store.shopDomain !== shop) throw new BadRequestException("Shop mismatch");

    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_BRIDGE_CLIENT_ID,
        client_secret: process.env.SHOPIFY_BRIDGE_SECRET,
        code,
      }),
    });
    if (!res.ok) throw new BadRequestException("Token exchange failed");
    const data = (await res.json()) as { access_token: string; scope: string };

    await this.prisma.store.update({
      where: { id: storeId },
      data: {
        accessTokenEnc: encryptSecret(data.access_token),
        grantedScopes: data.scope ? data.scope.split(",") : [],
        tokenRotatedAt: new Date(),
      },
    });
    await this.audit(null, "bridge.authorize", "STORE", storeId, { scopes: data.scope });
    return { ok: true, storeId };
  }

  // ─── Connections ────────────────────────────────────────────────
  async connect(toolId: string, storeId: string, actorId?: string) {
    const [tool, store] = await Promise.all([
      this.prisma.tool.findUnique({ where: { id: toolId } }),
      this.prisma.store.findUnique({ where: { id: storeId } }),
    ]);
    if (!tool) throw new NotFoundException("Tool not found");
    if (!store) throw new NotFoundException("Store not found");
    if (!tool.usesStoreBridge) throw new BadRequestException("Tool does not use the Store Bridge");
    this.assertScopes(tool.requiredScopes, store.grantedScopes);
    const ent = await this.entitlements.resolve(store.agencyId, toolId);
    if (!ent.access) throw new HttpException("Agency not entitled to this tool", 402);

    const conn = await this.prisma.storeBridgeConnection.upsert({
      where: { toolId_storeId: { toolId, storeId } },
      update: { status: "ACTIVE", grantedScopes: tool.requiredScopes, revokedAt: null },
      create: { toolId, storeId, status: "ACTIVE", grantedScopes: tool.requiredScopes },
    });
    await this.audit(actorId ?? null, "bridge.connect", "TOOL", toolId, { storeId });
    return conn;
  }

  async listConnections(opts: { toolId?: string; storeId?: string } = {}) {
    return this.prisma.storeBridgeConnection.findMany({
      where: { ...(opts.toolId ? { toolId: opts.toolId } : {}), ...(opts.storeId ? { storeId: opts.storeId } : {}) },
      include: { tool: { select: { slug: true, name: true } }, store: { select: { shopDomain: true, agencyId: true } } },
      orderBy: { connectedAt: "desc" },
    });
  }

  /** Immediate kill — the next proxy call for this (tool, store) fails at connection resolution. */
  async revoke(connectionId: string, actorId?: string) {
    const conn = await this.prisma.storeBridgeConnection.findUnique({ where: { id: connectionId } });
    if (!conn) throw new NotFoundException("Connection not found");
    await this.prisma.storeBridgeConnection.update({
      where: { id: connectionId },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    await this.audit(actorId ?? null, "bridge.revoke", "TOOL", conn.toolId, { storeId: conn.storeId });
    return { ok: true };
  }

  // ─── Scoped GraphQL Admin proxy (the only Tool→store path, I-13) ──
  async proxyGraphql(toolSlug: string, input: { storeId: string; query: string; variables?: unknown }) {
    const tool = await this.prisma.tool.findUnique({ where: { slug: toolSlug } });
    if (!tool || !tool.usesStoreBridge) throw new ForbiddenException("Unknown bridge tool");
    const store = await this.prisma.store.findUnique({ where: { id: input.storeId } });
    if (!store) throw new NotFoundException("Store not found");

    const conn = await this.prisma.storeBridgeConnection.findUnique({
      where: { toolId_storeId: { toolId: tool.id, storeId: store.id } },
    });
    if (!conn || conn.status !== "ACTIVE") throw new ForbiddenException("No active bridge connection");

    this.assertScopes(tool.requiredScopes, store.grantedScopes);

    const ent = await this.entitlements.resolve(store.agencyId, tool.id);
    if (!ent.access) throw new HttpException("Agency not entitled to this tool", 402);

    this.checkRate(store.id);

    if (!store.accessTokenEnc) throw new HttpException("Store not authorized (no offline token)", 409);
    const token = decryptSecret(store.accessTokenEnc);

    let ok = false;
    try {
      const res = await fetch(`https://${store.shopDomain}/admin/api/${API_VERSION}/graphql.json`, {
        method: "POST",
        headers: { "content-type": "application/json", "X-Shopify-Access-Token": token },
        body: JSON.stringify({ query: input.query, variables: input.variables ?? {} }),
      });
      ok = res.ok;
      const body = await res.json();
      return body; // the GraphQL result only — the token NEVER leaves the Bridge (I-13)
    } finally {
      await this.audit(null, "bridge.graphql", "TOOL", tool.id, { storeId: store.id, ok });
    }
  }

  // ─── Webhook relay (store events → platform ingress, F6) ────────
  async relayWebhook(toolSlug: string, input: { topic: string; shopDomain: string; webhookId: string; payload: unknown }) {
    const externalId = input.webhookId || `${toolSlug}:${Date.now()}`;
    const existing = await this.prisma.webhookEvent.findUnique({ where: { externalId } });
    if (existing) return { received: true, deduped: true };
    await this.prisma.webhookEvent.create({
      data: {
        externalId,
        source: "STORE_BRIDGE",
        productType: "TOOL",
        productSlug: toolSlug,
        topic: input.topic,
        shopDomain: input.shopDomain,
        payload: (input.payload ?? {}) as object,
        status: "RECEIVED",
      },
    });
    // P5: recorded + routed to the tool's relay target (the tool repo subscribes). 200 immediately.
    return { received: true };
  }

  // ─── helpers ────────────────────────────────────────────────────
  private assertScopes(required: string[], granted: string[]) {
    const has = new Set(granted);
    const missing = required.filter((s) => !has.has(s));
    if (missing.length > 0) throw new ForbiddenException(`Store missing scopes: ${missing.join(", ")}`);
  }

  private checkRate(storeId: string) {
    const now = Date.now();
    const e = rate.get(storeId);
    if (!e || now > e.resetAt) {
      rate.set(storeId, { count: 1, resetAt: now + 60_000 });
      return;
    }
    if (e.count >= RATE_LIMIT) throw new HttpException("Store Bridge rate limit exceeded", 429);
    e.count += 1;
  }

  private async audit(actorId: string | null, action: string, targetType: string, targetId: string, metadata: object) {
    await this.prisma.auditLog.create({ data: { actorId, action, targetType, targetId, metadata } });
  }
}
