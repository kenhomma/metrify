const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function getGoogleAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`Google token refresh failed: ${res.status} ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function runGA4Report(
  accessToken: string,
  propertyId: string,
  body: object
): Promise<any> {
  const url = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`GA4 API error: ${res.status} ${JSON.stringify(err)}`);
  }

  return res.json();
}
