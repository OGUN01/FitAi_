import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import {
  useDashboardIntegration,
  useUnitConversion,
} from "../../utils/integration";
import { useOffline } from "../../hooks/useOffline";
import { useAuth } from "../../hooks/useAuth";

/**
 * Example of how to integrate the existing HomeScreen with real backend data
 * This shows how to replace mock data with actual user data
 */

export const HomeScreenIntegrationExample: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();
  const {
    getUserStats,
    getHealthMetrics,
    getDailyCalorieNeeds,
    getUserPreferences,
    isOnline,
    profile,
  } = useDashboardIntegration();

  const { formatWeight, formatHeight } = useUnitConversion();
  const { syncNow, queueLength, syncInProgress } = useOffline();

  // Get real data instead of mock data
  const stats = getUserStats();
  const healthMetrics = getHealthMetrics();
  const dailyCalories = getDailyCalorieNeeds();
  const preferences = getUserPreferences();

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      // Sync offline data if needed
      if (queueLength > 0) {
        await syncNow();
      }

      // Refresh user data
      if (user) {
        // You could reload profile data here if needed
        // await getCompleteProfile(user.id);
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#ff6b35"
        />
      }
    >
      {/* Header with user greeting */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Good {getTimeOfDay()},{" "}
          {profile?.personalInfo.name || "Fitness Enthusiast"}!
        </Text>
        <Text style={styles.subtitle}>Ready to crush your goals today?</Text>
      </View>

      {/* Network Status Indicator */}
      <NetworkStatusIndicator isOnline={isOnline} queueLength={queueLength} />

      {/* Quick Stats - Real Data */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>

        <View style={styles.statsGrid}>
          <StatCard
            title="Total Workouts"
            value={stats?.totalWorkouts?.toString() ?? "--"}
            icon="💪"
            subtitle="All time"
          />

          <StatCard
            title="Current Streak"
            value={
              stats?.currentStreak !== undefined
                ? `${stats.currentStreak} days`
                : "--"
            }
            icon="🔥"
            subtitle="Keep it up!"
          />

          <StatCard
            title="Calories Burned"
            value={stats?.totalCaloriesBurned?.toString() ?? "--"}
            icon="⚡"
            subtitle="Total"
          />

          <StatCard
            title="Longest Streak"
            value={
              stats?.longestStreak !== undefined
                ? `${stats.longestStreak} days`
                : "--"
            }
            icon="🏆"
            subtitle="Personal best"
          />
        </View>
      </View>

      {/* Health Metrics - Real Data */}
      {healthMetrics && (
        <View style={styles.healthContainer}>
          <Text style={styles.sectionTitle}>Health Metrics</Text>

          <View style={styles.healthGrid}>
            <HealthMetricCard
              title="BMI"
              value={healthMetrics.bmi.toString()}
              subtitle={healthMetrics.bmiCategory}
              color={getBMIColor(healthMetrics.bmi)}
            />

            <HealthMetricCard
              title="Weight"
              value={formatWeight(healthMetrics.weight)}
              subtitle="Current"
              color="#4CAF50"
            />

            <HealthMetricCard
              title="Height"
              value={formatHeight(healthMetrics.height)}
              subtitle="Profile"
              color="#2196F3"
            />
          </View>
        </View>
      )}

      {/* Daily Calories - Real Data */}
      {dailyCalories && (
        <View style={styles.caloriesContainer}>
          <Text style={styles.sectionTitle}>Daily Nutrition Goal</Text>

          <View style={styles.caloriesCard}>
            <Text style={styles.caloriesValue}>{dailyCalories}</Text>
            <Text style={styles.caloriesLabel}>Calories per day</Text>
            <Text style={styles.caloriesSubtitle}>
              Based on your profile and {profile?.personalInfo.activityLevel}{" "}
              activity level
            </Text>
          </View>
        </View>
      )}

      {/* User Preferences Display */}
      <View style={styles.preferencesContainer}>
        <Text style={styles.sectionTitle}>Your Preferences</Text>

        <View style={styles.preferencesList}>
          <PreferenceItem
            label="Units"
            value={
              preferences?.units === "metric"
                ? "Metric (kg, cm)"
                : "Imperial (lbs, ft)"
            }
          />
          <PreferenceItem
            label="Notifications"
            value={preferences?.notifications ? "Enabled" : "Disabled"}
          />
          <PreferenceItem
            label="Theme"
            value={preferences?.darkMode ? "Dark Mode" : "Light Mode"}
          />
        </View>
      </View>

      {/* Integration Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>
          🔧 Integration Instructions
        </Text>
        <Text style={styles.instructionsText}>
          This example shows how to replace mock data in HomeScreen.tsx with
          real backend data:
        </Text>
        <Text style={styles.instructionsText}>
          • Use useDashboardIntegration() hook for user stats and metrics
        </Text>
        <Text style={styles.instructionsText}>
          • Use useUnitConversion() for automatic unit formatting
        </Text>
        <Text style={styles.instructionsText}>
          • Use useOffline() for sync status and network indicators
        </Text>
        <Text style={styles.instructionsText}>
          • Add pull-to-refresh for data synchronization
        </Text>
      </View>
    </ScrollView>
  );
};

// Helper Components

const NetworkStatusIndicator: React.FC<{
  isOnline: boolean;
  queueLength: number;
}> = ({ isOnline, queueLength }) => {
  if (isOnline && queueLength === 0) return null;

  return (
    <View style={[styles.networkStatus, !isOnline && styles.offline]}>
      <Text style={styles.networkStatusText}>
        {!isOnline ? "📱 Offline Mode" : `📤 ${queueLength} items pending sync`}
      </Text>
    </View>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: string;
  subtitle: string;
}> = ({ title, value, icon, subtitle }) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={styles.statSubtitle}>{subtitle}</Text>
  </View>
);

const HealthMetricCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  color: string;
}> = ({ title, value, subtitle, color }) => (
  <View style={styles.healthCard}>
    <Text style={[styles.healthValue, { color }]}>{value}</Text>
    <Text style={styles.healthTitle}>{title}</Text>
    <Text style={styles.healthSubtitle}>{subtitle}</Text>
  </View>
);

const PreferenceItem: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={styles.preferenceItem}>
    <Text style={styles.preferenceLabel}>{label}</Text>
    <Text style={styles.preferenceValue}>{value}</Text>
  </View>
);

// Helper Functions

const getTimeOfDay = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
};

const getBMIColor = (bmi: number): string => {
  if (bmi < 18.5) return "#FF9800"; // Underweight
  if (bmi < 25) return "#4CAF50"; // Normal
  if (bmi < 30) return "#FF9800"; // Overweight
  return "#F44336"; // Obese
};

// Styles
const styles = {
  container: {
    flex: 1,
    backgroundColor: "#0a0f1c",
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: "#ffffff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#8e9aaf",
  },
  networkStatus: {
    backgroundColor: "#ff6b35",
    padding: 8,
    marginHorizontal: 20,
    borderRadius: 6,
    marginBottom: 20,
  },
  offline: {
    backgroundColor: "#666",
  },
  networkStatusText: {
    color: "#ffffff",
    textAlign: "center" as const,
    fontSize: 14,
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: "#ffffff",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "#1a1f2e",
    padding: 16,
    borderRadius: 12,
    width: "48%",
    marginBottom: 12,
    alignItems: "center" as const,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: "#ff6b35",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: "#ffffff",
    textAlign: "center" as const,
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: "#8e9aaf",
    textAlign: "center" as const,
  },
  healthContainer: {
    padding: 20,
  },
  healthGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-between",
  },
  healthCard: {
    backgroundColor: "#1a1f2e",
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center" as const,
  },
  healthValue: {
    fontSize: 20,
    fontWeight: "bold" as const,
    marginBottom: 4,
  },
  healthTitle: {
    fontSize: 14,
    color: "#ffffff",
    marginBottom: 2,
  },
  healthSubtitle: {
    fontSize: 12,
    color: "#8e9aaf",
  },
  caloriesContainer: {
    padding: 20,
  },
  caloriesCard: {
    backgroundColor: "#1a1f2e",
    padding: 24,
    borderRadius: 12,
    alignItems: "center" as const,
  },
  caloriesValue: {
    fontSize: 36,
    fontWeight: "bold" as const,
    color: "#ff6b35",
    marginBottom: 4,
  },
  caloriesLabel: {
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 8,
  },
  caloriesSubtitle: {
    fontSize: 14,
    color: "#8e9aaf",
    textAlign: "center" as const,
  },
  preferencesContainer: {
    padding: 20,
  },
  preferencesList: {
    backgroundColor: "#1a1f2e",
    borderRadius: 12,
    padding: 16,
  },
  preferenceItem: {
    flexDirection: "row" as const,
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  preferenceLabel: {
    fontSize: 14,
    color: "#ffffff",
  },
  preferenceValue: {
    fontSize: 14,
    color: "#8e9aaf",
  },
  instructionsContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: "#1a1f2e",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ff6b35",
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "bold" as const,
    color: "#ff6b35",
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: "#8e9aaf",
    marginBottom: 4,
    lineHeight: 20,
  },
};

export default HomeScreenIntegrationExample;
