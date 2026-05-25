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
    label: "01 SIGNAL CAPTURED",
    sub: "xStocks price + trading-halt status",
    state: "live",
    detail: "indicative price · halt flags · market hours",
  },
  {
    id: "risk",
    label: "02 RISK ENGINE",
    sub: "Deterministic scoring",
    state: "live",
    detail: "market-hours · spread* · liquidity* · basis · volatility",
  },
  {
    id: "policy",
    label: "03 POLICY VERDICT",
    sub: "Explicit rules, no LLM",
    state: "live",
    detail: "blockAfterHoursEquity · maxRiskForAllocate · fallback",
  },
  {
    id: "receipt",
    label: "04 ON-CHAIN RECEIPT",
    sub: "RWADecisionLogger · Mantle mainnet",
    state: "verified",
    detail: "keccak256(canonicalJson) = reasonHash on-chain",
  },
  {
    id: "execution",
    label: "05 EXECUTION GATE",
    sub: "Fluxion V3 · xChange RFQ auth-gated",
    state: "blocked",
    detail: "Fluxion: live · xChange: requires API key + registered wallet",
  },
];

const STATE_COLORS: Record<StepState, { dot: string; line: string; label: string; badge: string }> = {
  live:      { dot: "var(--bb-teal)",   line: "var(--bb-teal)",   label: "LIVE",      badge: "badge-live" },
  modelled:  { dot: "var(--bb-amber)",  line: "var(--bb-amber)",  label: "MODELLED",  badge: "badge-stub" },
  blocked:   { dot: "#9D84FF",          line: "#9D84FF",          label: "AUTH GATED", badge: "badge-notexec" },
  verified:  { dot: "var(--bb-teal)",   line: "var(--bb-teal)",   label: "VERIFIED",  badge: "badge-live" },
  pending:   { dot: "var(--bb-muted)",  line: "var(--bb-muted)",  label: "PENDING",   badge: "badge-na" },
};

export function DecisionTimeline({ steps = DEFAULT_STEPS }: DecisionTimelineProps) {
  return (
    <section className="bb-section">
      <p
        className="text-[10px] font-medium uppercase tracking-widest mb-5"
        style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-muted)" }}
      >
        AGENT PIPELINE · DECISION FLOW
      </p>

      <div className="relative">
        {/* Vertical connector line */}
        <div
          className="absolute left-[11px] top-4 bottom-4"
          style={{ width: 1, background: "linear-gradient(180deg, var(--bb-teal) 0%, rgba(255,255,255,0.05) 100%)" }}
        />

        <div className="space-y-0">
          {steps.map((step, idx) => {
            const colors = STATE_COLORS[step.state];
            const isLast = idx === steps.length - 1;

            return (
              <div key={step.id} className={`relative flex gap-5 ${isLast ? "" : "pb-6"}`}>
                {/* Dot */}
                <div className="relative z-10 mt-0.5 shrink-0">
                  <div
                    className="h-5 w-5 rounded-full flex items-center justify-center"
                    style={{
                      background: `${colors.dot}18`,
                      border: `1.5px solid ${colors.dot}60`,
                    }}
                  >
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: colors.dot }}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p
                      className="text-xs font-semibold tracking-wider"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--bb-text)" }}
                    >
                      {step.label}
                    </p>
                    <span
                      className={`${colors.badge} inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono font-medium uppercase tracking-widest`}
                    >
                      {colors.label}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--bb-muted)" }}>
                    {step.sub}
                  </p>
                  {step.detail ? (
                    <p
                      className="mt-1 text-[11px]"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.6)" }}
                    >
                      {step.detail}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="mt-5 pt-4 text-[11px]"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", fontFamily: "'IBM Plex Mono', monospace", color: "rgba(138,148,166,0.5)" }}
      >
        * spread and liquidity signals are modelled — xStocks public API does not expose order-book microstructure
      </div>
    </section>
  );
}
