import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sql } from '@/lib/db';
import { SESSION_COOKIE_NAME, COOKIE_OPTIONS, createSessionValue } from '@/lib/session';

function verifyHmac(searchParams: URLSearchParams, secret: string): boolean {
  const hmac = searchParams.get('hmac');
  if (!hmac) return false;

  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== 'hmac') params[key] = value;
  });

  const message = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  const computed = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hmac, 'hex'));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // 1. State validation (CSRF protection)
  const storedState = request.cookies.get('shopify_oauth_state')?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.json({ error: 'Invalid state parameter' }, { status: 403 });
  }

  // 2. HMAC validation
  if (!verifyHmac(searchParams, process.env.SHOPIFY_API_SECRET!)) {
    return NextResponse.json({ error: 'HMAC validation failed' }, { status: 403 });
  }

  if (!shop || !code) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  // 3. Exchange authorization code for access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 502 });
  }

  const { access_token } = await tokenRes.json();

  // 4. Persist merchant to Neon
  try {
    await sql`
      INSERT INTO merchants (shop_domain, access_token)
      VALUES (${shop}, ${access_token})
      ON CONFLICT (shop_domain)
      DO UPDATE SET access_token = EXCLUDED.access_token
    `;
  } catch (dbError) {
    console.error('DB error:', dbError);
    return NextResponse.json({ error: 'Failed to save merchant' }, { status: 500 });
  }

  // 5. Redirect to dashboard with shop parameter
  const appUrl = process.env.APP_URL!.replace(/\/$/, '');
  const response = NextResponse.redirect(`${appUrl}/dashboard?shop=${encodeURIComponent(shop)}`);
  response.cookies.set(SESSION_COOKIE_NAME, createSessionValue(shop), COOKIE_OPTIONS);
  response.cookies.delete('shopify_oauth_state');

  return response;
}
