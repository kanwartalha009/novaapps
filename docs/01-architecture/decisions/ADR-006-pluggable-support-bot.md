# ADR-006: Pluggable support bot backend (rules + LLM)

**Status:** Accepted · 2026-06-10

## Context
The support module's Tier-0 automatic chat answers basic app questions (plans, scopes, install
steps, billing) before humans see a ticket. Kanwar wants BOTH implementations available —
deterministic rules and LLM — switchable in the future without rework.

## Decision
Mirror the PayoutProvider pattern (ADR-003): the bot is a driver behind one interface.

```ts
interface SupportBotProvider {
  readonly key: "RULES" | "LLM";
  /** Try to answer; null = escalate to the human queue with context attached. */
  answer(ctx: TicketContext): Promise<{ reply: string; resolved: boolean } | null>;
}
```

- `RulesBotProvider` — intent matching against registry data (plans, scopes, FAQ metafields).
  Deterministic, zero cost, no hallucination risk. Default at launch.
- `LlmBotProvider` — LLM with the app's registry data + docs as context, strict guardrails
  (answer only from provided context, else escalate).
- Selection: platform default in `Setting.supportBotProvider`, overridable per app
  (`App.supportBotProvider`, nullable = inherit). Switching is a settings change, not a deploy.
- Both providers produce identical `TicketMessage(author: BOT)` rows — the rest of the support
  module (and all UIs) cannot tell which backend replied. Escalation contract is shared.

## Consequences
- A/B per app is possible (e.g. LLM on low-risk apps first).
- Commission/billing modules untouched; ticket model untouched (I-4 respected).
- New cost: LLM provider keys live in env (`SUPPORT_LLM_*`), absent until enabled.
