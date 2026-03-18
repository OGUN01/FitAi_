'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/lib/supabase/client';

const TITLES: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/config':        'App Config',
  '/plans':         'Subscription Plans',
  '/users':         'Users',
  '/analytics':     'Analytics',
  '/cache':         'Cache Management',
  '/contributions': 'Food Contributions',
  '/webhooks':      'Webhook Logs',
  '/admins':        'Admin Users',
};

export default function Header({ user }: { user: User }) {
  const path = usePathname();
  const router = useRouter();
  const title = Object.entries(TITLES).find(([k]) => path.startsWith(k))?.[1] ?? 'Admin';

  async function handleSignOut() {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 px-6 flex items-center justify-between">
      <h1 className="font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">{user.email}</span>
        <button
          onClick={handleSignOut}
          className="text-gray-400 hover:text-white transition-colors"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
