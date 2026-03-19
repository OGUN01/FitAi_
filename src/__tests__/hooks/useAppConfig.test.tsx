import { renderHook, waitFor } from '@testing-library/react-native';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';

jest.mock('../../services/supabase', () => ({
	supabase: {
		from: jest.fn(),
	},
}));

import { supabase } from '../../services/supabase';
import { useAppConfig } from '../../hooks/useAppConfig';

const mockedSupabase = supabase as unknown as {
	from: jest.Mock;
};

function makeQueryMock(result: { data: Array<{ key: string; value: unknown }> | null; error: { message: string } | null }) {
	const chain = {
		select: jest.fn().mockReturnThis(),
		in: jest.fn().mockResolvedValue(result),
	};

	mockedSupabase.from.mockReturnValue(chain);
	return chain;
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('useAppConfig', () => {
	it('maps public app_config rows into feature, maintenance, and version flags', async () => {
		const chain = makeQueryMock({
			data: [
				{ key: 'maintenance_mode', value: 'true' },
				{ key: 'maintenance_message', value: 'Planned maintenance' },
				{ key: 'min_app_version', value: '2.3.0' },
				{ key: 'force_update_version', value: '2.4.0' },
				{ key: 'feature_ai_chat', value: 0 },
				{ key: 'feature_food_contributions', value: 'no' },
				{ key: 'feature_analytics', value: 1 },
			],
			error: null,
		});

		const { result } = renderHook(() => useAppConfig());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.error).toBeNull();
		expect(result.current.config).toEqual({
			maintenanceMode: true,
			maintenanceMessage: 'Planned maintenance',
			minAppVersion: '2.3.0',
			forceUpdateVersion: '2.4.0',
			featureAiChat: false,
			featureFoodContributions: false,
			featureAnalytics: true,
		});
		expect(mockedSupabase.from).toHaveBeenCalledWith('app_config');
		expect(chain.select).toHaveBeenCalledWith('key, value');
		expect(chain.in).toHaveBeenCalledWith('category', ['features', 'app', 'maintenance']);
	});

	it('keeps safe defaults and surfaces query errors', async () => {
		makeQueryMock({
			data: null,
			error: { message: 'db offline' },
		});

		const { result } = renderHook(() => useAppConfig());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.error).toBe('Failed to load app config');
		expect(result.current.config).toEqual({
			maintenanceMode: false,
			maintenanceMessage: 'Back soon!',
			minAppVersion: '1.0.0',
			forceUpdateVersion: '0.0.0',
			featureAiChat: false,
			featureFoodContributions: false,
			featureAnalytics: false,
		});
	});
});
