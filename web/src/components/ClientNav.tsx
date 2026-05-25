"use client";

import Link from "next/link";

const NAV = [
  { href: "/#scenarios", label: "Run" },
  { href: "/market-map", label: "Market map" },
  { href: "/proof", label: "Proofs" },
] as const;

export function ClientNav() {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="nav-link rounded-md px-3 py-1.5 text-sm transition-colors"
        >
          {item.label}
        </Link>
      ))}
      <a
        href="https://github.com/RedGnad/Neutrino"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-2 rounded px-2 py-1 text-xs font-mono nav-link transition-colors"
        style={{ border: "1px solid rgba(148,180,148,0.12)", fontFamily: "'Azeret Mono', monospace" }}
      >
        GitHub
      </a>
    </nav>
  );
}
