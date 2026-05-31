import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { ClientNav } from '@/components/ClientNav';

export const metadata: Metadata = {
  title: 'Neutrino — Risk judgment layer for Mantle RWA agents',
  description:
    "Tokenized stocks trade 24/7. Their underlying markets don't. Neutrino gives autonomous agents a safety loop: the AI proposes an action, policy validates or overrides it, and Mantle verifies the final decision.",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
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
          <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="brand-lockup flex shrink-0 items-center gap-3">
              <svg
                className="brand-mark"
                width="22"
                height="22"
                viewBox="0 0 32 32"
                aria-hidden="true"
                style={{ display: 'block', flexShrink: 0 }}
              >
                <rect className="brand-mark-base" width="32" height="32" rx="2" />
                <rect className="brand-mark-frame" x="1" y="1" width="30" height="30" rx="1.5" fill="none" strokeWidth="1.2"/>
                <path className="brand-mark-glyph" d="M8 25 L8 8 C8 6 24 6 24 14 L24 25" fill="none" strokeWidth="2.8" strokeLinecap="square" strokeLinejoin="miter"/>
              </svg>
              <span
                className="brand-wordmark"
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
                  background: 'color-mix(in srgb, var(--clear) 9%, transparent)',
                  color: 'var(--clear)',
                  border: '1px solid color-mix(in srgb, var(--clear) 26%, transparent)',
                }}
              >
                mainnet
              </span>
            </Link>

            <ClientNav />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          {children}
        </main>

        <footer
          className="mx-auto max-w-6xl px-4 py-6 sm:px-6"
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
