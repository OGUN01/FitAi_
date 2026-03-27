import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateObjectMock, gatewayInstanceMock, createGatewayMock } =
	vi.hoisted(() => {
		const generateObjectMock = vi.fn();
		const gatewayInstanceMock = vi.fn(() => 'mock-model');
		const createGatewayMock = vi.fn(() => gatewayInstanceMock);

		return {
			generateObjectMock,
			gatewayInstanceMock,
			createGatewayMock,
		};
	});

vi.mock('ai', () => ({
	generateObject: generateObjectMock,
	createGateway: createGatewayMock,
}));

import { handleNutritionLabelScan } from './nutritionLabelScan';

describe('handleNutritionLabelScan', () => {
	const imageBase64 = `data:image/jpeg;base64,${'a'.repeat(160)}`;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('uses the vision extractor and returns a structured vision-label payload', async () => {
		generateObjectMock.mockResolvedValue({
			object: {
				productName: 'Labelled Oats',
				brand: 'FitAI',
				servingSize: 40,
				servingUnit: 'g',
				caloriesPerServing: 120,
				proteinPerServing: 3,
				carbsPerServing: 22,
				fatPerServing: 2,
				fiberPerServing: 4,
				sugarPerServing: 1,
				sodiumPerServing: 0.1,
				caloriesPer100g: 300,
				proteinPer100g: 7.5,
				carbsPer100g: 55,
				fatPer100g: 5,
				ingredients: 'Oats, Salt',
				allergens: ['gluten'],
				confidence: 94,
				extractionNotes: 'clear label',
			},
		});

		const jsonMock = vi.fn((body: unknown, status?: number) => ({
			body,
			status: status ?? 200,
		}));
		const context = {
			get: vi.fn((key: string) =>
				key === 'user' ? { id: 'user-1' } : undefined,
			),
			req: {
				json: vi.fn().mockResolvedValue({
					imageBase64,
					productName: 'Oats',
				}),
			},
			env: {
				AI_GATEWAY_API_KEY: 'test-gateway-key',
			},
			json: jsonMock,
		} as any;

		await handleNutritionLabelScan(context);

		expect(createGatewayMock).toHaveBeenCalledWith({
			apiKey: 'test-gateway-key',
		});
		expect(gatewayInstanceMock).toHaveBeenCalledWith('google/gemini-2.5-flash');
		expect(generateObjectMock).toHaveBeenCalledTimes(1);

		const generateArgs = generateObjectMock.mock.calls[0][0];
		expect(generateArgs.mode).toBe('json');
		expect(generateArgs.messages).toEqual([
			{
				role: 'user',
				content: [
					expect.objectContaining({ type: 'text' }),
					{ type: 'image', image: imageBase64 },
				],
			},
		]);

		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({
				success: true,
				data: expect.objectContaining({
					productName: 'Labelled Oats',
					brand: 'FitAI',
					servingSize: 40,
					servingUnit: 'g',
					perServing: expect.objectContaining({
						calories: 120,
						protein: 3,
						carbs: 22,
						fat: 2,
						fiber: 4,
						sugar: 1,
						sodium: 0.1,
					}),
					per100g: expect.objectContaining({
						calories: 300,
						protein: 7.5,
						carbs: 55,
						fat: 5,
					}),
					source: 'vision-label',
				}),
			}),
		);

		const responseBody = jsonMock.mock.calls[0][0] as Record<string, any>;
		expect(responseBody.data).not.toHaveProperty('barcode');
	});
});
