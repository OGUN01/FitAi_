/**
 * Migration Test Component
 * Debug component to test migration functionality
 * Remove this component in production builds
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import { dataBridge } from "../../services/DataBridge";
import { migrationManager } from "../../services/migrationManager";
import { ResponsiveTheme } from '../../utils/constants';
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

interface TestResult {
  test: string;
  result: any;
  success: boolean;
  timestamp: string;
}

export const MigrationTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (test: string, result: any, success: boolean) => {
    const newResult: TestResult = {
      test,
      result,
      success,
      timestamp: new Date().toLocaleTimeString(),
    };
    setTestResults((prev) => [newResult, ...prev]);
  };

  const runTest = async (
    testName: string,
    testFunction: () => Promise<any>,
  ) => {
    try {
      const result = await testFunction();
      addTestResult(testName, result, true);
    } catch (error) {
      console.error(`❌ Test failed: ${testName}`, error);
      addTestResult(
        testName,
        error instanceof Error ? error.message : "Unknown error",
        false,
      );
    }
  };

  const testHasLocalData = async () => {
    if (__DEV__) {
      const testUserId = "test-user-123";
      dataBridge.setUserId(testUserId);

      const hasData = await dataBridge.hasLocalData();
      return { hasData, userId: testUserId };
    }
    throw new Error("This test is only available in development mode");
  };

  const testCreateSampleData = async () => {
    if (__DEV__) {
      const testUserId = "test-user-123";
      dataBridge.setUserId(testUserId);

      const created = await dataBridge.createSampleProfileData();
      return { created, userId: testUserId };
    }
    throw new Error("This test is only available in development mode");
  };

  const testMigrationDetection = async () => {
    if (__DEV__) {
      const testUserId = "test-user-123";
      const migrationNeeded =
        await migrationManager.checkProfileMigrationNeeded(testUserId);
      return { migrationNeeded, userId: testUserId };
    }
    throw new Error("This test is only available in development mode");
  };

  const testProfileDataSummary = async () => {
    if (__DEV__) {
      const testUserId = "test-user-123";
      dataBridge.setUserId(testUserId);

      const summary = await dataBridge.getProfileDataSummary();
      return summary;
    }
    throw new Error("This test is only available in development mode");
  };

  const testLocalStorageMethods = async () => {
    if (__DEV__) {
      const testUserId = "test-user-123";
      dataBridge.setUserId(testUserId);
      await dataBridge.testLocalStorageMethods();
      return { completed: true, userId: testUserId };
    }
    throw new Error("This test is only available in development mode");
  };

  const testCompleteFlow = async () => {
    if (__DEV__) {
      const testUserId = "test-user-123";
      await migrationManager.testMigrationFlow(testUserId);
      return { completed: true, userId: testUserId };
    }
    throw new Error("This test is only available in development mode");
  };

  const clearTestData = async () => {
    if (__DEV__) {
      const testUserId = "test-user-123";
      dataBridge.setUserId(testUserId);

      const cleared = await dataBridge.clearLocalData();
      return { cleared, userId: testUserId };
    }
    throw new Error("This test is only available in development mode");
  };

  const runAllTests = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 0: Test localStorage methods directly
      await runTest("Test localStorage Methods", testLocalStorageMethods);

      // Test 1: Check initial state
      await runTest("Check Initial Local Data", testHasLocalData);

      // Test 2: Create sample data
      await runTest("Create Sample Data", testCreateSampleData);

      // Test 3: Check data after creation
      await runTest("Check Local Data After Creation", testHasLocalData);

      // Test 4: Get profile summary
      await runTest("Get Profile Data Summary", testProfileDataSummary);

      // Test 5: Test migration detection
      await runTest("Test Migration Detection", testMigrationDetection);

      // Test 6: Test complete flow
      await runTest("Test Complete Migration Flow", testCompleteFlow);

      crossPlatformAlert(
        "Tests Complete",
        "All migration tests have been completed. Check the results below.",
      );
    } catch (error) {
      console.error("❌ Test suite failed:", error);
      crossPlatformAlert("Test Failed", "The test suite encountered an error.");
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const clearDataAndResults = async () => {
    await runTest("Clear Test Data", clearTestData);
    crossPlatformAlert("Data Cleared", "Test data has been cleared.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Migration System Test</Text>
      <Text style={styles.subtitle}>
        Debug component for testing migration functionality
      </Text>

      {/* Test Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            isRunning && styles.disabledButton,
          ]}
          onPress={runAllTests}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? "Running Tests..." : "Run All Tests"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={clearResults}
        >
          <Text style={styles.buttonTextSecondary}>Clear Results</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.warningButton]}
          onPress={clearDataAndResults}
        >
          <Text style={styles.buttonText}>Clear Test Data</Text>
        </TouchableOpacity>
      </View>

      {/* Test Results */}
      <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultsTitle}>
          Test Results ({testResults.length})
        </Text>

        {testResults.length === 0 ? (
          <Text style={styles.noResults}>
            No test results yet. Run tests to see results.
          </Text>
        ) : (
          testResults.map((result, index) => (
            <View
              key={index}
              style={[
                styles.resultItem,
                result.success ? styles.successResult : styles.errorResult,
              ]}
            >
              <View style={styles.resultHeader}>
                <Text style={styles.resultTest}>{result.test}</Text>
                <Text style={styles.resultTime}>{result.timestamp}</Text>
              </View>

              <Text style={styles.resultStatus}>
                {result.success ? "✅ PASSED" : "❌ FAILED"}
              </Text>

              <Text style={styles.resultData}>
                {typeof result.result === "object"
                  ? JSON.stringify(result.result, null, 2)
                  : String(result.result)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
    padding: ResponsiveTheme.spacing.md,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  controls: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.lg,
    flexWrap: "wrap",
  },

  button: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    alignItems: "center" as const,
    minWidth: 100,
  },

  primaryButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  secondaryButton: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  warningButton: {
    backgroundColor: ResponsiveTheme.colors.warning,
  },

  disabledButton: {
    opacity: 0.5,
  },

  buttonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  buttonTextSecondary: {
    color: ResponsiveTheme.colors.text,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  results: {
    flex: 1,
  },

  resultsTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  noResults: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: ResponsiveTheme.spacing.xl,
  },

  resultItem: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
    borderLeftWidth: 4,
  },

  successResult: {
    borderLeftColor: ResponsiveTheme.colors.success,
  },

  errorResult: {
    borderLeftColor: ResponsiveTheme.colors.error,
  },

  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  resultTest: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },

  resultTime: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },

  resultStatus: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  resultData: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontFamily: "monospace",
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
});
