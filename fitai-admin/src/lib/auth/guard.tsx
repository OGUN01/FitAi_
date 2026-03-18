'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '../supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAdminSession() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
        return;
      }
      const role = session.user.app_metadata?.role;
      if (role !== 'admin') {
        supabase.auth.signOut().then(() => router.replace('/login?error=access_denied'));
        return;
      }
      setUser(session.user);
      setAccessToken(session.access_token);
      setLoading(false);
    });
  }, [router]);

  return { user, accessToken, loading };
}
