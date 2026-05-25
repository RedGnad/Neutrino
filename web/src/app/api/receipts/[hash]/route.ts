import { NextResponse, type NextRequest } from 'next/server';
import { getReceiptByHash } from '@/lib/agent/receipts/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/receipts/:hash — retrieve one receipt by its reasonHash (hex). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hash: string }> },
) {
  const { hash } = await params;
  if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    return NextResponse.json({ error: 'Invalid hash format' }, { status: 400 });
  }
  const receipt = getReceiptByHash(hash);
  if (!receipt) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
  }
  return NextResponse.json(receipt);
}
