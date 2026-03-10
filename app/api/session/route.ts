import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedShop } from '@/lib/session';

export async function GET(request: NextRequest) {
  const shop = await getAuthenticatedShop(request);

  if (!shop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ shop });
}
