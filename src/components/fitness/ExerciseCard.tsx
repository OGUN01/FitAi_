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
import { ResponsiveTheme } from "../../utils/constants";
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
    return colors[group.toLowerCase()] || ResponsiveTheme.colors.primary;
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
        return ResponsiveTheme.colors.success;
      case "intermediate":
        return ResponsiveTheme.colors.warning;
      case "advanced":
        return ResponsiveTheme.colors.error;
      default:
        return ResponsiveTheme.colors.textMuted;
    }
  };

  return (
    <Card
      style={
        (isCompleted
          ? [styles.card, styles.cardCompleted, style]
          : [styles.card, style]) as any
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
                  color={ResponsiveTheme.colors.white}
                />
              </View>
            ) : (
              <TouchableOpacity style={styles.playButton} onPress={onStart}>
                <Ionicons
                  name="play"
                  size={rf(14)}
                  color={ResponsiveTheme.colors.textSecondary}
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
                    color={ResponsiveTheme.colors.textSecondary}
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
                    color={ResponsiveTheme.colors.textSecondary}
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
            color={ResponsiveTheme.colors.textMuted}
          />
        </Pressable>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  cardCompleted: {
    backgroundColor: `${ResponsiveTheme.colors.success}08`,
    borderColor: ResponsiveTheme.colors.success,
  },

  cardContent: {
    padding: ResponsiveTheme.spacing.md,
  },

  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.sm,
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
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: ResponsiveTheme.spacing.md,
  },

  exerciseNumberText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  titleSection: {
    flex: 1,
  },

  exerciseName: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(4),
  },

  exerciseNameCompleted: {
    color: ResponsiveTheme.colors.success,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center" as const,
  },

  metaText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  statusSection: {
    alignItems: "center" as const,
  },

  completedBadge: {
    width: rs(32),
    height: rs(32),
    borderRadius: rbr(16),
    backgroundColor: ResponsiveTheme.colors.success,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  playButton: {
    width: 44,
    height: 44,
    borderRadius: rbr(22),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  timerSection: {
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  timerDisplay: {
    backgroundColor: ResponsiveTheme.colors.warning,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  timerText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  expandedContent: {
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  detailsSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  detailIcon: {
    marginRight: ResponsiveTheme.spacing.sm,
    width: rw(20),
  },

  detailLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginRight: ResponsiveTheme.spacing.sm,
    minWidth: 80,
  },

  detailValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  muscleGroupsSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  muscleGroupsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.xs,
  },

  muscleGroupChip: {
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
    borderRadius: rbr(12),
  },

  muscleGroupText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textTransform: "capitalize",
  },

  equipmentSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  equipmentContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.xs,
  },

  equipmentChip: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
    borderRadius: rbr(12),
  },

  equipmentText: {
    color: ResponsiveTheme.colors.text,
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textTransform: "capitalize",
  },

  instructionsSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  instructionItem: {
    flexDirection: "row",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  instructionNumber: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginRight: ResponsiveTheme.spacing.sm,
    minWidth: 20,
  },

  instructionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    flex: 1,
    lineHeight: rf(20),
  },

  tipsSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  tipText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
    lineHeight: rf(18),
  },

  actionButtons: {
    alignItems: "center" as const,
    marginTop: ResponsiveTheme.spacing.md,
  },

  completeButton: {
    backgroundColor: ResponsiveTheme.colors.success,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    minHeight: 44,
    justifyContent: "center",
  },

  completeButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  completedStatus: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
  },

  completedStatusText: {
    color: ResponsiveTheme.colors.success,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  expandIndicator: {
    alignItems: "center" as const,
    marginTop: ResponsiveTheme.spacing.sm,
  },
});
