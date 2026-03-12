'use client';

export default function SummaryCard({
  title,
  value,
  unit,
  loading,
}: {
  title: string;
  value: string | number;
  unit?: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : (
        <p className="text-2xl font-bold text-gray-800">
          {value}
          {unit && (
            <span className="text-base font-normal text-gray-500 ml-1">{unit}</span>
          )}
        </p>
      )}
    </div>
  );
}
