/**
 * Error Handling Integration Guide
 *
 * Quick reference for integrating the new error handling components
 */

import {
  ScreenErrorBoundary,
  ErrorFallback,
  DataLoadError,
  NetworkError,
  EmptyState,
} from "@/components/errors";

// ============================================================================
// EXAMPLE 1: Wrap a Screen Component
// ============================================================================

export function HomeScreen() {
  return (
    <ScreenErrorBoundary
      screenName="Home"
      onReset={() => {
        // Reset logic (e.g., refetch data, clear state)
        refetchData();
      }}
    >
      <HomeScreenContent />
    </ScreenErrorBoundary>
  );
}

// ============================================================================
// EXAMPLE 2: Show Data Loading Errors
// ============================================================================

export function HealthDataSection() {
  const { healthData, error, loading, refetch } = useHealthData();

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <DataLoadError
        dataType="health data"
        onRetry={refetch}
        partial={healthData?.metadata?.isPartial}
      />
    );
  }

  return <HealthDataDisplay data={healthData} />;
}

// ============================================================================
// EXAMPLE 3: Show Partial Data Warning
// ============================================================================

export function HealthMetrics({ healthData }: Props) {
  return (
    <View>
      {/* Show warning for partial data */}
      {healthData.metadata?.isPartial && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={20} color={THEME.colors.warning} />
          <Text style={styles.warningText}>
            Some metrics unavailable:{" "}
            {healthData.metadata.failedMetrics?.join(", ")}
          </Text>
        </View>
      )}

      {/* Show metrics */}
      <MetricCard
        title="Steps"
        value={healthData.steps ?? "N/A"}
        isMissing={!healthData.steps}
      />
      {/* ... other metrics */}
    </View>
  );
}

// ============================================================================
// EXAMPLE 4: Show Fallback Data Indicator
// ============================================================================

export function CalorieCard({ healthData }: Props) {
  const isEstimated =
    healthData.metadata?.estimatedMetrics?.includes("totalCalories");

  return (
    <Card>
      <Text>Total Calories: {healthData.totalCalories}</Text>
      {isEstimated && (
        <Text style={styles.estimatedLabel}>(estimated from BMR + active)</Text>
      )}
    </Card>
  );
}

// ============================================================================
// EXAMPLE 5: Handle Network Errors
// ============================================================================

export function AIFeatureScreen() {
  const { generatePlan, error, loading } = useAIGeneration();
  const [isNetworkError, setIsNetworkError] = useState(false);

  useEffect(() => {
    // Check if error is network-related
    if (
      error?.message?.includes("network") ||
      error?.message?.includes("connection")
    ) {
      setIsNetworkError(true);
    }
  }, [error]);

  if (isNetworkError) {
    return <NetworkError onRetry={() => generatePlan()} />;
  }

  // ... rest of component
}

// ============================================================================
// EXAMPLE 6: Show Empty State
// ============================================================================

export function WorkoutHistory() {
  const { workouts, loading } = useWorkoutHistory();

  if (loading) return <LoadingSpinner />;

  if (workouts.length === 0) {
    return (
      <EmptyState
        icon="barbell-outline"
        title="No workouts yet"
        message="Start your first workout to track your progress"
        actionText="Start Workout"
        onAction={() => navigation.navigate("WorkoutPlan")}
      />
    );
  }

  return <WorkoutList workouts={workouts} />;
}

// ============================================================================
// EXAMPLE 7: Generic Error Fallback
// ============================================================================

export function CustomFeature() {
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <ErrorFallback
        title="Feature Unavailable"
        message={error}
        icon="alert-circle"
        onRetry={() => {
          setError(null);
          retryOperation();
        }}
        retryText="Try Again"
      />
    );
  }

  // ... component logic
}

// ============================================================================
// EXAMPLE 8: Error Boundary with Custom Reset
// ============================================================================

export function FitnessScreen() {
  const navigation = useNavigation();
  const { resetFitnessData } = useFitnessStore();

  return (
    <ScreenErrorBoundary
      screenName="Fitness"
      onReset={() => {
        // Custom reset logic
        resetFitnessData();
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      }}
    >
      <FitnessContent />
    </ScreenErrorBoundary>
  );
}

// ============================================================================
// STYLING EXAMPLES
// ============================================================================

const styles = StyleSheet.create({
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.warningLight,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: THEME.spacing.md,
    gap: THEME.spacing.xs,
  },

  warningText: {
    flex: 1,
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.warningDark,
  },

  estimatedLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    fontStyle: "italic",
    marginTop: THEME.spacing.xs,
  },
});

// ============================================================================
// HEALTH CONNECT SPECIFIC EXAMPLES
// ============================================================================

export function HealthConnectSync() {
  const { syncHealthData, lastSyncResult } = useHealthConnect();

  const handleSync = async () => {
    const result = await syncHealthData();

    if (!result.success) {
      // Show error
      Alert.alert("Sync Failed", result.error || "Could not sync health data");
      return;
    }

    if (result.partial) {
      // Show partial sync warning
      Alert.alert(
        "Partial Sync",
        `Some health metrics could not be loaded. ${result.data?.metadata?.failedMetrics?.length || 0} metrics failed.`,
        [
          { text: "View Details", onPress: () => showDetails(result.data) },
          { text: "OK" },
        ],
      );
    } else {
      // Full sync success
      Alert.alert("Success", "All health data synced successfully");
    }
  };

  return <Button onPress={handleSync}>Sync Health Data</Button>;
}

// ============================================================================
// ERROR LOGGING HELPER
// ============================================================================

export function logError(context: string, error: unknown) {
  if (__DEV__) {
    console.error(`[${context}] Error:`, error);
  }

  // In production, send to error tracking service
  // errorTrackingService.logError({ context, error });
}

// Usage:
try {
  await riskyOperation();
} catch (error) {
  logError("HealthConnect.syncData", error);
  setError(error instanceof Error ? error.message : "Unknown error");
}
