import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,

} from "react-native";
import geminiTest, {
import { ResponsiveTheme } from '../../utils/constants';
  TestSummary,
  TestResult,
} from "../../test/geminiStructuredOutputTest";

import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

interface GeminiTestComponentProps {
  onClose?: () => void;
}

export const GeminiTestComponent: React.FC<GeminiTestComponentProps> = ({
  onClose,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestSummary | null>(null);
  const [currentTest, setCurrentTest] = useState<string>("");

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults(null);
    setCurrentTest("Initializing comprehensive test suite...");

    try {
      // Add visual feedback during testing
      const testNames = [
        "Service Availability",
        "Simple Structured Output",
        "Daily Workout Schema",
        "Weekly Plan Schema",
        "End-to-End Generation",
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
      setCurrentTest("Tests completed!");

      // Show alert with results
      crossPlatformAlert(
        results.overallSuccess
          ? "✅ All Tests Passed!"
          : "❌ Some Tests Failed",
        `${results.passedTests}/${results.totalTests} tests successful\n\n` +
          `This confirms that Gemini structured output is ${results.overallSuccess ? "100% working correctly!" : "having issues."}`,
        [{ text: "OK" }],
      );
    } catch (error) {
      console.error("Test execution failed:", error);
      crossPlatformAlert(
        "💥 Test Execution Failed",
        error instanceof Error ? error.message : "Unknown error occurred",
        [{ text: "OK" }],
      );
      setCurrentTest("Test execution failed");
    } finally {
      setIsRunning(false);
    }
  };

  const runQuickTest = async () => {
    setIsRunning(true);
    setCurrentTest("Running quick structured output test...");

    try {
      const result = await geminiTest.testSimpleStructuredOutput();
      crossPlatformAlert(
        result ? "✅ Quick Test Passed!" : "❌ Quick Test Failed",
        result
          ? "Simple structured output is working correctly!"
          : "There are issues with structured output.",
        [{ text: "OK" }],
      );
    } catch (error: any) {
      crossPlatformAlert("❌ Quick Test Error", error.message, [{ text: "OK" }]);
    } finally {
      setIsRunning(false);
      setCurrentTest("");
    }
  };

  const runWorkoutTest = async () => {
    setIsRunning(true);
    setCurrentTest("Testing weekly workout generation...");

    try {
      const result = await geminiTest.testEndToEndGeneration();
      crossPlatformAlert(
        result ? "✅ Workout Test Passed!" : "❌ Workout Test Failed",
        result
          ? "Weekly workout generation is working perfectly!"
          : "There are issues with workout generation.",
        [{ text: "OK" }],
      );
    } catch (error: any) {
      crossPlatformAlert("❌ Workout Test Error", error.message, [{ text: "OK" }]);
    } finally {
      setIsRunning(false);
      setCurrentTest("");
    }
  };

  const getStatusColor = (passed: boolean) =>
    passed ? ResponsiveTheme.colors.success : ResponsiveTheme.colors.error;

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: ResponsiveTheme.colors.background,
        padding: ResponsiveTheme.spacing.lg,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: ResponsiveTheme.spacing.lg,
        }}
      >
        <Text
          style={{
            fontSize: ResponsiveTheme.fontSize.xl,
            fontWeight: "bold",
            color: ResponsiveTheme.colors.text,
          }}
        >
          🧪 Gemini Test Suite
        </Text>
        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: ResponsiveTheme.spacing.sm,
              backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
              borderRadius: ResponsiveTheme.borderRadius.md,
            }}
          >
            <Text style={{ color: ResponsiveTheme.colors.text, fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Description */}
      <View
        style={{
          backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
          padding: ResponsiveTheme.spacing.md,
          borderRadius: ResponsiveTheme.borderRadius.md,
          marginBottom: ResponsiveTheme.spacing.lg,
        }}
      >
        <Text
          style={{
            color: ResponsiveTheme.colors.textSecondary,
            lineHeight: 20,
            textAlign: "center",
          }}
        >
          🎯 Verify that Gemini structured output is working 100% correctly
          {"\n"}
          Tests JSON parsing, schema validation, and workout generation pipeline
        </Text>
      </View>

      {/* Current Test Status */}
      {isRunning && currentTest && (
        <View
          style={{
            backgroundColor: ResponsiveTheme.colors.primary,
            padding: ResponsiveTheme.spacing.md,
            borderRadius: ResponsiveTheme.borderRadius.md,
            marginBottom: ResponsiveTheme.spacing.lg,
            alignItems: "center",
          }}
        >
          <ActivityIndicator
            size="small"
            color={ResponsiveTheme.colors.text}
            style={{ marginBottom: ResponsiveTheme.spacing.sm }}
          />
          <Text
            style={{
              color: ResponsiveTheme.colors.text,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {currentTest}
          </Text>
        </View>
      )}

      {/* Test Buttons */}
      <View style={{ marginBottom: ResponsiveTheme.spacing.lg }}>
        {/* Quick Test Button */}
        <TouchableOpacity
          onPress={runQuickTest}
          disabled={isRunning}
          style={{
            backgroundColor: isRunning
              ? ResponsiveTheme.colors.backgroundSecondary
              : "#3B82F6",
            padding: ResponsiveTheme.spacing.md,
            borderRadius: ResponsiveTheme.borderRadius.md,
            alignItems: "center",
            marginBottom: ResponsiveTheme.spacing.md,
          }}
        >
          <Text style={{ color: ResponsiveTheme.colors.text, fontWeight: "bold" }}>
            {isRunning ? "⏳ Testing..." : "⚡ Quick Test"}
          </Text>
        </TouchableOpacity>

        {/* Workout Test Button */}
        <TouchableOpacity
          onPress={runWorkoutTest}
          disabled={isRunning}
          style={{
            backgroundColor: isRunning
              ? ResponsiveTheme.colors.backgroundSecondary
              : ResponsiveTheme.colors.success,
            padding: ResponsiveTheme.spacing.md,
            borderRadius: ResponsiveTheme.borderRadius.md,
            alignItems: "center",
            marginBottom: ResponsiveTheme.spacing.md,
          }}
        >
          <Text style={{ color: ResponsiveTheme.colors.text, fontWeight: "bold" }}>
            {isRunning ? "⏳ Testing..." : "💪 Test Weekly Workout Generation"}
          </Text>
        </TouchableOpacity>

        {/* Full Test Suite Button */}
        <TouchableOpacity
          onPress={runAllTests}
          disabled={isRunning}
          style={{
            backgroundColor: isRunning
              ? ResponsiveTheme.colors.backgroundSecondary
              : "#FF8A5C",
            padding: ResponsiveTheme.spacing.md,
            borderRadius: ResponsiveTheme.borderRadius.md,
            alignItems: "center",
          }}
        >
          <Text style={{ color: ResponsiveTheme.colors.text, fontWeight: "bold" }}>
            {isRunning
              ? "⏳ Running Full Test Suite..."
              : "🎯 Run Complete Test Suite"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Test Results */}
      {testResults && testResults.results.length > 0 && (
        <View
          style={{
            backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
            padding: ResponsiveTheme.spacing.md,
            borderRadius: ResponsiveTheme.borderRadius.md,
            marginBottom: ResponsiveTheme.spacing.lg,
          }}
        >
          <Text
            style={{
              fontSize: ResponsiveTheme.fontSize.lg,
              fontWeight: "bold",
              color: ResponsiveTheme.colors.text,
              marginBottom: ResponsiveTheme.spacing.md,
            }}
          >
            📊 Test Results
          </Text>

          {testResults.results.map((result, index) => (
            <View
              key={index}
              style={{
                borderBottomWidth:
                  index < testResults.results.length - 1 ? 1 : 0,
                borderBottomColor: ResponsiveTheme.colors.backgroundTertiary,
                paddingBottom: ResponsiveTheme.spacing.sm,
                marginBottom: ResponsiveTheme.spacing.sm,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: ResponsiveTheme.spacing.xs,
                }}
              >
                <Text
                  style={{
                    fontWeight: "bold",
                    color: ResponsiveTheme.colors.text,
                    flex: 1,
                  }}
                >
                  {result.test}
                </Text>
                <Text
                  style={{
                    color: getStatusColor(result.passed),
                    fontWeight: "bold",
                  }}
                >
                  {result.passed ? "✅ PASS" : "❌ FAIL"}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                {result.duration && (
                  <Text
                    style={{
                      fontSize: ResponsiveTheme.fontSize.xs,
                      color: ResponsiveTheme.colors.textMuted,
                    }}
                  >
                    ⏱️ {result.duration}ms
                  </Text>
                )}
                {result.tokensUsed && (
                  <Text
                    style={{
                      fontSize: ResponsiveTheme.fontSize.xs,
                      color: ResponsiveTheme.colors.textMuted,
                    }}
                  >
                    🔢 {result.tokensUsed} tokens
                  </Text>
                )}
              </View>

              {result.error && (
                <Text
                  style={{
                    color: ResponsiveTheme.colors.error,
                    fontSize: ResponsiveTheme.fontSize.xs,
                    marginTop: ResponsiveTheme.spacing.xs,
                  }}
                >
                  Error: {result.error}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Summary */}
      {testResults && (
        <View
          style={{
            backgroundColor: testResults.overallSuccess
              ? "rgba(16, 185, 129, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            padding: ResponsiveTheme.spacing.md,
            borderRadius: ResponsiveTheme.borderRadius.md,
            marginBottom: ResponsiveTheme.spacing.lg,
            borderWidth: 1,
            borderColor: testResults.overallSuccess
              ? ResponsiveTheme.colors.success
              : ResponsiveTheme.colors.error,
          }}
        >
          <Text
            style={{
              fontSize: ResponsiveTheme.fontSize.lg,
              fontWeight: "bold",
              color: ResponsiveTheme.colors.text,
              marginBottom: ResponsiveTheme.spacing.sm,
            }}
          >
            📋 Final Result
          </Text>
          <Text
            style={{
              color: testResults.overallSuccess
                ? ResponsiveTheme.colors.success
                : ResponsiveTheme.colors.error,
              fontWeight: "bold",
              fontSize: ResponsiveTheme.fontSize.md,
              textAlign: "center",
            }}
          >
            {testResults.overallSuccess
              ? "🎉 ALL TESTS PASSED! Gemini Structured Output is 100% Working!"
              : "❌ Some tests failed. Review the results above."}
          </Text>
          <Text
            style={{
              color: ResponsiveTheme.colors.textSecondary,
              textAlign: "center",
              marginTop: ResponsiveTheme.spacing.sm,
            }}
          >
            {testResults.passedTests}/{testResults.totalTests} tests successful
          </Text>
        </View>
      )}

      {/* Instructions */}
      <View
        style={{
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          padding: ResponsiveTheme.spacing.md,
          borderRadius: ResponsiveTheme.borderRadius.md,
          borderWidth: 1,
          borderColor: "#3B82F6",
        }}
      >
        <Text
          style={{
            color: "#1E40AF",
            fontWeight: "bold",
            marginBottom: ResponsiveTheme.spacing.sm,
          }}
        >
          ℹ️ Test Information
        </Text>
        <Text
          style={{
            color: "#1E40AF",
            fontSize: ResponsiveTheme.fontSize.sm,
            lineHeight: 18,
          }}
        >
          • Quick Test: Basic structured output validation{"\n"}• Workout Test:
          Tests weekly workout plan generation{"\n"}• Full Suite: Comprehensive
          testing of all schemas{"\n"}• All tests verify that JSON parsing is
          working correctly{"\n"}• Results confirm if Gemini structured output
          is production-ready
        </Text>
      </View>
    </ScrollView>
  );
};

export default GeminiTestComponent;
