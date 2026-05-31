import { ConsoleCard, SectionHeader, StatusPill } from "./Console";

const POLICIES = [
  {
    name: "Conservative RWA",
    tone: "green" as const,
    summary: "Default hosted profile.",
    rules: [
      "After-hours xStocks: block",
      "xStocks RFQ: required",
      "Yield: freshness + risk pass",
    ],
  },
  {
    name: "Balanced Agent",
    tone: "gold" as const,
    summary: "More review before pause.",
    rules: [
      "More REVIEW states",
      "Moderate risk accepted",
      "Unauth rails: blocked",
    ],
  },
  {
    name: "Yield-seeking",
    tone: "violet" as const,
    summary: "Yield bias with stricter freshness.",
    rules: [
      "mETH / USDY priority",
      "Stricter freshness",
      "Verified rails only",
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
            Hosted runtime uses Conservative RWA today. Other profiles show builder template direction.
          </>
        }
      />

      <div className="landing-brief-grid grid gap-4 lg:grid-cols-3">
        {POLICIES.map((policy) => (
          <ConsoleCard key={policy.name} compact={compact} surface="ledger" accent={policy.tone} className="landing-brief-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="landing-card-title">
                  {policy.name}
                </p>
                <p className="landing-card-copy mt-1">
                  {policy.summary}
                </p>
              </div>
              <StatusPill value="template" tone={policy.tone}>template</StatusPill>
            </div>
            <ul className="landing-fact-list">
              {policy.rules.map((rule) => (
                <li key={rule} className="landing-fact-row">
                  <span className="landing-fact-key">Rule</span>
                  <span className="landing-fact-value">
                  {rule}
                  </span>
                </li>
              ))}
            </ul>
          </ConsoleCard>
        ))}
      </div>
    </section>
  );
}
