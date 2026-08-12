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
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from './aurora/GlassCard';
import { GlassButton, GlassButtonVariant } from './aurora/GlassButton';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  zIndex as auroraZIndex,
} from '../../theme/aurora-tokens';
import { rf, rs, rh, rbr } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_SOFT } from '../../utils/colors';
import { crossPlatformAlert } from '../../utils/crossPlatformAlert';

interface DialogAction {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
  variant?: GlassButtonVariant;
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

/**
 * Web scrim-layering fix: react-native-web renders <Modal> into a body-level
 * portal whose fixed wrapper has z-index:auto, so any in-app element with
 * zIndex>0 (RestTimer/ExerciseCard z10, achievement toasts z1200, builder
 * chrome z1300) paints ABOVE the scrim — the workout player header (X,
 * counter, timer) and the background CTA punched through the dimmed overlay.
 * On web, bypass Modal and render the scrim as a fixed View at
 * zIndex.modal (1400), above every app-level zIndex (≤1300). Native keeps the
 * real Modal (fade/slide animations, hardware back, accessibility).
 */
const DialogShell: React.FC<{
  visible: boolean;
  animationType: 'fade' | 'slide';
  onRequestClose?: () => void;
  keyboardAvoiding?: boolean;
  children: React.ReactNode;
}> = ({ visible, animationType, onRequestClose, keyboardAvoiding, children }) => {
  if (Platform.OS === 'web') {
    if (!visible) return null;
    const WebWrapper = keyboardAvoiding ? KeyboardAvoidingView : View;
    return (
      <WebWrapper style={[styles.overlay, styles.webScrim]}>
        {children}
      </WebWrapper>
    );
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onRequestClose}
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {children}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.overlay}>{children}</View>
      )}
    </Modal>
  );
};

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

  const getButtonVariant = (action: DialogAction): GlassButtonVariant => {
    if (action.variant) return action.variant;

    switch (action.style) {
      case 'destructive':
        return 'error';
      case 'cancel':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  // NOTE: do NOT early-return on !visible. The Modal relies on its `visible`
  // prop transitioning from true→false to play animationType="fade"'s
  // fade-out. Returning null before that transition skips the fade-out.
  // (DialogShell handles the web path, where this fade does not apply.)
  return (
    <DialogShell visible={visible} animationType="fade" onRequestClose={onDismiss}>
        <SafeAreaView style={styles.safeArea}>
          <GlassCard padding="xl" contentStyle={styles.dialogContent} elevation={4}>
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
                  <GlassButton
                    label={actions[0].text}
                    onPress={actions[0].onPress}
                    variant={getButtonVariant(actions[0])}
                    fullWidth
                    style={styles.singleAction}
                  />
                ) : (
                  <View style={styles.multipleActions}>
                    {actions.map((action, index) => (
                      <GlassButton
                        key={index}
                        label={action.text}
                        onPress={action.onPress}
                        variant={getButtonVariant(action)}
                        accessibilityLabel={action.text}
                        fullWidth
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
          </GlassCard>
        </SafeAreaView>
    </DialogShell>
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

  // Web-only (see DialogShell): fixed full-viewport scrim stacked above every
  // app-level zIndex so nothing punches through the dimmed overlay.
  // RN's ViewStyle lacks 'fixed' — react-native-web passes it through to CSS.
  webScrim: {
    position: 'fixed' as unknown as ViewStyle['position'],
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: auroraZIndex.modal,
  },

  safeArea: {
    width: '85%', // Use percentage instead of screenWidth
    maxWidth: 400,
  },

  // Padding now comes from GlassCard's own `padding="xl"` prop; this only
  // needs to center the content column (icon/title/message/actions).
  dialogContent: {
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

// Was previously a hand-rolled raw RN `Modal` + a fully separate flat
// `detailStyles.card` panel — the third of three different dialog patterns
// living in this file. Now shares `DialogShell` (same web-scrim fix, same
// fade/slide handling as the other dialogs above) and `GlassCard` for the
// surface, so this is visually and structurally the same shell as
// CustomDialog/WorkoutCompleteDialog instead of a bespoke one.
export const WorkoutDetailsDialog: React.FC<WorkoutDetailsDialogProps> = ({
  visible,
  title,
  description,
  duration,
  calories,
  exerciseCount,
  onClose,
}) => {
  // NOTE: do NOT early-return on !visible — see CustomDialog above. DialogShell
  // needs the true→false render pass to play its fade-out.
  return (
    <DialogShell visible={visible} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <GlassCard padding="xl" elevation={4}>
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
          <GlassButton
            label="Got it"
            onPress={onClose}
            variant="primary"
            fullWidth
            accessibilityLabel="Got it"
          />
        </GlassCard>
      </SafeAreaView>
    </DialogShell>
  );
};

const detailStyles = StyleSheet.create({
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
    <DialogShell visible={visible} animationType="fade" keyboardAvoiding>
        <SafeAreaView style={styles.safeArea}>
          <GlassCard padding="xl" contentStyle={styles.dialogContent} elevation={4}>
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
                  {/* Pluralize — a 1-minute workout read "1 minutes" */}
                  <Text style={styles.statLabel}>{duration === 1 ? 'minute' : 'minutes'}</Text>
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
              <GlassButton
                label="View Progress"
                onPress={handleViewProgress}
                variant="secondary"
                fullWidth
                style={styles.actionButton}
              />
              <GlassButton
                label="Done"
                onPress={handleDone}
                variant="primary"
                fullWidth
                style={styles.lastActionButton}
              />
            </View>
          </GlassCard>
        </SafeAreaView>
    </DialogShell>
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
