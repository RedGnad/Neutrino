import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { ClientNav } from '@/components/ClientNav';

export const metadata: Metadata = {
  title: 'Neutrino — Risk judgment layer for Mantle RWA agents',
  description:
    "Tokenized stocks trade 24/7. Their underlying markets don't. Neutrino is the autonomous risk-judgment layer that decides when execution is safe and writes a verifiable receipt on Mantle.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <header
          style={{ background: 'rgba(8,13,9,0.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(148,180,148,0.08)' }}
          className="sticky top-0 z-50"
        >
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-3">
              {/* Live indicator dot */}
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span
                  className="absolute h-3 w-3 rounded-full animate-live"
                  style={{ background: 'rgba(61,138,98,0.25)' }}
                />
                <span
                  className="relative h-1.5 w-1.5 rounded-full"
                  style={{ background: 'var(--sage)' }}
                />
              </span>
              {/* Fraunces italic logo — the unexpected serif in a DeFi nav */}
              <span
                className="text-lg font-display italic"
                style={{ color: 'var(--text)', fontFamily: "'Fraunces', Georgia, serif", letterSpacing: '-0.02em' }}
              >
                Neutrino
              </span>
              <span
                className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest"
                style={{ fontFamily: "'Azeret Mono', monospace", background: 'rgba(61,138,98,0.1)', color: 'var(--sage)', border: '1px solid rgba(61,138,98,0.2)' }}
              >
                mainnet
              </span>
            </Link>

            <ClientNav />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-6 py-10">
          {children}
        </main>

        <footer
          className="mx-auto max-w-6xl px-6 py-6 text-xs"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)', color: 'var(--bb-muted)', fontFamily: "'IBM Plex Mono', monospace" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Neutrino — Mantle Turing Test 2026 — AI × RWA</span>
            <span style={{ color: 'rgba(138,148,166,0.5)' }}>
              schema: neutrino.decision.v2 · engine: deterministic · narration: claude-haiku-4-5
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
