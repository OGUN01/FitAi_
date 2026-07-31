import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  LayoutAnimation,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rp, rbr, rw, rs } from "../../utils/responsive";
import { hexToRgba } from "../../utils/colors";
import { Exercise, WorkoutSet } from "../../types/workout";
import { useReducedMotion } from "../../utils/accessibility/hooks";

interface ExerciseCardProps {
  exercise: Exercise;
  workoutSet: WorkoutSet;
  exerciseNumber: number;
  isCompleted?: boolean;
  onComplete?: () => void;
  onStart?: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  showTimer?: boolean;
  remainingTime?: number;
  style?: StyleProp<ViewStyle>;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = React.memo(({
  exercise,
  workoutSet,
  exerciseNumber,
  isCompleted = false,
  onComplete,
  onStart,
  expanded = false,
  onToggleExpand,
  showTimer = false,
  remainingTime = 0,
  style,
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [expandedInstructions, setExpandedInstructions] = useState<Set<number>>(new Set());
  const reduceMotion = useReducedMotion();

  const handleToggleExpand = () => {
    if (!reduceMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggleExpand?.();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatReps = (reps: number | string) => {
    if (typeof reps === "string") return reps;
    return reps.toString();
  };

  // Muscle-group chip tints — semantic aurora tokens passed through hexToRgba
  // so the chip background adapts to the active theme (dark/light). Text on
  // top is colors.text (styles.muscleGroupText), so the 0.25 alpha keeps
  // contrast readable in both modes.
  const getMuscleGroupColor = (group: string) => {
    const muscleColors: Record<string, string> = {
      chest: hexToRgba(colors.error, 0.25),
      back: hexToRgba(colors.info, 0.25),
      shoulders: hexToRgba(colors.info, 0.25),
      biceps: hexToRgba(colors.success, 0.25),
      triceps: hexToRgba(colors.warning, 0.25),
      legs: hexToRgba(colors.secondary, 0.25),
      abs: hexToRgba(colors.success, 0.25),
      glutes: hexToRgba(colors.warning, 0.25),
      cardio: hexToRgba(colors.error, 0.25),
      flexibility: hexToRgba(colors.neutral, 0.25),
    };
    return muscleColors[group.toLowerCase()] || hexToRgba(colors.primary, 0.25);
  };

  const getDifficultyIcon = (
    difficulty: string,
  ): keyof typeof Ionicons.glyphMap => {
    switch (difficulty) {
      case "beginner":
        return "trending-up-outline";
      case "intermediate":
        return "trending-up";
      case "advanced":
        return "flame";
      default:
        return "ellipse-outline";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return colors.success;
      case "intermediate":
        return colors.warning;
      case "advanced":
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  return (
    <View
      style={StyleSheet.flatten(
        isCompleted
          ? [styles.card, styles.cardOutlined, styles.cardCompleted, style]
          : [styles.card, styles.cardOutlined, style],
      )}
    >
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <AnimatedPressable
            onPress={handleToggleExpand}
            style={styles.headerPressable}
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
          >
            <View style={styles.exerciseNumber}>
              <Text style={styles.exerciseNumberText}>{exerciseNumber}</Text>
            </View>

            <View style={styles.titleSection}>
              <Text
                style={[
                  styles.exerciseName,
                  isCompleted && styles.exerciseNameCompleted,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {exercise.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText} numberOfLines={1}>
                  {workoutSet.sets} sets x {formatReps(workoutSet.reps)} reps
                </Text>
                {workoutSet.weight && (
                  <Text style={styles.metaText}> - {workoutSet.weight}kg</Text>
                )}
                {workoutSet.duration && (
                  <Text style={styles.metaText}>
                    {" "}
                    - {formatTime(workoutSet.duration)}
                  </Text>
                )}
              </View>
            </View>
          </AnimatedPressable>

          <View style={styles.statusSection}>
            {isCompleted ? (
              <View style={styles.completedBadge}>
                <Ionicons
                  name="checkmark"
                  size={rf(16)}
                  color={colors.white}
                />
              </View>
            ) : (
              <AnimatedPressable
                style={styles.playButton}
                onPress={onStart}
                scaleValue={0.9}
                springConfig="snappy"
                hapticType="light"
              >
                <Ionicons
                  name="play"
                  size={rf(14)}
                  color={colors.textSecondary}
                />
              </AnimatedPressable>
            )}
          </View>
        </View>

        {showTimer && remainingTime > 0 && (
          <View style={styles.timerSection}>
            <View style={styles.timerDisplay}>
              <Text style={styles.timerText}>
                Rest: {formatTime(remainingTime)}
              </Text>
            </View>
          </View>
        )}

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Ionicons
                  name={getDifficultyIcon(exercise.difficulty)}
                  size={rf(14)}
                  color={getDifficultyColor(exercise.difficulty)}
                  style={styles.detailIcon}
                />
                <Text style={styles.detailLabel}>Difficulty:</Text>
                <Text style={styles.detailValue}>{exercise.difficulty}</Text>
              </View>

              {workoutSet.restTime && (
                <View style={styles.detailRow}>
                  <Ionicons
                    name="time-outline"
                    size={rf(14)}
                    color={colors.textSecondary}
                    style={styles.detailIcon}
                  />
                  <Text style={styles.detailLabel}>Rest time:</Text>
                  <Text style={styles.detailValue}>
                    {formatTime(workoutSet.restTime)}
                  </Text>
                </View>
              )}

              {exercise.calories && (
                <View style={styles.detailRow}>
                  <Ionicons
                    name="flame-outline"
                    size={rf(14)}
                    color={colors.textSecondary}
                    style={styles.detailIcon}
                  />
                  <Text style={styles.detailLabel}>Calories:</Text>
                  <Text style={styles.detailValue}>
                    {exercise.calories} per set
                  </Text>
                </View>
              )}
            </View>

            {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
              <View style={styles.muscleGroupsSection}>
                <Text style={styles.sectionTitle}>Target Muscles</Text>
                <View style={styles.muscleGroupsContainer}>
                  {exercise.muscleGroups.map((group) => (
                    <View
                      key={`muscle-${group}`}
                      style={[
                        styles.muscleGroupChip,
                        { backgroundColor: getMuscleGroupColor(group) },
                      ]}
                    >
                      <Text style={styles.muscleGroupText}>
                        {group.replace("_", " ")}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {exercise.equipment && exercise.equipment.length > 0 && (
              <View style={styles.equipmentSection}>
                <Text style={styles.sectionTitle}>Equipment Needed</Text>
                <View style={styles.equipmentContainer}>
                  {exercise.equipment.map((item) => (
                    <View key={`equipment-${item}`} style={styles.equipmentChip}>
                      <Text style={styles.equipmentText}>
                        {item.replace("_", " ")}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {exercise.instructions && exercise.instructions.length > 0 && (
              <View style={styles.instructionsSection}>
                <Text style={styles.sectionTitle}>Instructions</Text>
                {exercise.instructions.map((instruction, index) => {
                  const isInstrExpanded = expandedInstructions.has(index);
                  return (
                    <View
                      key={`instruction-${index}-${instruction.substring(0, 20)}`}
                      style={styles.instructionItem}
                    >
                      <Text style={styles.instructionNumber}>{index + 1}.</Text>
                      <View style={styles.instructionTextWrapper}>
                        <Text
                          style={styles.instructionText}
                          numberOfLines={isInstrExpanded ? undefined : 5}
                        >
                          {instruction}
                        </Text>
                        <AnimatedPressable
                          onPress={() =>
                            setExpandedInstructions((prev) => {
                              const next = new Set(prev);
                              if (next.has(index)) {
                                next.delete(index);
                              } else {
                                next.add(index);
                              }
                              return next;
                            })
                          }
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel={isInstrExpanded ? "Show less" : "Show more"}
                          style={styles.showMoreButton}
                          scaleValue={0.9}
                          springConfig="snappy"
                          hapticType="light"
                        >
                          <Text style={styles.showMoreText}>
                            {isInstrExpanded ? "Show less" : "Show more"}
                          </Text>
                        </AnimatedPressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {exercise.tips && exercise.tips.length > 0 && (
              <View style={styles.tipsSection}>
                <Text style={styles.sectionTitle}>Tips</Text>
                {exercise.tips.map((tip) => (
                  <Text
                    key={`tip-${tip.substring(0, 30)}`}
                    style={styles.tipText}
                  >
                    - {tip}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.actionButtons}>
              {!isCompleted ? (
                <AnimatedPressable
                  style={styles.completeButton}
                  onPress={onComplete}
                  scaleValue={0.9}
                  springConfig="snappy"
                  hapticType="light"
                >
                  <Text style={styles.completeButtonText}>Mark Complete</Text>
                </AnimatedPressable>
              ) : (
                <View style={styles.completedStatus}>
                  <Text style={styles.completedStatusText}>Completed</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <AnimatedPressable
          onPress={handleToggleExpand}
          style={styles.expandIndicator}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? "Collapse exercise details" : "Expand exercise details"}
          scaleValue={0.9}
          springConfig="snappy"
          hapticType="light"
        >
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={rf(14)}
            color={colors.textMuted}
          />
        </AnimatedPressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },

  // Flat outlined surface replicating the old ui/Card `variant="outlined"` +
  // `padding="md"` treatment — Editorial Dark: hairline border on a flat step,
  // no elevation/shadow. Padding lives here (was applied by Card internally).
  cardOutlined: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },

  cardCompleted: {
    backgroundColor: hexToRgba(colors.success, 0.03),
    borderColor: colors.success,
  },

  cardContent: {
    padding: spacing.md,
  },

  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: spacing.sm,
  },

  headerPressable: {
    flexDirection: "row",
    alignItems: "center" as const,
    flex: 1,
  },

  exerciseNumber: {
    width: rs(32),
    height: rs(32),
    borderRadius: rbr(16),
    backgroundColor: colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: spacing.md,
  },

  exerciseNumberText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },

  titleSection: {
    flex: 1,
  },

  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: rp(4),
  },

  exerciseNameCompleted: {
    color: colors.success,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center" as const,
  },

  metaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  statusSection: {
    alignItems: "center" as const,
  },

  completedBadge: {
    width: Math.max(rs(44), 44),
    height: Math.max(rs(44), 44),
    borderRadius: rbr(22),
    backgroundColor: colors.success,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  playButton: {
    width: Math.max(rs(44), 44),
    height: Math.max(rs(44), 44),
    borderRadius: rbr(22),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  timerSection: {
    alignItems: "center" as const,
    marginBottom: spacing.md,
  },

  // Solid amber bg + white text — passes WCAG AA consistently across themes
  // (was rgba amber tint + amber text ~2.8:1 fail; tinted variants now use
  // the warningTint token only when paired with dark text).
  timerDisplay: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },

  timerText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },

  expandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  detailsSection: {
    marginBottom: spacing.md,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: spacing.xs,
  },

  detailIcon: {
    marginRight: spacing.sm,
    width: rw(20),
  },

  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
    minWidth: 80,
  },

  detailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
  },

  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  muscleGroupsSection: {
    marginBottom: spacing.md,
  },

  muscleGroupsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },

  muscleGroupChip: {
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
    borderRadius: rbr(12),
  },

  // Dark text on the muscle-group tint (some tints are very light — e.g.
  // triceps #FFEAA7 yellow — and fail contrast with white text.
  muscleGroupText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: "capitalize",
  },

  equipmentSection: {
    marginBottom: spacing.md,
  },

  equipmentContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },

  equipmentChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
    borderRadius: rbr(12),
  },

  equipmentText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: "capitalize",
  },

  instructionsSection: {
    marginBottom: spacing.md,
  },

  instructionItem: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },

  instructionNumber: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginRight: spacing.sm,
    minWidth: 20,
  },

  instructionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
    lineHeight: rf(20),
  },

  instructionTextWrapper: {
    flex: 1,
  },

  showMoreButton: {
    marginTop: rp(4),
    alignSelf: "flex-start",
  },

  showMoreText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },

  tipsSection: {
    marginBottom: spacing.md,
  },

  tipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: rf(18),
  },

  actionButtons: {
    alignItems: "center" as const,
    marginTop: spacing.md,
  },

  completeButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 44,
    justifyContent: "center",
  },

  completeButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },

  completedStatus: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  completedStatusText: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },

  expandIndicator: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: spacing.sm,
    minHeight: 44,
  },
});
