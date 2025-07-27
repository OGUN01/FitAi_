/**
 * Gemini Structured Output Test for React Native Environment
 * Can be called from the app to verify structured output is working
 */

import { geminiService } from '../ai/gemini';
import { WEEKLY_PLAN_SCHEMA, DAILY_WORKOUT_SCHEMA } from '../ai/schemas/workoutSchema';
import { weeklyContentGenerator } from '../ai/weeklyContentGenerator';
import { PersonalInfo, FitnessGoals } from '../types/user';

export interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  duration?: number;
  tokensUsed?: number;
  data?: any;
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  overallSuccess: boolean;
}

// Test data matching our app's user profile structure
const TEST_PERSONAL_INFO: PersonalInfo = {
  name: 'Test User',
  age: '28',
  gender: 'male',
  height: '175',
  weight: '75',
  activityLevel: 'moderate'
};

const TEST_FITNESS_GOALS: FitnessGoals = {
  primaryGoals: ['muscle_gain', 'strength'],
  timeCommitment: '45-60',
  experience: 'intermediate',
  experience_level: 'intermediate'
};

class GeminiStructuredOutputTest {
  private results: TestResult[] = [];

  private logTest(testName: string, passed: boolean, details: Partial<TestResult> = {}): void {
    const result: TestResult = {
      test: testName,
      passed,
      ...details
    };

    this.results.push(result);
    console.log(passed ? `✅ ${testName}` : `❌ ${testName}`);

    if (details.error) {
      console.log(`   Error: ${details.error}`);
    }
    if (details.duration) {
      console.log(`   Duration: ${details.duration}ms`);
    }
    if (details.tokensUsed) {
      console.log(`   Tokens: ${details.tokensUsed}`);
    }
  }

