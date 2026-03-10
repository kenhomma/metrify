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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border rounded shadow">
        <p>{`日付: ${label}`}</p>
        <p>{`売上: ${Number(payload[0].value).toLocaleString()} USD`}</p>
      </div>
    )
  }
  return null
}

type OrderNode = {
  id: string;
  name: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
};

type SalesPoint = { date: string; sales: number };

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

export default function DashboardClient({
  shop,
  gaConnected,
  ga4PropertyId,
}: {
  shop: string;
  gaConnected: boolean;
  ga4PropertyId: string | null;
}) {
  const [orders, setOrders] = useState<OrderNode[]>([]);
  const [salesData, setSalesData] = useState<SalesPoint[]>([]);
  const [salesCurrency, setSalesCurrency] = useState('USD');
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);

  // GA4 state
  const [gaData, setGaData] = useState<GAData | null>(null);
  const [gaLoading, setGaLoading] = useState(false);
  const [gaError, setGaError] = useState<string | null>(null);
  const [propertyIdInput, setPropertyIdInput] = useState(ga4PropertyId?.replace('properties/', '') ?? '');
  const [showPropertyForm, setShowPropertyForm] = useState(!ga4PropertyId && gaConnected);
  const [propertySaving, setPropertySaving] = useState(false);

  // 注文データ取得
  useEffect(() => {
    fetch(`/api/orders?shop=${encodeURIComponent(shop)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setOrdersError(data.error);
        else setOrders((data.orders?.edges ?? []).map((e: { node: OrderNode }) => e.node));
      })
      .catch(() => setOrdersError('注文データの取得に失敗しました'))
      .finally(() => setOrdersLoading(false));
  }, [shop]);

  // 売上グラフデータ取得
  useEffect(() => {
    setSalesLoading(true);
    setSalesError(null);
    fetch(`/api/analytics/sales?shop=${encodeURIComponent(shop)}&period=${period}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.error) setSalesError(res.error);
        else {
          setSalesData(res.data ?? []);
          setSalesCurrency(res.currency ?? 'USD');
        }
      })
      .catch(() => setSalesError('グラフデータの取得に失敗しました'))
      .finally(() => setSalesLoading(false));
  }, [shop, period]);

  // GA4データ取得
  useEffect(() => {
    if (!gaConnected || !ga4PropertyId) return;
    setGaLoading(true);
    setGaError(null);
    fetch(`/api/ga/data?shop=${encodeURIComponent(shop)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setGaError(data.error);
        else setGaData(data);
      })
      .catch(() => setGaError('GA4データの取得に失敗しました'))
      .finally(() => setGaLoading(false));
  }, [shop, gaConnected, ga4PropertyId]);

  const totalRevenue = orders.reduce(
    (sum, o) => sum + parseFloat(o.totalPriceSet.shopMoney.amount),
    0
  );
  const currency = orders[0]?.totalPriceSet.shopMoney.currencyCode ?? 'USD';

  const formatDate = (date: string) => {
    if (period === 'monthly') return date.slice(0, 7);
    const [, m, d] = date.split('-');
    return `${m}/${d}`;
  };

  const handleConnectGA4 = () => {
    const w = 600;
    const h = 700;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    window.open(
      `/api/ga/auth?shop=${encodeURIComponent(shop)}`,
      'ga4-oauth',
      `width=${w},height=${h},left=${left},top=${top}`
    );
  };

  const handleSavePropertyId = async () => {
    if (!propertyIdInput.trim()) return;
    setPropertySaving(true);
    try {
      const res = await fetch(`/api/ga/property?shop=${encodeURIComponent(shop)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: propertyIdInput.trim() }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      // ignore
    } finally {
      setPropertySaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-1">{shop}</p>
      </div>

      {/* Shopify サマリーカード */}
      <div className="grid grid-cols-2 gap-4 mb-8 max-w-lg">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">売上合計</p>
          {ordersLoading ? (
            <p className="text-gray-400 text-sm">読み込み中...</p>
          ) : (
            <p className="text-2xl font-bold text-gray-800">
              {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-base font-normal text-gray-500">{currency}</span>
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">注文件数</p>
          {ordersLoading ? (
            <p className="text-gray-400 text-sm">読み込み中...</p>
          ) : (
            <p className="text-2xl font-bold text-gray-800">
              {orders.length}{' '}
              <span className="text-base font-normal text-gray-500">件</span>
            </p>
          )}
        </div>
      </div>

      {/* 売上グラフ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-700">
            売上推移（過去{period === 'daily' ? '30日' : '12ヶ月'}）
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                period === 'daily'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              日次
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                period === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              月次
            </button>
          </div>
        </div>

        {salesLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            読み込み中...
          </div>
        ) : salesError ? (
          <div className="h-64 flex items-center justify-center text-red-400">
            {salesError}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={salesData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                interval={period === 'daily' ? 4 : 0}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={(v) => `${v}`}
                width={56}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 注文一覧テーブル */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-700">注文一覧</h2>
        </div>
        {ordersLoading ? (
          <p className="p-6 text-gray-400">読み込み中...</p>
        ) : ordersError ? (
          <p className="p-6 text-red-500">{ordersError}</p>
        ) : orders.length === 0 ? (
          <p className="p-6 text-gray-500">注文がありません</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left font-medium">注文番号</th>
                <th className="px-6 py-3 text-left font-medium">金額</th>
                <th className="px-6 py-3 text-left font-medium">日付</th>
                <th className="px-6 py-3 text-left font-medium">支払い</th>
                <th className="px-6 py-3 text-left font-medium">配送</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => {
                const { amount, currencyCode } = order.totalPriceSet.shopMoney;
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{order.name}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {parseFloat(amount).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      {currencyCode}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {new Date(order.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.displayFinancialStatus} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.displayFulfillmentStatus} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ========== GA4セクション ========== */}
      <div className="border-t border-gray-200 pt-8 mt-4">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Google Analytics</h2>

        {/* GA4未接続 */}
        {!gaConnected && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-4">
              GA4アカウントを接続して、トラフィックやコンバージョンデータを表示します。
            </p>
            <button
              onClick={handleConnectGA4}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              GA4アカウントを接続
            </button>
          </div>
        )}

        {/* プロパティID入力 */}
        {gaConnected && showPropertyForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-4">
              GA4のプロパティIDを入力してください（GA4管理画面 → プロパティ設定で確認できます）
            </p>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={propertyIdInput}
                onChange={(e) => setPropertyIdInput(e.target.value)}
                placeholder="123456789"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSavePropertyId}
                disabled={propertySaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {propertySaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        )}

        {/* GA4ローディング */}
        {gaConnected && ga4PropertyId && gaLoading && (
          <p className="text-gray-400 text-sm">GA4データを読み込み中...</p>
        )}

        {/* GA4エラー */}
        {gaConnected && ga4PropertyId && gaError && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <p className="text-red-500 text-sm">{gaError}</p>
          </div>
        )}

        {/* GA4データ表示 */}
        {gaData && (
          <>
            {/* トラフィックサマリー */}
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">ページビュー</p>
                <p className="text-2xl font-bold text-gray-800">
                  {gaData.totals.pageViews.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">セッション</p>
                <p className="text-2xl font-bold text-gray-800">
                  {gaData.totals.sessions.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">ユーザー</p>
                <p className="text-2xl font-bold text-gray-800">
                  {gaData.totals.users.toLocaleString()}
                </p>
              </div>
            </div>

            {/* トラフィック推移グラフ */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-base font-semibold text-gray-700 mb-4">
                トラフィック推移（過去30日）
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={gaData.traffic} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => d.slice(5)}
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    interval={4}
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

            {/* チャネル別テーブル */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-700">チャネル別トラフィック</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
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

            {/* eコマースサマリー */}
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">GA4売上</p>
                <p className="text-2xl font-bold text-gray-800">
                  {gaData.totals.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">購入件数</p>
                <p className="text-2xl font-bold text-gray-800">
                  {gaData.totals.purchases.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">コンバージョン率</p>
                <p className="text-2xl font-bold text-gray-800">
                  {gaData.totals.conversionRate}
                  <span className="text-base font-normal text-gray-500">%</span>
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { style: string; label: string }> = {
    PAID:                 { style: 'bg-green-100 text-green-700',  label: '支払済' },
    PENDING:              { style: 'bg-yellow-100 text-yellow-700', label: '保留中' },
    REFUNDED:             { style: 'bg-gray-100 text-gray-600',    label: '返金済' },
    PARTIALLY_REFUNDED:   { style: 'bg-orange-100 text-orange-700', label: '一部返金' },
    FULFILLED:            { style: 'bg-blue-100 text-blue-700',    label: '配送済' },
    UNFULFILLED:          { style: 'bg-red-100 text-red-700',      label: '未配送' },
    PARTIALLY_FULFILLED:  { style: 'bg-orange-100 text-orange-700', label: '一部配送' },
    IN_PROGRESS:          { style: 'bg-purple-100 text-purple-700', label: '処理中' },
  };
  const { style, label } = map[status] ?? { style: 'bg-gray-100 text-gray-600', label: status };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
