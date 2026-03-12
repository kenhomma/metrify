'use client';

import { useState, useCallback, ReactNode } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

export default function DashboardGrid({
  pageKey,
  defaultLayouts,
  children,
}: {
  pageKey: string;
  defaultLayouts: ResponsiveLayouts;
  children: ReactNode;
}) {
  const storageKey = `metrify-layout-${pageKey}`;
  const { width, containerRef, mounted } = useContainerWidth();

  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() => {
    if (typeof window === 'undefined') return defaultLayouts;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : defaultLayouts;
    } catch {
      return defaultLayouts;
    }
  });

  const handleLayoutChange = useCallback(
    (_: Layout, allLayouts: ResponsiveLayouts) => {
      setLayouts(allLayouts);
      try {
        localStorage.setItem(storageKey, JSON.stringify(allLayouts));
      } catch {
        // ignore
      }
    },
    [storageKey]
  );

  const handleReset = () => {
    setLayouts(defaultLayouts);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  return (
    <div ref={containerRef}>
      <div className="flex justify-end mb-2">
        <button
          onClick={handleReset}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          レイアウトをリセット
        </button>
      </div>
      {mounted && (
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768 }}
          cols={{ lg: 12, md: 8, sm: 4 }}
          rowHeight={80}
          width={width}
          onLayoutChange={handleLayoutChange}
          dragConfig={{ handle: '.drag-handle' }}
          resizeConfig={{ enabled: true }}
        >
          {children}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
