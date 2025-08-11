// 🧪 FitAI Quick Actions In-App Test Suite
// React Native compatible testing utilities

import { Alert } from 'react-native';
import { foodRecognitionService } from '../services/foodRecognitionService';
import { APIKeyRotator } from '../utils/apiKeyRotator';
import { foodRecognitionE2ETests } from './testFoodRecognitionE2E';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message?: string;
  details?: any;
}

class QuickActionsTestSuite {
  private results: TestResult[] = [];

  private addResult(
    name: string,
    status: 'PASS' | 'FAIL' | 'WARN',
    message?: string,
    details?: any
  ) {
    this.results.push({ name, status, message, details });
  }

  // Test 1: Environment Configuration
  private testEnvironment(): TestResult[] {
    const results: TestResult[] = [];

    // Check API keys
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_KEY_1;
    results.push({
      name: 'API Key Configuration',
      status: apiKey ? 'PASS' : 'WARN',
      message: apiKey ? 'API key found' : 'No API key configured - demo mode will be used',
      details: { hasKey: !!apiKey },
    });

    // Check multiple keys for rotation
    const keyCount = Object.keys(process.env).filter((key) =>
      key.startsWith('EXPO_PUBLIC_GEMINI_KEY_')
    ).length;

    results.push({
      name: 'API Key Rotation Setup',
      status: keyCount >= 2 ? 'PASS' : 'WARN',
      message: `Found ${keyCount} API keys (recommended: 5+)`,
      details: { keyCount },
    });

    return results;
  }

  // Test 2: Service Availability
  private testServices(): TestResult[] {
    const results: TestResult[] = [];

    // Test Food Recognition Service
    try {
      const hasService = !!foodRecognitionService;
      const hasMethods = hasService && typeof foodRecognitionService.recognizeFood === 'function';

      results.push({
        name: 'Food Recognition Service',
        status: hasMethods ? 'PASS' : 'FAIL',
        message: hasMethods ? 'Service loaded and ready' : 'Service not available',
        details: { hasService, hasMethods },
      });
    } catch (error) {
      results.push({
        name: 'Food Recognition Service',
        status: 'FAIL',
        message: `Service error: ${error}`,
        details: { error },
      });
    }

    // Test API Key Rotator
    try {
      const rotator = new APIKeyRotator();
      const hasRotator = !!rotator;
      const hasMethods = hasRotator && typeof rotator.getAvailableKey === 'function';

      results.push({
        name: 'API Key Rotator',
        status: hasMethods ? 'PASS' : 'FAIL',
        message: hasMethods ? 'Rotator ready' : 'Rotator not available',
        details: { hasRotator, hasMethods },
      });
    } catch (error) {
      results.push({
        name: 'API Key Rotator',
        status: 'FAIL',
        message: `Rotator error: ${error}`,
        details: { error },
      });
    }

    return results;
  }

