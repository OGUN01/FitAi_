'use client';

import { useEffect, useState } from 'react';
import { useAdminSession } from '@/lib/auth/guard';
import { adminFetch } from '@/lib/workers/client';
import StatCard from '@/components/shared/StatCard';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

interface CacheStats {
  workout: { rows: number; topHitCount: number };
  meal: { rows: number; topHitCount: number };
}

export default function CachePage() {
  const { accessToken } = useAdminSession();
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [confirm, setConfirm] = useState<'workout' | 'meal' | 'all' | null>(null);
  const [error, setError] = useState('');

  async function load() {
    if (!accessToken) return;
    adminFetch<{ success: boolean; data: CacheStats }>('/api/admin/cache/stats', {}, accessToken)
      .then(r => setStats(r.data))
      .catch(e => setError(e.message));
  }

  useEffect(() => { load(); }, [accessToken]);

  async function handleClear(type: 'workout' | 'meal' | 'all') {
    if (!accessToken) return;
    await adminFetch('/api/admin/cache/clear', {
      method: 'POST',
      body: JSON.stringify({ type }),
    }, accessToken).catch(e => setError(e.message));
    setConfirm(null);
    load();
  }

  if (error) return <div className="text-red-400">{error}</div>;
  if (!stats) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Workout Cache Rows" value={stats.workout.rows} color="blue" />
        <StatCard label="Workout Top Hits" value={stats.workout.topHitCount} />
        <StatCard label="Meal Cache Rows" value={stats.meal.rows} color="blue" />
        <StatCard label="Meal Top Hits" value={stats.meal.topHitCount} />
      </div>
      <div className="flex gap-3">
        <button onClick={() => setConfirm('workout')} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm">Clear Workout Cache</button>
        <button onClick={() => setConfirm('meal')} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm">Clear Meal Cache</button>
        <button onClick={() => setConfirm('all')} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">Clear All</button>
      </div>
      <ConfirmDialog
        open={confirm !== null}
        title="Clear Cache"
        message={`Are you sure you want to clear the ${confirm} cache? This cannot be undone.`}
        confirmLabel="Clear"
        onConfirm={() => confirm && handleClear(confirm)}
        onCancel={() => setConfirm(null)}
        danger
      />
    </div>
  );
}
