import { Suspense } from 'react';
import DashboardNav from './components/DashboardNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Suspense fallback={<nav className="w-56 bg-white border-r border-gray-200 min-h-screen p-4 shrink-0" />}>
        <DashboardNav />
      </Suspense>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
