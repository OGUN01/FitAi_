'use client';

import { useEffect, useState } from 'react';
import { useAdminSession } from '@/lib/auth/guard';
import { adminFetch } from '@/lib/workers/client';
import StatCard from '@/components/shared/StatCard';
import type { DashboardStats } from '@/types/admin';

export default function DashboardPage() {
  const { accessToken } = useAdminSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    adminFetch<{ success: boolean; data: DashboardStats }>('/api/admin/dashboard', {}, accessToken)
      .then(r => setStats(r.data))
      .catch(e => setError(e.message));
  }, [accessToken]);

  if (error) return <div className="text-red-400">{error}</div>;
  if (!stats) return <div className="text-gray-400">Loading…</div>;

  const revenueInr = (stats.revenueInrPaisa / 100).toFixed(0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} color="blue" />
        <StatCard label="Pro Subscribers" value={stats.activeSubscriptions.pro} color="green" />
        <StatCard label="AI Calls Today" value={stats.aiCallsToday.toLocaleString()} color="yellow" />
        <StatCard label="Revenue MTD" value={`₹${Number(revenueInr).toLocaleString()}`} color="green" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Free Tier" value={stats.activeSubscriptions.free} />
        <StatCard label="Basic Tier" value={stats.activeSubscriptions.basic} />
        <StatCard
          label="Maintenance Mode"
          value={stats.maintenanceMode ? 'ON' : 'OFF'}
          color={stats.maintenanceMode ? 'red' : 'green'}
        />
      </div>
    </div>
  );
}
