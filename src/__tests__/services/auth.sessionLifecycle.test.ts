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
	it('returns a valid cached session immediately without waiting on Supabase', async () => {
		mockedAsyncStorage.getItem.mockResolvedValueOnce(
			JSON.stringify({
				user: {
					id: 'user-123',
					email: 'cached@example.com',
					isEmailVerified: false,
					lastLoginAt: '2026-03-01T00:00:00.000Z',
				},
				accessToken: 'cached-token',
				refreshToken: 'cached-refresh',
				expiresAt: Math.floor(Date.now() / 1000) + 3600,
			}),
		);

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
		mockedAsyncStorage.getItem.mockResolvedValueOnce(
			JSON.stringify({
				user: {
					id: 'user-123',
					email: 'cached@example.com',
					isEmailVerified: false,
					lastLoginAt: '2026-03-01T00:00:00.000Z',
				},
				accessToken: 'cached-token',
				refreshToken: 'cached-refresh',
				expiresAt: Math.floor(Date.now() / 1000) + 3600,
			}),
		);

		await authService.restoreSession();
		jest.clearAllMocks();

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
		expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
			'auth_session',
			expect.stringContaining('server-token'),
		);
		expect(authService.getCurrentUser()?.email).toBe('server@example.com');
	});

	it('clears a stale cached session when Supabase can no longer validate it', async () => {
		mockedAsyncStorage.getItem.mockResolvedValueOnce(
			JSON.stringify({
				user: {
					id: 'user-123',
					email: 'cached@example.com',
					isEmailVerified: true,
					lastLoginAt: '2026-03-01T00:00:00.000Z',
				},
				accessToken: 'cached-token',
				refreshToken: 'cached-refresh',
				expiresAt: Math.floor(Date.now() / 1000) + 3600,
			}),
		);

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

		const result = await authService.revalidateSession();

		expect(result.success).toBe(false);
		expect(result.error).toBe('Stored session is no longer valid');
		expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('auth_session');
		expect(dataBridge.setUserId).toHaveBeenCalledWith(null);
		expect(authService.getCurrentSession()).toBeNull();
	});

	it('clears local auth state on logout even when the remote sign-out fails', async () => {
		mockedAsyncStorage.getItem.mockResolvedValueOnce(
			JSON.stringify({
				user: {
					id: 'user-123',
					email: 'logout@example.com',
					isEmailVerified: true,
					lastLoginAt: '2026-03-19T00:00:00.000Z',
				},
				accessToken: 'session-token',
				refreshToken: 'session-refresh',
				expiresAt: Math.floor(Date.now() / 1000) + 3600,
			}),
		);

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

		mockedSupabase.auth.signOut.mockResolvedValueOnce({ error: new Error('network down') });

		const result = await authService.logout();

		expect(result.success).toBe(true);
		expect(mockedSupabase.auth.signOut).toHaveBeenCalled();
		expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('auth_session');
		expect(dataBridge.setUserId).toHaveBeenCalledWith(null);
		expect(authService.getCurrentSession()).toBeNull();
	});
});
