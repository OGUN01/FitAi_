import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { Button } from "./Button";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rs, rbr } from "../../utils/responsive";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

interface DialogAction {
  text: string;
  onPress: () => void;
  style?: "default" | "cancel" | "destructive";
  variant?: "primary" | "secondary" | "outline";
}

interface CustomDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  actions?: DialogAction[];
  onDismiss?: () => void;
  type?: "info" | "success" | "warning" | "error";
  icon?: string;
}

// REMOVED: Module-level Dimensions.get() causes crash
// const { width: screenWidth } = Dimensions.get('window');

export const CustomDialog: React.FC<CustomDialogProps> = ({
  visible,
  title,
  message,
  actions = [],
  onDismiss,
  type = "info",
  icon,
}) => {
  const getTypeIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "success":
        return "checkmark-circle";
      case "warning":
        return "warning";
      case "error":
        return "close-circle";
      default:
        return "information-circle";
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case "success":
        return ResponsiveTheme.colors.success;
      case "warning":
        return ResponsiveTheme.colors.warning;
      case "error":
        return ResponsiveTheme.colors.error;
      default:
        return ResponsiveTheme.colors.primary;
    }
  };

  const getButtonVariant = (action: DialogAction) => {
    if (action.variant) return action.variant;

    switch (action.style) {
      case "destructive":
        return "primary";
      case "cancel":
        return "outline";
      default:
        return "primary";
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <Card style={styles.dialogCard} variant="elevated">
            {/* Icon */}
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: getTypeColor() + "20" },
              ]}
            >
              <Ionicons
                name={getTypeIcon()}
                size={rf(32)}
                color={getTypeColor()}
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Message */}
            {message && <Text style={styles.message}>{message}</Text>}

            {/* Actions */}
            {actions.length > 0 && (
              <View style={styles.actionsContainer}>
                {actions.length === 1 ? (
                  <Button
                    title={actions[0].text}
                    onPress={actions[0].onPress}
                    variant={getButtonVariant(actions[0])}
                    style={styles.singleAction}
                  />
                ) : (
                  <View style={styles.multipleActions}>
                    {actions.map((action, index) => (
                      <Button
                        key={index}
                        title={action.text}
                        onPress={action.onPress}
                        variant={getButtonVariant(action)}
                        accessibilityLabel={action.style === "cancel" ? "back" : action.text}
                        style={
                          (index === actions.length - 1
                            ? { width: "100%" }
                            : styles.actionButton) as any
                        }
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </Card>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

// Convenience functions to replace Alert.alert()
export const showDialog = {
  info: (title: string, message?: string, _actions?: DialogAction[]) => {
    const buttons = _actions?.map((a) => ({ text: a.text, onPress: a.onPress, style: a.style })) ?? [{ text: "OK" }];
    crossPlatformAlert(title, message ?? "", buttons);
  },

  success: (title: string, message?: string, _actions?: DialogAction[]) => {
    const buttons = _actions?.map((a) => ({ text: a.text, onPress: a.onPress, style: a.style })) ?? [{ text: "OK" }];
    crossPlatformAlert(`✅ ${title}`, message ?? "", buttons);
  },

  warning: (title: string, message?: string, _actions?: DialogAction[]) => {
    const buttons = _actions?.map((a) => ({ text: a.text, onPress: a.onPress, style: a.style })) ?? [{ text: "OK" }];
    crossPlatformAlert(`⚠️ ${title}`, message ?? "", buttons);
  },

  error: (title: string, message?: string, _actions?: DialogAction[]) => {
    const buttons = _actions?.map((a) => ({ text: a.text, onPress: a.onPress, style: a.style })) ?? [{ text: "OK" }];
    crossPlatformAlert(`❌ ${title}`, message ?? "", buttons);
  },
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  safeArea: {
    width: "85%", // Use percentage instead of screenWidth
    maxWidth: 400,
  },

  dialogCard: {
    padding: ResponsiveTheme.spacing.xl,
    alignItems: "center" as const,
  },

  iconContainer: {
    width: rs(60),
    height: rs(60),
    borderRadius: rbr(30),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  icon: {
    fontSize: rf(28),
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  message: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(22),
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  actionsContainer: {
    width: "100%",
  },

  singleAction: {
    width: "100%",
  },

  multipleActions: {
    flexDirection: "column",
    gap: ResponsiveTheme.spacing.sm,
  },

  actionButton: {
    width: "100%",
  },

  lastActionButton: {
    // Any special styling for the last button
  },

  // Workout complete styles
  statsContainer: {
    width: "100%",
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  statsTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
    lineHeight: rf(22),
  },

  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: ResponsiveTheme.spacing.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },

  statItem: {
    alignItems: "center" as const,
  },

  statValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: "700",
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  statLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
});

// Workout-specific dialogs
interface WorkoutStartDialogProps {
  visible: boolean;
  workoutTitle: string;
  isResuming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const WorkoutStartDialog: React.FC<WorkoutStartDialogProps> = ({
  visible,
  workoutTitle,
  isResuming = false,
  onCancel,
  onConfirm,
}) => {
  const title = isResuming ? "Resume Workout?" : "Ready to Start?";
  const message = isResuming
    ? `Resume "${workoutTitle}" from where you left off?`
    : `Starting "${workoutTitle}". Ready to begin your workout session?`;
  const confirmText = isResuming ? "Resume Workout" : "Begin Workout";

  return (
    <CustomDialog
      visible={visible}
      title={title}
      message={message}
      type="info"
      actions={[
        {
          text: "Cancel",
          onPress: onCancel,
          style: "cancel",
        },
        {
          text: confirmText,
          onPress: onConfirm,
          style: "default",
        },
      ]}
    />
  );
};

interface WorkoutCompleteDialogProps {
  visible: boolean;
  workoutTitle: string;
  duration: number;
  calories: number;
  exercisesCompleted: number;
  totalExercises: number;
  onViewProgress: () => void;
  onDone: () => void;
}

interface WorkoutDetailsDialogProps {
  visible: boolean;
  title: string;
  description?: string;
  duration: number;
  calories?: number;
  exerciseCount: number;
  onClose: () => void;
}

export const WorkoutDetailsDialog: React.FC<WorkoutDetailsDialogProps> = ({
  visible,
  title,
  description,
  duration,
  calories,
  exerciseCount,
  onClose,
}) => {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={detailStyles.card}>
          {/* Header */}
          <View style={detailStyles.header}>
            <View style={detailStyles.iconCircle}>
              <Ionicons name="barbell" size={rf(22)} color={ResponsiveTheme.colors.primary} />
            </View>
            <Text style={detailStyles.title} numberOfLines={2}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={detailStyles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={rf(20)} color={ResponsiveTheme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          {!!description && (
            <ScrollView style={detailStyles.descScroll} showsVerticalScrollIndicator={false}>
              <Text style={detailStyles.description}>{description}</Text>
            </ScrollView>
          )}

          {/* Stats Row */}
          <View style={detailStyles.statsRow}>
            <View style={detailStyles.statItem}>
              <Ionicons name="time-outline" size={rf(18)} color={ResponsiveTheme.colors.primary} />
              <Text style={detailStyles.statValue}>{duration} min</Text>
              <Text style={detailStyles.statLabel}>Duration</Text>
            </View>
            <View style={detailStyles.divider} />
            <View style={detailStyles.statItem}>
              <Ionicons name="flame-outline" size={rf(18)} color="#FF6B35" />
              <Text style={detailStyles.statValue}>{calories ?? "N/A"}</Text>
              <Text style={detailStyles.statLabel}>Calories</Text>
            </View>
            <View style={detailStyles.divider} />
            <View style={detailStyles.statItem}>
              <Ionicons name="swap-horizontal-outline" size={rf(18)} color={ResponsiveTheme.colors.success} />
              <Text style={detailStyles.statValue}>{exerciseCount}</Text>
              <Text style={detailStyles.statLabel}>Exercises</Text>
            </View>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={detailStyles.closeButton} onPress={onClose} activeOpacity={0.8}>
            <Text style={detailStyles.closeButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const detailStyles = StyleSheet.create({
  card: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: rbr(20),
    padding: ResponsiveTheme.spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.sm,
  },
  iconCircle: {
    width: rs(36),
    height: rs(36),
    borderRadius: rbr(18),
    backgroundColor: ResponsiveTheme.colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    flex: 1,
    fontSize: rf(16),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  descScroll: {
    maxHeight: 80,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  description: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(19),
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: rbr(14),
    paddingVertical: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  divider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 4,
  },
  statValue: {
    fontSize: rf(15),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  statLabel: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
  },
  closeButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(12),
    paddingVertical: ResponsiveTheme.spacing.md,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
  },
});

export const WorkoutCompleteDialog: React.FC<WorkoutCompleteDialogProps> = ({
  visible,
  workoutTitle,
  duration,
  calories,
  exercisesCompleted,
  totalExercises,
  onViewProgress,
  onDone,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <Card style={styles.dialogCard} variant="elevated">
            {/* Celebration Icon */}
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: ResponsiveTheme.colors.success + "20" },
              ]}
            >
              <Ionicons
                name="trophy"
                size={rf(32)}
                color={ResponsiveTheme.colors.success}
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>Workout Complete!</Text>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>
                Great job! You completed "{workoutTitle}"
              </Text>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{duration}</Text>
                  <Text style={styles.statLabel}>minutes</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>~{calories}</Text>
                  <Text style={styles.statLabel}>calories</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {exercisesCompleted}/{totalExercises}
                  </Text>
                  <Text style={styles.statLabel}>exercises</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <Button
                title="View Progress"
                onPress={onViewProgress}
                variant="outline"
                style={styles.actionButton}
              />
              <Button
                title="Done"
                onPress={onDone}
                variant="primary"
                style={styles.actionButton}
              />
            </View>
          </Card>
        </SafeAreaView>
      </View>
    </Modal>
  );
};
