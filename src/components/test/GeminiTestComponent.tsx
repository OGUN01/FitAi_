import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import geminiTest, { TestSummary, TestResult } from '../../test/geminiStructuredOutputTest';
import { THEME } from '../ui';

interface GeminiTestComponentProps {
  onClose?: () => void;
}

export const GeminiTestComponent: React.FC<GeminiTestComponentProps> = ({ onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestSummary | null>(null);
  const [currentTest, setCurrentTest] = useState<string>('');

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults(null);
    setCurrentTest('Initializing comprehensive test suite...');

    try {
      // Add visual feedback during testing
      const testNames = [
        'Service Availability',
        'Simple Structured Output',
        'Daily Workout Schema',
        'Weekly Plan Schema',
        'End-to-End Generation'
      ];

      let currentIndex = 0;
      const updateProgress = () => {
        if (currentIndex < testNames.length) {
          setCurrentTest(`Running: ${testNames[currentIndex]}`);
          currentIndex++;
          setTimeout(updateProgress, 2000);
        }
      };

      updateProgress();

      const results = await geminiTest.runAllTests();
      setTestResults(results);
      setCurrentTest('Tests completed!');

      // Show alert with results
      Alert.alert(
        results.overallSuccess ? '✅ All Tests Passed!' : '❌ Some Tests Failed',
        `${results.passedTests}/${results.totalTests} tests successful\n\n` +
        `This confirms that Gemini structured output is ${results.overallSuccess ? '100% working correctly!' : 'having issues.'}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Test execution failed:', error);
      Alert.alert(
        '💥 Test Execution Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
        [{ text: 'OK' }]
      );
      setCurrentTest('Test execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const runQuickTest = async () => {
    setIsRunning(true);
    setCurrentTest('Running quick structured output test...');

    try {
      const result = await geminiTest.testSimpleStructuredOutput();
      Alert.alert(
        result ? '✅ Quick Test Passed!' : '❌ Quick Test Failed',
        result ? 'Simple structured output is working correctly!' : 'There are issues with structured output.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('❌ Quick Test Error', error.message, [{ text: 'OK' }]);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const runWorkoutTest = async () => {
    setIsRunning(true);
    setCurrentTest('Testing weekly workout generation...');

    try {
      const result = await geminiTest.testEndToEndGeneration();
      Alert.alert(
        result ? '✅ Workout Test Passed!' : '❌ Workout Test Failed',
        result ? 'Weekly workout generation is working perfectly!' : 'There are issues with workout generation.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('❌ Workout Test Error', error.message, [{ text: 'OK' }]);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const getStatusColor = (passed: boolean) => passed ? THEME.colors.success : THEME.colors.error;

  return (
    <ScrollView style={{
      flex: 1,
      backgroundColor: THEME.colors.background,
      padding: THEME.spacing.lg
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: THEME.spacing.lg
      }}>
        <Text style={{
          fontSize: THEME.fontSize.xl,
          fontWeight: 'bold',
          color: THEME.colors.text
        }}>
          🧪 Gemini Test Suite
        </Text>
        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: THEME.spacing.sm,
              backgroundColor: THEME.colors.backgroundSecondary,
              borderRadius: THEME.borderRadius.md
            }}
          >
            <Text style={{ color: THEME.colors.text, fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Description */}
      <View style={{
        backgroundColor: THEME.colors.backgroundSecondary,
        padding: THEME.spacing.md,
        borderRadius: THEME.borderRadius.md,
        marginBottom: THEME.spacing.lg
      }}>
        <Text style={{
          color: THEME.colors.textSecondary,
          lineHeight: 20,
          textAlign: 'center'
        }}>
          🎯 Verify that Gemini structured output is working 100% correctly{'\n'}
          Tests JSON parsing, schema validation, and workout generation pipeline
        </Text>
      </View>

      {/* Current Test Status */}
      {isRunning && currentTest && (
        <View style={{
          backgroundColor: THEME.colors.primary,
          padding: THEME.spacing.md,
          borderRadius: THEME.borderRadius.md,
          marginBottom: THEME.spacing.lg,
          alignItems: 'center'
        }}>
          <ActivityIndicator size="small" color={THEME.colors.text} style={{ marginBottom: THEME.spacing.sm }} />
          <Text style={{ color: THEME.colors.text, textAlign: 'center', fontWeight: 'bold' }}>
            {currentTest}
          </Text>
        </View>
      )}

      {/* Test Buttons */}
      <View style={{ marginBottom: THEME.spacing.lg }}>
        {/* Quick Test Button */}
        <TouchableOpacity
          onPress={runQuickTest}
          disabled={isRunning}
          style={{
            backgroundColor: isRunning ? THEME.colors.backgroundSecondary : '#3B82F6',
            padding: THEME.spacing.md,
            borderRadius: THEME.borderRadius.md,
            alignItems: 'center',
            marginBottom: THEME.spacing.md
          }}
        >
          <Text style={{ color: THEME.colors.text, fontWeight: 'bold' }}>
            {isRunning ? '⏳ Testing...' : '⚡ Quick Test'}
          </Text>
        </TouchableOpacity>

        {/* Workout Test Button */}
        <TouchableOpacity
          onPress={runWorkoutTest}
          disabled={isRunning}
          style={{
            backgroundColor: isRunning ? THEME.colors.backgroundSecondary : THEME.colors.success,
            padding: THEME.spacing.md,
            borderRadius: THEME.borderRadius.md,
            alignItems: 'center',
            marginBottom: THEME.spacing.md
          }}
        >
          <Text style={{ color: THEME.colors.text, fontWeight: 'bold' }}>
            {isRunning ? '⏳ Testing...' : '💪 Test Weekly Workout Generation'}
          </Text>
        </TouchableOpacity>

        {/* Full Test Suite Button */}
        <TouchableOpacity
          onPress={runAllTests}
          disabled={isRunning}
          style={{
            backgroundColor: isRunning ? THEME.colors.backgroundSecondary : '#8B5CF6',
            padding: THEME.spacing.md,
            borderRadius: THEME.borderRadius.md,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: THEME.colors.text, fontWeight: 'bold' }}>
            {isRunning ? '⏳ Running Full Test Suite...' : '🎯 Run Complete Test Suite'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Test Results */}
      {testResults && testResults.results.length > 0 && (
        <View style={{
          backgroundColor: THEME.colors.backgroundSecondary,
          padding: THEME.spacing.md,
          borderRadius: THEME.borderRadius.md,
          marginBottom: THEME.spacing.lg
        }}>
          <Text style={{
            fontSize: THEME.fontSize.lg,
            fontWeight: 'bold',
            color: THEME.colors.text,
            marginBottom: THEME.spacing.md
          }}>
            📊 Test Results
          </Text>

          {testResults.results.map((result, index) => (
            <View key={index} style={{
              borderBottomWidth: index < testResults.results.length - 1 ? 1 : 0,
              borderBottomColor: THEME.colors.backgroundTertiary,
              paddingBottom: THEME.spacing.sm,
              marginBottom: THEME.spacing.sm
            }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: THEME.spacing.xs
              }}>
                <Text style={{
                  fontWeight: 'bold',
                  color: THEME.colors.text,
                  flex: 1
                }}>
                  {result.test}
                </Text>
                <Text style={{ color: getStatusColor(result.passed), fontWeight: 'bold' }}>
                  {result.passed ? '✅ PASS' : '❌ FAIL'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {result.duration && (
                  <Text style={{ fontSize: THEME.fontSize.xs, color: THEME.colors.textMuted }}>
                    ⏱️ {result.duration}ms
                  </Text>
                )}
                {result.tokensUsed && (
                  <Text style={{ fontSize: THEME.fontSize.xs, color: THEME.colors.textMuted }}>
                    🔢 {result.tokensUsed} tokens
                  </Text>
                )}
              </View>

              {result.error && (
                <Text style={{
                  color: THEME.colors.error,
                  fontSize: THEME.fontSize.xs,
                  marginTop: THEME.spacing.xs
                }}>
                  Error: {result.error}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Summary */}
      {testResults && (
        <View style={{
          backgroundColor: testResults.overallSuccess ?
            'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          padding: THEME.spacing.md,
          borderRadius: THEME.borderRadius.md,
          marginBottom: THEME.spacing.lg,
          borderWidth: 1,
          borderColor: testResults.overallSuccess ? THEME.colors.success : THEME.colors.error
        }}>
          <Text style={{
            fontSize: THEME.fontSize.lg,
            fontWeight: 'bold',
            color: THEME.colors.text,
            marginBottom: THEME.spacing.sm
          }}>
            📋 Final Result
          </Text>
          <Text style={{
            color: testResults.overallSuccess ? THEME.colors.success : THEME.colors.error,
            fontWeight: 'bold',
            fontSize: THEME.fontSize.md,
            textAlign: 'center'
          }}>
            {testResults.overallSuccess ?
              '🎉 ALL TESTS PASSED! Gemini Structured Output is 100% Working!' :
              '❌ Some tests failed. Review the results above.'
            }
          </Text>
          <Text style={{
            color: THEME.colors.textSecondary,
            textAlign: 'center',
            marginTop: THEME.spacing.sm
          }}>
            {testResults.passedTests}/{testResults.totalTests} tests successful
          </Text>
        </View>
      )}

      {/* Instructions */}
      <View style={{
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        padding: THEME.spacing.md,
        borderRadius: THEME.borderRadius.md,
        borderWidth: 1,
        borderColor: '#3B82F6'
      }}>
        <Text style={{
          color: '#1E40AF',
          fontWeight: 'bold',
          marginBottom: THEME.spacing.sm
        }}>
          ℹ️ Test Information
        </Text>
        <Text style={{
          color: '#1E40AF',
          fontSize: THEME.fontSize.sm,
          lineHeight: 18
        }}>
          • Quick Test: Basic structured output validation{'\n'}
          • Workout Test: Tests weekly workout plan generation{'\n'}
          • Full Suite: Comprehensive testing of all schemas{'\n'}
          • All tests verify that JSON parsing is working correctly{'\n'}
          • Results confirm if Gemini structured output is production-ready
        </Text>
      </View>
    </ScrollView>
  );
};

export default GeminiTestComponent;