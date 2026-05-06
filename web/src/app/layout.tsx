import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Neutrino — Market-aware AI risk-allocation for Mantle RWAs',
  description:
    "Tokenized stocks trade 24/7. Their underlying markets don't. Neutrino is the agent that knows when not to trade.",
};

const NAV = [
  { href: '/market-map', label: 'Market map' },
  { href: '/proof', label: 'Proof' },
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 font-sans text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Neutrino
              <span className="ml-1 rounded-sm bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                testnet
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-6xl border-t border-zinc-200 px-6 py-6 text-xs text-zinc-500">
          Neutrino — built for the Mantle Turing Test 2026 — track AI x RWA.
        </footer>
      </body>
    </html>
  );
}
