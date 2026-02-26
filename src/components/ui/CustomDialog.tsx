import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Alert,
  } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { Button } from "./Button";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rs, rbr } from "../../utils/responsive";

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
    Alert.alert(title, message ?? "", buttons);
  },

  success: (title: string, message?: string, _actions?: DialogAction[]) => {
    const buttons = _actions?.map((a) => ({ text: a.text, onPress: a.onPress, style: a.style })) ?? [{ text: "OK" }];
    Alert.alert(`\u2705 ${title}`, message ?? "", buttons);
  },

  warning: (title: string, message?: string, _actions?: DialogAction[]) => {
    const buttons = _actions?.map((a) => ({ text: a.text, onPress: a.onPress, style: a.style })) ?? [{ text: "OK" }];
    Alert.alert(`\u26A0\uFE0F ${title}`, message ?? "", buttons);
  },

  error: (title: string, message?: string, _actions?: DialogAction[]) => {
    const buttons = _actions?.map((a) => ({ text: a.text, onPress: a.onPress, style: a.style })) ?? [{ text: "OK" }];
    Alert.alert(`\u274C ${title}`, message ?? "", buttons);
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
  onCancel: () => void;
  onConfirm: () => void;
}

export const WorkoutStartDialog: React.FC<WorkoutStartDialogProps> = ({
  visible,
  workoutTitle,
  onCancel,
  onConfirm,
}) => {
  return (
    <CustomDialog
      visible={visible}
      title="Ready to Start?"
      message={`Starting "${workoutTitle}". Ready to begin your workout session?`}
      type="info"
      actions={[
        {
          text: "Cancel",
          onPress: onCancel,
          style: "cancel",
        },
        {
          text: "Begin Workout",
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
