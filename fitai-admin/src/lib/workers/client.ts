export async function adminFetch<T>(
  path: string,
  options: RequestInit,
  accessToken: string,
): Promise<T> {
  if (!accessToken) {
    throw new Error('Missing admin session. Please sign in again.');
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_WORKERS_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    if (res.status === 401 || res.status === 403) {
      throw new Error(err.error?.message ?? 'Your admin session expired. Please sign in again.');
    }
    throw new Error(err.error?.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function verifyAdminSession(accessToken: string): Promise<void> {
  await adminFetch('/api/admin/session', { method: 'GET' }, accessToken);
}
