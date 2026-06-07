"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/#scenarios", label: "Run", match: "/" },
  { href: "/integrate", label: "Integrate", match: "/integrate" },
  { href: "/market-map", label: "Market map", match: "/market-map" },
  { href: "/proof", label: "Proofs", match: "/proof" },
] as const;

export function ClientNav() {
  const pathname = usePathname();

  return (
    <nav className="flex min-w-0 flex-1 items-center justify-end gap-0.5 overflow-x-auto">
      {NAV.map((item) => {
        const active = item.match === "/" ? pathname === "/" : pathname.startsWith(item.match);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link whitespace-nowrap rounded px-3 py-1.5 text-[13px] transition-colors${active ? " nav-link-active" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
      <a
        href="https://github.com/RedGnad/Neutrino"
        target="_blank"
        rel="noopener noreferrer"
        className="nav-link ml-3 hidden whitespace-nowrap rounded px-2.5 py-1 text-[11px] transition-colors sm:inline-flex"
        style={{
          fontFamily: "'Azeret Mono', monospace",
          border: "1px solid var(--border-hi)",
        }}
      >
        GitHub
      </a>
    </nav>
  );
}
