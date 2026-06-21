import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rp, rbr, rw, rs } from "../../utils/responsive";
import { Exercise, WorkoutSet } from "../../types/workout";

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

  const handleToggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

  const getMuscleGroupColor = (group: string) => {
    const colors: Record<string, string> = {
      chest: "#FF6B6B",
      back: "#4ECDC4",
      shoulders: "#45B7D1",
      biceps: "#96CEB4",
      triceps: "#FFEAA7",
      legs: "#DDA0DD",
      abs: "#98D8C8",
      glutes: "#F7DC6F",
      cardio: "#FF7675",
      flexibility: "#A29BFE",
    };
    return colors[group.toLowerCase()] || colors.primary;
  };

  const getDifficultyIcon = (
    difficulty: string,
  ): keyof typeof Ionicons.glyphMap => {
    switch (difficulty) {
      case "beginner":
        return "ellipse";
      case "intermediate":
        return "ellipse";
      case "advanced":
        return "ellipse";
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
    <Card
      style={
        StyleSheet.flatten(isCompleted
          ? [styles.card, styles.cardCompleted, style]
          : [styles.card, style])
      }
      variant="outlined"
    >
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <Pressable onPress={handleToggleExpand} style={styles.headerPressable}>
            <View style={styles.exerciseNumber}>
              <Text style={styles.exerciseNumberText}>{exerciseNumber}</Text>
            </View>

            <View style={styles.titleSection}>
              <Text
                style={[
                  styles.exerciseName,
                  isCompleted && styles.exerciseNameCompleted,
                ]}
              >
                {exercise.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
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
          </Pressable>

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
              <TouchableOpacity style={styles.playButton} onPress={onStart}>
                <Ionicons
                  name="play"
                  size={rf(14)}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
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
                {exercise.instructions.map((instruction, index) => (
                  <View
                    key={`instruction-${index}-${instruction.substring(0, 20)}`}
                    style={styles.instructionItem}
                  >
                    <Text style={styles.instructionNumber}>{index + 1}.</Text>
                    <Text style={styles.instructionText}>{instruction}</Text>
                  </View>
                ))}
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
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={onComplete}
                >
                  <Text style={styles.completeButtonText}>Mark Complete</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.completedStatus}>
                  <Text style={styles.completedStatusText}>Completed</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <Pressable onPress={handleToggleExpand} style={styles.expandIndicator}>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={rf(14)}
            color={colors.textMuted}
          />
        </Pressable>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },

  cardCompleted: {
    backgroundColor: `${colors.success}08`,
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
    width: rs(32),
    height: rs(32),
    borderRadius: rbr(16),
    backgroundColor: colors.success,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  playButton: {
    width: 44,
    height: 44,
    borderRadius: rbr(22),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  timerSection: {
    alignItems: "center" as const,
    marginBottom: spacing.md,
  },

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

  muscleGroupText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.medium,
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
    marginTop: spacing.sm,
  },
});
