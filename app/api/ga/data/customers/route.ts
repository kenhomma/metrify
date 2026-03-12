import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getGoogleAccessToken, runGA4Report } from '@/lib/google';
import { authenticateRequest } from '@/lib/auth';

async function safeReport(
  accessToken: string,
  propertyId: string,
  body: object
): Promise<{ data: any; error: string | null }> {
  try {
    const data = await runGA4Report(accessToken, propertyId, body);
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if ('error' in auth) return auth.error;
  const { shop } = auth;

  const merchants = await sql`
    SELECT google_refresh_token, ga4_property_id
    FROM merchants WHERE shop_domain = ${shop} LIMIT 1
  `;

  if (merchants.length === 0) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { google_refresh_token, ga4_property_id } = merchants[0];

  if (!google_refresh_token || !ga4_property_id) {
    return NextResponse.json({ error: 'GA4 not configured' }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken(google_refresh_token);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Googleアクセストークンの取得に失敗しました: ${err.message}` },
      { status: 502 }
    );
  }

  const periodParam = request.nextUrl.searchParams.get('period') ?? 'daily';
  const isMonthly = periodParam === 'monthly';

  const endDate = new Date().toISOString().split('T')[0];
  const startDateObj = new Date();
  if (isMonthly) {
    startDateObj.setMonth(startDateObj.getMonth() - 12);
  } else {
    startDateObj.setDate(startDateObj.getDate() - 30);
  }
  const startDate = startDateObj.toISOString().split('T')[0];

  const [newVsReturningResult, countryResult, deviceResult] = await Promise.all([
    safeReport(accessToken, ga4_property_id, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'newVsReturning' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
      ],
    }),

    safeReport(accessToken, ga4_property_id, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'country' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
      ],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 20,
    }),

    safeReport(accessToken, ga4_property_id, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    }),
  ]);

  if (newVsReturningResult.error && countryResult.error && deviceResult.error) {
    return NextResponse.json(
      { error: `GA4データの取得に失敗しました: ${newVsReturningResult.error}` },
      { status: 502 }
    );
  }

  const newVsReturning = newVsReturningResult.data
    ? (newVsReturningResult.data.rows ?? []).map((row: any) => ({
        type: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value, 10),
        users: parseInt(row.metricValues[1].value, 10),
      }))
    : [];

  const countries = countryResult.data
    ? (countryResult.data.rows ?? []).map((row: any) => ({
        country: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value, 10),
        sessions: parseInt(row.metricValues[1].value, 10),
      }))
    : [];

  const devices = deviceResult.data
    ? (deviceResult.data.rows ?? []).map((row: any) => ({
        device: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value, 10),
        users: parseInt(row.metricValues[1].value, 10),
      }))
    : [];

  const totalUsers = newVsReturning.reduce((s: number, r: any) => s + r.users, 0);
  const totalSessions = newVsReturning.reduce((s: number, r: any) => s + r.sessions, 0);

  return NextResponse.json({
    newVsReturning,
    countries,
    devices,
    totals: {
      users: totalUsers,
      sessions: totalSessions,
    },
    errors: {
      newVsReturning: newVsReturningResult.error,
      countries: countryResult.error,
      devices: deviceResult.error,
    },
  });
}
