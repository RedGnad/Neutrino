/**
 * Static NYSE/NASDAQ schedule. For hackathon scope this is more than enough —
 * both venues share holiday calendars and trade 09:30–16:00 ET.
 *
 * The 2026 holiday list is hardcoded; revisit annually. Half-days not modeled
 * (we treat them as full sessions; over-permissive but acceptable for V1).
 */
const US_MARKET_HOLIDAYS_2026 = new Set([
  '2026-01-01', // New Year's Day
  '2026-01-19', // MLK Day
  '2026-02-16', // Presidents' Day
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth
  '2026-07-03', // Independence Day (observed)
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving
  '2026-12-25', // Christmas
]);

/** True iff the NYSE/NASDAQ session is currently active (regular hours, ET). */
export function isUsMarketOpen(at: Date = new Date()): boolean {
  const et = toEasternParts(at);

  // Weekends.
  if (et.dayOfWeek === 0 || et.dayOfWeek === 6) return false;

  // Holidays.
  if (US_MARKET_HOLIDAYS_2026.has(et.dateIso)) return false;

  // Regular hours: 09:30–16:00 ET.
  const minutes = et.hour * 60 + et.minute;
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

function toEasternParts(d: Date): {
  dateIso: string;
  hour: number;
  minute: number;
  dayOfWeek: number;
} {
  // Intl gives us localized parts in America/New_York with proper DST.
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
