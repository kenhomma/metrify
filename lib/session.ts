import { unsealData } from 'iron-session';
import { cookies } from 'next/headers';

export type SessionData = {
  shop: string;
};

export const SESSION_COOKIE_NAME = 'metrify_session';

export const SEAL_OPTIONS = {
  password: process.env.SESSION_SECRET!,
  ttl: 0, // no expiry
};

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

export async function getSessionShop(): Promise<string | null> {
  const cookieStore = await cookies();
  const sealed = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sealed) return null;

  try {
    const data = await unsealData<SessionData>(sealed, SEAL_OPTIONS);
    return data.shop ?? null;
  } catch {
    return null;
  }
}
