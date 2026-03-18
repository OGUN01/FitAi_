'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminSession } from '@/lib/auth/guard';
import { adminFetch } from '@/lib/workers/client';
import DataTable from '@/components/shared/DataTable';
import type { UserListItem } from '@/types/admin';

export default function UsersPage() {
  const { accessToken } = useAdminSession();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    adminFetch<{ success: boolean; data: { users: UserListItem[]; total: number } }>(
      `/api/admin/users?${params}`, {}, accessToken
    ).then(r => {
      setUsers(r.data.users);
      setTotal(r.data.total);
    }).catch(e => setError(e.message));
  }, [accessToken, page, search]);

  const TIER_COLOR: Record<string, string> = {
    free: 'text-gray-400',
    basic: 'text-blue-400',
    pro: 'text-yellow-400',
  };

  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search by email…"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
      />
      <DataTable<UserListItem>
        keyField="id"
        data={users}
        columns={[
          { key: 'email', header: 'Email' },
          {
            key: 'tier', header: 'Tier',
            render: u => <span className={`font-medium capitalize ${TIER_COLOR[u.tier]}`}>{u.tier}</span>,
          },
          {
            key: 'confirmed', header: 'Confirmed',
            render: u => <span className={u.confirmed ? 'text-green-400' : 'text-red-400'}>{u.confirmed ? 'Yes' : 'No'}</span>,
          },
          {
            key: 'created_at', header: 'Joined',
            render: u => new Date(u.created_at).toLocaleDateString(),
          },
          {
            key: 'id', header: '',
            render: u => <Link href={`/users/${u.id}`} className="text-blue-400 hover:text-blue-300 text-xs">View →</Link>,
          },
        ]}
      />
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span>{total} total users</span>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="disabled:opacity-40">← Prev</button>
        <span>Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={users.length < 20} className="disabled:opacity-40">Next →</button>
      </div>
    </div>
  );
}
