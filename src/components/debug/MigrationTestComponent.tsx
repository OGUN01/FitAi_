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
  Alert,
} from "react-native";
import { THEME } from "../ui";
import { dataBridge } from "../../services/DataBridge";
import { migrationManager } from "../../services/migrationManager";

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
      console.log(`🧪 Running test: ${testName}`);
      const result = await testFunction();
      addTestResult(testName, result, true);
      console.log(`✅ Test passed: ${testName}`, result);
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

      Alert.alert(
        "Tests Complete",
        "All migration tests have been completed. Check the results below.",
      );
    } catch (error) {
      console.error("❌ Test suite failed:", error);
      Alert.alert("Test Failed", "The test suite encountered an error.");
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const clearDataAndResults = async () => {
    await runTest("Clear Test Data", clearTestData);
    Alert.alert("Data Cleared", "Test data has been cleared.");
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
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.md,
  },

  title: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  subtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.lg,
  },

  controls: {
    flexDirection: "row",
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.lg,
    flexWrap: "wrap",
  },

  button: {
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignItems: "center" as const,
    minWidth: 100,
  },

  primaryButton: {
    backgroundColor: THEME.colors.primary,
  },

  secondaryButton: {
    backgroundColor: THEME.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },

  warningButton: {
    backgroundColor: THEME.colors.warning,
  },

  disabledButton: {
    opacity: 0.5,
  },

  buttonText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
  },

  buttonTextSecondary: {
    color: THEME.colors.text,
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
  },

  results: {
    flex: 1,
  },

  resultsTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  noResults: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    marginTop: THEME.spacing.xl,
  },

  resultItem: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    borderLeftWidth: 4,
  },

  successResult: {
    borderLeftColor: THEME.colors.success,
  },

  errorResult: {
    borderLeftColor: THEME.colors.error,
  },

  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: THEME.spacing.xs,
  },

  resultTest: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
    flex: 1,
  },

  resultTime: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
  },

  resultStatus: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
    marginBottom: THEME.spacing.xs,
  },

  resultData: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    fontFamily: "monospace",
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.sm,
  },
});
