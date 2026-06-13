"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Silently polls router.refresh() so server components (hero card, decisions)
 * stay current without any user action. Renders nothing.
 */
export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
