'use client';

import { useEffect, useState } from 'react';
import { useAdminSession } from '@/lib/auth/guard';
import { adminFetch } from '@/lib/workers/client';
import LineChart from '@/components/charts/LineChart';

export default function AnalyticsPage() {
  const { accessToken } = useAdminSession();
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState('ai_calls');
  const [data, setData] = useState<unknown[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    adminFetch<{ success: boolean; data: unknown[] }>(
      `/api/admin/analytics?days=${days}&metric=${metric}`, {}, accessToken
    ).then(r => setData(r.data)).catch(e => setError(e.message));
  }, [accessToken, days, metric]);

  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <select
          value={metric}
          onChange={e => setMetric(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
        >
          <option value="ai_calls">AI Calls</option>
          <option value="dau">Daily Active Users</option>
          <option value="revenue">Revenue</option>
        </select>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      <LineChart
        data={data as Array<Record<string, unknown>>}
        xKey="period_start"
        yKey="usage_count"
        label={`${metric.replace(/_/g, ' ')} — last ${days} days`}
      />
    </div>
  );
}
