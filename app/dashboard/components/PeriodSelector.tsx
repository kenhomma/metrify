'use client';

export default function PeriodSelector({
  period,
  onChange,
}: {
  period: 'daily' | 'monthly';
  onChange: (p: 'daily' | 'monthly') => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onChange('daily')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          period === 'daily'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        日次
      </button>
      <button
        onClick={() => onChange('monthly')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          period === 'monthly'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        月次
      </button>
    </div>
  );
}
