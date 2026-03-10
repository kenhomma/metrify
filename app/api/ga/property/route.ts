import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get('shop');
  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }

  const merchants = await sql`
    SELECT google_refresh_token, ga4_property_id
    FROM merchants WHERE shop_domain = ${shop} LIMIT 1
  `;

  if (merchants.length === 0) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const m = merchants[0];
  return NextResponse.json({
    connected: !!m.google_refresh_token,
    propertyId: m.ga4_property_id ?? null,
  });
}

export async function POST(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get('shop');
  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }

  const body = await request.json();
  const propertyId = body.propertyId;

  if (!propertyId || typeof propertyId !== 'string') {
    return NextResponse.json({ error: 'Invalid property ID' }, { status: 400 });
  }

  const normalizedId = propertyId.startsWith('properties/')
    ? propertyId
    : `properties/${propertyId}`;

  await sql`
    UPDATE merchants
    SET ga4_property_id = ${normalizedId}
    WHERE shop_domain = ${shop}
  `;

  return NextResponse.json({ ok: true, propertyId: normalizedId });
}
