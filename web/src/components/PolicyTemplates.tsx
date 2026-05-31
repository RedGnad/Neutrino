import { ConsoleCard, SectionHeader, StatusPill } from "./Console";

const POLICIES = [
  {
    name: "Conservative RWA",
    tone: "green" as const,
    summary: "Default guardrail profile for tokenized equity and yield agents.",
    rules: [
      "Blocks unsafe after-hours tokenized equity execution.",
      "Requires verified RFQ rails for xStocks execution.",
      "Allows safe-yield assets only when signal freshness and risk checks pass.",
    ],
  },
  {
    name: "Balanced Agent",
    tone: "gold" as const,
    summary: "More tolerant review posture for agents that can defer execution.",
    rules: [
      "Allows more REVIEW states before PAUSE.",
      "Accepts moderate risk while preserving explicit policy review.",
      "Still blocks unauthenticated execution.",
    ],
  },
  {
    name: "Yield-seeking",
    tone: "violet" as const,
    summary: "Biases toward Mantle-native yield only when data quality is strong.",
    rules: [
      "Prioritizes mETH/USDY opportunities.",
      "Applies stricter freshness checks.",
      "Allows execution only through verified rails.",
    ],
  },
] as const;

export function PolicyTemplates({ compact = false }: { compact?: boolean }) {
  return (
    <section className="section-ruled space-y-5">
      <SectionHeader
        eyebrow="Policy templates"
        title="Outputs are policy outcomes, not fixed asset labels."
        compact={compact}
        body={
          <>
            Neutrino reevaluates live signals on every run. The hosted demo uses the
            Conservative RWA-style No after-hours risk policy today; the other profiles show
            builder template direction.
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {POLICIES.map((policy) => (
          <ConsoleCard key={policy.name} compact={compact} accent={policy.tone} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {policy.name}
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                  {policy.summary}
                </p>
              </div>
              <StatusPill value="template" tone={policy.tone}>template</StatusPill>
            </div>
            <ul className="space-y-2">
              {policy.rules.map((rule) => (
                <li key={rule} className="text-xs leading-relaxed" style={{ color: "rgba(242,232,213,0.72)" }}>
                  {rule}
                </li>
              ))}
            </ul>
          </ConsoleCard>
        ))}
      </div>
    </section>
  );
}
