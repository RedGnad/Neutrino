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
        background: copied ? "color-mix(in srgb, var(--clear) 10%, transparent)" : "rgba(229,221,207,0.035)",
        border: `1px solid ${copied ? "color-mix(in srgb, var(--clear) 28%, transparent)" : "var(--border)"}`,
        color: copied ? "var(--clear)" : "var(--muted)",
      }}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
