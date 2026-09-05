import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getPeriodStart } from './usageTracker';

describe('getPeriodStart — timezone-aware daily/monthly boundaries', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('falls back to UTC when no timezone is given (existing behavior preserved)', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-05T23:30:00.000Z'));
		expect(getPeriodStart('daily')).toBe('2026-09-05');
		expect(getPeriodStart('monthly')).toBe('2026-09-01');
	});

	it('computes the LOCAL calendar date for a timezone ahead of UTC — the exact bug this fixes', () => {
		// 23:30 UTC on Sep 5 is already 05:00 IST (UTC+5:30) on Sep 6 — a real
		// user in India whose "daily" reset should follow THEIR midnight, not
		// UTC's, must see Sep 6 here even though UTC still reads Sep 5.
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-05T23:30:00.000Z'));
		expect(getPeriodStart('daily', 'Asia/Kolkata')).toBe('2026-09-06');
		expect(getPeriodStart('daily')).toBe('2026-09-05'); // UTC unaffected
	});

	it('computes the LOCAL calendar date for a timezone behind UTC', () => {
		// 02:00 UTC on Sep 5 is still 18:00 on Sep 4 in Los Angeles (UTC-8).
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-05T02:00:00.000Z'));
		expect(getPeriodStart('daily', 'America/Los_Angeles')).toBe('2026-09-04');
		expect(getPeriodStart('daily')).toBe('2026-09-05'); // UTC unaffected
	});

	it('rolls the MONTH boundary correctly in a local timezone even when UTC has not crossed it yet', () => {
		// 23:30 UTC on Aug 31 is already 05:00 IST on Sep 1.
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-31T23:30:00.000Z'));
		expect(getPeriodStart('monthly', 'Asia/Kolkata')).toBe('2026-09-01');
		expect(getPeriodStart('monthly')).toBe('2026-08-01'); // UTC unaffected
	});

	it('falls back to UTC (never throws) for an invalid/malformed timezone string', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-05T12:00:00.000Z'));
		expect(() => getPeriodStart('daily', 'Not/A_Real_Timezone')).not.toThrow();
		expect(getPeriodStart('daily', 'Not/A_Real_Timezone')).toBe('2026-09-05');
	});
});
