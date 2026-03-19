'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '../supabase/client';
import type { User } from '@supabase/supabase-js';
import { verifyAdminSession } from '../workers/client';

export function useAdminSession() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseClient();
    let cancelled = false;

    const applySession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] | null) => {
      if (cancelled) return;

      if (!session) {
        setUser(null);
        setAccessToken(null);
        setLoading(false);
        router.replace('/login');
        return;
      }

      try {
        await verifyAdminSession(session.access_token);
      } catch {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        if (cancelled) return;
        setUser(null);
        setAccessToken(null);
        setLoading(false);
        router.replace('/login?error=access_denied');
        return;
      }

      setUser(session.user);
      setAccessToken(session.access_token);
      setLoading(false);
    };

    supabase.auth.getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setAccessToken(null);
        setLoading(false);
        router.replace('/login');
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;

      if (!session) {
        setUser(null);
        setAccessToken(null);
        setLoading(false);
        router.replace('/login');
        return;
      }

      try {
        await verifyAdminSession(session.access_token);
      } catch {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        if (cancelled) return;
        setUser(null);
        setAccessToken(null);
        setLoading(false);
        router.replace('/login?error=access_denied');
        return;
      }

      setUser(session.user);
      setAccessToken(session.access_token);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  return { user, accessToken, loading };
}
