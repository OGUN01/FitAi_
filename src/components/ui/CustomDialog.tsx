import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Card } from './Card';
import { Button } from './Button';
import { THEME } from '../../utils/constants';

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
  icon,
}) => {
  const getTypeIcon = () => {
    if (icon) return icon;
    
    switch (type) {
      case 'success': return '🎉';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'success': return THEME.colors.success;
      case 'warning': return THEME.colors.warning;
      case 'error': return THEME.colors.error;
      default: return THEME.colors.primary;
    }
  };

  const getButtonVariant = (action: DialogAction) => {
    if (action.variant) return action.variant;
    
    switch (action.style) {
      case 'destructive': return 'primary';
      case 'cancel': return 'outline';
      default: return 'primary';
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
            <View style={[styles.iconContainer, { backgroundColor: getTypeColor() + '20' }]}>
              <Text style={styles.icon}>{getTypeIcon()}</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Message */}
            {message && (
              <Text style={styles.message}>{message}</Text>
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
                        style={[
                          styles.actionButton,
                          index === actions.length - 1 && styles.lastActionButton
                        ]}
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
  info: (title: string, message?: string, actions?: DialogAction[]) => {
    // This would be implemented with a global state management solution
    // For now, it's a placeholder
    console.log('Info Dialog:', { title, message, actions });
  },
  
  success: (title: string, message?: string, actions?: DialogAction[]) => {
    console.log('Success Dialog:', { title, message, actions });
  },
  
  warning: (title: string, message?: string, actions?: DialogAction[]) => {
    console.log('Warning Dialog:', { title, message, actions });
  },
  
  error: (title: string, message?: string, actions?: DialogAction[]) => {
    console.log('Error Dialog:', { title, message, actions });
  },
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  safeArea: {
    width: '85%',  // Use percentage instead of screenWidth
    maxWidth: 400,
  },

  dialogCard: {
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },

  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },

  icon: {
    fontSize: 28,
  },

  title: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
  },

  message: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: THEME.spacing.xl,
  },

  actionsContainer: {
    width: '100%',
  },

  singleAction: {
    width: '100%',
  },

  multipleActions: {
    flexDirection: 'column',
    gap: THEME.spacing.sm,
  },

  actionButton: {
    width: '100%',
  },

  lastActionButton: {
    // Any special styling for the last button
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
      title="🎯 Workout Started!"
      message={`Starting "${workoutTitle}". Ready to begin your workout session?`}
      type="success"
      actions={[
        {
          text: 'Cancel',
          onPress: onCancel,
          style: 'cancel',
        },
        {
          text: 'Begin Workout',
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <Card style={styles.dialogCard} variant="elevated">
            {/* Celebration Icon */}
            <View style={[styles.iconContainer, { backgroundColor: THEME.colors.success + '20' }]}>
              <Text style={styles.icon}>🎉</Text>
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
                  <Text style={styles.statValue}>{exercisesCompleted}/{totalExercises}</Text>
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

// Additional styles for workout complete dialog
const workoutCompleteStyles = StyleSheet.create({
  statsContainer: {
    width: '100%',
    marginBottom: THEME.spacing.xl,
  },

  statsTitle: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
    lineHeight: 22,
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: THEME.spacing.lg,
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: THEME.borderRadius.lg,
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },

  statLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
});

// Merge additional styles
Object.assign(styles, workoutCompleteStyles);