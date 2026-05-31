import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

type Tone = "green" | "amber" | "blue" | "red" | "slate" | "gold" | "violet";
type Surface = "ledger" | "command" | "evidence";

const TONES: Record<Tone, { fg: string; bg: string; border: string }> = {
  green: {
    fg: "var(--clear)",
    bg: "color-mix(in srgb, var(--clear) 14%, transparent)",
    border: "color-mix(in srgb, var(--clear) 44%, transparent)",
  },
  amber: {
    fg: "var(--pause)",
    bg: "color-mix(in srgb, var(--pause) 14%, transparent)",
    border: "color-mix(in srgb, var(--pause) 44%, transparent)",
  },
  blue: {
    fg: "var(--review)",
    bg: "color-mix(in srgb, var(--review) 13%, transparent)",
    border: "color-mix(in srgb, var(--review) 40%, transparent)",
  },
  red: {
    fg: "var(--refuse)",
    bg: "color-mix(in srgb, var(--refuse) 14%, transparent)",
    border: "color-mix(in srgb, var(--refuse) 42%, transparent)",
  },
  slate: {
    fg: "var(--muted-strong)",
    bg: "color-mix(in srgb, var(--muted-strong) 8%, transparent)",
    border: "color-mix(in srgb, var(--muted-strong) 26%, transparent)",
  },
  gold: {
    fg: "var(--seal)",
    bg: "color-mix(in srgb, var(--seal) 14%, transparent)",
    border: "color-mix(in srgb, var(--seal) 38%, transparent)",
  },
  violet: {
    fg: "var(--gated)",
    bg: "color-mix(in srgb, var(--gated) 13%, transparent)",
    border: "color-mix(in srgb, var(--gated) 40%, transparent)",
  },
};

export function toneForStatus(value?: string | null): Tone {
  const normalized = (value ?? "").toUpperCase();
  if (["ALLOCATE", "LIVE", "OPEN", "VERIFIED", "FOUND", "SAFE", "OK"].includes(normalized)) {
    return "green";
  }
  if (["PAUSE", "STUB", "MODELLED", "MODELED", "CLOSED", "RISK", "WATCH", "HOLD"].includes(normalized)) {
    return "amber";
  }
  if (["REVIEW", "REQUIRE_HUMAN_CONFIRMATION", "PENDING", "NO DATA", "N/A", "NA"].includes(normalized)) {
    return "blue";
  }
  if (["ERROR", "UNAVAILABLE", "HALTED", "MISMATCH", "FAILED", "NOT FOUND"].includes(normalized)) {
    return "red";
  }
  if (["GATED", "SIMULATED"].includes(normalized)) {
    return "violet";
  }
  return "slate";
}

export function ConsoleCard({
  children,
  accent = "slate",
  className = "",
  compact = false,
  surface = "ledger",
  style,
}: {
  children: ReactNode;
  accent?: Tone | "none";
  className?: string;
  compact?: boolean;
  surface?: Surface;
  style?: CSSProperties;
}) {
  const accentBorder =
    accent === "none" ? "var(--border-hi)" : (TONES[accent]?.border ?? "var(--border-hi)");
  return (
    <div
      className={`console-surface surface-${surface} ${compact ? "console-surface-compact" : ""} ${className}`}
      style={{
        borderColor: "var(--border)",
        ["--panel-accent" as string]: accentBorder,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function LedgerPanel(props: Omit<Parameters<typeof ConsoleCard>[0], "surface">) {
  return <ConsoleCard {...props} surface="ledger" />;
}

export function CommandSurface(props: Omit<Parameters<typeof ConsoleCard>[0], "surface">) {
  return <ConsoleCard {...props} surface="command" />;
}

export function EvidenceRow(props: Omit<Parameters<typeof ConsoleCard>[0], "surface">) {
  return <ConsoleCard {...props} surface="evidence" compact />;
}

export function SectionHeader({
  eyebrow,
  title,
  body,
  compact = false,
  children,
}: {
  eyebrow: string;
  title: string;
  body?: ReactNode;
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <span className="section-label">{eyebrow}</span>
        <h2
          className="leading-tight"
          style={{
            color: "var(--text)",
            fontFamily: "'Instrument Sans', system-ui, sans-serif",
            fontSize: compact ? "1.05rem" : "clamp(1.08rem, 1.7vw, 1.42rem)",
            fontWeight: 600,
            letterSpacing: "0",
          }}
        >
          {title}
        </h2>
        {body ? (
          <div className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            {body}
          </div>
        ) : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

export function StatusPill({
  children,
  value,
  tone,
  className = "",
}: {
  children?: ReactNode;
  value?: string | null;
  tone?: Tone;
  className?: string;
}) {
  const t = TONES[tone ?? toneForStatus(value)];
  return (
    <span
      className={`status-chip inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${className}`}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.fg,
        fontFamily: "'Azeret Mono', monospace",
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.fg }} />
      {children ?? value}
    </span>
  );
}

export function RiskBar({
  value,
  max = 1000,
  label = true,
}: {
  value?: number | null;
  max?: number;
  label?: boolean;
}) {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : null;
  const pct = safeValue === null ? 0 : Math.max(0, Math.min(100, (safeValue / max) * 100));
  const tone: Tone = safeValue === null ? "slate" : safeValue >= 500 ? "red" : safeValue >= 250 ? "amber" : "green";
  const t = TONES[tone];
  return (
    <div className="min-w-[92px]">
      {label ? (
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(144,126,108,0.58)", fontFamily: "'Azeret Mono', monospace" }}>
            Risk
          </span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--text)", fontFamily: "'Azeret Mono', monospace" }}>
            {safeValue ?? "-"}<span style={{ color: "rgba(144,126,108,0.45)" }}>/{max}</span>
          </span>
        </div>
      ) : null}
      <div className="h-px overflow-hidden" style={{ background: "rgba(231,223,208,0.11)" }}>
        <div className="h-full" style={{ width: `${pct}%`, background: t.fg }} />
      </div>
    </div>
  );
}

export function MetricStrip({
  items,
  columns = 4,
}: {
  items: Array<{ label: string; value: ReactNode; tone?: Tone; href?: string }>;
  columns?: 2 | 3 | 4;
}) {
  const grid =
    columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={`metric-strip grid ${grid}`}>
      {items.map((item) => {
        const t = item.tone ? TONES[item.tone] : null;
        const content = (
          <div
            className="metric-cell px-4 py-3"
            style={{
              borderColor: t?.border ?? "var(--border)",
            }}
          >
            <p className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(144,126,108,0.56)", fontFamily: "'Azeret Mono', monospace" }}>
              {item.label}
            </p>
            <div className="mt-1 text-sm font-semibold leading-snug" style={{ color: t?.fg ?? "var(--text)" }}>
              {item.value}
            </div>
          </div>
        );
        if (item.href) {
          return (
            <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="block transition-opacity hover:opacity-80">
              {content}
            </a>
          );
        }
        return <div key={item.label}>{content}</div>;
      })}
    </div>
  );
}

export function HashText({
  value,
  href,
  chars = 10,
}: {
  value: string;
  href?: string;
  chars?: number;
}) {
  const short = `${value.slice(0, chars)}...${value.slice(-6)}`;
  const content = (
    <code className="break-all text-xs" style={{ color: href ? "var(--clear)" : "rgba(229,221,207,0.66)" }}>
      {short}
    </code>
  );
  if (!href) return content;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80">
      {content}
    </a>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-semibold transition-opacity hover:opacity-80" style={{ color: "var(--clear)" }}>
      {children}
    </Link>
  );
}
