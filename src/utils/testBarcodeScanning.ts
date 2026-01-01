/**
 * Test utility for QR/Barcode scanning functionality
 * Tests the end-to-end workflow without actual camera scanning
 */

import { barcodeService } from '../services/barcodeService';
import { nutritionAnalyzer } from '../ai';

export interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  details: any;
  error?: string;
}

/**
 * Test barcode validation functionality
 */
export async function testBarcodeValidation(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Barcode Validation Test';

  try {
    const testCases = [
      { barcode: '3017620422003', expected: 'EAN-13' }, // Nutella barcode
      { barcode: '012345678905', expected: 'UPC-A' }, // UPC-A format
      { barcode: '12345678', expected: 'EAN-8' }, // EAN-8 format
      { barcode: 'QR_CODE_DATA_123', expected: 'QR Code' }, // QR Code
      { barcode: '', expected: false }, // Invalid: empty
      { barcode: 'invalid@#$', expected: false }, // Invalid: special chars
    ];

    const results = [];
    for (const testCase of testCases) {
      const validation = barcodeService.validateBarcode(testCase.barcode);
      const passed = testCase.expected === false 
        ? !validation.isValid 
        : validation.isValid && validation.format === testCase.expected;
      
      results.push({
        barcode: testCase.barcode,
        expected: testCase.expected,
        actual: validation,
        passed
      });
    }

    const allPassed = results.every(r => r.passed);
    const duration = Date.now() - startTime;

    return {
      testName,
      success: allPassed,
      duration,
      details: {
        testCases: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        results
      }
    };

  } catch (error) {
    return {
      testName,
      success: false,
      duration: Date.now() - startTime,
      details: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test product lookup with known barcodes
 */
export async function testProductLookup(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Product Lookup Test';

  try {
    // Test with known product barcodes (these should exist in OpenFoodFacts)
    const testBarcodes = [
      '3017620422003', // Nutella
      '8901030865916', // Indian product
      '0123456789012', // Test barcode (might not exist)
    ];

    const results = [];
    for (const barcode of testBarcodes) {
      console.log(`🔍 Testing barcode lookup: ${barcode}`);
      const lookupResult = await barcodeService.lookupProduct(barcode);
      
      results.push({
        barcode,
        success: lookupResult.success,
        product: lookupResult.product,
        confidence: lookupResult.confidence,
        error: lookupResult.error
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const successCount = results.filter(r => r.success).length;
    const duration = Date.now() - startTime;

    return {
      testName,
      success: successCount > 0, // At least one should succeed
      duration,
      details: {
        testBarcodes: testBarcodes.length,
        successful: successCount,
        failed: testBarcodes.length - successCount,
        results
      }
    };

  } catch (error) {
    return {
      testName,
      success: false,
      duration: Date.now() - startTime,
      details: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test health assessment functionality
 */
export async function testHealthAssessment(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Health Assessment Test';

  try {
    // Mock product data for testing
    const mockProducts = [
      {
        name: 'Fresh Apple',
        nutrition: {
          calories: 52,
          protein: 0.3,
          carbs: 14,
          fat: 0.2,
          fiber: 2.4,
          sugar: 10.4,
          sodium: 0.001
        },
        additionalInfo: {
          labels: ['organic', 'natural'],
          ingredients: ['apple']
        },
        expectedCategory: 'excellent'
      },
      {
        name: 'Chocolate Bar',
        nutrition: {
          calories: 534,
          protein: 7.6,
          carbs: 59.4,
          fat: 31.3,
          fiber: 7.0,
          sugar: 47.9,
          sodium: 0.024
        },
        additionalInfo: {
          ingredients: ['sugar', 'cocoa butter', 'milk powder', 'artificial flavor'],
          labels: []
        },
        expectedCategory: 'poor'
      }
    ];

    const results = [];
    for (const mockProduct of mockProducts) {
      console.log(`🧪 Testing health assessment: ${mockProduct.name}`);
      const assessment = await nutritionAnalyzer.assessProductHealth({
        nutrition: mockProduct.nutrition,
        additionalInfo: mockProduct.additionalInfo,
        name: mockProduct.name
      });

      results.push({
        product: mockProduct.name,
        score: assessment.overallScore,
        category: assessment.category,
        expectedCategory: mockProduct.expectedCategory,
        passed: assessment.category === mockProduct.expectedCategory ||
               (assessment.category === 'good' && mockProduct.expectedCategory === 'excellent') ||
               (assessment.category === 'unhealthy' && mockProduct.expectedCategory === 'poor'),
        breakdown: assessment.breakdown,
        recommendations: assessment.recommendations.length,
        alerts: assessment.alerts.length
      });
    }

    const allPassed = results.every(r => r.passed);
    const duration = Date.now() - startTime;

    return {
      testName,
      success: allPassed,
      duration,
      details: {
        products: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        results
      }
    };

  } catch (error) {
    return {
      testName,
      success: false,
      duration: Date.now() - startTime,
      details: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Run all barcode scanning tests
 */
export async function runAllBarcodeTests(): Promise<{
  success: boolean;
  totalDuration: number;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}> {
  console.log('🧪 Starting Barcode Scanning Test Suite...');
  const startTime = Date.now();

  const tests = [
    await testBarcodeValidation(),
    await testProductLookup(),
    await testHealthAssessment()
  ];

  const totalDuration = Date.now() - startTime;
  const passed = tests.filter(t => t.success).length;
  const failed = tests.length - passed;

  console.log(`\n📊 Test Results Summary:`);
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`Duration: ${totalDuration}ms`);

  tests.forEach(test => {
    console.log(`\n${test.success ? '✅' : '❌'} ${test.testName}`);
    console.log(`  Duration: ${test.duration}ms`);
    if (test.error) {
      console.log(`  Error: ${test.error}`);
    }
    if (test.details) {
      console.log(`  Details:`, test.details);
    }
  });

  return {
    success: failed === 0,
    totalDuration,
    tests,
    summary: {
      total: tests.length,
      passed,
      failed
    }
  };
}

// Export for use in other test files
export default {
  testBarcodeValidation,
  testProductLookup,
  testHealthAssessment,
  runAllBarcodeTests
};