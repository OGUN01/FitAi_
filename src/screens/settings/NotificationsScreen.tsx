import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Card, Button, THEME } from '../../components/ui';
import Constants from 'expo-constants';

// Simple Expo Go detection
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient' ||
  (__DEV__ && !Constants.isDevice && Constants.platform?.web !== true);

// Load components and stores with safety nets
let WaterReminderEditModal: any = null;
let NotificationEditModal: any = null;
let useNotificationStore: any = null;
let useWaterReminders: any = null;
let useMealReminders: any = null;
let useSleepReminders: any = null;
let useWorkoutReminders: any = null;

if (!isExpoGo) {
  try {
    WaterReminderEditModal =
      require('../../components/notifications/WaterReminderEditModal').default;
    NotificationEditModal = require('../../components/notifications/NotificationEditModal').default;

    const notificationStore = require('../../stores/notificationStore');
    useNotificationStore = notificationStore.useNotificationStore;
    useWaterReminders = notificationStore.useWaterReminders;
    useMealReminders = notificationStore.useMealReminders;
    useSleepReminders = notificationStore.useSleepReminders;
    useWorkoutReminders = notificationStore.useWorkoutReminders;
  } catch (error) {
    console.warn('Failed to load notification modules:', error);
  }
}

interface NotificationsScreenProps {
  onBack?: () => void;
}

