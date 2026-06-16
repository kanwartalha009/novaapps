import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyNovaSignature } from "./nova-signature";

const secret = "shared-secret-between-nova-and-encore";
const sign = (body: string) =>
  "sha256=" + createHmac("sha256", secret).update(Buffer.from(body)).digest("hex");

describe("verifyNovaSignature", () => {
  it("accepts a valid signature over the exact raw body", () => {
    const body = JSON.stringify({ shopDomain: "acme.myshopify.com", appSlug: "encore" });
    expect(verifyNovaSignature(Buffer.from(body), sign(body), secret)).toBe(true);
  });

  it("rejects a tampered body (even a trailing space)", () => {
    const body = JSON.stringify({ amount: 1999 });
    const sig = sign(body);
    expect(verifyNovaSignature(Buffer.from(body + " "), sig, secret)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const body = "{}";
    expect(verifyNovaSignature(Buffer.from(body), sign(body), "different-secret")).toBe(false);
  });

  it("rejects missing body, header, or secret", () => {
    const body = Buffer.from("{}");
    expect(verifyNovaSignature(undefined, sign("{}"), secret)).toBe(false);
    expect(verifyNovaSignature(body, undefined, secret)).toBe(false);
    expect(verifyNovaSignature(body, sign("{}"), "")).toBe(false);
  });

  it("rejects a malformed header without throwing (length-guards the constant-time compare)", () => {
    expect(verifyNovaSignature(Buffer.from("{}"), "garbage", secret)).toBe(false);
    expect(verifyNovaSignature(Buffer.from("{}"), "sha256=", secret)).toBe(false);
  });
});
