import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import DashboardClient from './client';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const shop = typeof params.shop === 'string' ? params.shop : null;

  if (!shop) {
    redirect('/');
    return;
  }

  // OAuthを通過済み（DBにアクセストークンがある）か確認
  const merchants = await sql`
    SELECT shop_domain, google_refresh_token, ga4_property_id
    FROM merchants WHERE shop_domain = ${shop} LIMIT 1
  `;

  if (merchants.length === 0) {
    // 未インストール → OAuth開始
    redirect(`/api/auth?shop=${encodeURIComponent(shop)}`);
    return;
  }

  const m = merchants[0];
  return (
    <DashboardClient
      shop={shop}
      gaConnected={!!m.google_refresh_token}
      ga4PropertyId={m.ga4_property_id ?? null}
    />
  );
}
