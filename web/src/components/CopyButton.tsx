"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label = "copy",
  copiedLabel = "copied",
  className = "",
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard availability depends on browser permissions.
        }
      }}
      className={`rounded px-2 py-0.5 text-[10px] font-mono transition-all shrink-0 ${className}`}
      style={{
        background: copied ? "rgba(45,212,165,0.15)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${copied ? "rgba(45,212,165,0.3)" : "rgba(255,255,255,0.08)"}`,
        color: copied ? "var(--bb-teal, var(--clear))" : "var(--bb-muted, var(--muted))",
      }}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
