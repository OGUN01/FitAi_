'use client';

import { useEffect, useState } from 'react';
import { useAdminSession } from '@/lib/auth/guard';
import { adminFetch } from '@/lib/workers/client';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import type { AdminUser } from '@/types/admin';

export default function AdminsPage() {
  const { user, accessToken } = useAdminSession();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    if (!accessToken) return;
    adminFetch<{ success: boolean; data: AdminUser[] }>('/api/admin/admins', {}, accessToken)
      .then(r => setAdmins(r.data))
      .catch(e => setError(e.message));
  }

  useEffect(() => { load(); }, [accessToken]);

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    await adminFetch('/api/admin/admins', {
      method: 'POST',
      body: JSON.stringify({ email: newEmail, display_name: newName }),
    }, accessToken).catch(e => setError(e.message));
    setNewEmail('');
    setNewName('');
    load();
  }

  async function removeAdmin(userId: string) {
    if (!accessToken) return;
    await adminFetch(`/api/admin/admins/${userId}`, { method: 'DELETE', body: '' }, accessToken)
      .catch(e => setError(e.message));
    setRemoving(null);
    load();
  }

  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 bg-gray-900/50">
          <span className="text-sm font-semibold text-gray-300">Admin Users</span>
        </div>
        <div className="divide-y divide-gray-800">
          {admins.map(a => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-white">{a.display_name ?? a.email}</p>
                <p className="text-xs text-gray-500">{a.email}</p>
              </div>
              {a.user_id !== user?.id && (
                <button
                  onClick={() => setRemoving(a.user_id)}
                  className="text-red-400 hover:text-red-300 text-xs transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {admins.length === 0 && (
            <p className="text-gray-500 text-sm px-5 py-4">No admins found</p>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Add Admin</h3>
        <form onSubmit={addAdmin} className="flex gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            required
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <input
            placeholder="Display name (optional)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            Add
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={removing !== null}
        title="Remove Admin"
        message="This will revoke admin access. The user will need to sign out and back in for the change to take effect."
        confirmLabel="Remove"
        onConfirm={() => removing && removeAdmin(removing)}
        onCancel={() => setRemoving(null)}
        danger
      />
    </div>
  );
}
