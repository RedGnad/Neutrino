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
    sub: "Signal scoring with policy guardrails",
    state: "live",
    detail: "market-hours · spread* · liquidity* · basis · volatility",
  },
  {
    id: "policy",
    label: "03  POLICY VERDICT",
    sub: "Rules validate the AI proposal",
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
    sub: "Fluxion V3 · xStocks via verified rails",
    state: "blocked",
    detail: "Fluxion: live · xStocks execution waits for verified RFQ rails",
  },
];

const STATE_STYLE: Record<StepState, { dot: string; badge: string; label: string }> = {
  live:     { dot: "var(--clear)",   badge: "badge-live",    label: "LIVE" },
  modelled: { dot: "var(--seal)",    badge: "badge-stub",    label: "MODELLED" },
  blocked:  { dot: "var(--gated)",   badge: "badge-notexec", label: "VERIFIED RAILS" },
  verified: { dot: "var(--clear)",   badge: "badge-live",    label: "VERIFIED" },
  pending:  { dot: "var(--muted)",   badge: "badge-na",      label: "PENDING" },
};

export function DecisionTimeline({ steps = DEFAULT_STEPS }: DecisionTimelineProps) {
  return (
    <section className="bb-section">
      <p className="section-label">AGENT PIPELINE · DECISION FLOW</p>

      <div className="relative">
        {/* Vertical rule */}
        <div
          className="absolute left-[11px] top-3 bottom-3"
          style={{ width: "1px", background: "linear-gradient(180deg, var(--clear) 0%, var(--border) 100%)" }}
        />

        <div className="space-y-0">
          {steps.map((step, idx) => {
            const style = STATE_STYLE[step.state];
            const isLast = idx === steps.length - 1;

            return (
              <div key={step.id} className={`relative flex gap-5 ${isLast ? "" : "pb-5"}`}>
                {/* Node */}
                <div className="relative z-10 mt-0.5 shrink-0">
                  <div
                    className="h-5 w-5 rounded-full flex items-center justify-center"
                    style={{
                      background: `${style.dot}14`,
                      border: `1.5px solid ${style.dot}48`,
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
                      className={`${style.badge} inline-flex items-center rounded px-1.5 py-0.5`}
                      style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
                    >
                      {style.label}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--muted)", fontFamily: "'Instrument Sans', sans-serif" }}>
                    {step.sub}
                  </p>
                  {step.detail && (
                    <p
                      className="mt-0.5"
                      style={{ fontFamily: "'Azeret Mono', monospace", fontSize: "10px", color: "rgba(144,126,108,0.5)" }}
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

      <div
        className="mt-5 pt-4"
        style={{
          borderTop: "1px solid var(--border)",
          fontFamily: "'Azeret Mono', monospace",
          fontSize: "10px",
          color: "rgba(144,126,108,0.45)",
        }}
      >
        * spread and liquidity signals are modelled — xStocks public API does not expose order-book microstructure
      </div>
    </section>
  );
}