  // Test 3: API Connection
  private async testAPIConnection(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_KEY_1;

    if (!apiKey) {
      results.push({
        name: 'API Connection Test',
        status: 'WARN',
        message: 'Skipped - No API key configured',
        details: { skipped: true },
      });
      return results;
    }

    try {
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Test' }] }],
        }),
      });

      const isWorking = response.status === 200 || response.status === 400; // 400 is OK for this test

      results.push({
        name: 'Gemini API Connection',
        status: isWorking ? 'PASS' : 'FAIL',
        message: isWorking ? 'API is reachable' : `API returned status: ${response.status}`,
        details: { status: response.status, isWorking },
      });
    } catch (error) {
      results.push({
        name: 'Gemini API Connection',
        status: 'FAIL',
        message: `Connection failed: ${error}`,
        details: { error: String(error) },
      });
    }

    return results;
  }

  // Test 4: Food Recognition End-to-End
  private async testFoodRecognition(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Create a test image data URL (1x1 transparent PNG)
    const testImageUri =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    try {
      const startTime = Date.now();

      const result = await foodRecognitionService.recognizeFood(testImageUri, 'lunch', {
        personalInfo: {
          name: 'Test User',
          age: '30',
          gender: 'male',
          height: '175',
          weight: '70',
          activityLevel: 'moderate',
        },
        fitnessGoals: {
          primaryGoals: ['weight_loss'],
          experience: 'intermediate',
          experience_level: 'intermediate',
          timeCommitment: '30-45 minutes',
        },
      });

      const processingTime = Date.now() - startTime;

      results.push({
        name: 'Food Recognition E2E Test',
        status: result.success ? 'PASS' : 'FAIL',
        message: result.success
          ? `Recognition completed in ${processingTime}ms`
          : `Recognition failed: ${result.error}`,
        details: {
          success: result.success,
          processingTime,
          error: result.error,
          dataReceived: !!result.data,
        },
      });
    } catch (error) {
      results.push({
        name: 'Food Recognition E2E Test',
        status: 'FAIL',
        message: `Test failed: ${error}`,
        details: { error: String(error) },
      });
    }

    return results;
  }

  // Main test runner
  async runAllTests(): Promise<{
    summary: { passed: number; failed: number; warnings: number; total: number };
    results: TestResult[];
    recommendations: string[];
  }> {
    console.log('🚀 Starting FitAI Quick Actions Test Suite...');

    this.results = [];

    // Run all tests
    const envResults = this.testEnvironment();
    const serviceResults = this.testServices();
    const apiResults = await this.testAPIConnection();
    const e2eResults = await this.testFoodRecognition();

    const allResults = [...envResults, ...serviceResults, ...apiResults, ...e2eResults];

    // Calculate summary
    const passed = allResults.filter((r) => r.status === 'PASS').length;
    const failed = allResults.filter((r) => r.status === 'FAIL').length;
    const warnings = allResults.filter((r) => r.status === 'WARN').length;
    const total = allResults.length;

    // Generate recommendations
    const recommendations: string[] = [];

    if (failed > 0) {
      recommendations.push('❌ Some critical tests failed - check the detailed results');
    }

    if (warnings > 0) {
      const hasApiWarning = allResults.some((r) => r.name.includes('API') && r.status === 'WARN');
      if (hasApiWarning) {
        recommendations.push(
          '🔑 Add your Gemini API key to EXPO_PUBLIC_GEMINI_API_KEY for full functionality'
        );
      }

      const hasRotationWarning = allResults.some(
        (r) => r.name.includes('Rotation') && r.status === 'WARN'
      );
      if (hasRotationWarning) {
        recommendations.push(
          '⚡ Consider adding multiple API keys (EXPO_PUBLIC_GEMINI_KEY_1, _2, etc.) for better performance'
        );
      }
    }

    if (passed === total) {
      recommendations.push('🎉 All tests passed! Your Quick Actions are fully functional');
    } else if (failed === 0) {
      recommendations.push('✅ Core functionality works! Warnings are about optimizations');
    }

    return {
      summary: { passed, failed, warnings, total },
      results: allResults,
      recommendations,
    };
  }

  // Display results in React Native Alert
  async runTestsWithAlert(): Promise<void> {
    try {
      const testResults = await this.runAllTests();
      const { summary, results, recommendations } = testResults;

      // Create summary message
      let message = `📊 Test Results:\n`;
      message += `✅ Passed: ${summary.passed}\n`;
      message += `❌ Failed: ${summary.failed}\n`;
      message += `⚠️ Warnings: ${summary.warnings}\n`;
      message += `📈 Success Rate: ${Math.round((summary.passed / summary.total) * 100)}%\n\n`;

      // Add failed tests
      const failedTests = results.filter((r) => r.status === 'FAIL');
      if (failedTests.length > 0) {
        message += `🚨 Failed Tests:\n`;
        failedTests.forEach((test) => {
          message += `• ${test.name}: ${test.message}\n`;
        });
        message += `\n`;
      }

      // Add recommendations
      if (recommendations.length > 0) {
        message += `💡 Recommendations:\n`;
        recommendations.forEach((rec) => {
          message += `${rec}\n`;
        });
      }

      Alert.alert('🧪 Quick Actions Test Results', message, [
        { text: 'View Details', onPress: () => this.showDetailedResults(results) },
        { text: 'OK' },
      ]);
    } catch (error) {
      Alert.alert('❌ Test Suite Error', `Failed to run tests: ${error}`, [{ text: 'OK' }]);
    }
  }

  private showDetailedResults(results: TestResult[]): void {
    const detailedMessage = results
      .map((result) => {
        const emoji = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
        return `${emoji} ${result.name}: ${result.message || result.status}`;
      })
      .join('\n');

    Alert.alert('📋 Detailed Test Results', detailedMessage, [{ text: 'OK' }]);
  }
}

// Export singleton instance
export const quickActionsTestSuite = new QuickActionsTestSuite();

// Export convenience function
export const runQuickActionsTests = () => {
  return quickActionsTestSuite.runTestsWithAlert();
};

// Export E2E test runner
export const runFoodRecognitionE2ETests = async () => {
  Alert.alert(
    '🧪 Starting Food Recognition E2E Tests',
    'This will test the complete food recognition and meal logging workflow. It may take 30-60 seconds.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Run Tests',
        onPress: async () => {
          try {
            const results = await foodRecognitionE2ETests.runAllTests('test-user-e2e');

            const emoji = results.failed === 0 ? '🎉' : '⚠️';
            Alert.alert(`${emoji} E2E Test Results`, `${results.summary}`, [
              { text: 'OK' },
              {
                text: 'View Details',
                onPress: () => {
                  const detailedResults = results.results
                    .map(
                      (r) =>
                        `${r.success ? '✅' : '❌'} ${r.testName}\n  Duration: ${r.duration}ms\n  ${r.error || 'Success'}`
                    )
                    .join('\n\n');

                  Alert.alert('📊 Detailed E2E Results', detailedResults, [{ text: 'Close' }]);
                },
              },
            ]);
          } catch (error) {
            Alert.alert('❌ E2E Test Error', `Failed to run E2E tests: ${error}`, [{ text: 'OK' }]);
          }
        },
      },
    ]
  );
};

export default quickActionsTestSuite;
