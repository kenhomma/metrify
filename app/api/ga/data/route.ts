import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getGoogleAccessToken, runGA4Report } from '@/lib/google';

function formatGA4Date(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

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

  const [trafficResult, channelResult, ecommerceResult] = await Promise.all([
    safeReport(accessToken, ga4_property_id, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'sessions' },
        { name: 'activeUsers' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),

    safeReport(accessToken, ga4_property_id, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    }),

    safeReport(accessToken, ga4_property_id, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'ecommercePurchases' },
        { name: 'purchaseRevenue' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
  ]);

  // 全レポートが失敗した場合
  if (trafficResult.error && channelResult.error && ecommerceResult.error) {
    return NextResponse.json(
      { error: `GA4データの取得に失敗しました: ${trafficResult.error}` },
      { status: 502 }
    );
  }

  const traffic = trafficResult.data
    ? (trafficResult.data.rows ?? []).map((row: any) => ({
        date: formatGA4Date(row.dimensionValues[0].value),
        pageViews: parseInt(row.metricValues[0].value, 10),
        sessions: parseInt(row.metricValues[1].value, 10),
        users: parseInt(row.metricValues[2].value, 10),
      }))
    : [];

  const channels = channelResult.data
    ? (channelResult.data.rows ?? []).map((row: any) => ({
        channel: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value, 10),
        users: parseInt(row.metricValues[1].value, 10),
      }))
    : [];

  const ecommerce = ecommerceResult.data
    ? (ecommerceResult.data.rows ?? []).map((row: any) => ({
        date: formatGA4Date(row.dimensionValues[0].value),
        purchases: parseInt(row.metricValues[0].value, 10),
        revenue: parseFloat(row.metricValues[1].value),
      }))
    : [];

  // 月次集計
  const aggregateMonthly = (
    data: { date: string; [key: string]: any }[],
    sumKeys: string[]
  ) => {
    const map: Record<string, any> = {};
    for (const row of data) {
      const month = row.date.slice(0, 7);
      if (!map[month]) {
        map[month] = { date: month };
        for (const k of sumKeys) map[month][k] = 0;
      }
      for (const k of sumKeys) map[month][k] += row[k];
    }
    return Object.values(map).sort((a: any, b: any) => a.date.localeCompare(b.date));
  };

  const finalTraffic = isMonthly
    ? aggregateMonthly(traffic, ['pageViews', 'sessions', 'users'])
    : traffic;

  const finalEcommerce = isMonthly
    ? aggregateMonthly(ecommerce, ['purchases', 'revenue'])
    : ecommerce;

  const totalPV = finalTraffic.reduce((s: number, r: any) => s + r.pageViews, 0);
  const totalSessions = finalTraffic.reduce((s: number, r: any) => s + r.sessions, 0);
  const totalUsers = finalTraffic.reduce((s: number, r: any) => s + r.users, 0);
  const totalRevenue = finalEcommerce.reduce((s: number, r: any) => s + r.revenue, 0);
  const totalPurchases = finalEcommerce.reduce((s: number, r: any) => s + r.purchases, 0);
  const conversionRate = totalSessions > 0
    ? Math.round((totalPurchases / totalSessions) * 10000) / 100
    : 0;

  return NextResponse.json({
    traffic: finalTraffic,
    channels,
    ecommerce: finalEcommerce,
    totals: {
      pageViews: totalPV,
      sessions: totalSessions,
      users: totalUsers,
      revenue: Math.round(totalRevenue * 100) / 100,
      purchases: totalPurchases,
      conversionRate,
    },
    errors: {
      traffic: trafficResult.error,
      channels: channelResult.error,
      ecommerce: ecommerceResult.error,
    },
  });
}
