'use client';

import { useState } from 'react';
import { useAuthFetch } from '@/lib/use-auth-fetch';

export default function GA4SettingsPanel({
  shop,
  ga4PropertyId,
}: {
  shop: string;
  ga4PropertyId: string | null;
}) {
  const [propertyIdInput, setPropertyIdInput] = useState(
    ga4PropertyId?.replace('properties/', '') ?? ''
  );
  const [propertySaving, setPropertySaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const authFetch = useAuthFetch();

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
      const res = await authFetch(
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
      setPropertySaving(false);
    }
  };

  const handleDisconnectGA4 = async () => {
    if (!confirm('GA4接続を解除しますか？')) return;
    setDisconnecting(true);
    try {
      const res = await authFetch(
        `/api/ga/property?shop=${encodeURIComponent(shop)}`,
        { method: 'DELETE' }
      );
      if (res.ok) window.location.reload();
    } catch {
      // ignore
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {showSettings ? '閉じる' : '設定'}
      </button>

      {showSettings && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">GA4設定</h3>

          <div className="mb-4">
            <label className="block text-sm text-gray-500 mb-1">プロパティID</label>
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
                {propertySaving ? '保存中...' : '変更'}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <button
              onClick={handleConnectGA4}
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              別のGoogleアカウントで再接続
            </button>
            <button
              onClick={handleDisconnectGA4}
              disabled={disconnecting}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {disconnecting ? '解除中...' : '接続を解除'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
