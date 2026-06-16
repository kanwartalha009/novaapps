"use client";

import { useState } from "react";
import { toast } from "sonner";
import { resolveFxAppDb, type FxAppDb } from "@nova/shared";
import { Badge, Card, Mono } from "@/components/ui";
import { Field, TextInput, PrimaryButton, SecondaryButton } from "@/components/overlay";

const STATUS_BADGE: Record<FxAppDb["status"], string> = {
  CONNECTED: "ACTIVE",
  MIGRATIONS_PENDING: "PENDING",
  NOT_CONFIGURED: "DRAFT",
};

/**
 * App database configuration — one isolated DB + migration history per app
 * (engine amendment 2026-06-10-c). The master/platform DB is separate.
 * Wires to PATCH /v1/admin/engine/apps/:id/database (Phase E).
 */
export function DatabaseCard({ slug }: { slug: string }) {
  const db = resolveFxAppDb(slug); // synthesizes NOT_CONFIGURED for freshly created slugs
  const [url, setUrl] = useState(db.urlMasked ?? "");
  const [tested, setTested] = useState<null | "ok">(null);
  const [migrated, setMigrated] = useState(false);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Database</h2>
        <Badge value={migrated ? "ACTIVE" : STATUS_BADGE[db.status]} />
      </div>
      <p className="mt-0.5 text-xs text-zinc-500">
        This app's own Postgres — isolated schema and migration history, separate from the platform DB.
      </p>

      <div className="mt-4">
        <Field
          label="Connection string"
          hint={`Stored encrypted as ${db.envVar}. Changing it never touches other apps.`}
        >
          <TextInput
            value={url}
            onChange={(e) => { setUrl(e.target.value); setTested(null); }}
            placeholder="postgresql://user:pass@host:5432/db"
            className="mono text-xs"
          />
        </Field>
      </div>

      <dl className="space-y-1.5 text-body">
        <div className="flex justify-between"><dt className="text-zinc-500">Schema</dt><dd><Mono>{db.schemaPath}</Mono></dd></div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">Migrations</dt>
          <dd className="num">
            {migrated ? db.migrations + 1 : db.migrations} applied · last {migrated ? "2026-06-10" : db.lastMigratedAt ?? "never"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-4">
        <SecondaryButton
          onClick={() => { setTested("ok"); toast.success("Connection ok"); }}
          disabled={!url}
          className="btn-sm"
        >
          {tested === "ok" ? "✓ Connection ok" : "Test connection"}
        </SecondaryButton>
        <PrimaryButton
          onClick={() => { setMigrated(true); toast.success(`Migrations applied — prisma migrate deploy --schema db/${slug}/schema.prisma`); }}
          disabled={!url || migrated || (db.status === "CONNECTED" && tested !== "ok")}
          className="btn-sm min-w-0"
        >
          {migrated ? "✓ Migrated" : "Run migrations"}
        </PrimaryButton>
        <span className="text-2xs text-zinc-400">
          prisma migrate deploy --schema db/{slug}/schema.prisma
        </span>
      </div>
    </Card>
  );
}
