import { describe, expect, it } from 'vitest';
import { buildDietPrompt } from './index';

describe('buildDietPrompt', () => {
	it('includes live clinical context, exclusions, and micronutrient guidance', () => {
		const prompt = buildDietPrompt(
			{
				daily_calories: 2100,
				daily_protein_g: 145,
				daily_carbs_g: 185,
				daily_fat_g: 70,
				daily_water_ml: 3200,
				daily_fiber_g: 32,
				calculated_bmi: 24.3,
				bmi_category: 'healthy',
			} as any,
			{
				age: 29,
				gender: 'female',
				country: 'IN',
				state: 'MH',
				occupation_type: 'desk_job',
				fitness_goal: 'fat_loss',
			} as any,
			{
				diet_type: 'vegetarian',
				allergies: ['peanut'],
				restrictions: ['low-sodium'],
				breakfast_enabled: true,
				lunch_enabled: true,
				dinner_enabled: true,
				snacks_enabled: false,
				cooking_skill_level: 'beginner',
				max_prep_time_minutes: 20,
				budget_level: 'medium',
			} as any,
			{
				medical_conditions: ['pcos'],
				medications: ['metformin'],
				pregnancy_status: true,
				pregnancy_trimester: 2,
				breastfeeding_status: false,
				stress_level: 'high',
			} as any,
			7,
			['okra'],
		);

		expect(prompt).toContain('metformin');
		expect(prompt.toLowerCase()).toContain('pregnant');
		expect(prompt).toContain('low-sodium');
		expect(prompt).toContain('okra');
		expect(prompt.toLowerCase()).toContain('micronutrient');
	});
});
