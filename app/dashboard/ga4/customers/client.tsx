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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import DashboardGrid from '../../components/DashboardGrid';
import PeriodSelector from '../../components/PeriodSelector';
import SummaryCard from '../../components/SummaryCard';
import GA4SettingsPanel from '../../components/GA4SettingsPanel';

type CustomerData = {
  newVsReturning: { type: string; sessions: number; users: number }[];
  countries: { country: string; users: number; sessions: number }[];
  devices: { device: string; sessions: number; users: number }[];
  totals: { users: number; sessions: number };
};

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];

const defaultLayouts = {
  lg: [
    { i: 'total-users', x: 0, y: 0, w: 6, h: 2 },
    { i: 'total-sessions', x: 6, y: 0, w: 6, h: 2 },
    { i: 'new-vs-returning', x: 0, y: 2, w: 6, h: 4 },
    { i: 'devices', x: 6, y: 2, w: 6, h: 4 },
    { i: 'countries-table', x: 0, y: 6, w: 12, h: 5 },
  ],
  md: [
    { i: 'total-users', x: 0, y: 0, w: 4, h: 2 },
    { i: 'total-sessions', x: 4, y: 0, w: 4, h: 2 },
    { i: 'new-vs-returning', x: 0, y: 2, w: 4, h: 4 },
    { i: 'devices', x: 4, y: 2, w: 4, h: 4 },
    { i: 'countries-table', x: 0, y: 6, w: 8, h: 5 },
  ],
  sm: [
    { i: 'total-users', x: 0, y: 0, w: 4, h: 2 },
    { i: 'total-sessions', x: 0, y: 2, w: 4, h: 2 },
    { i: 'new-vs-returning', x: 0, y: 4, w: 4, h: 4 },
    { i: 'devices', x: 0, y: 8, w: 4, h: 4 },
    { i: 'countries-table', x: 0, y: 12, w: 4, h: 5 },
  ],
};

const typeLabels: Record<string, string> = {
  new: '新規',
  returning: 'リピーター',
};

const deviceLabels: Record<string, string> = {
  desktop: 'デスクトップ',
  mobile: 'モバイル',
  tablet: 'タブレット',
};

export default function CustomersClient({
  shop,
  ga4PropertyId,
}: {
  shop: string;
  ga4PropertyId: string;
}) {
  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/ga/data/customers?shop=${encodeURIComponent(shop)}&period=${period}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((err) => setError(`データの取得に失敗しました: ${err.message}`))
      .finally(() => setLoading(false));
  }, [shop, period]);

  const pieData = data?.newVsReturning.map((r) => ({
    name: typeLabels[r.type] ?? r.type,
    value: r.users,
  })) ?? [];

  const deviceData = data?.devices.map((d) => ({
    ...d,
    label: deviceLabels[d.device] ?? d.device,
  })) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">顧客</h2>
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
        <DashboardGrid pageKey="ga4-customers" defaultLayouts={defaultLayouts}>
          <div key="total-users">
            <div className="drag-handle cursor-move h-full">
              <SummaryCard title="ユーザー" value={data.totals.users.toLocaleString()} />
            </div>
          </div>
          <div key="total-sessions">
            <div className="drag-handle cursor-move h-full">
              <SummaryCard title="セッション" value={data.totals.sessions.toLocaleString()} />
            </div>
          </div>

          <div key="new-vs-returning">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
              <div className="drag-handle cursor-move mb-4">
                <h3 className="text-base font-semibold text-gray-700">新規 vs リピーター</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div key="devices">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
              <div className="drag-handle cursor-move mb-4">
                <h3 className="text-base font-semibold text-gray-700">デバイス別セッション</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deviceData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} width={56} />
                  <Tooltip />
                  <Bar dataKey="sessions" fill="#2563eb" name="セッション" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div key="countries-table">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
              <div className="drag-handle cursor-move px-6 py-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-700">国別ユーザー</h3>
              </div>
              <div className="overflow-auto max-h-80">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">国</th>
                      <th className="px-6 py-3 text-right font-medium">ユーザー</th>
                      <th className="px-6 py-3 text-right font-medium">セッション</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.countries.map((c) => (
                      <tr key={c.country} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-800">{c.country}</td>
                        <td className="px-6 py-4 text-right text-gray-700">{c.users.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-gray-700">{c.sessions.toLocaleString()}</td>
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
