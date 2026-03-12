import { NextRequest, NextResponse } from 'next/server';
import { getShopFromToken } from './verify-session-token';

/**
 * Authenticate a request using Shopify App Bridge session token.
 * Returns the verified shop domain, or a 401 response.
 */
export function authenticateRequest(
  request: NextRequest
): { shop: string } | { error: NextResponse } {
  const shopParam = request.nextUrl.searchParams.get('shop');
  if (!shopParam) {
    return { error: NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 }) };
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const token = authHeader.slice(7);
  const tokenShop = getShopFromToken(token);

  if (!tokenShop) {
    return { error: NextResponse.json({ error: 'Invalid session token' }, { status: 401 }) };
  }

  if (tokenShop !== shopParam) {
    return { error: NextResponse.json({ error: 'Shop mismatch' }, { status: 403 }) };
  }

  return { shop: tokenShop };
}
