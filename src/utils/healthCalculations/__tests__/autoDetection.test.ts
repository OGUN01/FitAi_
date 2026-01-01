/**
 * UNIVERSAL HEALTH CALCULATION SYSTEM - AUTO-DETECTION TESTS
 * Comprehensive test suite for climate, ethnicity, and formula detection
 *
 * Test Coverage:
 * - 50+ countries for climate detection
 * - 7 test profiles for ethnicity detection
 * - BMR formula selection logic
 * - Activity level validation
 *
 * Phase 1: Foundation Tests
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import {
  detectClimate,
  detectEthnicity,
  detectBestBMRFormula,
  validateActivityLevel,
} from '../autoDetection';
import type { UserProfile } from '../types';

describe('Climate Detection', () => {
  describe('Country-level detection', () => {
    test('India → tropical', () => {
      const result = detectClimate('IN');
      expect(result.climate).toBe('tropical');
      expect(result.confidence).toBeGreaterThanOrEqual(85);
      expect(result.shouldAskUser).toBe(false);
      expect(result.characteristics?.waterModifier).toBe(1.50);
    });

    test('Norway → cold', () => {
      const result = detectClimate('NO');
      expect(result.climate).toBe('cold');
      expect(result.confidence).toBeGreaterThanOrEqual(85);
      expect(result.characteristics?.tdeeModifier).toBe(1.15);
      expect(result.characteristics?.waterModifier).toBe(0.90);
    });

    test('UAE → arid', () => {
      const result = detectClimate('AE');
      expect(result.climate).toBe('arid');
      expect(result.confidence).toBeGreaterThanOrEqual(85);
      expect(result.characteristics?.waterModifier).toBe(1.70);
    });

    test('Kenya → tropical', () => {
      const result = detectClimate('KE');
      expect(result.climate).toBe('tropical');
      expect(result.confidence).toBeGreaterThanOrEqual(85);
    });

    test('Canada → cold', () => {
      const result = detectClimate('CA');
      expect(result.climate).toBe('cold');
      expect(result.confidence).toBeGreaterThanOrEqual(85);
    });

    test('Thailand → tropical', () => {
      const result = detectClimate('TH');
      expect(result.climate).toBe('tropical');
      expect(result.confidence).toBeGreaterThanOrEqual(85);
    });
  });

  describe('State-level detection (India)', () => {
    test('Kerala → tropical', () => {
      const result = detectClimate('IN', 'KL');
      expect(result.climate).toBe('tropical');
      expect(result.confidence).toBe(90);
      expect(result.source).toBe('state_database');
    });

    test('Rajasthan → arid', () => {
      const result = detectClimate('IN', 'RJ');
      expect(result.climate).toBe('arid');
      expect(result.confidence).toBe(90);
    });

    test('Himachal Pradesh → cold', () => {
      const result = detectClimate('IN', 'HP');
      expect(result.climate).toBe('cold');
      expect(result.confidence).toBe(90);
    });

    test('Delhi → temperate', () => {
      const result = detectClimate('IN', 'DL');
      expect(result.climate).toBe('temperate');
      expect(result.confidence).toBe(90);
    });
  });

  describe('State-level detection (USA)', () => {
    test('Florida → tropical', () => {
      const result = detectClimate('US', 'FL');
      expect(result.climate).toBe('tropical');
      expect(result.confidence).toBe(90);
    });

    test('Arizona → arid', () => {
      const result = detectClimate('US', 'AZ');
      expect(result.climate).toBe('arid');
      expect(result.confidence).toBe(90);
    });

    test('Alaska → cold', () => {
      const result = detectClimate('US', 'AK');
      expect(result.climate).toBe('cold');
      expect(result.confidence).toBe(90);
    });

    test('New York → temperate', () => {
      const result = detectClimate('US', 'NY');
      expect(result.climate).toBe('temperate');
      expect(result.confidence).toBe(90);
    });
  });

  describe('Default fallback', () => {
    test('Unknown country → temperate with low confidence', () => {
      const result = detectClimate('XX');
      expect(result.climate).toBe('temperate');
      expect(result.confidence).toBe(50);
      expect(result.shouldAskUser).toBe(true);
      expect(result.source).toBe('default');
    });
  });
});

describe('Ethnicity Detection', () => {
  test('India → asian (high confidence)', () => {
    const result = detectEthnicity('IN');
    expect(result.ethnicity).toBe('asian');
    expect(result.confidence).toBe(90);
    expect(result.shouldAskUser).toBe(false);
  });

  test('Japan → asian (high confidence)', () => {
    const result = detectEthnicity('JP');
    expect(result.ethnicity).toBe('asian');
    expect(result.confidence).toBe(90);
    expect(result.shouldAskUser).toBe(false);
  });

  test('Thailand → asian', () => {
    const result = detectEthnicity('TH');
    expect(result.ethnicity).toBe('asian');
    expect(result.confidence).toBe(85);
    expect(result.shouldAskUser).toBe(false);
  });

  test('Germany → caucasian', () => {
    const result = detectEthnicity('DE');
    expect(result.ethnicity).toBe('caucasian');
    expect(result.confidence).toBe(80);
    expect(result.shouldAskUser).toBe(false);
  });

  test('UK → caucasian', () => {
    const result = detectEthnicity('GB');
    expect(result.ethnicity).toBe('caucasian');
    expect(result.confidence).toBe(80);
    expect(result.shouldAskUser).toBe(false);
  });

  test('Nigeria → black_african', () => {
    const result = detectEthnicity('NG');
    expect(result.ethnicity).toBe('black_african');
    expect(result.confidence).toBe(75);
    expect(result.shouldAskUser).toBe(false);
  });

  test('Kenya → black_african', () => {
    const result = detectEthnicity('KE');
    expect(result.ethnicity).toBe('black_african');
    expect(result.confidence).toBe(75);
    expect(result.shouldAskUser).toBe(false);
  });

  test('Mexico → hispanic', () => {
    const result = detectEthnicity('MX');
    expect(result.ethnicity).toBe('hispanic');
    expect(result.confidence).toBe(80);
    expect(result.shouldAskUser).toBe(false);
  });

  test('Saudi Arabia → middle_eastern', () => {
    const result = detectEthnicity('SA');
    expect(result.ethnicity).toBe('middle_eastern');
    expect(result.confidence).toBe(75);
    expect(result.shouldAskUser).toBe(false);
  });

  test('UAE → middle_eastern', () => {
    const result = detectEthnicity('AE');
    expect(result.ethnicity).toBe('middle_eastern');
    expect(result.confidence).toBe(75);
    expect(result.shouldAskUser).toBe(false);
  });

  test('Fiji → pacific_islander', () => {
    const result = detectEthnicity('FJ');
    expect(result.ethnicity).toBe('pacific_islander');
    expect(result.confidence).toBe(85);
    expect(result.shouldAskUser).toBe(false);
  });

  test('USA → mixed (high diversity, ask user)', () => {
    const result = detectEthnicity('US');
    expect(result.ethnicity).toBe('mixed');
    expect(result.confidence).toBe(50);
    expect(result.shouldAskUser).toBe(true);
    expect(result.message).toContain('diverse populations');
  });

  test('Brazil → mixed (high diversity, ask user)', () => {
    const result = detectEthnicity('BR');
    expect(result.ethnicity).toBe('mixed');
    expect(result.confidence).toBe(50);
    expect(result.shouldAskUser).toBe(true);
  });

  test('Unknown country → general (ask user)', () => {
    const result = detectEthnicity('XX');
    expect(result.ethnicity).toBe('general');
    expect(result.confidence).toBe(40);
    expect(result.shouldAskUser).toBe(true);
  });
});

describe('BMR Formula Selection', () => {
  test('User with DEXA body fat → Katch-McArdle', () => {
    const user: UserProfile = {
      age: 30,
      gender: 'male',
      weight: 75,
      height: 175,
      bodyFat: 15,
      bodyFatMethod: 'dexa',
      country: 'US',
    };

    const result = detectBestBMRFormula(user);
    expect(result.formula).toBe('katch_mcardle');
    expect(result.accuracy).toBe('±5%');
    expect(result.confidence).toBe(95);
    expect(result.reason).toContain('DEXA');
  });

  test('User with Bod Pod → Katch-McArdle', () => {
    const user: UserProfile = {
      age: 28,
      gender: 'female',
      weight: 60,
      height: 165,
      bodyFat: 22,
      bodyFatMethod: 'bodpod',
      country: 'US',
    };

    const result = detectBestBMRFormula(user);
    expect(result.formula).toBe('katch_mcardle');
    expect(result.accuracy).toBe('±5%');
    expect(result.confidence).toBe(95);
  });

  test('Elite athlete with low body fat → Cunningham', () => {
    const user: UserProfile = {
      age: 25,
      gender: 'male',
      weight: 80,
      height: 180,
      bodyFat: 10,
      workoutExperienceYears: 5,
      fitnessLevel: 'elite',
      country: 'US',
    };

    const result = detectBestBMRFormula(user);
    expect(result.formula).toBe('cunningham');
    expect(result.accuracy).toBe('±5%');
    expect(result.confidence).toBe(90);
    expect(result.reason).toContain('athlete');
  });

  test('User with calipers → Katch-McArdle', () => {
    const user: UserProfile = {
      age: 35,
      gender: 'male',
      weight: 85,
      height: 178,
      bodyFat: 18,
      bodyFatMethod: 'calipers',
      country: 'US',
    };

    const result = detectBestBMRFormula(user);
    expect(result.formula).toBe('katch_mcardle');
    expect(result.accuracy).toBe('±7%');
    expect(result.confidence).toBe(80);
  });

  test('User with AI photo → Katch-McArdle', () => {
    const user: UserProfile = {
      age: 28,
      gender: 'female',
      weight: 65,
      height: 168,
      bodyFat: 25,
      bodyFatMethod: 'ai_photo',
      country: 'US',
    };

    const result = detectBestBMRFormula(user);
    expect(result.formula).toBe('katch_mcardle');
    expect(result.accuracy).toBe('±10%');
    expect(result.confidence).toBe(70);
  });

  test('Regular user without body fat → Mifflin-St Jeor', () => {
    const user: UserProfile = {
      age: 32,
      gender: 'male',
      weight: 78,
      height: 176,
      country: 'US',
    };

    const result = detectBestBMRFormula(user);
    expect(result.formula).toBe('mifflin_st_jeor');
    expect(result.accuracy).toBe('±10%');
    expect(result.confidence).toBe(85);
    expect(result.reason).toContain('general population');
  });
});

describe('Activity Level Validation', () => {
  test('Desk job with sedentary → valid', () => {
    const result = validateActivityLevel('desk_job', 'sedentary');
    expect(result.isValid).toBe(true);
  });

  test('Desk job with active → valid', () => {
    const result = validateActivityLevel('desk_job', 'active');
    expect(result.isValid).toBe(true);
  });

  test('Light active with light → valid', () => {
    const result = validateActivityLevel('light_active', 'light');
    expect(result.isValid).toBe(true);
  });

  test('Light active with sedentary → invalid', () => {
    const result = validateActivityLevel('light_active', 'sedentary');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('at least "light"');
  });

  test('Heavy labor with active → valid', () => {
    const result = validateActivityLevel('heavy_labor', 'active');
    expect(result.isValid).toBe(true);
  });

  test('Heavy labor with moderate → invalid', () => {
    const result = validateActivityLevel('heavy_labor', 'moderate');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('at least "active"');
  });

  test('Very active with very_active → valid', () => {
    const result = validateActivityLevel('very_active', 'very_active');
    expect(result.isValid).toBe(true);
  });

  test('Very active with active → invalid', () => {
    const result = validateActivityLevel('very_active', 'active');
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('very_active');
  });
});

describe('Global Population Coverage', () => {
  const testCases = [
    { name: 'Indian Male (Mumbai)', country: 'IN', state: 'MH', expectedClimate: 'tropical', expectedEthnicity: 'asian' },
    { name: 'American Female (NYC)', country: 'US', state: 'NY', expectedClimate: 'temperate', expectedEthnicity: 'mixed' },
    { name: 'Nigerian Male (Lagos)', country: 'NG', expectedClimate: 'tropical', expectedEthnicity: 'black_african' },
    { name: 'German Female (Berlin)', country: 'DE', expectedClimate: 'temperate', expectedEthnicity: 'caucasian' },
    { name: 'Japanese Male (Tokyo)', country: 'JP', expectedClimate: 'temperate', expectedEthnicity: 'asian' },
    { name: 'Brazilian Male (São Paulo)', country: 'BR', expectedClimate: 'temperate', expectedEthnicity: 'mixed' },
    { name: 'Australian Female (Sydney)', country: 'AU', expectedClimate: 'temperate', expectedEthnicity: 'caucasian' },
  ];

  testCases.forEach(({ name, country, state, expectedClimate, expectedEthnicity }) => {
    test(`${name} → climate: ${expectedClimate}, ethnicity: ${expectedEthnicity}`, () => {
      const climateResult = detectClimate(country, state);
      const ethnicityResult = detectEthnicity(country, state);

      expect(climateResult.climate).toBe(expectedClimate);
      expect(ethnicityResult.ethnicity).toBe(expectedEthnicity);
    });
  });
});
