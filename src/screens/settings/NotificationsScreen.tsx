/**
 * NotificationsScreen - Smart Notification Settings
 * 
 * Redesigned following UI/UX Methodology:
 * - GlassCard for all cards
 * - Ionicons instead of emojis
 * - AnimatedPressable with haptics
 * - ResponsiveTheme for spacing/colors
 * - FadeInDown entry animations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

// UI Components
import { GlassCard } from '../../components/ui/aurora/GlassCard';
import { AnimatedPressable } from '../../components/ui/aurora/AnimatedPressable';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';

// Theme & Utils
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh } from '../../utils/responsive';
import { haptics } from '../../utils/haptics';

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

interface NotificationItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  timeInfo?: string;
  enabled: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  animationDelay: number;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  icon,
  iconColor,
  title,
  description,
  timeInfo,
  enabled,
  onToggle,
  onEdit,
  animationDelay,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)}>
      <GlassCard 
        elevation={1} 
        padding="md" 
        blurIntensity="light" 
        borderRadius="lg"
        style={styles.notificationCard}
      >
        <View style={styles.notificationContent}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
            <Ionicons name={icon} size={rf(20)} color={iconColor} />
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text style={styles.notificationTitle}>{title}</Text>
            <Text style={styles.notificationDescription} numberOfLines={2}>
              {description}
            </Text>
            {enabled && timeInfo && (
              <AnimatedPressable
                onPress={() => {
                  haptics.light();
                  onEdit?.();
                }}
                scaleValue={0.95}
                hapticFeedback={false}
              >
                <View style={styles.timeInfoBadge}>
                  <Ionicons name="time-outline" size={rf(10)} color={ResponsiveTheme.colors.primary} />
                  <Text style={styles.timeInfoText}>{timeInfo}</Text>
                </View>
              </AnimatedPressable>
            )}
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            {onEdit && (
              <AnimatedPressable
                onPress={() => {
                  haptics.light();
                  onEdit();
                }}
                scaleValue={0.9}
                hapticFeedback={false}
              >
                <View style={styles.editButton}>
                  <Ionicons name="settings-outline" size={rf(14)} color={ResponsiveTheme.colors.textSecondary} />
                </View>
              </AnimatedPressable>
            )}
            <Switch
              value={enabled}
              onValueChange={() => {
                haptics.light();
                onToggle();
              }}
              trackColor={{
                false: 'rgba(255, 255, 255, 0.1)',
                true: `${ResponsiveTheme.colors.primary}50`,
              }}
              thumbColor={enabled ? ResponsiveTheme.colors.primary : 'rgba(255, 255, 255, 0.4)'}
              ios_backgroundColor="rgba(255, 255, 255, 0.1)"
            />
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack }) => {
  // Show message if running in Expo Go
  if (isExpoGo) {
    return (
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
            <AnimatedPressable
              onPress={() => {
                haptics.light();
                onBack?.();
              }}
              scaleValue={0.9}
              hapticFeedback={false}
            >
              <View style={styles.backButton}>
                <Ionicons name="chevron-back" size={rf(20)} color="#fff" />
              </View>
            </AnimatedPressable>
            <View style={styles.headerCenter}>
              <Ionicons name="notifications-outline" size={rf(18)} color={ResponsiveTheme.colors.primary} />
              <Text style={styles.headerTitle}>Notifications</Text>
            </View>
            <View style={styles.headerSpacer} />
          </Animated.View>

          <View style={styles.expoGoContainer}>
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <GlassCard 
                elevation={2} 
                padding="xl" 
                blurIntensity="medium" 
                borderRadius="xl"
                style={styles.expoGoCard}
              >
                <View style={styles.expoGoIconContainer}>
                  <LinearGradient
                    colors={['#FF9800', '#FF5722']}
                    style={styles.expoGoIcon}
                  >
                    <Ionicons name="warning-outline" size={rf(28)} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.expoGoTitle}>Notifications Unavailable</Text>
                <Text style={styles.expoGoMessage}>
                  Notifications require a development build and are not available in Expo Go.
                </Text>
                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>To enable, run:</Text>
                  <View style={styles.codeBox}>
                    <Text style={styles.codeText}>
                      eas build --platform android --profile development
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  const { preferences, toggleNotificationType, initialize, isInitialized } = useNotificationStore();
  const waterReminders = useWaterReminders?.();
  const workoutReminders = useWorkoutReminders?.();
  const mealReminders = useMealReminders?.();
  const sleepReminders = useSleepReminders?.();

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
      const count = await useNotificationStore.getState().getScheduledCount();
      setScheduledCount(count);
    };

    initializeNotifications();
  }, [isInitialized, initialize]);

  const handleToggle = async (type: keyof typeof preferences) => {
    try {
      await toggleNotificationType(type);
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
              haptics.medium();
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
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <AnimatedPressable
            onPress={() => {
              haptics.light();
              onBack?.();
            }}
            scaleValue={0.9}
            hapticFeedback={false}
          >
            <View style={styles.backButton}>
              <Ionicons name="chevron-back" size={rf(20)} color="#fff" />
            </View>
          </AnimatedPressable>
          <View style={styles.headerCenter}>
            <Ionicons name="notifications-outline" size={rf(18)} color={ResponsiveTheme.colors.primary} />
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
          <View style={styles.headerSpacer} />
        </Animated.View>

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Description Card */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <GlassCard 
              elevation={1} 
              padding="md" 
              blurIntensity="light" 
              borderRadius="lg"
              style={styles.descriptionCard}
            >
              <View style={styles.descriptionContent}>
                <View style={styles.scheduledBadge}>
                  <Ionicons name="calendar-outline" size={rf(14)} color="#fff" />
                  <Text style={styles.scheduledText}>{scheduledCount}</Text>
                </View>
                <Text style={styles.descriptionText}>
                  notifications currently scheduled
                </Text>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Section: Smart Reminders */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles-outline" size={rf(14)} color={ResponsiveTheme.colors.textSecondary} />
              <Text style={styles.sectionTitle}>Smart Reminders</Text>
            </View>

            {/* Water Reminders */}
            <NotificationItem
              icon="water-outline"
              iconColor="#2196F3"
              title="Water Reminders"
              description="Smart hydration reminders based on your daily schedule"
              timeInfo={preferences.water.enabled ? getTimeDisplay('water') : undefined}
              enabled={preferences.water.enabled}
              onToggle={() => handleToggle('water')}
              onEdit={() => handleEditPress('water', 'Water Reminders')}
              animationDelay={100}
            />

            {/* Workout Reminders */}
            <NotificationItem
              icon="barbell-outline"
              iconColor="#FF6B6B"
              title="Workout Reminders"
              description="Get notified before your scheduled workouts"
              timeInfo={preferences.workout.enabled ? getTimeDisplay('workout') : undefined}
              enabled={preferences.workout.enabled}
              onToggle={() => handleToggle('workout')}
              onEdit={() => handleEditPress('workout', 'Workout Reminders')}
              animationDelay={150}
            />

            {/* Meal Reminders */}
            <NotificationItem
              icon="restaurant-outline"
              iconColor="#4CAF50"
              title="Meal Reminders"
              description="Never miss breakfast, lunch, or dinner"
              timeInfo={preferences.meals.enabled ? getTimeDisplay('meals') : undefined}
              enabled={preferences.meals.enabled}
              onToggle={() => handleToggle('meals')}
              onEdit={() => handleEditPress('meals', 'Meal Reminders')}
              animationDelay={200}
            />

            {/* Sleep Reminders */}
            <NotificationItem
              icon="moon-outline"
              iconColor="#9C27B0"
              title="Sleep Reminders"
              description="Smart bedtime notifications for better recovery"
              timeInfo={preferences.sleep.enabled ? getTimeDisplay('sleep') : undefined}
              enabled={preferences.sleep.enabled}
              onToggle={() => handleToggle('sleep')}
              onEdit={() => handleEditPress('sleep', 'Sleep Reminders')}
              animationDelay={250}
            />

            {/* Progress Updates */}
            <NotificationItem
              icon="analytics-outline"
              iconColor="#FF9800"
              title="Progress Updates"
              description="Weekly summary of your fitness journey"
              timeInfo={preferences.progress.enabled ? getTimeDisplay('progress') : undefined}
              enabled={preferences.progress.enabled}
              onToggle={() => handleToggle('progress')}
              animationDelay={300}
            />
          </View>

          {/* Section: General */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={rf(14)} color={ResponsiveTheme.colors.textSecondary} />
              <Text style={styles.sectionTitle}>General</Text>
            </View>

            <Animated.View entering={FadeInDown.delay(350).duration(400)}>
              <AnimatedPressable
                onPress={handleResetDefaults}
                scaleValue={0.98}
                hapticFeedback={true}
                hapticType="light"
              >
                <GlassCard 
                  elevation={1} 
                  padding="md" 
                  blurIntensity="light" 
                  borderRadius="lg"
                  style={styles.actionCard}
                >
                  <View style={styles.actionContent}>
                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(244, 67, 54, 0.15)' }]}>
                      <Ionicons name="refresh-outline" size={rf(20)} color="#F44336" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>Reset to Defaults</Text>
                      <Text style={styles.actionDescription}>
                        Restore all notification settings
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={rf(18)} color={ResponsiveTheme.colors.textMuted} />
                  </View>
                </GlassCard>
              </AnimatedPressable>
            </Animated.View>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Water Reminder Edit Modal */}
        {WaterReminderEditModal && (
          <WaterReminderEditModal
            visible={editModal.visible && editModal.type === 'water'}
            onClose={closeEditModal}
          />
        )}

        {/* Other Notification Edit Modal */}
        {NotificationEditModal && (
          <NotificationEditModal
            visible={editModal.visible && editModal.type !== 'water'}
            type={editModal.type}
            title={editModal.title}
            onClose={closeEditModal}
          />
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.md,
  },
  backButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.sm,
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: rw(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.sm,
  },
  descriptionCard: {
    marginBottom: ResponsiveTheme.spacing.lg,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  descriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.sm,
  },
  scheduledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  scheduledText: {
    fontSize: rf(12),
    fontWeight: '700',
    color: '#fff',
  },
  descriptionText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    flex: 1,
  },
  section: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.sm,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  sectionTitle: {
    fontSize: rf(12),
    fontWeight: '700',
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  notificationCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },
  notificationTitle: {
    fontSize: rf(15),
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },
  timeInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: 3,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  timeInfoText: {
    fontSize: rf(10),
    fontWeight: '500',
    color: ResponsiveTheme.colors.primary,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.sm,
  },
  editButton: {
    width: rw(30),
    height: rw(30),
    borderRadius: rw(8),
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },
  actionTitle: {
    fontSize: rf(15),
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
  bottomSpacing: {
    height: rh(80),
  },
  // Expo Go styles
  expoGoContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  expoGoCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  expoGoIconContainer: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  expoGoIcon: {
    width: rw(64),
    height: rw(64),
    borderRadius: rw(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  expoGoTitle: {
    fontSize: rf(20),
    fontWeight: '700',
    color: '#fff',
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: 'center',
  },
  expoGoMessage: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
    lineHeight: rf(20),
  },
  codeContainer: {
    width: '100%',
  },
  codeLabel: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textMuted,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  codeBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  codeText: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.primary,
    fontFamily: 'monospace',
  },
});

export default NotificationsScreen;
