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
          className="sticky top-0 z-50"
          style={{
            background: 'rgba(8,7,5,0.92)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="mx-auto flex h-13 max-w-6xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span
                  className="absolute h-3 w-3 rounded-full animate-live"
                  style={{ background: 'rgba(58,155,98,0.2)' }}
                />
                <span
                  className="relative h-1.5 w-1.5 rounded-full"
                  style={{ background: 'var(--clear)' }}
                />
              </span>
              <span
                className="italic"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                  letterSpacing: '-0.015em',
                }}
              >
                Neutrino
              </span>
              <span
                className="hidden sm:inline-block rounded px-1.5 py-0.5"
                style={{
                  fontFamily: "'Azeret Mono', monospace",
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  background: 'rgba(58,155,98,0.1)',
                  color: 'var(--clear)',
                  border: '1px solid rgba(58,155,98,0.2)',
                }}
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
          className="mx-auto max-w-6xl px-6 py-6"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span
              style={{
                fontFamily: "'Azeret Mono', monospace",
                fontSize: '10px',
                color: 'var(--muted)',
              }}
            >
              Neutrino — Mantle Turing Test 2026 — AI × RWA
            </span>
            <span
              style={{
                fontFamily: "'Azeret Mono', monospace",
                fontSize: '10px',
                color: 'rgba(144,126,108,0.45)',
              }}
            >
              schema: neutrino.decision.v2 · engine: deterministic · narration: claude-haiku-4-5
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
