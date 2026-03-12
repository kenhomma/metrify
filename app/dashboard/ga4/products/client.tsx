'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import DashboardGrid from '../../components/DashboardGrid';
import PeriodSelector from '../../components/PeriodSelector';
import SummaryCard from '../../components/SummaryCard';
import GA4SettingsPanel from '../../components/GA4SettingsPanel';

type Product = {
  name: string;
  revenue: number;
  purchased: number;
  viewed: number;
  addedToCart: number;
};

type ProductsData = {
  products: Product[];
  totals: {
    revenue: number;
    purchased: number;
    viewed: number;
  };
};

const defaultLayouts = {
  lg: [
    { i: 'revenue', x: 0, y: 0, w: 4, h: 2 },
    { i: 'purchased', x: 4, y: 0, w: 4, h: 2 },
    { i: 'viewed', x: 8, y: 0, w: 4, h: 2 },
    { i: 'top10-chart', x: 0, y: 2, w: 12, h: 5 },
    { i: 'products-table', x: 0, y: 7, w: 12, h: 6 },
  ],
  md: [
    { i: 'revenue', x: 0, y: 0, w: 4, h: 2 },
    { i: 'purchased', x: 4, y: 0, w: 4, h: 2 },
    { i: 'viewed', x: 0, y: 2, w: 4, h: 2 },
    { i: 'top10-chart', x: 0, y: 4, w: 8, h: 5 },
    { i: 'products-table', x: 0, y: 9, w: 8, h: 6 },
  ],
  sm: [
    { i: 'revenue', x: 0, y: 0, w: 4, h: 2 },
    { i: 'purchased', x: 0, y: 2, w: 4, h: 2 },
    { i: 'viewed', x: 0, y: 4, w: 4, h: 2 },
    { i: 'top10-chart', x: 0, y: 6, w: 4, h: 5 },
    { i: 'products-table', x: 0, y: 11, w: 4, h: 6 },
  ],
};

export default function ProductsClient({
  shop,
  ga4PropertyId,
}: {
  shop: string;
  ga4PropertyId: string;
}) {
  const [data, setData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/ga/data/products?shop=${encodeURIComponent(shop)}&period=${period}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((err) => setError(`データの取得に失敗しました: ${err.message}`))
      .finally(() => setLoading(false));
  }, [shop, period]);

  const top10 = data?.products.slice(0, 10) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">商品</h2>
        <div className="flex items-center gap-4">
          <PeriodSelector period={period} onChange={setPeriod} />
          <GA4SettingsPanel shop={shop} ga4PropertyId={ga4PropertyId} />
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm">データを読み込み中...</p>}
      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {data && (
        <DashboardGrid pageKey="ga4-products" defaultLayouts={defaultLayouts}>
          <div key="revenue">
            <div className="drag-handle cursor-move h-full">
              <SummaryCard
                title="商品売上合計"
                value={data.totals.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              />
            </div>
          </div>
          <div key="purchased">
            <div className="drag-handle cursor-move h-full">
              <SummaryCard title="購入数合計" value={data.totals.purchased.toLocaleString()} />
            </div>
          </div>
          <div key="viewed">
            <div className="drag-handle cursor-move h-full">
              <SummaryCard title="閲覧数合計" value={data.totals.viewed.toLocaleString()} />
            </div>
          </div>

          <div key="top10-chart">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
              <div className="drag-handle cursor-move mb-4">
                <h3 className="text-base font-semibold text-gray-700">売れ筋 Top 10</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={top10}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                  />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#2563eb" name="売上" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div key="products-table">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
              <div className="drag-handle cursor-move px-6 py-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-700">商品別パフォーマンス</h3>
              </div>
              <div className="overflow-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">商品名</th>
                      <th className="px-6 py-3 text-right font-medium">売上</th>
                      <th className="px-6 py-3 text-right font-medium">購入数</th>
                      <th className="px-6 py-3 text-right font-medium">閲覧数</th>
                      <th className="px-6 py-3 text-right font-medium">カート追加</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.products.map((p) => (
                      <tr key={p.name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-800">{p.name}</td>
                        <td className="px-6 py-4 text-right text-gray-700">
                          {p.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-700">{p.purchased.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-gray-700">{p.viewed.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-gray-700">{p.addedToCart.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DashboardGrid>
      )}
    </div>
  );
}