interface EditModalState {
  visible: boolean;
  type: 'water' | 'workout' | 'meals' | 'sleep' | null;
  title: string;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack }) => {
  // Show message if running in Expo Go
  if (isExpoGo) {
    return (
      <SafeAreaView style={styles.container}>
        <Card style={styles.expoGoCard}>
          <Text style={styles.expoGoTitle}>Notifications Unavailable</Text>
          <Text style={styles.expoGoMessage}>
            Notifications require a development build and are not available in Expo Go.
          </Text>
          <Text style={styles.expoGoInstruction}>
            To enable notifications, run:{'\n'}
            <Text style={styles.expoGoCode}>
              eas build --platform android --profile development
            </Text>
          </Text>
          {onBack && (
            <Button onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </Button>
          )}
        </Card>
      </SafeAreaView>
    );
  }

  const { preferences, toggleNotificationType, initialize, isInitialized } = useNotificationStore();
  const waterReminders = useWaterReminders();
  const workoutReminders = useWorkoutReminders();
  const mealReminders = useMealReminders();
  const sleepReminders = useSleepReminders();

  const [editModal, setEditModal] = useState<EditModalState>({
    visible: false,
    type: null,
    title: '',
  });

  const [scheduledCount, setScheduledCount] = useState(0);

  useEffect(() => {
    const initializeNotifications = async () => {
      if (!isInitialized) {
        await initialize();
      }
      // Update scheduled count
      const count = await useNotificationStore.getState().getScheduledCount();
      setScheduledCount(count);
    };

    initializeNotifications();
  }, [isInitialized, initialize]);

  const handleToggle = async (type: keyof typeof preferences) => {
    try {
      await toggleNotificationType(type);
      // Update scheduled count
      const count = await useNotificationStore.getState().getScheduledCount();
      setScheduledCount(count);
    } catch (error) {
      console.error('Failed to toggle notification:', error);
      Alert.alert('Error', 'Failed to update notification setting');
    }
  };

  const handleEditPress = (type: 'water' | 'workout' | 'meals' | 'sleep', title: string) => {
    setEditModal({ visible: true, type, title });
  };

  const closeEditModal = () => {
    setEditModal({ visible: false, type: null, title: '' });
  };

  const handleResetDefaults = async () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all notification settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await useNotificationStore.getState().resetToDefaults();
              const count = await useNotificationStore.getState().getScheduledCount();
              setScheduledCount(count);
              Alert.alert('Success', 'Settings reset to defaults!');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          },
        },
      ]
    );
  };

  const getTimeDisplay = (type: string) => {
    switch (type) {
      case 'water':
        const awakeHours = calculateAwakeHours(
          preferences.water.wakeUpTime,
          preferences.water.sleepTime
        );
        return `${awakeHours}h awake, ${preferences.water.dailyGoalLiters}L daily`;
      case 'workout':
        return `${preferences.workout.reminderMinutes} min before`;
      case 'meals':
        const enabledMeals = [
          preferences.meals.breakfast.enabled && 'Breakfast',
          preferences.meals.lunch.enabled && 'Lunch',
          preferences.meals.dinner.enabled && 'Dinner',
        ].filter(Boolean);
        return `${enabledMeals.length} meals enabled`;
      case 'sleep':
        return `${preferences.sleep.reminderMinutes} min before ${preferences.sleep.bedtime}`;
      case 'progress':
        return preferences.progress.frequency;
      default:
        return '';
    }
  };

  const calculateAwakeHours = (wakeTime: string, sleepTime: string) => {
    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(':').map(Number);
    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;
    const awakeMinutes =
      sleepMinutes > wakeMinutes
        ? sleepMinutes - wakeMinutes
        : 24 * 60 - wakeMinutes + sleepMinutes;
    return Math.floor(awakeMinutes / 60);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.description}>
            Customize your smart notification preferences. {scheduledCount} notifications currently
            scheduled.
          </Text>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smart Reminders</Text>

          {/* Water Reminders */}
          <Card style={styles.settingCard} variant="outlined">
            <View style={styles.settingContent}>
              <View style={styles.settingInfo}>
                <View style={styles.settingHeader}>
                  <Text style={styles.settingIcon}>💧</Text>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingTitle}>Water Reminders</Text>
                    <Text style={styles.settingDescription}>
                      Smart hydration reminders based on your daily schedule
                    </Text>
                    {preferences.water.enabled && (
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => handleEditPress('water', 'Water Reminders')}
                      >
                        <Text style={styles.timeText}>⚙️ {getTimeDisplay('water')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.rightControls}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditPress('water', 'Water Reminders')}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <Switch
                  value={preferences.water.enabled}
                  onValueChange={() => handleToggle('water')}
                  trackColor={{
                    false: THEME.colors.border,
                    true: THEME.colors.primary + '50',
                  }}
                  thumbColor={
                    preferences.water.enabled ? THEME.colors.primary : THEME.colors.textMuted
                  }
                />
              </View>
            </View>
          </Card>

          {/* Workout Reminders */}
          <Card style={styles.settingCard} variant="outlined">
            <View style={styles.settingContent}>
              <View style={styles.settingInfo}>
                <View style={styles.settingHeader}>
                  <Text style={styles.settingIcon}>🏋️</Text>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingTitle}>Workout Reminders</Text>
                    <Text style={styles.settingDescription}>
                      Get notified before your scheduled workouts
                    </Text>
                    {preferences.workout.enabled && (
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => handleEditPress('workout', 'Workout Reminders')}
                      >
                        <Text style={styles.timeText}>⚙️ {getTimeDisplay('workout')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.rightControls}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditPress('workout', 'Workout Reminders')}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <Switch
                  value={preferences.workout.enabled}
                  onValueChange={() => handleToggle('workout')}
                  trackColor={{
                    false: THEME.colors.border,
                    true: THEME.colors.primary + '50',
                  }}
                  thumbColor={
                    preferences.workout.enabled ? THEME.colors.primary : THEME.colors.textMuted
                  }
                />
              </View>
            </View>
          </Card>

          {/* Meal Reminders */}
          <Card style={styles.settingCard} variant="outlined">
            <View style={styles.settingContent}>
              <View style={styles.settingInfo}>
                <View style={styles.settingHeader}>
                  <Text style={styles.settingIcon}>🍽️</Text>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingTitle}>Meal Reminders</Text>
                    <Text style={styles.settingDescription}>
                      Never miss breakfast, lunch, or dinner
                    </Text>
                    {preferences.meals.enabled && (
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => handleEditPress('meals', 'Meal Reminders')}
                      >
                        <Text style={styles.timeText}>⚙️ {getTimeDisplay('meals')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.rightControls}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditPress('meals', 'Meal Reminders')}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <Switch
                  value={preferences.meals.enabled}
                  onValueChange={() => handleToggle('meals')}
                  trackColor={{
                    false: THEME.colors.border,
                    true: THEME.colors.primary + '50',
                  }}
                  thumbColor={
                    preferences.meals.enabled ? THEME.colors.primary : THEME.colors.textMuted
                  }
                />
              </View>
            </View>
          </Card>

          {/* Sleep Reminders */}
          <Card style={styles.settingCard} variant="outlined">
            <View style={styles.settingContent}>
              <View style={styles.settingInfo}>
                <View style={styles.settingHeader}>
                  <Text style={styles.settingIcon}>😴</Text>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingTitle}>Sleep Reminders</Text>
                    <Text style={styles.settingDescription}>
                      Smart bedtime notifications for better recovery
                    </Text>
                    {preferences.sleep.enabled && (
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => handleEditPress('sleep', 'Sleep Reminders')}
                      >
                        <Text style={styles.timeText}>⚙️ {getTimeDisplay('sleep')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.rightControls}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditPress('sleep', 'Sleep Reminders')}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <Switch
                  value={preferences.sleep.enabled}
                  onValueChange={() => handleToggle('sleep')}
                  trackColor={{
                    false: THEME.colors.border,
                    true: THEME.colors.primary + '50',
                  }}
                  thumbColor={
                    preferences.sleep.enabled ? THEME.colors.primary : THEME.colors.textMuted
                  }
                />
              </View>
            </View>
          </Card>

          {/* Progress Updates */}
          <Card style={styles.settingCard} variant="outlined">
            <View style={styles.settingContent}>
              <View style={styles.settingInfo}>
                <View style={styles.settingHeader}>
                  <Text style={styles.settingIcon}>📊</Text>
                  <View style={styles.settingTexts}>
                    <Text style={styles.settingTitle}>Progress Updates</Text>
                    <Text style={styles.settingDescription}>
                      Weekly summary of your fitness journey
                    </Text>
                    {preferences.progress.enabled && (
                      <View style={styles.timeButton}>
                        <Text style={styles.timeText}>⚙️ {getTimeDisplay('progress')}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <Switch
                value={preferences.progress.enabled}
                onValueChange={() => handleToggle('progress')}
                trackColor={{
                  false: THEME.colors.border,
                  true: THEME.colors.primary + '50',
                }}
                thumbColor={
                  preferences.progress.enabled ? THEME.colors.primary : THEME.colors.textMuted
                }
              />
            </View>
          </Card>
        </View>

        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>

          <Card style={styles.actionCard} variant="outlined">
            <TouchableOpacity onPress={handleResetDefaults}>
              <View style={styles.actionContent}>
                <Text style={styles.actionIcon}>🔄</Text>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionTitle}>Reset to Defaults</Text>
                  <Text style={styles.actionDescription}>
                    Restore all notification settings to their default values
                  </Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Water Reminder Edit Modal - Only render if component is available */}
      {WaterReminderEditModal && (
        <WaterReminderEditModal
          visible={editModal.visible && editModal.type === 'water'}
          onClose={closeEditModal}
        />
      )}

      {/* Other Notification Edit Modal - Only render if component is available */}
      {NotificationEditModal && (
        <NotificationEditModal
          visible={editModal.visible && editModal.type !== 'water'}
          type={editModal.type}
          title={editModal.title}
          onClose={closeEditModal}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  scrollView: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.md,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backIcon: {
    fontSize: 24,
    color: THEME.colors.text,
    fontWeight: 'bold',
  },

  title: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },

  headerSpacer: {
    width: 40,
  },

  section: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },

  description: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  settingCard: {
    marginBottom: THEME.spacing.sm,
  },

  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: THEME.spacing.lg,
  },

  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },

  editButton: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    backgroundColor: THEME.colors.backgroundTertiary,
    borderRadius: THEME.borderRadius.sm,
  },

  editButtonText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },

  settingInfo: {
    flex: 1,
  },

  settingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  settingIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.md,
    marginTop: 2,
  },

  settingTexts: {
    flex: 1,
  },

  settingTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  settingDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },

  timeButton: {
    marginTop: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    backgroundColor: THEME.colors.primary + '20',
    borderRadius: THEME.borderRadius.sm,
    alignSelf: 'flex-start',
  },

  timeText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.medium,
  },

  actionCard: {
    marginBottom: THEME.spacing.sm,
  },

  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },

  actionIcon: {
    fontSize: 20,
    marginRight: THEME.spacing.md,
  },

  actionInfo: {
    flex: 1,
  },

  actionTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
  },

  actionDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },

  actionArrow: {
    fontSize: 20,
    color: THEME.colors.textMuted,
    fontWeight: THEME.fontWeight.bold,
  },

  saveSection: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },

  saveButton: {
    marginTop: THEME.spacing.md,
  },

  bottomSpacing: {
    height: THEME.spacing.xl,
  },

  // Expo Go message styles
  expoGoCard: {
    margin: THEME.spacing.lg,
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },

  expoGoTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  expoGoMessage: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
  },

  expoGoInstruction: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
  },

  expoGoCode: {
    fontFamily: 'monospace',
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.primary,
  },

  backButton: {
    marginTop: THEME.spacing.md,
  },

  backButtonText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
  },
});
