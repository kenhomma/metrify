import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getGoogleAccessToken, runGA4Report } from '@/lib/google';

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

  try {
    const data = await runGA4Report(accessToken, ga4_property_id, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'itemName' }],
      metrics: [
        { name: 'itemRevenue' },
        { name: 'itemsPurchased' },
        { name: 'itemsViewed' },
        { name: 'itemsAddedToCart' },
      ],
      orderBys: [{ metric: { metricName: 'itemRevenue' }, desc: true }],
      limit: 50,
    });

    const products = (data.rows ?? []).map((row: any) => ({
      name: row.dimensionValues[0].value,
      revenue: parseFloat(row.metricValues[0].value),
      purchased: parseInt(row.metricValues[1].value, 10),
      viewed: parseInt(row.metricValues[2].value, 10),
      addedToCart: parseInt(row.metricValues[3].value, 10),
    }));

    const totalRevenue = products.reduce((s: number, p: any) => s + p.revenue, 0);
    const totalPurchased = products.reduce((s: number, p: any) => s + p.purchased, 0);
    const totalViewed = products.reduce((s: number, p: any) => s + p.viewed, 0);

    return NextResponse.json({
      products,
      totals: {
        revenue: Math.round(totalRevenue * 100) / 100,
        purchased: totalPurchased,
        viewed: totalViewed,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `GA4データの取得に失敗しました: ${err.message}` },
      { status: 502 }
    );
  }
}
