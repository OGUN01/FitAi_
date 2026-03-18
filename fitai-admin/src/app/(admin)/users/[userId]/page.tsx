'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAdminSession } from '@/lib/auth/guard';
import { adminFetch } from '@/lib/workers/client';
import type { SubscriptionRow } from '@/types/admin';

interface UserDetail {
  user: { id: string; email: string; created_at: string; last_sign_in_at: string | null; app_metadata: Record<string, unknown> };
  profile: Record<string, unknown> | null;
  subscriptions: SubscriptionRow[];
  usageHistory: Array<{ feature_key: string; period_type: string; usage_count: number; period_start: string }>;
}

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { accessToken } = useAdminSession();
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideTier, setOverrideTier] = useState('pro');
  const [overrideNote, setOverrideNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken || !userId) return;
    adminFetch<{ success: boolean; data: UserDetail }>(`/api/admin/users/${userId}`, {}, accessToken)
      .then(r => setDetail(r.data))
      .catch(e => setError(e.message));
  }, [accessToken, userId]);

  async function handleOverride() {
    if (!accessToken) return;
    try {
      await adminFetch(`/api/admin/users/${userId}/subscription`, {
        method: 'POST',
        body: JSON.stringify({ tier: overrideTier, note: overrideNote }),
      }, accessToken);
      setShowOverride(false);
      // Refresh
      const r = await adminFetch<{ success: boolean; data: UserDetail }>(`/api/admin/users/${userId}`, {}, accessToken);
      setDetail(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Override failed');
    }
  }

  if (error) return <div className="text-red-400">{error}</div>;
  if (!detail) return <div className="text-gray-400">Loading…</div>;

  const activeSub = detail.subscriptions.find(s => s.status === 'active');

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-3">User Info</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-400">Email:</span> <span className="text-white">{detail.user.email}</span></div>
          <div><span className="text-gray-400">ID:</span> <span className="text-gray-400 font-mono text-xs">{detail.user.id}</span></div>
          <div><span className="text-gray-400">Joined:</span> <span className="text-white">{new Date(detail.user.created_at).toLocaleDateString()}</span></div>
          <div><span className="text-gray-400">Current Tier:</span> <span className="text-yellow-400 capitalize font-medium">{activeSub?.tier ?? 'free'}</span></div>
        </div>
        <button
          onClick={() => setShowOverride(true)}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          Override Subscription
        </button>
      </div>

      {showOverride && (
        <div className="bg-gray-900 border border-blue-700 rounded-xl p-5 space-y-3">
          <h3 className="font-medium text-white">Manual Subscription Override</h3>
          <div className="flex gap-3">
            <select
              value={overrideTier}
              onChange={e => setOverrideTier(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
            </select>
            <input
              placeholder="Note (optional)"
              value={overrideNote}
              onChange={e => setOverrideNote(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleOverride} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">Apply</button>
            <button onClick={() => setShowOverride(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-3">Subscription History</h2>
        {detail.subscriptions.length === 0 ? (
          <p className="text-gray-500 text-sm">No subscriptions</p>
        ) : (
          <div className="space-y-2">
            {detail.subscriptions.map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-800/50">
                <span className="capitalize text-gray-300">{s.tier} — {s.billing_cycle ?? '—'}</span>
                <span className={s.status === 'active' ? 'text-green-400' : 'text-gray-500'}>{s.status}</span>
                <span className="text-gray-500 text-xs">{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