  async testServiceAvailability(): Promise<boolean> {
    console.log('\n📋 Test 1: Gemini Service Availability');
    try {
      const isAvailable = geminiService.isAvailable();
      this.logTest('Service Availability', isAvailable);
      return isAvailable;
    } catch (error) {
      this.logTest('Service Availability', false, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async testSimpleStructuredOutput(): Promise<boolean> {
    console.log('\n📋 Test 2: Simple Structured Output');
    try {
      const simpleSchema = {
        type: "OBJECT" as const,
        properties: {
          message: { type: "STRING" as const, description: "A simple test message" },
          number: { type: "NUMBER" as const, description: "A test number" },
          success: { type: "BOOLEAN" as const, description: "Test success status" }
        },
        required: ["message", "number", "success"]
      };

      const startTime = Date.now();
      const response = await geminiService.generateResponse(
        'Create a simple test response with message "Hello World", number 42, and success true.',
        {},
        simpleSchema,
        1,
        { maxOutputTokens: 512 }
      );
      const duration = Date.now() - startTime;

      if (response.success && response.data) {
        const isValid = response.data.message &&
                       typeof response.data.number === 'number' &&
                       typeof response.data.success === 'boolean';

        this.logTest('Simple Structured Output', isValid, {
          duration,
          tokensUsed: response.tokensUsed,
          data: response.data
        });
        return isValid;
      } else {
        this.logTest('Simple Structured Output', false, {
          duration,
          error: response.error
        });
        return false;
      }
    } catch (error) {
      this.logTest('Simple Structured Output', false, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async testDailyWorkoutSchema(): Promise<boolean> {
    console.log('\n📋 Test 3: Daily Workout Schema');
    try {
      const startTime = Date.now();
      const response = await geminiService.generateResponse(
        `Create a single workout for Monday targeting upper body strength training.
        User: ${TEST_PERSONAL_INFO.age} year old ${TEST_PERSONAL_INFO.gender}, ${TEST_PERSONAL_INFO.height}cm, ${TEST_PERSONAL_INFO.weight}kg
        Experience: ${TEST_FITNESS_GOALS.experience}
        Goals: ${TEST_FITNESS_GOALS.primaryGoals.join(', ')}
        Time: ${TEST_FITNESS_GOALS.timeCommitment} minutes`,
        {},
        DAILY_WORKOUT_SCHEMA,
        1,
        { maxOutputTokens: 4096 }
      );
      const duration = Date.now() - startTime;

      if (response.success && response.data) {
        const isValid = response.data.dayOfWeek &&
                       response.data.title &&
                       response.data.exercises &&
                       Array.isArray(response.data.exercises) &&
                       response.data.exercises.length > 0;

        this.logTest('Daily Workout Schema', isValid, {
          duration,
          tokensUsed: response.tokensUsed,
          data: {
            title: response.data.title,
            day: response.data.dayOfWeek,
            duration: response.data.duration,
            exerciseCount: response.data.exercises?.length || 0
          }
        });
        return isValid;
      } else {
        this.logTest('Daily Workout Schema', false, {
          duration,
          error: response.error
        });
        return false;
      }
    } catch (error) {
      this.logTest('Daily Workout Schema', false, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async testWeeklyPlanSchema(): Promise<boolean> {
    console.log('\n📋 Test 4: Weekly Plan Schema (Complex)');
    try {
      const startTime = Date.now();
      const response = await geminiService.generateResponse(
        `Create a complete weekly workout plan for an intermediate fitness enthusiast.
        User Profile:
        - Age: ${TEST_PERSONAL_INFO.age}, Gender: ${TEST_PERSONAL_INFO.gender}
        - Height: ${TEST_PERSONAL_INFO.height}cm, Weight: ${TEST_PERSONAL_INFO.weight}kg
        - Activity Level: ${TEST_PERSONAL_INFO.activityLevel}
        - Experience: ${TEST_FITNESS_GOALS.experience}
        - Goals: ${TEST_FITNESS_GOALS.primaryGoals.join(' and ')}
        - Time per workout: ${TEST_FITNESS_GOALS.timeCommitment} minutes

        Create 4-5 workouts spread across the week with rest days.`,
        {},
        WEEKLY_PLAN_SCHEMA,
        1,
        { maxOutputTokens: 8192 }
      );
      const duration = Date.now() - startTime;

      if (response.success && response.data) {
        const hasValidWorkouts = response.data.workouts &&
                                Array.isArray(response.data.workouts) &&
                                response.data.workouts.length > 0;

        const hasValidDays = hasValidWorkouts &&
                            response.data.workouts.every((w: any) =>
                              w.dayOfWeek &&
                              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(w.dayOfWeek)
                            );

        const hasValidExercises = hasValidWorkouts &&
                                 response.data.workouts.every((w: any) =>
                                   w.exercises && Array.isArray(w.exercises) && w.exercises.length > 0
                                 );

        const isValid = hasValidWorkouts && hasValidDays && hasValidExercises;

        this.logTest('Weekly Plan Schema', isValid, {
          duration,
          tokensUsed: response.tokensUsed,
          data: {
            planTitle: response.data.planTitle,
            workoutCount: response.data.workouts?.length || 0,
            restDays: response.data.restDays?.length || 0,
            weeklyCalories: response.data.estimatedWeeklyCalories
          }
        });
        return isValid;
      } else {
        this.logTest('Weekly Plan Schema', false, {
          duration,
          error: response.error
        });
        return false;
      }
    } catch (error) {
      this.logTest('Weekly Plan Schema', false, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async testEndToEndGeneration(): Promise<boolean> {
    console.log('\n📋 Test 5: End-to-End Weekly Generation');
    try {
      const startTime = Date.now();
      const response = await weeklyContentGenerator.generateWeeklyWorkoutPlan(
        TEST_PERSONAL_INFO,
        TEST_FITNESS_GOALS,
        1 // Week 1
      );
      const duration = Date.now() - startTime;

      if (response.success && response.data) {
        const isValid = response.data.id &&
                       response.data.weekNumber === 1 &&
                       response.data.workouts &&
                       Array.isArray(response.data.workouts) &&
                       response.data.workouts.length > 0 &&
                       response.data.workouts.every((w: any) => w.dayOfWeek && w.exercises);

        this.logTest('End-to-End Generation', isValid, {
          duration,
          tokensUsed: response.tokensUsed,
          data: {
            planId: response.data.id,
            weekNumber: response.data.weekNumber,
            workoutCount: response.data.workouts?.length || 0
          }
        });
        return isValid;
      } else {
        this.logTest('End-to-End Generation', false, {
          duration,
          error: response.error
        });
        return false;
      }
    } catch (error) {
      this.logTest('End-to-End Generation', false, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async runAllTests(): Promise<TestSummary> {
    console.log('🧪 COMPREHENSIVE GEMINI STRUCTURED OUTPUT TEST');
    console.log('='.repeat(60));

    this.results = []; // Reset results

    // Run all tests
    const serviceAvailable = await this.testServiceAvailability();
    if (!serviceAvailable) {
      return this.generateSummary();
    }

    await this.testSimpleStructuredOutput();
    await this.testDailyWorkoutSchema();
    await this.testWeeklyPlanSchema();
    await this.testEndToEndGeneration();

    return this.generateSummary();
  }

  private generateSummary(): TestSummary {
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;
    const overallSuccess = failedTests === 0;

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    this.results.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.test}: ${status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.duration) {
        console.log(`   Duration: ${result.duration}ms`);
      }
    });

    console.log('\n' + '='.repeat(60));
    if (overallSuccess) {
      console.log('🎉 ALL TESTS PASSED! Gemini Structured Output is 100% Working!');
      console.log(`✅ ${passedTests}/${this.results.length} tests successful`);
      console.log('🚀 The weekly workout generation pipeline is production ready!');
    } else {
      console.log('❌ SOME TESTS FAILED! Issues detected in structured output.');
      console.log(`⚠️  ${passedTests}/${this.results.length} tests successful`);
      console.log('🔧 Review the failed tests above for debugging.');
    }
    console.log('='.repeat(60));

    return {
      totalTests: this.results.length,
      passedTests,
      failedTests,
      results: this.results,
      overallSuccess
    };
  }
}

// Export singleton instance
const geminiTest = new GeminiStructuredOutputTest();

export default geminiTest;

// Export convenience function
export const runGeminiStructuredOutputTest = () => geminiTest.runAllTests();

export interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  duration?: number;
  tokensUsed?: number;
  data?: any;
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  overallSuccess: boolean;
}

// Test data matching our app's user profile structure
const TEST_PERSONAL_INFO: PersonalInfo = {
  name: 'Test User',
  age: '28',
  gender: 'male',
  height: '175',
  weight: '75',
  activityLevel: 'moderate'
};

const TEST_FITNESS_GOALS: FitnessGoals = {
  primaryGoals: ['muscle_gain', 'strength'],
  timeCommitment: '45-60',
  experience: 'intermediate',
  experience_level: 'intermediate'
};

class GeminiStructuredOutputTest {
  private results: TestResult[] = [];

  private logTest(testName: string, passed: boolean, details: Partial<TestResult> = {}): void {
    const result: TestResult = {
      test: testName,
      passed,
      ...details
    };

    this.results.push(result);
    console.log(passed ? `✅ ${testName}` : `❌ ${testName}`);

    if (details.error) {
      console.log(`   Error: ${details.error}`);
    }
    if (details.duration) {
      console.log(`   Duration: ${details.duration}ms`);
    }
    if (details.tokensUsed) {
      console.log(`   Tokens: ${details.tokensUsed}`);
    }
  }

  async testServiceAvailability(): Promise<boolean> {
    console.log('\n📋 Test 1: Gemini Service Availability');
    try {
      const isAvailable = geminiService.isAvailable();
      this.logTest('Service Availability', isAvailable);
      return isAvailable;
    } catch (error) {
      this.logTest('Service Availability', false, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async testSimpleStructuredOutput(): Promise<boolean> {
    console.log('\n📋 Test 2: Simple Structured Output');
    try {
      const simpleSchema = {
        type: "OBJECT" as const,
        properties: {
          message: { type: "STRING" as const, description: "A simple test message" },
          number: { type: "NUMBER" as const, description: "A test number" },
          success: { type: "BOOLEAN" as const, description: "Test success status" }
        },
        required: ["message", "number", "success"]
      };

      const startTime = Date.now();
      const response = await geminiService.generateResponse(
        'Create a simple test response with message "Hello World", number 42, and success true.',
        {},
        simpleSchema,
        1,
        { maxOutputTokens: 512 }
      );
      const duration = Date.now() - startTime;

      if (response.success && response.data) {
        const isValid = response.data.message &&
                       typeof response.data.number === 'number' &&
                       typeof response.data.success === 'boolean';

        this.logTest('Simple Structured Output', isValid, {
          duration,
          tokensUsed: response.tokensUsed,
          data: response.data
        });
        return isValid;
      } else {
        this.logTest('Simple Structured Output', false, {
          duration,
          error: response.error
        });
        return false;
      }
    } catch (error) {
      this.logTest('Simple Structured Output', false, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

export class GeminiStructuredOutputTest {
  private static testPersonalInfo: PersonalInfo = {
    name: 'Test User',
    age: '28',
    gender: 'male',
    height: '175',
    weight: '75',
    activityLevel: 'moderate'
  };

  private static testFitnessGoals: FitnessGoals = {
    primaryGoals: ['muscle_gain', 'strength'],
    timeCommitment: '45-60',
    experience: 'intermediate',
    experience_level: 'intermediate'
  };

  /**
   * Run all tests and return comprehensive results
   */
  static async runAllTests(): Promise<{
    allPassed: boolean;
    results: TestResult[];
    summary: string;
  }> {
    console.log('🧪 Starting Gemini Structured Output Tests...');
    
    const results: TestResult[] = [];
    let allPassed = true;

    // Test 1: Service Availability
    try {
      const startTime = Date.now();
      const isAvailable = geminiService.isAvailable();
      results.push({
        test: 'Service Availability',
        passed: isAvailable,
        duration: Date.now() - startTime
      });
      if (!isAvailable) allPassed = false;
    } catch (error: any) {
      results.push({
        test: 'Service Availability',
        passed: false,
        error: error.message
      });
      allPassed = false;
    }

    // Test 2: Simple Structured Output
    if (results[0].passed) {
      try {
        const startTime = Date.now();
        const simpleSchema = {
          type: "OBJECT",
          properties: {
            message: { type: "STRING" },
            count: { type: "NUMBER" },
            success: { type: "BOOLEAN" }
          },
          required: ["message", "count", "success"]
        };

        const response = await geminiService.generateResponse(
          'Create a test response with message "Test Success", count 10, and success true.',
          {},
          simpleSchema,
          1,
          { maxOutputTokens: 512 }
        );

        const isValid = response.success && 
                       response.data &&
                       response.data.message &&
                       typeof response.data.count === 'number' &&
                       typeof response.data.success === 'boolean';

        results.push({
          test: 'Simple Structured Output',
          passed: isValid,
          duration: Date.now() - startTime,
          tokensUsed: response.tokensUsed,
          error: !response.success ? response.error : undefined
        });

        if (!isValid) allPassed = false;
      } catch (error: any) {
        results.push({
          test: 'Simple Structured Output',
          passed: false,
          error: error.message
        });
        allPassed = false;
      }
    }

    // Test 3: Daily Workout Schema
    if (allPassed) {
      try {
        const startTime = Date.now();
        const response = await geminiService.generateResponse(
          'Create a Monday upper body workout for intermediate level.',
          {},
          DAILY_WORKOUT_SCHEMA,
          1,
          { maxOutputTokens: 4096 }
        );

        const isValid = response.success &&
                       response.data &&
                       response.data.dayOfWeek &&
                       response.data.title &&
                       response.data.exercises &&
                       Array.isArray(response.data.exercises) &&
                       response.data.exercises.length > 0;

        results.push({
          test: 'Daily Workout Schema',
          passed: isValid,
          duration: Date.now() - startTime,
          tokensUsed: response.tokensUsed,
          error: !response.success ? response.error : undefined
        });

        if (!isValid) allPassed = false;
      } catch (error: any) {
        results.push({
          test: 'Daily Workout Schema',
          passed: false,
          error: error.message
        });
        allPassed = false;
      }
    }

    // Test 4: Weekly Plan Schema (Most Complex)
    if (allPassed) {
      try {
        const startTime = Date.now();
        const response = await geminiService.generateResponse(
          'Create a 4-day intermediate weekly workout plan focusing on muscle gain.',
          {},
          WEEKLY_PLAN_SCHEMA,
          1,
          { maxOutputTokens: 8192 }
        );

        const isValid = response.success &&
                       response.data &&
                       response.data.planTitle &&
                       response.data.workouts &&
                       Array.isArray(response.data.workouts) &&
                       response.data.workouts.length > 0 &&
                       response.data.workouts.every((w: any) => 
                         w.dayOfWeek && w.exercises && Array.isArray(w.exercises)
                       );

        results.push({
          test: 'Weekly Plan Schema',
          passed: isValid,
          duration: Date.now() - startTime,
          tokensUsed: response.tokensUsed,
          error: !response.success ? response.error : undefined
        });

        if (!isValid) allPassed = false;
      } catch (error: any) {
        results.push({
          test: 'Weekly Plan Schema',
          passed: false,
          error: error.message
        });
        allPassed = false;
      }
    }

    // Test 5: End-to-End Generator
    if (allPassed) {
      try {
        const startTime = Date.now();
        const response = await weeklyContentGenerator.generateWeeklyWorkoutPlan(
          this.testPersonalInfo,
          this.testFitnessGoals,
          1
        );

        const isValid = response.success &&
                       response.data &&
                       response.data.id &&
                       response.data.workouts &&
                       Array.isArray(response.data.workouts) &&
                       response.data.workouts.length > 0;

        results.push({
          test: 'End-to-End Generator',
          passed: isValid,
          duration: Date.now() - startTime,
          tokensUsed: response.tokensUsed,
          error: !response.success ? response.error : undefined
        });

        if (!isValid) allPassed = false;
      } catch (error: any) {
        results.push({
          test: 'End-to-End Generator',
          passed: false,
          error: error.message
        });
        allPassed = false;
      }
    }

    // Generate summary
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
    const totalTokens = results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);

    const summary = allPassed
      ? `🎉 ALL TESTS PASSED! (${passedCount}/${totalCount}) - ${totalDuration}ms total, ${totalTokens} tokens used`
      : `❌ TESTS FAILED (${passedCount}/${totalCount}) - Check failed tests for details`;

    return {
      allPassed,
      results,
      summary
    };
  }

  /**
   * Quick test for basic functionality - can be called from UI
   */
  static async quickTest(): Promise<{
    success: boolean;
    message: string;
    duration: number;
  }> {
    const startTime = Date.now();
    
    try {
      if (!geminiService.isAvailable()) {
        return {
          success: false,
          message: 'Gemini service not available',
          duration: Date.now() - startTime
        };
      }

      const response = await geminiService.generateResponse(
        'Create a quick test with message "Working", number 1, success true',
        {},
        {
          type: "OBJECT",
          properties: {
            message: { type: "STRING" },
            number: { type: "NUMBER" },
            success: { type: "BOOLEAN" }
          },
          required: ["message", "number", "success"]
        },
        1,
        { maxOutputTokens: 256 }
      );

      const success = response.success && 
                     response.data &&
                     response.data.message === "Working" &&
                     response.data.success === true;

      return {
        success,
        message: success 
          ? `✅ Structured output working! (${response.tokensUsed} tokens, ${Date.now() - startTime}ms)`
          : `❌ Failed: ${response.error || 'Invalid response structure'}`,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        success: false,
        message: `❌ Error: ${error.message}`,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Test weekly workout generation specifically
   */
  static async testWeeklyWorkoutGeneration(): Promise<{
    success: boolean;
    message: string;
    workoutCount: number;
    duration: number;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await weeklyContentGenerator.generateWeeklyWorkoutPlan(
        this.testPersonalInfo,
        this.testFitnessGoals,
        1
      );

      if (response.success && response.data) {
        const workoutCount = response.data.workouts.length;
        const hasValidDays = response.data.workouts.every(w => 
          ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(w.dayOfWeek)
        );

        return {
          success: hasValidDays && workoutCount > 0,
          message: hasValidDays && workoutCount > 0
            ? `✅ Weekly plan generated: ${workoutCount} workouts, ${response.tokensUsed} tokens`
            : `❌ Invalid workout structure`,
          workoutCount,
          duration: Date.now() - startTime
        };
      } else {
        return {
          success: false,
          message: `❌ Generation failed: ${response.error}`,
          workoutCount: 0,
          duration: Date.now() - startTime
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `❌ Error: ${error.message}`,
        workoutCount: 0,
        duration: Date.now() - startTime
      };
    }
  }
}

export default GeminiStructuredOutputTest;