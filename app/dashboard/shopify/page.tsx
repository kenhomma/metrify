import ShopifyClient from './client';

export default async function ShopifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const shop = typeof params.shop === 'string' ? params.shop : '';

  return <ShopifyClient shop={shop} />;
}
