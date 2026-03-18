'use client';

import { useEffect, useState } from 'react';
import { useAdminSession } from '@/lib/auth/guard';
import { adminFetch } from '@/lib/workers/client';
import type { AppConfigRow } from '@/types/admin';

export default function ConfigPage() {
  const { accessToken } = useAdminSession();
  const [grouped, setGrouped] = useState<Record<string, AppConfigRow[]>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    adminFetch<{ success: boolean; data: Record<string, AppConfigRow[]> }>(
      '/api/admin/config', {}, accessToken
    ).then(r => setGrouped(r.data)).catch(e => setError(e.message));
  }, [accessToken]);

  async function save(key: string) {
    if (!accessToken) return;
    setSaving(s => ({ ...s, [key]: true }));
    try {
      let value: unknown = editing[key];
      try { value = JSON.parse(editing[key]); } catch {}
      await adminFetch('/api/admin/config', {
        method: 'POST',
        body: JSON.stringify({ key, value }),
      }, accessToken);
      // Refresh
      const r = await adminFetch<{ success: boolean; data: Record<string, AppConfigRow[]> }>(
        '/api/admin/config', {}, accessToken
      );
      setGrouped(r.data);
      setEditing(e => { const n = { ...e }; delete n[key]; return n; });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  }

  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cat, rows]) => (
        <div key={cat} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 bg-gray-900/50">
            <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{cat}</span>
          </div>
          <div className="divide-y divide-gray-800">
            {rows.map(row => {
              const raw = editing[row.key] ?? JSON.stringify(row.value);
              const isEditing = row.key in editing;
              return (
                <div key={row.key} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{row.key}</p>
                    {row.description && <p className="text-xs text-gray-500 mt-0.5">{row.description}</p>}
                  </div>
                  <input
                    className="w-64 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={raw}
                    onChange={e => setEditing(ed => ({ ...ed, [row.key]: e.target.value }))}
                  />
                  {isEditing && (
                    <button
                      onClick={() => save(row.key)}
                      disabled={saving[row.key]}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                    >
                      {saving[row.key] ? 'Saving…' : 'Save'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
