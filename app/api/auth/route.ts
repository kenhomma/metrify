import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SHOP_DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }

  if (!SHOP_DOMAIN_REGEX.test(shop)) {
    return NextResponse.json({ error: 'Invalid shop domain' }, { status: 400 });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const appUrl = process.env.APP_URL!.replace(/\/$/, '');
  const redirectUri = `${appUrl}/api/auth/callback`;
  const scopes = process.env.SHOPIFY_SCOPES;
  const apiKey = process.env.SHOPIFY_API_KEY;

  const authUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${apiKey}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('shopify_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  return response;
}
