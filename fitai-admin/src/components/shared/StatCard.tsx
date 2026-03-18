interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export default function StatCard({ label, value, sub, color = 'blue' }: StatCardProps) {
  const accent = {
    blue:   'text-blue-400',
    green:  'text-green-400',
    yellow: 'text-yellow-400',
    red:    'text-red-400',
  }[color];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
