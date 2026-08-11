import { describe, expect, it } from 'vitest';
import { MealSwapRequestSchema } from './validation';

const validRequest = {
	meal: {
		name: 'Paneer Bowl',
		type: 'lunch',
		dayOfWeek: 'monday',
		totalCalories: 520,
		totalMacros: {
			protein: 32,
			carbohydrates: 58,
			fat: 18,
			fiber: 9,
		},
	},
	dietType: 'vegetarian',
	allergies: ['peanut'],
	restrictions: ['egg_free'],
	excludeIngredients: ['mushroom'],
};

describe('MealSwapRequestSchema', () => {
	it('accepts the selected slot and its nutrition constraints', () => {
		expect(MealSwapRequestSchema.parse(validRequest)).toMatchObject(validRequest);
	});

	it('rejects unsupported meal slots and missing macro targets', () => {
		expect(() =>
			MealSwapRequestSchema.parse({
				...validRequest,
				meal: { ...validRequest.meal, type: 'brunch', totalMacros: { protein: 20 } },
			}),
		).toThrow();
	});
});
