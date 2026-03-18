'use client';

import { useEffect, useState } from 'react';
import { useAdminSession } from '@/lib/auth/guard';
import { adminFetch } from '@/lib/workers/client';
import type { WebhookEvent } from '@/types/admin';

export default function WebhooksPage() {
  const { accessToken } = useAdminSession();
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    const params = filter ? `?event_type=${filter}` : '';
    adminFetch<{ success: boolean; data: WebhookEvent[] }>(`/api/admin/webhooks${params}`, {}, accessToken)
      .then(r => setEvents(r.data))
      .catch(e => setError(e.message));
  }, [accessToken, filter]);

  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Filter by event type…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
      />
      <div className="space-y-2">
        {events.map(ev => (
          <div key={ev.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">{ev.event_type}</span>
                <span className="text-xs text-gray-500 font-mono">{ev.id.substring(0, 16)}…</span>
              </div>
              <span className="text-xs text-gray-500">{new Date(ev.processed_at).toLocaleString()}</span>
            </button>
            {expanded === ev.id && (
              <pre className="px-4 pb-4 text-xs text-gray-400 overflow-x-auto border-t border-gray-800">
                {JSON.stringify(ev.payload, null, 2)}
              </pre>
            )}
          </div>
        ))}
        {events.length === 0 && <p className="text-gray-500 text-sm">No webhook events</p>}
      </div>
    </div>
  );
}
