import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../services/supabase', () => ({
	supabase: {
		auth: {
			signOut: jest.fn(),
			getSession: jest.fn(),
			refreshSession: jest.fn(),
			signInWithPassword: jest.fn(),
			signUp: jest.fn(),
			resetPasswordForEmail: jest.fn(),
			resend: jest.fn(),
			getUser: jest.fn(),
			onAuthStateChange: jest.fn(),
		},
	},
}));

jest.mock('../../services/googleAuth', () => ({
	googleAuthService: {
		configure: jest.fn().mockResolvedValue(undefined),
		signInWithGoogle: jest.fn(),
		handleGoogleCallback: jest.fn(),
		linkGoogleAccount: jest.fn(),
		unlinkGoogleAccount: jest.fn(),
		isGoogleLinked: jest.fn(),
		getGoogleUserInfo: jest.fn(),
	},
}));

jest.mock('../../services/migrationManager', () => ({
	migrationManager: {
		startProfileMigration: jest.fn(),
	},
}));

jest.mock('../../services/DataBridge', () => ({
	dataBridge: {
		setUserId: jest.fn(),
		hasGuestDataForMigration: jest.fn().mockResolvedValue(false),
	},
}));

import { authService } from '../../services/auth';
import { dataBridge } from '../../services/DataBridge';
import { supabase } from '../../services/supabase';

const mockedSupabase = supabase as unknown as {
	auth: {
		signOut: jest.Mock;
		getSession: jest.Mock;
		refreshSession: jest.Mock;
	};
};

const mockedAsyncStorage = AsyncStorage as unknown as {
	getItem: jest.Mock;
	setItem: jest.Mock;
	removeItem: jest.Mock;
};

beforeEach(async () => {
	jest.clearAllMocks();
	mockedSupabase.auth.signOut.mockResolvedValue({ error: null });
	mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
	mockedSupabase.auth.refreshSession.mockResolvedValue({ data: { session: null }, error: null });
	mockedAsyncStorage.getItem.mockResolvedValue(null);
	mockedAsyncStorage.setItem.mockResolvedValue(undefined);
	mockedAsyncStorage.removeItem.mockResolvedValue(undefined);

	await authService.logout();
	jest.clearAllMocks();
});

