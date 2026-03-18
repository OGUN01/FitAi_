'use client';

import { useEffect, useState } from 'react';
import { useAdminSession } from '@/lib/auth/guard';
import { adminFetch } from '@/lib/workers/client';
import type { FoodContribution } from '@/types/admin';

export default function ContributionsPage() {
  const { accessToken } = useAdminSession();
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState<FoodContribution[]>([]);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  async function load() {
    if (!accessToken) return;
    adminFetch<{ success: boolean; data: FoodContribution[] }>(
      `/api/admin/contributions?status=${status}`, {}, accessToken
    ).then(r => setItems(r.data)).catch(e => setError(e.message));
  }

  useEffect(() => { load(); }, [accessToken, status]);

  async function approve(id: string) {
    if (!accessToken) return;
    await adminFetch(`/api/admin/contributions/${id}/approve`, { method: 'POST', body: '{}' }, accessToken)
      .catch(e => setError(e.message));
    load();
  }

  async function reject(id: string) {
    if (!accessToken) return;
    await adminFetch(`/api/admin/contributions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: rejectReason }),
    }, accessToken).catch(e => setError(e.message));
    setRejectId(null);
    setRejectReason('');
    load();
  }

  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
              status === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-white">{item.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{new Date(item.created_at).toLocaleDateString()}</p>
            </div>
            {status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => approve(item.id)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg">Approve</button>
                <button onClick={() => setRejectId(item.id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg">Reject</button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-gray-500 text-sm">No {status} contributions</p>}
      </div>
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 space-y-3">
            <h3 className="font-semibold text-white">Rejection Reason</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRejectId(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
              <button onClick={() => reject(rejectId)} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
