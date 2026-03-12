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
import DashboardGrid from '../components/DashboardGrid';
import PeriodSelector from '../components/PeriodSelector';
import SummaryCard from '../components/SummaryCard';

type OrderNode = {
  id: string;
  name: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
};

type SalesPoint = { date: string; sales: number };

const defaultLayouts = {
  lg: [
    { i: 'revenue', x: 0, y: 0, w: 3, h: 2 },
    { i: 'orders-count', x: 3, y: 0, w: 3, h: 2 },
    { i: 'sales-chart', x: 0, y: 2, w: 12, h: 4 },
    { i: 'orders-table', x: 0, y: 6, w: 12, h: 5 },
  ],
  md: [
    { i: 'revenue', x: 0, y: 0, w: 4, h: 2 },
    { i: 'orders-count', x: 4, y: 0, w: 4, h: 2 },
    { i: 'sales-chart', x: 0, y: 2, w: 8, h: 4 },
    { i: 'orders-table', x: 0, y: 6, w: 8, h: 5 },
  ],
  sm: [
    { i: 'revenue', x: 0, y: 0, w: 2, h: 2 },
    { i: 'orders-count', x: 2, y: 0, w: 2, h: 2 },
    { i: 'sales-chart', x: 0, y: 2, w: 4, h: 4 },
    { i: 'orders-table', x: 0, y: 6, w: 4, h: 5 },
  ],
};

const SalesTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border rounded shadow">
        <p>{`日付: ${label}`}</p>
        <p>{`売上: ${Number(payload[0].value).toLocaleString()} USD`}</p>
      </div>
    );
  }
  return null;
};

export default function ShopifyClient({ shop }: { shop: string }) {
  const [orders, setOrders] = useState<OrderNode[]>([]);
  const [salesData, setSalesData] = useState<SalesPoint[]>([]);
  const [salesCurrency, setSalesCurrency] = useState('USD');
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Shopify</h2>
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      <DashboardGrid pageKey="shopify" defaultLayouts={defaultLayouts}>
        <div key="revenue">
          <div className="drag-handle cursor-move h-full">
            <SummaryCard
              title="売上合計"
              value={totalRevenue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              unit={currency}
              loading={ordersLoading}
            />
          </div>
        </div>

        <div key="orders-count">
          <div className="drag-handle cursor-move h-full">
            <SummaryCard
              title="注文件数"
              value={orders.length}
              unit="件"
              loading={ordersLoading}
            />
          </div>
        </div>

        <div key="sales-chart">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
            <div className="drag-handle cursor-move mb-4">
              <h3 className="text-base font-semibold text-gray-700">
                売上推移（過去{period === 'daily' ? '30日' : '12ヶ月'}）
              </h3>
            </div>
            {salesLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-400">
                読み込み中...
              </div>
            ) : salesError ? (
              <div className="h-48 flex items-center justify-center text-red-400">
                {salesError}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
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
                  <Tooltip content={<SalesTooltip />} />
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
        </div>

        <div key="orders-table">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
            <div className="drag-handle cursor-move px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-700">注文一覧</h3>
            </div>
            {ordersLoading ? (
              <p className="p-6 text-gray-400">読み込み中...</p>
            ) : ordersError ? (
              <p className="p-6 text-red-500">{ordersError}</p>
            ) : orders.length === 0 ? (
              <p className="p-6 text-gray-500">注文がありません</p>
            ) : (
              <div className="overflow-auto max-h-80">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0">
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
              </div>
            )}
          </div>
        </div>
      </DashboardGrid>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { style: string; label: string }> = {
    PAID: { style: 'bg-green-100 text-green-700', label: '支払済' },
    PENDING: { style: 'bg-yellow-100 text-yellow-700', label: '保留中' },
    REFUNDED: { style: 'bg-gray-100 text-gray-600', label: '返金済' },
    PARTIALLY_REFUNDED: { style: 'bg-orange-100 text-orange-700', label: '一部返金' },
    FULFILLED: { style: 'bg-blue-100 text-blue-700', label: '配送済' },
    UNFULFILLED: { style: 'bg-red-100 text-red-700', label: '未配送' },
    PARTIALLY_FULFILLED: { style: 'bg-orange-100 text-orange-700', label: '一部配送' },
    IN_PROGRESS: { style: 'bg-purple-100 text-purple-700', label: '処理中' },
  };
  const { style, label } = map[status] ?? { style: 'bg-gray-100 text-gray-600', label: status };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
