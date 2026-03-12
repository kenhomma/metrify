'use client';

import { useCallback } from 'react';

declare global {
  interface Window {
    shopify?: {
      idToken: () => Promise<string>;
    };
  }
}

/**
 * Returns a fetch function that automatically includes
 * the Shopify App Bridge session token as a Bearer token.
 */
export function useAuthFetch() {
  return useCallback(async (url: string, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);

    if (window.shopify?.idToken) {
      try {
        const token = await window.shopify.idToken();
        headers.set('Authorization', `Bearer ${token}`);
      } catch {
        // App Bridge not available (e.g. outside Shopify admin)
      }
    }

    return fetch(url, { ...init, headers });
  }, []);
}
