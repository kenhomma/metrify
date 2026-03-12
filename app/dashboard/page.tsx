import { redirect } from 'next/navigation';

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

  redirect(`/dashboard/shopify?shop=${encodeURIComponent(shop)}`);
}
