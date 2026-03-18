'use client';

import { LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LineChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  color?: string;
  label?: string;
}

export default function LineChart({ data, xKey, yKey, color = '#3b82f6', label }: LineChartProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      {label && <p className="text-sm text-gray-400 mb-4">{label}</p>}
      <ResponsiveContainer width="100%" height={200}>
        <ReLineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey={xKey} tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#d1d5db' }}
            itemStyle={{ color: color }}
          />
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={false} />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  );
}
