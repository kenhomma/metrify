'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

const SHOP = 'metrify-test.myshopify.com';

type OrderNode = {
  id: string;
  name: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
};

type SalesPoint = { date: string; sales: number };

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderNode[]>([]);
  const [salesData, setSalesData] = useState<SalesPoint[]>([]);
  const [salesCurrency, setSalesCurrency] = useState('USD');
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders?shop=${SHOP}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setOrdersError(data.error);
        else setOrders((data.orders?.edges ?? []).map((e: { node: OrderNode }) => e.node));
      })
      .catch(() => setOrdersError('注文データの取得に失敗しました'))
      .finally(() => setOrdersLoading(false));
  }, []);

  useEffect(() => {
    setSalesLoading(true);
    setSalesError(null);
    fetch(`/api/analytics/sales?shop=${SHOP}&period=${period}`)
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
  }, [period]);

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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">ダッシュボード</h1>

      {/* サマリーカード */}
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
