export async function adminFetch<T>(
  path: string,
  options: RequestInit,
  accessToken: string,
): Promise<T> {
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
    throw new Error(err.error?.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}
