/**
 * Regression test for a real production bug found via Playwright testing of
 * Workout Engine v2 (2026-09-04): suggest-day (and every other builder-AI
 * endpoint) failed with `KV GET failed: 414 ... exceeds key length limit of
 * 512` once Phase 6A's volumeLandmarkContext/mesocycleContext were folded
 * into the cache fingerprint — the old `generateCacheKey` just base64-
 * encoded the full param string (which EXPANDS length, ~33%), so any
 * sufficiently rich request blew past Cloudflare KV's 512-byte key limit.
 * Fixed by hashing to a fixed-length SHA-256 hex digest instead.
 */
import { describe, it, expect } from 'vitest';
import { generateCacheKey } from './cache';

describe('generateCacheKey', () => {
  it('returns a short, fixed-length key regardless of a large params payload', async () => {
    // Simulate the real-world shape that triggered the bug: a rich
    // volumeLandmarkContext array + mesocycleContext object + profile +
    // plan fingerprint, all folded into one cache-key params object.
    const bigParams: Record<string, unknown> = {
      profile: { age: 28, gender: 'male', fitnessGoal: 'muscle_gain', experienceLevel: 'intermediate' },
      volumeLandmarkContext: Array.from({ length: 15 }, (_, i) => ({
        muscle: `muscle_group_number_${i}`,
        currentSets: i,
        mev: 8,
        mav: 16,
        mrv: 22,
        zone: 'mav_to_mrv',
      })),
      mesocycleContext: { weekInBlock: 3, isDeloadWeek: false, targetRir: 2, volumeMultiplier: 1.1 },
      dayIndex: 2,
      goals: ['muscle_gain', 'strength'],
    };

    const key = await generateCacheKey('workout', bigParams);

    // The actual bug: this length must stay comfortably under Cloudflare
    // KV's 512-byte key limit no matter how much context is added.
    expect(key.length).toBeLessThan(200);
    expect(key.startsWith('workout:')).toBe(true);
  });

  it('is deterministic — same params always produce the same key', async () => {
    const params = { a: 1, b: 'two', c: [3, 1, 2] };
    const key1 = await generateCacheKey('meal', params);
    const key2 = await generateCacheKey('meal', params);
    expect(key1).toBe(key2);
  });

  it('is insensitive to object key order (still deterministic)', async () => {
    const key1 = await generateCacheKey('workout', { a: 1, b: 2 });
    const key2 = await generateCacheKey('workout', { b: 2, a: 1 });
    expect(key1).toBe(key2);
  });

  it('produces different keys for different params', async () => {
    const key1 = await generateCacheKey('workout', { dayIndex: 1 });
    const key2 = await generateCacheKey('workout', { dayIndex: 2 });
    expect(key1).not.toBe(key2);
  });

  it('produces different keys for different cache types with identical params', async () => {
    const params = { dayIndex: 1 };
    const workoutKey = await generateCacheKey('workout', params);
    const mealKey = await generateCacheKey('meal', params);
    expect(workoutKey).not.toBe(mealKey);
  });
});
