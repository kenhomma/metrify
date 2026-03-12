'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthFetch } from '@/lib/use-auth-fetch';

const navItems = [
  { label: 'Shopify', href: '/dashboard/shopify', group: 'shopify' },
  { label: 'チャネル', href: '/dashboard/ga4/channels', group: 'ga4' },
  { label: '商品', href: '/dashboard/ga4/products', group: 'ga4' },
  { label: '顧客', href: '/dashboard/ga4/customers', group: 'ga4' },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop') ?? '';
  const [gaConnected, setGaConnected] = useState(false);
  const authFetch = useAuthFetch();

  useEffect(() => {
    if (!shop) return;
    authFetch(`/api/ga/property?shop=${encodeURIComponent(shop)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.connected && data.propertyId) setGaConnected(true);
      })
      .catch(() => {});
  }, [shop, authFetch]);

  return (
    <nav className="w-56 bg-white border-r border-gray-200 min-h-screen p-4 shrink-0">
      <h1 className="text-lg font-bold text-gray-800 mb-1">Metrify</h1>
      <p className="text-xs text-gray-400 mb-6 truncate">{shop}</p>

      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Shopify
        </p>
        {navItems
          .filter((item) => item.group === 'shopify')
          .map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={`${item.href}?shop=${encodeURIComponent(shop)}`}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Google Analytics
        </p>
        {navItems
          .filter((item) => item.group === 'ga4')
          .map((item) => {
            const active = pathname === item.href;
            if (!gaConnected) {
              return (
                <span
                  key={item.href}
                  className="block px-3 py-2 rounded-lg text-sm text-gray-300 cursor-not-allowed"
                >
                  {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={`${item.href}?shop=${encodeURIComponent(shop)}`}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
