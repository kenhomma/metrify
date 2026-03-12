'use client';

import { useState } from 'react';

export default function GA4ConnectPrompt({
  shop,
  gaConnected,
  ga4PropertyId,
}: {
  shop: string;
  gaConnected: boolean;
  ga4PropertyId: string | null;
}) {
  const [propertyIdInput, setPropertyIdInput] = useState('');
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      const res = await fetch(
        `/api/ga/property?shop=${encodeURIComponent(shop)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId: propertyIdInput.trim() }),
        }
      );
      if (res.ok) window.location.reload();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!gaConnected) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Google Analytics</h2>
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
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Google Analytics</h2>
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
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}
