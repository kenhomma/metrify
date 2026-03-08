import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');

  if (!shop) {
    return NextResponse.json({ error: 'shop parameter is required' }, { status: 400 });
  }

  const merchants = await sql`
    SELECT shop_domain, access_token FROM merchants WHERE shop_domain = ${shop} LIMIT 1
  `;

  if (merchants.length === 0) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
  }

  const { shop_domain, access_token } = merchants[0];
  const token = access_token.trim();

  const query = `
    query {
      orders(first: 50) {
        edges {
          node {
            id
            name
            totalPriceSet { shopMoney { amount currencyCode } }
            createdAt
            displayFinancialStatus
            displayFulfillmentStatus
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
      {
        error: 'Shopify API error',
        status: res.status,
        shopify: body,
      },
      { status: res.status }
    );
  }

  const { data, errors } = await res.json();

  if (errors) {
    return NextResponse.json({ error: 'GraphQL error', errors }, { status: 400 });
  }

  return NextResponse.json(data);
}
