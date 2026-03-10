import crypto from 'crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'metrify_session';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
};

function sign(payload: string): string {
  return crypto
    .createHmac('sha256', process.env.SESSION_SECRET!)
    .update(payload)
    .digest('hex');
}

export function createSessionValue(shop: string): string {
  const payload = Buffer.from(JSON.stringify({ shop })).toString('base64url');
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export async function getSessionShop(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!value) return null;

  const [payload, sig] = value.split('.');
  if (!payload || !sig) return null;

  const expected = sign(payload);
  try {
    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.shop ?? null;
  } catch {
    return null;
  }
}
