import { redirect } from 'next/navigation';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const shop = typeof params.shop === 'string' ? params.shop : null;

  if (shop) {
    redirect(`/dashboard?shop=${encodeURIComponent(shop)}`);
  }

  // shopパラメータなしでアクセスされた場合
  redirect('/dashboard');
}
