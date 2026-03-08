import { NextResponse } from 'next/server';
import { getSessionShop } from '@/lib/session';

export async function GET() {
  const shop = await getSessionShop();

  if (!shop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ shop });
}
