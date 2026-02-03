import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rw } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard } from "../../ui/aurora/GlassCard";
import { AnimatedPressable } from "../../ui/aurora/AnimatedPressable";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../../../types/onboarding";

interface DataSummarySectionProps {
  personalInfo: PersonalInfoData | null;
  dietPreferences: DietPreferencesData | null;
  bodyAnalysis: BodyAnalysisData | null;
  workoutPreferences: WorkoutPreferencesData | null;
  calculatedData: AdvancedReviewData | null;
  onNavigateToTab?: (tabNumber: number) => void;
}

export const DataSummarySection: React.FC<DataSummarySectionProps> = ({
  personalInfo,
  dietPreferences,
  bodyAnalysis,
  workoutPreferences,
  calculatedData,
  onNavigateToTab,
}) => {
  return (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <View style={styles.sectionTitleContainer}>
          <Ionicons
            name="document-text-outline"
            size={rf(18)}
            color={ResponsiveTheme.colors.primary}
            style={styles.sectionTitleIcon}
          />
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Data Summary
          </Text>
        </View>
      </View>

      <View style={styles.summaryScrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.summaryScrollContent}
          decelerationRate="fast"
          snapToInterval={rw(130) + rw(12)}
          snapToAlignment="start"
        >
          {/* Personal Info Card */}
          <AnimatedPressable
            onPress={() => onNavigateToTab?.(1)}
            scaleValue={0.97}
            style={styles.summaryScrollCard}
          >
            <GlassCard
              elevation={2}
              blurIntensity="light"
              padding="md"
              borderRadius="lg"
              style={styles.summaryScrollCardInner}
            >
              <View style={styles.summaryScrollHeader}>
                <View style={styles.summaryScrollIconBg}>
                  <Ionicons
                    name="person"
                    size={rf(18)}
                    color={ResponsiveTheme.colors.primary}
                  />
                </View>
                <Ionicons
                  name="create-outline"
                  size={rf(14)}
                  color={ResponsiveTheme.colors.textMuted}
                />
              </View>
              <Text style={styles.summaryScrollTitle}>Personal Info</Text>
              <Text style={styles.summaryScrollValue} numberOfLines={1}>
                {personalInfo?.first_name} {personalInfo?.last_name}
              </Text>
              <Text style={styles.summaryScrollSub} numberOfLines={1}>
                {personalInfo?.age}y • {personalInfo?.gender}
              </Text>
              <Text style={styles.summaryScrollSub} numberOfLines={1}>
                {personalInfo?.country}
              </Text>
            </GlassCard>
          </AnimatedPressable>

          {/* Diet Card */}
          <AnimatedPressable
            onPress={() => onNavigateToTab?.(2)}
            scaleValue={0.97}
            style={styles.summaryScrollCard}
          >
            <GlassCard
              elevation={2}
              blurIntensity="light"
              padding="md"
              borderRadius="lg"
              style={styles.summaryScrollCardInner}
            >
              <View style={styles.summaryScrollHeader}>
                <View
                  style={[
                    styles.summaryScrollIconBg,
                    { backgroundColor: `${ResponsiveTheme.colors.success}20` },
                  ]}
                >
                  <Ionicons
                    name="restaurant"
                    size={rf(18)}
                    color={ResponsiveTheme.colors.success}
                  />
                </View>
                <Ionicons
                  name="create-outline"
                  size={rf(14)}
                  color={ResponsiveTheme.colors.textMuted}
                />
              </View>
              <Text style={styles.summaryScrollTitle}>Diet</Text>
              <Text style={styles.summaryScrollValue} numberOfLines={1}>
                {dietPreferences?.diet_type}
              </Text>
              <View style={styles.summaryScrollMeals}>
                <Text style={styles.summaryScrollSub}>Preferences Set</Text>
              </View>
            </GlassCard>
          </AnimatedPressable>

          {/* Body Analysis Card */}
          <AnimatedPressable
            onPress={() => onNavigateToTab?.(3)}
            scaleValue={0.97}
            style={styles.summaryScrollCard}
          >
            <GlassCard
              elevation={2}
              blurIntensity="light"
              padding="md"
              borderRadius="lg"
              style={styles.summaryScrollCardInner}
            >
              <View style={styles.summaryScrollHeader}>
                <View
                  style={[
                    styles.summaryScrollIconBg,
                    { backgroundColor: `${ResponsiveTheme.colors.warning}20` },
                  ]}
                >
                  <Ionicons
                    name="body"
                    size={rf(18)}
                    color={ResponsiveTheme.colors.warning}
                  />
                </View>
                <Ionicons
                  name="create-outline"
                  size={rf(14)}
                  color={ResponsiveTheme.colors.textMuted}
                />
              </View>
              <Text style={styles.summaryScrollTitle}>Body Analysis</Text>
              <Text style={styles.summaryScrollValue} numberOfLines={1}>
                {bodyAnalysis?.current_weight_kg}kg →{" "}
                {bodyAnalysis?.target_weight_kg}kg
              </Text>
              <Text style={styles.summaryScrollSub} numberOfLines={1}>
                BMI: {calculatedData?.calculated_bmi?.toFixed(1)}
              </Text>
            </GlassCard>
          </AnimatedPressable>

          {/* Workout Card */}
          <AnimatedPressable
            onPress={() => onNavigateToTab?.(4)}
            scaleValue={0.97}
            style={styles.summaryScrollCard}
          >
            <GlassCard
              elevation={2}
              blurIntensity="light"
              padding="md"
              borderRadius="lg"
              style={styles.summaryScrollCardInner}
            >
              <View style={styles.summaryScrollHeader}>
                <View
                  style={[
                    styles.summaryScrollIconBg,
                    { backgroundColor: `${ResponsiveTheme.colors.error}20` },
                  ]}
                >
                  <Ionicons
                    name="barbell"
                    size={rf(18)}
                    color={ResponsiveTheme.colors.error}
                  />
                </View>
                <Ionicons
                  name="create-outline"
                  size={rf(14)}
                  color={ResponsiveTheme.colors.textMuted}
                />
              </View>
              <Text style={styles.summaryScrollTitle}>Workout</Text>
              <Text style={styles.summaryScrollValue} numberOfLines={1}>
                {workoutPreferences?.intensity}
              </Text>
              <Text style={styles.summaryScrollSub} numberOfLines={1}>
                {workoutPreferences?.location}
              </Text>
            </GlassCard>
          </AnimatedPressable>
        </ScrollView>
      </View>
      <View style={styles.sectionBottomPadSmall} />
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  sectionEdgeToEdge: {
    marginBottom: rp(16),
    marginHorizontal: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderRadius: 0,
  },
  sectionTitlePadded: {
    paddingHorizontal: rp(20),
    paddingTop: rp(16),
    paddingBottom: rp(12),
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleIcon: {
    marginRight: rp(8),
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },
  summaryScrollContainer: {
    height: 140,
  },
  summaryScrollContent: {
    paddingHorizontal: rp(20),
    paddingBottom: rp(12),
  },
  summaryScrollCard: {
    width: rw(130),
    height: 120,
    marginRight: rp(12),
  },
  summaryScrollCardInner: {
    flex: 1,
    justifyContent: "space-between",
  },
  summaryScrollHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryScrollIconBg: {
    width: rf(32),
    height: rf(32),
    borderRadius: rf(16),
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryScrollTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(8),
  },
  summaryScrollValue: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },
  summaryScrollSub: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },
  summaryScrollMeals: {
    flexDirection: "row",
    gap: rp(4),
  },
  sectionBottomPadSmall: {
    height: rp(12),
  },
});
