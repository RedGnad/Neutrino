type SourceState = "live" | "stub" | "simulated" | "n/a";

export interface XStocksBreakdownDecision {
  asset: {
    symbol: string;
    kind: string;
  };
  sources: {
    marketHours?: SourceState;
    xStockPrice?: SourceState;
    xStockStatus?: SourceState;
  };
  snapshot: {
    marketOpen?: boolean | null;
  };
  xstocks?: {
    indicativePriceUsd?: number | null;
    priceSource?: string | null;
    marketTradingHalted?: boolean | null;
    atomicTradingHalted?: boolean | null;
  } | null;
  breakdown?: {
    marketHoursPenalty?: number;
  };
  action: string;
  policyReview?: {
    finalAction?: string;
  } | null;
}

export function parseXStocksDecision(canonicalJson?: string): XStocksBreakdownDecision | null {
  if (!canonicalJson) return null;
  try {
    const parsed = JSON.parse(canonicalJson) as XStocksBreakdownDecision;
    if (parsed.asset?.kind !== "tokenized_equity" || !parsed.xstocks) return null;
    return parsed;
  } catch {
    return null;
  }
}

function marketContext(decision: XStocksBreakdownDecision): "OPEN" | "CLOSED" | "HALTED" | "UNKNOWN" {
  if (decision.xstocks?.marketTradingHalted || decision.xstocks?.atomicTradingHalted) return "HALTED";
  if (decision.snapshot.marketOpen === true) return "OPEN";
  if (decision.snapshot.marketOpen === false) return "CLOSED";
  return "UNKNOWN";
}

function signalQuality(decision: XStocksBreakdownDecision): "LIVE" | "STUB" | "MODELLED" {
  if (decision.sources.xStockPrice === "live" && decision.sources.xStockStatus === "live") return "LIVE";
  if (decision.sources.xStockPrice === "stub" || decision.sources.xStockStatus === "stub") return "STUB";
  return "MODELLED";
}

function quoteLabel(decision: XStocksBreakdownDecision): string {
  if (decision.sources.xStockPrice === "live" && decision.xstocks?.indicativePriceUsd != null) {
    return `live (${decision.xstocks.indicativePriceUsd})`;
  }
  if (decision.xstocks?.indicativePriceUsd == null) return "stub / null quote";
  return decision.sources.xStockPrice ?? "unknown";
}

function pauseReason(decision: XStocksBreakdownDecision): string {
  const reasons: string[] = [];
  if (decision.xstocks?.marketTradingHalted) reasons.push("market trading halt");
  if (decision.xstocks?.atomicTradingHalted) reasons.push("atomic RFQ halt");
  if (decision.snapshot.marketOpen === false && (decision.breakdown?.marketHoursPenalty ?? 0) > 0) {
    reasons.push("underlying market closed");
  }
  if (decision.sources.xStockPrice !== "live") reasons.push("quote not fully live");
  if (decision.sources.xStockStatus !== "live") reasons.push("status feed not fully live");
  reasons.push("xStocks execution rail unavailable");
  return reasons.join(" · ");
}

function previewLabel(decision: XStocksBreakdownDecision): string {
  if (decision.xstocks?.marketTradingHalted || decision.xstocks?.atomicTradingHalted) return "NOT ELIGIBLE WHILE HALTED";
  if (decision.snapshot.marketOpen === true && signalQuality(decision) === "LIVE") return "ELIGIBLE FOR REVIEW";
  return "REVIEW DATA + MARKET CONTEXT";
}

function statusColor(value: string): string {
  if (value === "OPEN" || value === "LIVE" || value === "VERIFIED" || value === "ALLOCATE") return "var(--clear)";
  if (value === "UNAVAILABLE" || value === "HALTED") return "var(--refuse)";
  if (value === "PAUSE" || value === "CLOSED" || value === "STUB" || value === "MODELLED") return "var(--seal)";
  return "var(--seal)";
}

export function XStocksDecisionBreakdown({
  decision,
  compact = false,
}: {
  decision: XStocksBreakdownDecision | null;
  compact?: boolean;
}) {
  if (!decision) return null;

  const market = marketContext(decision);
  const signal = signalQuality(decision);
  const finalAction = decision.policyReview?.finalAction ?? decision.action;
  const rows = [
    ["Market context", market],
    ["Signal quality", signal],
    ["Execution rail", "UNAVAILABLE"],
    ["Final policy outcome", finalAction],
  ];

  return (
    <div
      className={`console-surface surface-ledger ${compact ? "console-surface-compact" : ""} space-y-3`}
      style={{ border: "1px solid color-mix(in srgb, var(--gated) 22%, transparent)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p
            className="text-[10px] font-medium uppercase tracking-widest"
            style={{ fontFamily: "'Azeret Mono', monospace", color: "var(--gated)" }}
          >
            xStocks decision breakdown
          </p>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
            Market context and execution readiness are evaluated separately.
          </p>
        </div>
        <span
          className="rounded px-2 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider"
          style={{ background: "color-mix(in srgb, var(--gated) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--gated) 26%, transparent)", color: "var(--gated)" }}
        >
          xStock
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="px-3 py-2"
            style={{ background: "rgba(0,0,0,0.16)", border: "1px solid var(--border)" }}
          >
            <p
              className="text-[9px] uppercase tracking-widest"
            style={{ fontFamily: "'Azeret Mono', monospace", color: "rgba(144,126,108,0.6)" }}
            >
              {label}
            </p>
            <p
              className="mt-1 text-[11px] font-semibold uppercase tracking-wide"
              style={{ fontFamily: "'Azeret Mono', monospace", color: statusColor(value) }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {finalAction === "PAUSE" ? (
        <details className="group">
          <summary
            className="cursor-pointer text-[11px] font-mono font-semibold uppercase tracking-wider transition-opacity hover:opacity-80"
            style={{ color: "var(--clear)" }}
          >
            Why paused?
          </summary>
          <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2" style={{ color: "var(--muted)" }}>
            <ReasonLine label="Market status" value={market.toLowerCase()} />
            <ReasonLine label="xStock quote" value={quoteLabel(decision)} />
            <ReasonLine label="RFQ execution rail" value="unavailable" />
            <ReasonLine label="Policy result" value="pause before capital movement" />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "rgba(138,148,166,0.72)" }}>
            PAUSE means the agent refused to move capital through an unverified rail. Current
            blockers: {pauseReason(decision)}.
          </p>
        </details>
      ) : null}

      <div className="px-3 py-2 text-[11px] leading-relaxed" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)", color: "var(--muted)" }}>
        <span className="font-mono uppercase tracking-wider" style={{ color: "var(--gated)" }}>
          Preview only:
        </span>{" "}
        Hypothetical if a verified RFQ rail existed: {previewLabel(decision)}. Not executed. Not
        committed as final action.
      </div>
    </div>
  );
}

function ReasonLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 px-2 py-1.5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)" }}>
      <span style={{ color: "rgba(138,148,166,0.55)" }}>{label}</span>
      <span className="text-right font-mono" style={{ color: "rgba(235,229,215,0.68)" }}>{value}</span>
    </div>
  );
}
