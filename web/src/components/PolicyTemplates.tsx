const POLICIES = [
  {
    name: "Conservative RWA",
    tone: "var(--clear)",
    summary: "Default guardrail profile for tokenized equity and yield agents.",
    rules: [
      "Blocks unsafe after-hours tokenized equity execution.",
      "Requires verified RFQ rails for xStocks execution.",
      "Allows safe-yield assets only when signal freshness and risk checks pass.",
    ],
  },
  {
    name: "Balanced Agent",
    tone: "var(--seal)",
    summary: "More tolerant review posture for agents that can defer execution.",
    rules: [
      "Allows more REVIEW states before PAUSE.",
      "Accepts moderate risk while preserving explicit policy review.",
      "Still blocks unauthenticated execution.",
    ],
  },
  {
    name: "Yield-seeking",
    tone: "var(--gated)",
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="section-label">POLICY TEMPLATES</span>
          <h2
            className="italic"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: compact ? "1.45rem" : "1.75rem",
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "-0.01em",
            }}
          >
            Choose the guardrail profile before the agent acts.
          </h2>
        </div>
        <p
          className="max-w-md text-sm leading-relaxed"
          style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}
        >
          Outputs are policy outcomes, not fixed asset labels. Neutrino reevaluates live
          signals on every run.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {POLICIES.map((policy) => (
          <div
            key={policy.name}
            className="rounded-lg p-5"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
              borderLeft: `3px solid ${policy.tone}`,
            }}
          >
            <p
              className="mb-2 text-sm font-semibold"
              style={{ color: "var(--text)", fontFamily: "'Instrument Sans', sans-serif" }}
            >
              {policy.name}
            </p>
            <p
              className="mb-4 text-xs leading-relaxed"
              style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}
            >
              {policy.summary}
            </p>
            <ul className="space-y-2">
              {policy.rules.map((rule) => (
                <li key={rule} className="flex gap-2 text-xs leading-relaxed">
                  <span style={{ color: policy.tone, marginTop: 1 }}>-</span>
                  <span style={{ color: "rgba(242,232,213,0.72)" }}>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
