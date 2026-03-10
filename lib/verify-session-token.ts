import crypto from 'crypto';

interface SessionTokenPayload {
  iss: string;
  dest: string;
  aud: string;
  sub: string;
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
}

export function verifySessionToken(token: string): SessionTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  const data = `${headerB64}.${payloadB64}`;
  const secret = process.env.SHOPIFY_API_SECRET!;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');

  if (expectedSig !== signatureB64) {
    throw new Error('Invalid signature');
  }

  const payload: SessionTokenPayload = JSON.parse(
    Buffer.from(payloadB64, 'base64url').toString()
  );

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }

  if (payload.aud !== process.env.SHOPIFY_API_KEY) {
    throw new Error('Invalid audience');
  }

  return payload;
}

export function getShopFromToken(token: string): string | null {
  try {
    const payload = verifySessionToken(token);
    const url = new URL(payload.dest);
    return url.hostname;
  } catch {
    return null;
  }
}
