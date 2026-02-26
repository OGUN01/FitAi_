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
  OCCUPATION_OPTIONS,
} from "../../../screens/onboarding/tabs/WorkoutPreferencesConstants";
import {
  WorkoutPreferencesData,
  BodyAnalysisData,
  PersonalInfoData,
} from "../../../types/onboarding";

interface GoalsSectionProps {
  formData: WorkoutPreferencesData;
  personalInfoData?: PersonalInfoData | null;
  bodyAnalysisData?: BodyAnalysisData | null;
  toggleGoal: (goalId: string) => void;
  getFieldError: (field: string) => string | undefined;
  hasFieldError: (field: string) => boolean;
  showInfoTooltip: (title: string, description: string) => void;
}

export const GoalsSection: React.FC<GoalsSectionProps> = ({
  formData,
  personalInfoData,
  bodyAnalysisData,
  toggleGoal,
  getFieldError,
  hasFieldError,
  showInfoTooltip,
}) => {
  // Get activity level info for display
  const currentActivityLevel = ACTIVITY_LEVELS.find(
    (level: any) => level.value === formData.activity_level,
  );
  const occupationType = personalInfoData?.occupation_type || "desk_job";
  const occupationLabel =
    OCCUPATION_OPTIONS.find((opt: any) => opt.value === occupationType)
      ?.label || "Unknown";

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
                      onPress={() =>
                        showInfoTooltip(goal.title, goal.description)
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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

      {/* Activity Level - Display Only (Auto-calculated from occupation) */}
      <View style={styles.edgeToEdgeContentPadded}>
        <View style={styles.activityField}>
          <Text style={styles.fieldLabel} numberOfLines={1}>
            Daily Activity Level
          </Text>
          <Text
            style={styles.fieldSubtitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            Auto-calculated based on your occupation ({occupationLabel})
          </Text>

          <GlassCard
            elevation={2}
            blurIntensity="default"
            padding="md"
            borderRadius="lg"
            style={styles.calculatedActivityCard}
          >
            <View style={styles.calculatedActivityContent}>
              <Ionicons
                name={(currentActivityLevel?.iconName as any) || "bed-outline"}
                size={rf(32)}
                color={ResponsiveTheme.colors.textSecondary}
                style={{ marginRight: ResponsiveTheme.spacing.md }}
              />
              <View style={styles.calculatedActivityText}>
                <Text
                  style={styles.calculatedActivityTitle}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentActivityLevel?.label || "Sedentary"}
                </Text>
                <Text
                  style={styles.calculatedActivityDescription}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {currentActivityLevel?.description || "Little to no exercise"}
                </Text>
                <View style={styles.calculatedActivityNote}>
                  <Ionicons
                    name="bulb-outline"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.primary}
                    style={{ marginRight: ResponsiveTheme.spacing.xs }}
                  />
                  <Text
                    style={styles.calculatedActivityNoteText}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    Activity level is automatically determined based on your
                    occupation type.
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </View>
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
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
});
