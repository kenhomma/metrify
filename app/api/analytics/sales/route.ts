import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type OrderNode = {
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  createdAt: string;
};

export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get('shop');

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }

  const period = request.nextUrl.searchParams.get('period') ?? 'daily';

  const merchants = await sql`
    SELECT shop_domain, access_token FROM merchants WHERE shop_domain = ${shop} LIMIT 1
  `;

  if (merchants.length === 0) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { shop_domain, access_token } = merchants[0];
  const token = access_token.trim();

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().split('T')[0];

  const query = `
    query {
      orders(first: 250, query: "created_at:>${sinceStr}") {
        edges {
          node {
            totalPriceSet { shopMoney { amount currencyCode } }
            createdAt
          }
        }
      }
    }
  `;

  const res = await fetch(
    `https://${shop_domain}/admin/api/2024-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return NextResponse.json(
      { error: 'Shopify API error', status: res.status, shopify: body },
      { status: res.status }
    );
  }

  const { data, errors } = await res.json();

  if (errors) {
    return NextResponse.json({ error: 'GraphQL error', errors }, { status: 400 });
  }

  const orders: OrderNode[] = data.orders.edges.map(
    (e: { node: OrderNode }) => e.node
  );

  const aggregated: Record<string, number> = {};

  for (const order of orders) {
    const d = new Date(order.createdAt);
    const key =
      period === 'monthly'
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : order.createdAt.split('T')[0];
    aggregated[key] = (aggregated[key] ?? 0) + parseFloat(order.totalPriceSet.shopMoney.amount);
  }

  const result: { date: string; sales: number }[] = [];

  if (period === 'monthly') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({ date: key, sales: Math.round((aggregated[key] ?? 0) * 100) / 100 });
    }
  } else {
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      result.push({ date: key, sales: Math.round((aggregated[key] ?? 0) * 100) / 100 });
    }
  }

  const currency = orders[0]?.totalPriceSet.shopMoney.currencyCode ?? 'USD';
  return NextResponse.json({ data: result, currency });
}
