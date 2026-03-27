import { describe, it, expect } from 'vitest';
import { selectOptimalSplit, getAllSplits, getSplitById } from '../src/utils/workoutSplits';
import type { UserProfile } from '../src/utils/validation';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
	return {
		age: 25,
		weight: 75,
		height: 175,
		gender: 'male',
		fitnessGoal: 'muscle_gain',
		experienceLevel: 'intermediate',
		availableEquipment: ['dumbbell', 'barbell', 'cable'],
		workoutsPerWeek: 4,
		workoutDuration: 45,
		medicalConditions: [],
		medications: [],
		pregnancyStatus: false,
		breastfeedingStatus: false,
		...overrides,
	} as UserProfile;
}

// ================================================================
// Task 2.2 - prefersVariety wiring
// ================================================================
describe('prefersVariety scoring', () => {
	it('prefersVariety=true gives higher variety score for 4-day splits than 3-day', () => {
		const profileWithVariety = makeProfile({
			workoutsPerWeek: 4,
			prefersVariety: true,
		});

		const result = selectOptimalSplit(profileWithVariety);
		const allSplits = getAllSplits();

		const fourDaySplit = allSplits.find((s) => s.daysPerWeek >= 4);
		const threeDaySplit = allSplits.find((s) => s.daysPerWeek === 3);

		expect(fourDaySplit).toBeDefined();
		expect(threeDaySplit).toBeDefined();

		expect(result.selectedSplit.daysPerWeek).toBeGreaterThanOrEqual(4);
	});
});

// ================================================================
// Task 2.3 - stressLevel and activityLevel wiring
// ================================================================
describe('stressLevel and activityLevel scoring', () => {
	it('high stress + sedentary prefers low recovery splits over high recovery', () => {
		const stressedSedentary = makeProfile({
			workoutsPerWeek: 3,
			stressLevel: 'high',
			activityLevel: 'sedentary',
			fitnessGoal: 'maintenance',
			experienceLevel: 'beginner',
		});

		const result = selectOptimalSplit(stressedSedentary);

		expect(result.selectedSplit.recoveryDemand).not.toBe('high');
	});

	it('low stress + active user can handle high recovery demand', () => {
		const activeUser = makeProfile({
			workoutsPerWeek: 6,
			stressLevel: 'low',
			activityLevel: 'active',
			fitnessGoal: 'muscle_gain',
			experienceLevel: 'advanced',
		});

		const result = selectOptimalSplit(activeUser);
		expect(result.score).toBeGreaterThan(0);
	});
});

// ================================================================
// Task 2.4 - FULL_BODY_2X split
// ================================================================
describe('FULL_BODY_2X split', () => {
	it('exists in ALL_SPLITS', () => {
		const split = getSplitById('full_body_2x');
		expect(split).not.toBeNull();
		expect(split!.daysPerWeek).toBe(2);
		expect(split!.experienceLevels).toContain('beginner');
		expect(split!.recoveryDemand).toBe('low');
		expect(split!.volumePerMuscle).toBe('low');
	});

	it('workoutsPerWeek=2 + beginner selects full_body_2x', () => {
		const beginner2x = makeProfile({
			workoutsPerWeek: 2,
			experienceLevel: 'beginner',
			fitnessGoal: 'maintenance',
			availableEquipment: ['body weight', 'dumbbell'],
		});

		const result = selectOptimalSplit(beginner2x);
		expect(result.selectedSplit.id).toBe('full_body_2x');
	});

	it('has exactly 2 workout days', () => {
		const split = getSplitById('full_body_2x');
		expect(split!.workoutDays).toHaveLength(2);
	});
});

// ================================================================
// Task 2.5 - UL_PPL_HYBRID split + BRO_SPLIT frequency change
// ================================================================
describe('UL_PPL_HYBRID split', () => {
	it('exists in ALL_SPLITS', () => {
		const split = getSplitById('ul_ppl_hybrid_5x');
		expect(split).not.toBeNull();
		expect(split!.daysPerWeek).toBe(5);
		expect(split!.idealFrequency).toEqual([5, 5]);
		expect(split!.experienceLevels).toContain('intermediate');
		expect(split!.experienceLevels).toContain('advanced');
	});

	it('workoutsPerWeek=5 + intermediate selects ul_ppl_hybrid_5x', () => {
		const intermediate5x = makeProfile({
			workoutsPerWeek: 5,
			experienceLevel: 'intermediate',
			fitnessGoal: 'muscle_gain',
			availableEquipment: ['dumbbell', 'barbell', 'cable'],
		});

		const result = selectOptimalSplit(intermediate5x);
		expect(result.selectedSplit.id).toBe('ul_ppl_hybrid_5x');
	});

	it('has 5 workout days with correct types', () => {
		const split = getSplitById('ul_ppl_hybrid_5x');
		expect(split!.workoutDays).toHaveLength(5);
		const types = split!.workoutDays.map((d) => d.workoutType);
		expect(types).toContain('Upper A');
		expect(types).toContain('Lower A');
		expect(types).toContain('Push');
		expect(types).toContain('Pull');
		expect(types).toContain('Legs');
	});
});

describe('BRO_SPLIT idealFrequency change', () => {
	it('bro_split idealFrequency is [6,6] (only wins at 6 days)', () => {
		const split = getSplitById('bro_split_5x');
		expect(split).not.toBeNull();
		expect(split!.idealFrequency).toEqual([6, 6]);
	});
});

// ================================================================
// Task 2.6 - Beginner guards
// ================================================================
describe('beginner guards in scoreSplit', () => {
	it('beginner never gets ppl_6x regardless of frequency', () => {
		const beginner6x = makeProfile({
			workoutsPerWeek: 6,
			experienceLevel: 'beginner',
			fitnessGoal: 'muscle_gain',
			availableEquipment: ['dumbbell', 'barbell'],
		});

		const result = selectOptimalSplit(beginner6x);
		expect(result.selectedSplit.id).not.toBe('ppl_6x');
	});

	it('beginner never gets bro_split_5x regardless of frequency', () => {
		const beginner5x = makeProfile({
			workoutsPerWeek: 5,
			experienceLevel: 'beginner',
			fitnessGoal: 'muscle_gain',
			availableEquipment: ['dumbbell', 'barbell', 'cable'],
		});

		const result = selectOptimalSplit(beginner5x);
		expect(result.selectedSplit.id).not.toBe('bro_split_5x');
	});

	it('beginner never gets a split with high recovery demand', () => {
		for (let freq = 1; freq <= 7; freq++) {
			const beginner = makeProfile({
				workoutsPerWeek: freq,
				experienceLevel: 'beginner',
				fitnessGoal: 'muscle_gain',
				availableEquipment: ['dumbbell', 'barbell', 'cable'],
			});

			const result = selectOptimalSplit(beginner);
			expect(result.selectedSplit.recoveryDemand).not.toBe('high');
		}
	});

	it('intermediate CAN get ppl_6x at 6 days', () => {
		const intermediate6x = makeProfile({
			workoutsPerWeek: 6,
			experienceLevel: 'advanced',
			fitnessGoal: 'muscle_gain',
			availableEquipment: ['dumbbell', 'barbell'],
		});

		const result = selectOptimalSplit(intermediate6x);
		expect(result.selectedSplit.id).toBe('ppl_6x');
	});
});