describe('auth session lifecycle', () => {
	// The AsyncStorage cache now holds ONLY the display AuthUser under the
	// `auth_user_cache` key (tokens live in Supabase's SecureStore adapter).
	// restoreSession() reads the cache for fast display, then revalidateSession()
	// re-reads it (since the cache path doesn't set this.currentSession), so we
	// mock getItem with a stable mockResolvedValue (not Once) for the cases that
	// exercise revalidateSession.
	const cachedUserPayload = (email: string) =>
		JSON.stringify({
			id: 'user-123',
			email,
			isEmailVerified: false,
			lastLoginAt: '2026-03-01T00:00:00.000Z',
			createdAt: '2026-03-01T00:00:00.000Z',
		});

	it('returns a valid cached session immediately without waiting on Supabase', async () => {
		mockedAsyncStorage.getItem.mockResolvedValue(cachedUserPayload('cached@example.com'));

		const result = await authService.restoreSession();

		expect(result.success).toBe(true);
		expect(result.source).toBe('cache');
		expect(result.user?.email).toBe('cached@example.com');
		expect(mockedSupabase.auth.getSession).not.toHaveBeenCalled();
		expect(mockedSupabase.auth.refreshSession).not.toHaveBeenCalled();
		expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
		expect(dataBridge.setUserId).toHaveBeenCalledWith('user-123');
		expect(authService.getCurrentUser()?.email).toBe('cached@example.com');
	});

	it('revalidates a cached session against Supabase and persists newer server data', async () => {
		mockedAsyncStorage.getItem.mockResolvedValue(cachedUserPayload('cached@example.com'));

		await authService.restoreSession();
		jest.clearAllMocks();
		// revalidateSession re-reads the cache; keep it returning the cached user.
		mockedAsyncStorage.getItem.mockResolvedValue(cachedUserPayload('cached@example.com'));

		mockedSupabase.auth.getSession.mockResolvedValueOnce({
			data: {
				session: {
					user: {
						id: 'user-123',
						email: 'server@example.com',
						email_confirmed_at: '2026-03-19T00:00:00.000Z',
					},
					access_token: 'server-token',
					refresh_token: 'server-refresh',
					expires_at: Math.floor(Date.now() / 1000) + 7200,
				},
			},
			error: null,
		});

		const result = await authService.revalidateSession();

		expect(result.success).toBe(true);
		expect(result.source).toBe('server');
		expect(result.user?.email).toBe('server@example.com');
		// Only the display AuthUser is persisted to AsyncStorage — tokens are
		// owned by Supabase's SecureStore adapter, NOT duplicated here.
		const setItemCall = mockedAsyncStorage.setItem.mock.calls.find(
			([key]) => key === 'auth_user_cache',
		);
		expect(setItemCall?.[0]).toBe('auth_user_cache');
		expect(setItemCall?.[1]).toEqual(expect.stringContaining('server@example.com'));
		// Tokens must NOT be persisted to the AsyncStorage cache.
		expect(setItemCall?.[1]).toEqual(expect.not.stringContaining('server-token'));
		expect(setItemCall?.[1]).toEqual(expect.not.stringContaining('server-refresh'));
		expect(authService.getCurrentUser()?.email).toBe('server@example.com');
	});

	it('clears a stale cached session when Supabase can no longer validate it', async () => {
		mockedAsyncStorage.getItem.mockResolvedValue(cachedUserPayload('cached@example.com'));

		mockedSupabase.auth.getSession.mockResolvedValueOnce({
			data: { session: null },
			error: null,
		});

		mockedSupabase.auth.refreshSession.mockResolvedValueOnce({
			data: { session: null },
			error: new Error('revoked'),
		});

		await authService.restoreSession();
		jest.clearAllMocks();
		mockedAsyncStorage.getItem.mockResolvedValue(cachedUserPayload('cached@example.com'));

		const result = await authService.revalidateSession();

		expect(result.success).toBe(false);
		expect(result.error).toBe('Stored session is no longer valid');
		// 'revoked' is a genuine auth failure (not a network blip), so the
		// session is cleared — removeItem called with the current cache key.
		expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('auth_user_cache');
		expect(dataBridge.setUserId).toHaveBeenCalledWith(null);
		expect(authService.getCurrentSession()).toBeNull();
	});

	it('keeps the cached session on a transient network error instead of force-logging-out', async () => {
		mockedAsyncStorage.getItem.mockResolvedValue(cachedUserPayload('cached@example.com'));

		mockedSupabase.auth.getSession.mockResolvedValueOnce({
			data: { session: null },
			error: null,
		});

		// A transport fault (TypeError "Failed to fetch") is retryable — the
		// refresh token is still valid, the user should NOT be signed out.
		mockedSupabase.auth.refreshSession.mockRejectedValueOnce(
			new TypeError('Failed to fetch'),
		);

		await authService.restoreSession();
		jest.clearAllMocks();
		mockedAsyncStorage.getItem.mockResolvedValue(cachedUserPayload('cached@example.com'));

		const result = await authService.revalidateSession();

		expect(result.success).toBe(false);
		expect(result.isNetworkError).toBe(true);
		// CRITICAL: a network blip must NOT clear the local session.
		expect(mockedAsyncStorage.removeItem).not.toHaveBeenCalled();
		expect(dataBridge.setUserId).not.toHaveBeenCalledWith(null);
	});

	it('clears local auth state on logout even when the remote sign-out fails', async () => {
		mockedAsyncStorage.getItem.mockResolvedValue(cachedUserPayload('logout@example.com'));

		mockedSupabase.auth.getSession.mockResolvedValueOnce({
			data: {
				session: {
					user: {
						id: 'user-123',
						email: 'logout@example.com',
						email_confirmed_at: '2026-03-19T00:00:00.000Z',
					},
					access_token: 'session-token',
					refresh_token: 'session-refresh',
					expires_at: Math.floor(Date.now() / 1000) + 3600,
				},
			},
			error: null,
		});

		await authService.restoreSession();
		jest.clearAllMocks();
		mockedAsyncStorage.getItem.mockResolvedValue(cachedUserPayload('logout@example.com'));

		mockedSupabase.auth.signOut.mockResolvedValueOnce({ error: new Error('network down') });

		const result = await authService.logout();

		expect(result.success).toBe(true);
		expect(mockedSupabase.auth.signOut).toHaveBeenCalled();
		expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('auth_user_cache');
		expect(dataBridge.setUserId).toHaveBeenCalledWith(null);
		expect(authService.getCurrentSession()).toBeNull();
	});
});
