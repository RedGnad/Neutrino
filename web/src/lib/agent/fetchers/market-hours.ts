// Mirrored from /agent/src/fetchers/market-hours.ts.
const US_MARKET_HOLIDAYS_2026 = new Set([
  '2026-01-01',
  '2026-01-19',
  '2026-02-16',
  '2026-04-03',
  '2026-05-25',
  '2026-06-19',
  '2026-07-03',
  '2026-09-07',
  '2026-11-26',
  '2026-12-25',
]);

export function isUsMarketOpen(at: Date = new Date()): boolean {
  const et = toEasternParts(at);
  if (et.dayOfWeek === 0 || et.dayOfWeek === 6) return false;
  if (US_MARKET_HOLIDAYS_2026.has(et.dateIso)) return false;
  const minutes = et.hour * 60 + et.minute;
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

function toEasternParts(d: Date): {
  dateIso: string;
  hour: number;
  minute: number;
  dayOfWeek: number;
} {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday ?? 'Sun');
  return {
    dateIso: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    dayOfWeek,
  };
}
