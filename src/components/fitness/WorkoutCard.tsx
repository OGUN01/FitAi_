import React, { memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Animated,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Card, Button } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr } from "../../utils/responsive";
import { Workout } from "../../types/workout";

interface WorkoutCardProps {
  workout: Workout;
  onStart: () => void;
  onViewDetails?: () => void;
  isInProgress?: boolean;
  progress?: number; // 0-100
  style?: StyleProp<ViewStyle>;
  animatedValue?: Animated.Value;
}

// PERF-010 FIX: Wrap component in React.memo to prevent unnecessary re-renders in FlatList
export const WorkoutCard: React.FC<WorkoutCardProps> = memo(
  ({
    workout,
    onStart,
    onViewDetails,
    isInProgress = false,
    progress = 0,
    style,
    animatedValue,
  }) => {
    const getDifficultyColor = (difficulty: string) => {
      switch (difficulty) {
        case "beginner":
          return ResponsiveTheme.colors.success;
        case "intermediate":
          return ResponsiveTheme.colors.warning;
        case "advanced":
          return ResponsiveTheme.colors.error;
        default:
          return ResponsiveTheme.colors.textSecondary;
      }
    };

    const getCategoryIcon = (category: string) => {
      const icons: Record<string, string> = {
        strength: "💪",
        cardio: "🏃",
        flexibility: "🧘",
        hiit: "🔥",
        yoga: "🕉️",
        pilates: "🤸",
        hybrid: "⚡",
      };
      return icons[category] || "🏋️";
    };

    const getEquipmentText = (equipment: string[]) => {
      if (equipment.length === 0 || equipment.includes("none")) {
        return "No equipment";
      }
      if (equipment.length === 1) {
        return equipment[0].replace("_", " ");
      }
      return `${equipment.length} equipment types`;
    };

    const getMuscleGroupText = (groups: string[]) => {
      if (groups.length === 0) return "Full body";
      if (groups.length <= 2) {
        return groups.join(", ").replace(/_/g, " ");
      }
      return `${groups.length} muscle groups`;
    };

    const cardContent = (
      <Card style={StyleSheet.flatten([styles.card, style])} variant="elevated">
        {/* Progress Bar */}
        {progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        )}

        <View
          style={styles.cardContent}
        >
          <Pressable onPress={onViewDetails}>
          <View style={styles.header}>
            <View style={styles.titleSection}>
              <View style={styles.titleRow}>
                <View style={styles.iconContainer}>
                  <Text style={styles.categoryIcon}>
                    {getCategoryIcon(workout.category)}
                  </Text>
                </View>
                <View style={styles.titleContainer}>
                  <Text style={styles.title} numberOfLines={2}>
                    {workout.title}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.difficultyBadge,
                        {
                          backgroundColor: getDifficultyColor(
                            workout.difficulty,
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.difficultyText}>
                        {workout.difficulty.toUpperCase()}
                      </Text>
                    </View>
                    {workout.aiGenerated && (
                      <View style={styles.aiPillBadge}>
                        <Text style={styles.aiPillText}>✨ AI</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <Text style={styles.description} numberOfLines={3}>
                {workout.description}
              </Text>
            </View>
          </View>

          {/* Progress Bar (if workout is in progress) */}
          {isInProgress && (
            <View style={styles.progressSection}>
              <View style={styles.workoutProgressBar}>
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(progress)}% complete
              </Text>
            </View>
          )}

          {/* Workout Details */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>⏱️</Text>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{workout.duration} min</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>🔥</Text>
              <Text style={styles.detailLabel}>Calories</Text>
              <Text style={styles.detailValue}>
                {workout.estimatedCalories || 0}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>🎯</Text>
              <Text style={styles.detailLabel}>Exercises</Text>
              <Text style={styles.detailValue}>
                {workout.exercises?.length ?? 0}
              </Text>
            </View>
          </View>

          {/* Equipment & Target Muscles */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🏋️</Text>
              <Text style={styles.infoText}>
                {getEquipmentText(workout.equipment)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>💪</Text>
              <Text style={styles.infoText}>
                {getMuscleGroupText(workout.targetMuscleGroups)}
              </Text>
            </View>
          </View>
          </Pressable>

          {/* Action Button */}
          <View style={styles.actionSection}>
            <Button
              title={isInProgress ? "Continue Workout" : "Start Workout"}
              onPress={onStart}
              variant={isInProgress ? "secondary" : "primary"}
              style={styles.startButton}
              size="lg"
            />
          </View>

          {/* Additional Info */}
          {workout.tags && workout.tags.length > 0 && (
            <View style={styles.tagsSection}>
              {workout.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {workout.tags.length > 3 && (
                <Text style={styles.moreTagsText}>
                  +{workout.tags.length - 3} more
                </Text>
              )}
            </View>
          )}
        </View>
      </Card>
    );

    // Wrap with animation if provided
    if (animatedValue) {
      return (
        <Animated.View
          style={{
            opacity: animatedValue,
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          }}
        >
          {cardContent}
        </Animated.View>
      );
    }

    return cardContent;
  },
);

const styles = StyleSheet.create({
  card: {
    marginBottom: ResponsiveTheme.spacing.lg,
    overflow: "hidden",
    borderRadius: rbr(16),
    backgroundColor: ResponsiveTheme.colors.surface,
    shadowColor: ResponsiveTheme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },

  progressContainer: {
    height: rp(4),
    backgroundColor: ResponsiveTheme.colors.border,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },

  progressBar: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(2),
  },

  cardContent: {
    padding: ResponsiveTheme.spacing.lg,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  titleSection: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.md,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  iconContainer: {
    width: rp(48),
    height: rp(48),
    borderRadius: rbr(12),
    backgroundColor: ResponsiveTheme.colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
  },

  categoryIcon: {
    fontSize: rf(24),
  },

  titleContainer: {
    flex: 1,
  },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },

  aiPillBadge: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: rp(8),
    paddingVertical: rp(2),
    borderRadius: rbr(10),
    marginLeft: ResponsiveTheme.spacing.sm,
  },

  aiPillText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(10),
    fontWeight: "600",
  },

  description: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
  },

  difficultyBadge: {
    paddingHorizontal: rp(12),
    paddingVertical: rp(6),
    borderRadius: rbr(16),
  },

  difficultyText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  progressSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  workoutProgressBar: {
    height: rp(6),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: rbr(3),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  progressFill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(3),
  },

  progressText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingVertical: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  detailItem: {
    alignItems: "center",
    flex: 1,
  },

  detailIcon: {
    fontSize: rf(20),
    marginBottom: rp(4),
  },

  detailLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(2),
  },

  detailValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  infoSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  infoIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.sm,
    width: rp(20),
  },

  infoText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    flex: 1,
  },

  actionSection: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  startButton: {
    width: "100%",
  },

  tagsSection: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: ResponsiveTheme.spacing.sm,
  },

  tag: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
    borderRadius: rbr(12),
    marginRight: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  tagText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  moreTagsText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    fontStyle: "italic",
  },
});
