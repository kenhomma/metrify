import { sql } from '@/lib/db';
import ChannelsClient from './client';
import GA4ConnectPrompt from '../../components/GA4ConnectPrompt';

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const shop = typeof params.shop === 'string' ? params.shop : '';

  const merchants = await sql`
    SELECT google_refresh_token, ga4_property_id
    FROM merchants WHERE shop_domain = ${shop} LIMIT 1
  `;

  const m = merchants[0];
  const gaConnected = !!m?.google_refresh_token;
  const ga4PropertyId = m?.ga4_property_id ?? null;

  if (!gaConnected || !ga4PropertyId) {
    return <GA4ConnectPrompt shop={shop} gaConnected={gaConnected} ga4PropertyId={ga4PropertyId} />;
  }

  return <ChannelsClient shop={shop} ga4PropertyId={ga4PropertyId} />;
}
