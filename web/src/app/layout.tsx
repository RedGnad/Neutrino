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
          style={{ background: 'rgba(7,10,15,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          className="sticky top-0 z-50"
        >
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span
                className="flex h-6 w-6 items-center justify-center rounded"
                style={{ background: 'rgba(45,212,165,0.15)', border: '1px solid rgba(45,212,165,0.4)' }}
              >
                <span className="h-2 w-2 rounded-full animate-live" style={{ background: 'var(--bb-teal)' }} />
              </span>
              <span className="font-semibold tracking-tight" style={{ color: 'var(--bb-text)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Neutrino
              </span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                style={{ background: 'rgba(45,212,165,0.1)', color: 'var(--bb-teal)', border: '1px solid rgba(45,212,165,0.2)' }}
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
