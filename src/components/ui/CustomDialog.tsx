import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Button } from './Button';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
} from '../../theme/aurora-tokens';
import { rf, rs, rh, rbr } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_SOFT } from '../../utils/colors';
import { crossPlatformAlert } from '../../utils/crossPlatformAlert';

interface DialogAction {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
  variant?: 'primary' | 'secondary' | 'outline';
}

interface CustomDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  actions?: DialogAction[];
  onDismiss?: () => void;
  type?: 'info' | 'success' | 'warning' | 'error';
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
  type = 'info',
  icon: _icon,
}) => {
  const getTypeIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'close-circle';
      default:
        return 'information-circle';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const getButtonVariant = (action: DialogAction) => {
    if (action.variant) return action.variant;

    switch (action.style) {
      case 'destructive':
        return 'primary';
      case 'cancel':
        return 'outline';
      default:
        return 'primary';
    }
  };

  // NOTE: do NOT early-return on !visible. The Modal relies on its `visible`
  // prop transitioning from true→false to play animationType="fade"'s
  // fade-out. Returning null before that transition skips the fade-out.
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <Card style={styles.dialogCard} variant="elevated">
            {/* Icon */}
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: hexToRgba(getTypeColor(), TINT_ALPHA_SOFT) },
              ]}
            >
              <Ionicons name={getTypeIcon()} size={rf(32)} color={getTypeColor()} />
            </View>

            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            {/* Message */}
            {message && (
              <Text style={styles.message} numberOfLines={6}>
                {message}
              </Text>
            )}

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
                        accessibilityLabel={action.text}
                        style={
                          index === actions.length - 1
                            ? styles.lastActionButton
                            : styles.actionButton
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
    const buttons = _actions?.map((a) => ({
      text: a.text,
      onPress: a.onPress,
      style: a.style,
    })) ?? [{ text: 'OK' }];
    crossPlatformAlert(title, message ?? '', buttons);
  },

  success: (title: string, message?: string, _actions?: DialogAction[]) => {
    const buttons = _actions?.map((a) => ({
      text: a.text,
      onPress: a.onPress,
      style: a.style,
    })) ?? [{ text: 'OK' }];
    crossPlatformAlert(title, message ?? '', buttons);
  },

  warning: (title: string, message?: string, _actions?: DialogAction[]) => {
    const buttons = _actions?.map((a) => ({
      text: a.text,
      onPress: a.onPress,
      style: a.style,
    })) ?? [{ text: 'OK' }];
    crossPlatformAlert(title, message ?? '', buttons);
  },

  error: (title: string, message?: string, _actions?: DialogAction[]) => {
    const buttons = _actions?.map((a) => ({
      text: a.text,
      onPress: a.onPress,
      style: a.style,
    })) ?? [{ text: 'OK' }];
    crossPlatformAlert(title, message ?? '', buttons);
  },
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  safeArea: {
    width: '85%', // Use percentage instead of screenWidth
    maxWidth: 400,
  },

  dialogCard: {
    padding: spacing.xl,
    alignItems: 'center' as const,
  },

  iconContainer: {
    width: rs(60),
    height: rs(60),
    borderRadius: rbr(30),
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.lg,
  },

  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(22),
    marginBottom: spacing.xl,
  },

  actionsContainer: {
    width: '100%',
  },

  singleAction: {
    width: '100%',
  },

  multipleActions: {
    flexDirection: 'column',
    gap: spacing.sm,
  },

  // Primary/last button gets full width and a slightly stronger visual
  // weight than the outline "cancel" button above it.
  actionButton: {
    width: '100%',
  },

  lastActionButton: {
    width: '100%',
    marginTop: spacing.xs,
  },

  // Workout complete styles (used by WorkoutCompleteDialog).
  statsContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },

  statsTitle: {
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: rf(22),
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
  },

  statItem: {
    alignItems: 'center' as const,
  },

  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },

  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
  const title = isResuming ? 'Resume Workout?' : 'Start Workout';
  const message = isResuming
    ? `Pick up "${workoutTitle}" where you left off?`
    : `"${workoutTitle}" — ready when you are.`;
  const confirmText = isResuming ? 'Resume' : 'Begin Workout';

  return (
    <CustomDialog
      visible={visible}
      title={title}
      message={message}
      type="info"
      actions={[
        {
          text: 'Cancel',
          onPress: onCancel,
          style: 'cancel',
        },
        {
          text: confirmText,
          onPress: onConfirm,
          style: 'default',
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
  onDone: (rating?: number, notes?: string) => void;
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
              <Ionicons name="barbell" size={rf(22)} color={colors.primary} />
            </View>
            <Text style={detailStyles.title} numberOfLines={2}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={detailStyles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              accessibilityHint="Closes the workout details dialog"
            >
              <Ionicons name="close" size={rf(20)} color={colors.textSecondary} />
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
              <Ionicons name="time-outline" size={rf(18)} color={colors.primary} />
              <Text style={detailStyles.statValue}>{duration} min</Text>
              <Text style={detailStyles.statLabel}>Duration</Text>
            </View>
            <View style={detailStyles.divider} />
            <View style={detailStyles.statItem}>
              <Ionicons name="flame-outline" size={rf(18)} color={colors.primary} />
              <Text style={detailStyles.statValue}>{calories ?? 'N/A'}</Text>
              <Text style={detailStyles.statLabel}>Calories</Text>
            </View>
            <View style={detailStyles.divider} />
            <View style={detailStyles.statItem}>
              <Ionicons name="swap-horizontal-outline" size={rf(18)} color={colors.success} />
              <Text style={detailStyles.statValue}>{exerciseCount}</Text>
              <Text style={detailStyles.statLabel}>Exercises</Text>
            </View>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={detailStyles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Got it"
            accessibilityHint="Closes the workout details dialog"
          >
            <Text style={detailStyles.closeButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const detailStyles = StyleSheet.create({
  card: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: rbr(20),
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  iconCircle: {
    width: rs(36),
    height: rs(36),
    borderRadius: rbr(18),
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_SOFT),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: rf(16),
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  descScroll: {
    maxHeight: 80,
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: rf(13),
    color: colors.textSecondary,
    lineHeight: rf(19),
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: rbr(14),
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  divider: {
    width: 1,
    backgroundColor: colors.glassBorder,
    marginVertical: 4,
  },
  statValue: {
    fontSize: rf(15),
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: rf(11),
    color: colors.textSecondary,
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: rbr(12),
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: rf(15),
    fontWeight: '600',
    color: colors.white,
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
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');

  const handleDone = () => {
    onDone(rating > 0 ? rating : undefined, notes.trim() || undefined);
    // Reset for next use
    setRating(0);
    setNotes('');
  };

  const handleViewProgress = () => {
    // Pass rating/notes before navigating so they get saved
    onDone(rating > 0 ? rating : undefined, notes.trim() || undefined);
    onViewProgress();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.safeArea}>
          <Card style={styles.dialogCard} variant="elevated">
            {/* Celebration Icon */}
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: hexToRgba(colors.success, TINT_ALPHA_SOFT) },
              ]}
            >
              <Ionicons name="trophy" size={rf(32)} color={colors.success} />
            </View>

            {/* Title */}
            <Text style={styles.title}>Workout Complete!</Text>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle} numberOfLines={3}>
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

            {/* Rating */}
            <View style={completeStyles.feedbackSection}>
              <Text style={completeStyles.feedbackLabel}>How was this workout?</Text>
              <View style={completeStyles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    accessibilityRole="button"
                    accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    accessibilityState={{ selected: star <= rating }}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    style={completeStyles.starButton}
                  >
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={rf(28)}
                      color={star <= rating ? colors.warningAlt : colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes */}
              <TextInput
                style={completeStyles.notesInput}
                placeholder="Any notes? (optional)"
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                maxLength={500}
                numberOfLines={2}
                accessibilityLabel="Workout notes (optional)"
              />
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <Button
                title="View Progress"
                onPress={handleViewProgress}
                variant="outline"
                style={styles.actionButton}
              />
              <Button
                title="Done"
                onPress={handleDone}
                variant="primary"
                style={styles.lastActionButton}
              />
            </View>
          </Card>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const completeStyles = StyleSheet.create({
  feedbackSection: {
    width: '100%',
    marginTop: rf(8),
    marginBottom: rf(4),
    alignItems: 'center',
  },
  feedbackLabel: {
    fontSize: rf(14),
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: rf(8),
  },
  starsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center',
    gap: rf(8),
    marginBottom: rf(12),
  },

  starButton: {
    minWidth: Math.max(rh(44), 44),
    minHeight: Math.max(rh(44), 44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesInput: {
    width: '100%' as const,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(10),
    padding: rf(10),
    fontSize: rf(13),
    color: colors.text,
    backgroundColor: colors.backgroundSecondary ?? colors.background,
    minHeight: rf(60),
    textAlignVertical: 'top' as const,
  },
});
