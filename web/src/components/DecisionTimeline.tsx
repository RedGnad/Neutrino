"use client";

type StepState = "live" | "modelled" | "blocked" | "verified" | "pending";

interface TimelineStep {
  id: string;
  label: string;
  sub: string;
  state: StepState;
  detail?: string;
}

interface DecisionTimelineProps {
  steps?: TimelineStep[];
}

const DEFAULT_STEPS: TimelineStep[] = [
  {
    id: "signal",
    label: "01  SIGNAL CAPTURED",
    sub: "xStocks price + trading-halt status",
    state: "live",
    detail: "indicative price · halt flags · market hours",
  },
  {
    id: "risk",
    label: "02  RISK ENGINE",
    sub: "Deterministic scoring",
    state: "live",
    detail: "market-hours · spread* · liquidity* · basis · volatility",
  },
  {
    id: "policy",
    label: "03  POLICY VERDICT",
    sub: "Explicit rules, no LLM",
    state: "live",
    detail: "blockAfterHoursEquity · maxRiskForAllocate · fallback",
  },
  {
    id: "receipt",
    label: "04  ON-CHAIN RECEIPT",
    sub: "RWADecisionLogger · Mantle mainnet",
    state: "verified",
    detail: "keccak256(canonicalJson) = reasonHash on-chain",
  },
  {
    id: "execution",
    label: "05  EXECUTION GATE",
    sub: "Fluxion V3 · xChange RFQ auth-gated",
    state: "blocked",
    detail: "Fluxion: live · xChange: requires API key + registered wallet",
  },
];

const STATE_STYLE: Record<StepState, { dot: string; line: string; badge: string; label: string }> = {
  live:     { dot: "var(--sage)",       line: "var(--sage)",       badge: "badge-live",    label: "LIVE" },
  modelled: { dot: "var(--gold)",       line: "var(--gold)",       badge: "badge-stub",    label: "MODELLED" },
  blocked:  { dot: "var(--violet)",     line: "var(--violet)",     badge: "badge-notexec", label: "AUTH GATED" },
  verified: { dot: "var(--sage)",       line: "var(--sage)",       badge: "badge-live",    label: "VERIFIED" },
  pending:  { dot: "var(--muted)",      line: "var(--muted)",      badge: "badge-na",      label: "PENDING" },
};

export function DecisionTimeline({ steps = DEFAULT_STEPS }: DecisionTimelineProps) {
  return (
    <section className="bb-section">
      {/* Section label */}
      <p
        className="text-[9px] font-medium uppercase tracking-widest mb-5"
        style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--muted)" }}
      >
        AGENT PIPELINE · DECISION FLOW
      </p>

      <div className="relative">
        {/* Vertical rule — like a legal document margin line */}
        <div
          className="absolute left-[11px] top-3 bottom-3"
          style={{ width: "1px", background: "linear-gradient(180deg, var(--sage) 0%, var(--border) 100%)" }}
        />

        <div className="space-y-0">
          {steps.map((step, idx) => {
            const style = STATE_STYLE[step.state];
            const isLast = idx === steps.length - 1;

            return (
              <div key={step.id} className={`relative flex gap-5 ${isLast ? "" : "pb-5"}`}>
                {/* Node dot */}
                <div className="relative z-10 mt-0.5 shrink-0">
                  <div
                    className="h-5 w-5 rounded-full flex items-center justify-center"
                    style={{
                      background: `${style.dot}16`,
                      border: `1.5px solid ${style.dot}50`,
                    }}
                  >
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: style.dot }} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p
                      className="text-xs font-semibold tracking-wider"
                      style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--text)" }}
                    >
                      {step.label}
                    </p>
                    <span
                      className={`${style.badge} inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest`}
                      style={{ fontFamily: "'Azeret Mono', monospace" }}
                    >
                      {style.label}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {step.sub}
                  </p>
                  {step.detail && (
                    <p
                      className="mt-0.5 text-[10px]"
                      style={{ fontFamily: "'Azeret Mono', monospace", color: "rgba(122,146,130,0.55)" }}
                    >
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer footnote */}
      <div
        className="mt-5 pt-4 text-[10px]"
        style={{
          borderTop: "1px solid var(--border)",
          fontFamily: "'Azeret Mono', monospace",
          color: "rgba(122,146,130,0.45)",
        }}
      >
        * spread and liquidity signals are modelled — xStocks public API does not expose order-book microstructure
      </div>
    </section>
  );
}
