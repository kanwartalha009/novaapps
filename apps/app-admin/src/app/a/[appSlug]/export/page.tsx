"use client";

import { use, useMemo, useState } from "react";
import { toast } from "sonner";
import { resolveFxAppSpec } from "@nova/shared";
import { getHostedApp } from "@/lib/apps-registry";
import { buildPackMarkdown } from "@/lib/spec-markdown";
import { PageHeader, Card, Mono } from "@/components/ui";
import { PrimaryButton, SecondaryButton } from "@/components/overlay";

/**
 * Build pack export — the handoff artifact. Pull this into Claude Cowork
 * (open Cowork on the app repo, attach or paste BUILD-PACK.md) and build.
 * Phase E: served at GET /v1/admin/engine/apps/:id/spec/export.
 */
export default function ExportPage({ params }: { params: Promise<{ appSlug: string }> }) {
  const { appSlug } = use(params);
  const hosted = getHostedApp(appSlug);
  const spec = useMemo(() => resolveFxAppSpec(appSlug, hosted.modules), [appSlug, hosted.modules]);
  const md = useMemo(() => buildPackMarkdown(hosted, spec), [hosted, spec]);
  const [copied, setCopied] = useState(false);

  const ready = spec.screens.filter((s) => s.status === "READY").length;
  const allReady = ready === spec.screens.length;

  function copy() {
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      toast.success("Build pack copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function download() {
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${appSlug}-BUILD-PACK.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Build pack"
        desc="One self-contained document — app config, every screen spec, and the backend spec. This is what Claude Cowork pulls to build the app."
        action={
          <div className="flex items-center gap-2">
            <SecondaryButton onClick={copy}>{copied ? "✓ Copied" : "Copy markdown"}</SecondaryButton>
            <PrimaryButton onClick={download}>Download .md</PrimaryButton>
          </div>
        }
      />

      {!allReady && (
        <div className="mb-4 rounded-md border border-warning-300 bg-warning-50 px-3.5 py-2.5 text-body text-warning-600">
          {spec.screens.length - ready} of {spec.screens.length} screens are still DRAFT — the pack exports anyway,
          but Cowork builds best when every screen is marked ready with acceptance criteria.
        </div>
      )}

      <Card className="mb-4 p-5">
        <h2 className="font-semibold">How to use with Claude Cowork</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-body text-zinc-600">
          <li>Download <Mono>{appSlug}-BUILD-PACK.md</Mono> (or copy the markdown).</li>
          <li>Open Claude Cowork on the app repo (<Mono>{hosted.engine.repoUrl}</Mono>) and attach the file.</li>
          <li>Prompt: <em>&quot;Build this Shopify app from the attached build pack. Work screen by screen; each screen is done when its acceptance boxes check.&quot;</em></li>
          <li>Cowork scaffolds via <Mono>shopify app init</Mono> (React Router template) and follows §5 build order.</li>
        </ol>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <span className="text-body font-medium">{appSlug}-BUILD-PACK.md</span>
          <span className="num text-xs text-zinc-400">{md.split("\n").length} lines · {spec.screens.length} screens · {spec.backend.entities.length} entities</span>
        </div>
        <pre className="mono max-h-[60vh] overflow-auto whitespace-pre-wrap bg-zinc-50 px-5 py-4 text-xs leading-5 text-zinc-700">
          {md}
        </pre>
      </Card>
    </div>
  );
}
