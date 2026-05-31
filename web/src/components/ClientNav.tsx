"use client";

import Link from "next/link";

const NAV = [
  { href: "/#scenarios", label: "Run" },
  { href: "/integrate", label: "Integrate" },
  { href: "/market-map", label: "Market map" },
  { href: "/proof", label: "Proofs" },
] as const;

export function ClientNav() {
  return (
    <nav className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="nav-link whitespace-nowrap rounded px-2.5 py-1.5 transition-colors sm:px-3"
          style={{ fontSize: '13px' }}
        >
          {item.label}
        </Link>
      ))}
      <a
        href="https://github.com/RedGnad/Neutrino"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-2 hidden whitespace-nowrap rounded px-2.5 py-1 transition-colors sm:inline-flex nav-link"
        style={{
          fontSize: '11px',
          fontFamily: "'Azeret Mono', monospace",
          border: '1px solid var(--border-hi)',
        }}
      >
        GitHub
      </a>
    </nav>
  );
}
