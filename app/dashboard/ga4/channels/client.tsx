'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import DashboardGrid from '../../components/DashboardGrid';
import PeriodSelector from '../../components/PeriodSelector';
import SummaryCard from '../../components/SummaryCard';
import GA4SettingsPanel from '../../components/GA4SettingsPanel';

type GAData = {
  traffic: { date: string; pageViews: number; sessions: number; users: number }[];
  channels: { channel: string; sessions: number; users: number }[];
  ecommerce: { date: string; purchases: number; revenue: number }[];
  totals: {
    pageViews: number;
    sessions: number;
    users: number;
    revenue: number;
    purchases: number;
    conversionRate: number;
  };
};

const defaultLayouts = {
  lg: [
    { i: 'pv', x: 0, y: 0, w: 4, h: 2 },
    { i: 'sessions', x: 4, y: 0, w: 4, h: 2 },
    { i: 'users', x: 8, y: 0, w: 4, h: 2 },
    { i: 'traffic-chart', x: 0, y: 2, w: 12, h: 4 },
    { i: 'channels-table', x: 0, y: 6, w: 12, h: 5 },
    { i: 'ga-revenue', x: 0, y: 11, w: 4, h: 2 },
    { i: 'purchases', x: 4, y: 11, w: 4, h: 2 },
    { i: 'cvr', x: 8, y: 11, w: 4, h: 2 },
  ],
  md: [
    { i: 'pv', x: 0, y: 0, w: 4, h: 2 },
    { i: 'sessions', x: 4, y: 0, w: 4, h: 2 },
    { i: 'users', x: 0, y: 2, w: 4, h: 2 },
    { i: 'traffic-chart', x: 0, y: 4, w: 8, h: 4 },
    { i: 'channels-table', x: 0, y: 8, w: 8, h: 5 },
    { i: 'ga-revenue', x: 0, y: 13, w: 4, h: 2 },
    { i: 'purchases', x: 4, y: 13, w: 4, h: 2 },
    { i: 'cvr', x: 0, y: 15, w: 4, h: 2 },
  ],
  sm: [
    { i: 'pv', x: 0, y: 0, w: 4, h: 2 },
    { i: 'sessions', x: 0, y: 2, w: 4, h: 2 },
    { i: 'users', x: 0, y: 4, w: 4, h: 2 },
    { i: 'traffic-chart', x: 0, y: 6, w: 4, h: 4 },
    { i: 'channels-table', x: 0, y: 10, w: 4, h: 5 },
    { i: 'ga-revenue', x: 0, y: 15, w: 4, h: 2 },
    { i: 'purchases', x: 0, y: 17, w: 4, h: 2 },
    { i: 'cvr', x: 0, y: 19, w: 4, h: 2 },
  ],
};

export default function ChannelsClient({
  shop,
  ga4PropertyId,
}: {
  shop: string;
  ga4PropertyId: string;
}) {
  const [gaData, setGaData] = useState<GAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/ga/data?shop=${encodeURIComponent(shop)}&period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setGaData(data);
      })
      .catch((err) => setError(`GA4データの取得に失敗しました: ${err.message}`))
      .finally(() => setLoading(false));
  }, [shop, period]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">チャネル</h2>
        <div className="flex items-center gap-4">
          <PeriodSelector period={period} onChange={setPeriod} />
          <GA4SettingsPanel shop={shop} ga4PropertyId={ga4PropertyId} />
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm">GA4データを読み込み中...</p>}

      {error && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {gaData && (
        <DashboardGrid pageKey="ga4-channels" defaultLayouts={defaultLayouts}>
          <div key="pv">
            <div className="drag-handle cursor-move h-full">
              <SummaryCard title="ページビュー" value={gaData.totals.pageViews.toLocaleString()} />
            </div>
          </div>
          <div key="sessions">
            <div className="drag-handle cursor-move h-full">
              <SummaryCard title="セッション" value={gaData.totals.sessions.toLocaleString()} />
            </div>
          </div>
          <div key="users">
            <div className="drag-handle cursor-move h-full">
              <SummaryCard title="ユーザー" value={gaData.totals.users.toLocaleString()} />
            </div>
          </div>

          <div key="traffic-chart">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
              <div className="drag-handle cursor-move mb-4">
                <h3 className="text-base font-semibold text-gray-700">
                  トラフィック推移（過去{period === 'daily' ? '30日' : '12ヶ月'}）
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={gaData.traffic} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => period === 'monthly' ? d : d.slice(5)}
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    interval={period === 'daily' ? 4 : 0}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} width={56} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="pageViews" stroke="#2563eb" strokeWidth={2} dot={false} name="PV" />
                  <Line type="monotone" dataKey="sessions" stroke="#16a34a" strokeWidth={2} dot={false} name="セッション" />
                  <Line type="monotone" dataKey="users" stroke="#d97706" strokeWidth={2} dot={false} name="ユーザー" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div key="channels-table">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
              <div className="drag-handle cursor-move px-6 py-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-700">チャネル別トラフィック</h3>
              </div>
              <div className="overflow-auto max-h-80">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">チャネル</th>
                      <th className="px-6 py-3 text-right font-medium">セッション</th>
                      <th className="px-6 py-3 text-right font-medium">ユーザー</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {gaData.channels.map((ch) => (
                      <tr key={ch.channel} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-800">{ch.channel}</td>
                        <td className="px-6 py-4 text-right text-gray-700">{ch.sessions.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-gray-700">{ch.users.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div key="ga-revenue">
            <div className="drag-handle cursor-move h-full">
              <SummaryCard
                title="GA4売上"
                value={gaData.totals.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              />
            </div>
          </div>
          <div key="purchases">
            <div className="drag-handle cursor-move h-full">
              <SummaryCard title="購入件数" value={gaData.totals.purchases.toLocaleString()} />
            </div>
          </div>
          <div key="cvr">
            <div className="drag-handle cursor-move h-full">
              <SummaryCard title="コンバージョン率" value={gaData.totals.conversionRate} unit="%" />
            </div>
          </div>
        </DashboardGrid>
      )}
    </div>
  );
}
