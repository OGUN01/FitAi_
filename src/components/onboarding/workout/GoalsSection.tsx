import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rh } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard, AnimatedPressable } from "../../../components/ui/aurora";
import {
  FITNESS_GOALS,
  ACTIVITY_LEVELS,
} from "../../../screens/onboarding/tabs/WorkoutPreferencesConstants";
import {
  WorkoutPreferencesData,
  BodyAnalysisData,
} from "../../../types/onboarding";

interface GoalsSectionProps {
  formData: WorkoutPreferencesData;
  bodyAnalysisData?: BodyAnalysisData | null;
  toggleGoal: (goalId: string) => void;
  updateField: <K extends keyof WorkoutPreferencesData>(field: K, value: WorkoutPreferencesData[K]) => void;
  getFieldError: (field: string) => string | undefined;
  hasFieldError: (field: string) => boolean;
  showInfoTooltip: (title: string, description: string) => void;
}

export const GoalsSection: React.FC<GoalsSectionProps> = ({
  formData,
  bodyAnalysisData,
  toggleGoal,
  updateField,
  getFieldError,
  hasFieldError,
  showInfoTooltip,
}) => {
  const handleInfoPress =
    (title: string, description: string) => (event: any) => {
      event.stopPropagation?.();
      showInfoTooltip(title, description);
    };

  // Get activity level info for display
  const currentActivityLevel = ACTIVITY_LEVELS.find(
    (level: any) => level.value === formData.activity_level,
  );

  return (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Fitness Goals
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          What are your fitness goals? (Select all that apply)
        </Text>
      </View>

      {/* Body type suggestion */}
      {bodyAnalysisData?.ai_body_type && (
        <View style={styles.edgeToEdgeContentPadded}>
          <View style={styles.autoSuggestText}>
            <Ionicons
              name="bulb-outline"
              size={rf(16)}
              color={ResponsiveTheme.colors.primary}
              style={{ marginRight: ResponsiveTheme.spacing.xs }}
            />
            <Text
              style={styles.autoSuggestTextContent}
              numberOfLines={3}
              ellipsizeMode="tail"
            >
              Based on your {bodyAnalysisData.ai_body_type} body type, we
              suggest focusing on{" "}
              {bodyAnalysisData.ai_body_type === "ectomorph"
                ? "muscle gain and strength"
                : bodyAnalysisData.ai_body_type === "endomorph"
                  ? "weight loss and endurance"
                  : "strength and muscle gain"}
            </Text>
          </View>
        </View>
      )}

      {/* Horizontal scroll for fitness goals - inset from card edges */}
      <View style={styles.scrollContainerInset}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentInset}
          decelerationRate="fast"
          snapToInterval={rw(105) + rw(10)}
          snapToAlignment="start"
        >
          {FITNESS_GOALS.map((goal: any) => {
            const isSelected = formData.primary_goals.includes(goal.id);
            return (
              <AnimatedPressable
                key={goal.id}
                onPress={() => toggleGoal(goal.id)}
                style={styles.consistentCardItem}
                scaleValue={0.97}
              >
                <View
                  style={[
                    styles.consistentCard,
                    isSelected && styles.consistentCardSelected,
                  ]}
                >
                  {/* Icon + Info row */}
                  <View style={styles.consistentCardHeader}>
                    <Ionicons
                      name={goal.iconName as any}
                      size={rf(22)}
                      color={
                        isSelected
                          ? ResponsiveTheme.colors.primary
                          : ResponsiveTheme.colors.textSecondary
                      }
                    />
                    <TouchableOpacity
                      onPress={handleInfoPress(goal.title, goal.description)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`More info about ${goal.title}`}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={rf(14)}
                        color={ResponsiveTheme.colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  {/* Title */}
                  <Text
                    style={[
                      styles.consistentCardTitle,
                      isSelected && styles.consistentCardTitleSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {goal.title}
                  </Text>
                  {/* Selection indicator */}
                  <View
                    style={[
                      styles.consistentCardIndicator,
                      isSelected && styles.consistentCardIndicatorSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={rf(12)}
                        color={ResponsiveTheme.colors.white}
                      />
                    )}
                  </View>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      {hasFieldError("goals") && (
        <View style={styles.edgeToEdgeContentPadded}>
          <Text style={styles.errorText}>{getFieldError("goals")}</Text>
        </View>
      )}

      {/* Activity Level - User Selection (SSOT for activity_level) */}
      <View style={styles.edgeToEdgeContentPadded}>
        <View style={styles.activityField}>
          <Text style={styles.fieldLabel} numberOfLines={1}>
            Daily Activity Level *
          </Text>
          <Text
            style={styles.fieldSubtitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            How active are you in your daily life, including work and leisure?
          </Text>
        </View>
      </View>

      <View style={styles.scrollContainerInset}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentInset}
          decelerationRate="fast"
          snapToInterval={rw(105) + rw(10)}
          snapToAlignment="start"
        >
          {ACTIVITY_LEVELS.map((level: any) => {
            const isSelected = formData.activity_level === level.value;
            return (
              <AnimatedPressable
                key={level.value}
                style={styles.activityCardItem}
                onPress={() => updateField("activity_level", level.value)}
                scaleValue={0.95}
              >
                <View
                  style={[
                    styles.activityCard,
                    isSelected && styles.activityCardSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.activityIconContainer,
                      isSelected && styles.activityIconContainerSelected,
                    ]}
                  >
                    <Ionicons
                      name={level.iconName as any}
                      size={rf(24)}
                      color={
                        isSelected
                          ? ResponsiveTheme.colors.primary
                          : ResponsiveTheme.colors.textSecondary
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.activityCardTitle,
                      isSelected && styles.activityCardTitleSelected,
                    ]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {level.label}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        {hasFieldError("activity_level") && (
          <Text style={styles.errorText}>{getFieldError("activity_level")}</Text>
        )}
      </View>
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  sectionEdgeToEdge: {
    marginTop: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
    marginHorizontal: -ResponsiveTheme.spacing.lg,
  },
  sectionTitlePadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  sectionSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.4,
    flexShrink: 1,
  },
  edgeToEdgeContentPadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  autoSuggestText: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  autoSuggestTextContent: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    lineHeight: rf(18),
  },
  scrollContainerInset: {
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.sm,
    overflow: "hidden",
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  scrollContentInset: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    gap: rw(10),
  },
  consistentCardItem: {
    width: rw(105),
  },
  consistentCard: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    padding: ResponsiveTheme.spacing.sm,
    minHeight: rh(12),
    alignItems: "center",
  },
  consistentCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },
  consistentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  consistentCardTitle: {
    fontSize: rf(11),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  consistentCardTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },
  consistentCardIndicator: {
    width: rf(18),
    height: rf(18),
    borderRadius: rf(9),
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginTop: ResponsiveTheme.spacing.xs,
  },
  consistentCardIndicatorSelected: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  errorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  activityField: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  fieldLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    flexShrink: 1,
  },
  fieldSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  calculatedActivityCard: {
    // Custom styles for activity card if needed
  },
  calculatedActivityContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  calculatedActivityText: {
    flex: 1,
  },
  calculatedActivityTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
    flexShrink: 1,
  },
  calculatedActivityDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    flexShrink: 1,
  },
  calculatedActivityNote: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: ResponsiveTheme.spacing.sm,
  },
  calculatedActivityNoteText: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },
  activityCardItem: {
    width: rw(105),
  },
  activityCard: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    padding: ResponsiveTheme.spacing.sm,
    minHeight: rh(10),
    alignItems: "center",
    justifyContent: "center",
  },
  activityCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },
  activityIconContainer: {
    width: rf(44),
    height: rf(44),
    borderRadius: rf(22),
    backgroundColor: `${ResponsiveTheme.colors.textSecondary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  activityIconContainerSelected: {
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },
  activityCardTitle: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(14),
  },
  activityCardTitleSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
});
