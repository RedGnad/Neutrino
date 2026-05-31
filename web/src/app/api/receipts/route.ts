import { NextResponse } from 'next/server';
import { getLatestReceipts } from '@/lib/agent/receipts/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/receipts/latest — returns up to 10 most recent decision receipts. */
export async function GET() {
  const receipts = await getLatestReceipts(10);
  return NextResponse.json({ receipts, count: receipts.length });
}
