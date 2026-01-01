import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Card, Button, THEME } from '../ui';
import Constants from 'expo-constants';

// Simple Expo Go detection
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient' ||
  (__DEV__ && !Constants.isDevice && !(Constants.platform?.web as any));

// Load notification stores safely
let useWorkoutReminders: any = null;
let useMealReminders: any = null;
let useSleepReminders: any = null;

if (!isExpoGo) {
  try {
    const notificationStore = require('../../stores/notificationStore');
    useWorkoutReminders = notificationStore.useWorkoutReminders;
    useMealReminders = notificationStore.useMealReminders;
    useSleepReminders = notificationStore.useSleepReminders;
  } catch (error) {
    console.warn('Failed to load notification stores:', error);
  }
}

interface NotificationEditModalProps {
  visible: boolean;
  type: 'workout' | 'meals' | 'sleep' | null;
  title: string;
  onClose: () => void;
}

export const NotificationEditModal: React.FC<NotificationEditModalProps> = ({
  visible,
  type,
  title,
  onClose,
}) => {
  // Return null if running in Expo Go or hooks not available
  if (isExpoGo || !useWorkoutReminders || !useMealReminders || !useSleepReminders) {
    return null;
  }

  const workoutReminders = useWorkoutReminders();
  const mealReminders = useMealReminders();
  const sleepReminders = useSleepReminders();

  // Workout state
  const [workoutReminderMinutes, setWorkoutReminderMinutes] = useState('30');

  // Meal state
  const [breakfastEnabled, setBreakfastEnabled] = useState(true);
  const [breakfastTime, setBreakfastTime] = useState('08:00');
  const [lunchEnabled, setLunchEnabled] = useState(true);
  const [lunchTime, setLunchTime] = useState('13:00');
  const [dinnerEnabled, setDinnerEnabled] = useState(true);
  const [dinnerTime, setDinnerTime] = useState('19:00');

  // Sleep state
  const [bedtime, setBedtime] = useState('22:30');
  const [sleepReminderMinutes, setSleepReminderMinutes] = useState('30');

  const [isLoading, setIsLoading] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (visible && type) {
      switch (type) {
        case 'workout':
          setWorkoutReminderMinutes(workoutReminders.config.reminderMinutes.toString());
          break;
        case 'meals':
          setBreakfastEnabled(mealReminders.config.breakfast.enabled);
          setBreakfastTime(mealReminders.config.breakfast.time);
          setLunchEnabled(mealReminders.config.lunch.enabled);
          setLunchTime(mealReminders.config.lunch.time);
          setDinnerEnabled(mealReminders.config.dinner.enabled);
          setDinnerTime(mealReminders.config.dinner.time);
          break;
        case 'sleep':
          setBedtime(sleepReminders.config.bedtime);
          setSleepReminderMinutes(sleepReminders.config.reminderMinutes.toString());
          break;
      }
    }
  }, [visible, type, workoutReminders.config, mealReminders.config, sleepReminders.config]);

  const handleSave = async () => {
    setIsLoading(true);

    try {
      switch (type) {
        case 'workout':
          await saveWorkoutSettings();
          break;
        case 'meals':
          await saveMealSettings();
          break;
        case 'sleep':
          await saveSleepSettings();
          break;
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
      setIsLoading(false);
    }
  };

  const saveWorkoutSettings = async () => {
    const minutes = parseInt(workoutReminderMinutes);

    if (isNaN(minutes) || minutes < 5 || minutes > 120) {
      Alert.alert('Invalid Time', 'Please enter a reminder time between 5 and 120 minutes.');
      setIsLoading(false);
      return;
    }

    await workoutReminders.updateConfig({
      reminderMinutes: minutes,
    });

    setIsLoading(false);
    Alert.alert(
      'Workout Reminders Updated!',
      `You'll be reminded ${minutes} minutes before your scheduled workouts.`,
      [{ text: 'OK', onPress: onClose }]
    );
  };

  const saveMealSettings = async () => {
    // Validate time formats
    const times = [breakfastTime, lunchTime, dinnerTime];
    for (const time of times) {
      if (!isValidTimeFormat(time)) {
        Alert.alert('Invalid Time', 'Please enter times in HH:MM format (e.g., 08:30).');
        setIsLoading(false);
        return;
      }
    }

    await mealReminders.updateConfig({
      breakfast: { enabled: breakfastEnabled, time: breakfastTime },
      lunch: { enabled: lunchEnabled, time: lunchTime },
      dinner: { enabled: dinnerEnabled, time: dinnerTime },
    });

    const enabledCount = [breakfastEnabled, lunchEnabled, dinnerEnabled].filter(Boolean).length;

    setIsLoading(false);
    Alert.alert(
      'Meal Reminders Updated!',
      `${enabledCount} meal reminder${enabledCount !== 1 ? 's' : ''} ${enabledCount > 0 ? 'enabled' : 'disabled'}.`,
      [{ text: 'OK', onPress: onClose }]
    );
  };

  const saveSleepSettings = async () => {
    const minutes = parseInt(sleepReminderMinutes);

    if (isNaN(minutes) || minutes < 5 || minutes > 60) {
      Alert.alert('Invalid Time', 'Please enter a reminder time between 5 and 60 minutes.');
      setIsLoading(false);
      return;
    }

    if (!isValidTimeFormat(bedtime)) {
      Alert.alert('Invalid Time', 'Please enter bedtime in HH:MM format (e.g., 22:30).');
      setIsLoading(false);
      return;
    }

    await sleepReminders.updateConfig({
      bedtime,
      reminderMinutes: minutes,
    });

    setIsLoading(false);
    Alert.alert(
      'Sleep Reminders Updated!',
      `You'll be reminded ${minutes} minutes before your ${bedtime} bedtime.`,
      [{ text: 'OK', onPress: onClose }]
    );
  };

  const isValidTimeFormat = (time: string): boolean => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const getPresetTime = (
    mealType: 'breakfast' | 'lunch' | 'dinner',
    variant: 'early' | 'normal' | 'late'
  ) => {
    const presets = {
      breakfast: { early: '07:00', normal: '08:00', late: '09:30' },
      lunch: { early: '12:00', normal: '13:00', late: '14:00' },
      dinner: { early: '18:00', normal: '19:00', late: '20:30' },
    };
    return presets[mealType][variant];
  };

  const renderWorkoutSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Workout Reminder Time</Text>
      <Text style={styles.sectionDescription}>
        How many minutes before your scheduled workout should you be reminded?
      </Text>

      <Card style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.inputLabel}>Minutes Before Workout</Text>
          <TextInput
            style={styles.textInput}
            value={workoutReminderMinutes}
            onChangeText={setWorkoutReminderMinutes}
            placeholder="30"
            keyboardType="number-pad"
            selectTextOnFocus
          />
        </View>

        <View style={styles.presetButtons}>
          {[15, 30, 45, 60].map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.presetButton,
                workoutReminderMinutes === minutes.toString() && styles.presetButtonActive,
              ]}
              onPress={() => setWorkoutReminderMinutes(minutes.toString())}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  workoutReminderMinutes === minutes.toString() && styles.presetButtonTextActive,
                ]}
              >
                {minutes}min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.infoText}>
          💡 Workout times are automatically detected from your AI-generated fitness plans. You can
          also manually set custom workout times in the fitness section.
        </Text>
      </Card>
    </View>
  );

  const renderMealSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Meal Reminder Times</Text>
      <Text style={styles.sectionDescription}>
        Customize when you want to be reminded for each meal.
      </Text>

      {/* Breakfast */}
      <Card style={styles.card}>
        <View style={styles.mealHeader}>
          <Text style={styles.mealTitle}>🍳 Breakfast</Text>
          <Switch
            value={breakfastEnabled}
            onValueChange={setBreakfastEnabled}
            trackColor={{ false: THEME.colors.border, true: THEME.colors.primary + '50' }}
            thumbColor={breakfastEnabled ? THEME.colors.primary : THEME.colors.textMuted}
          />
        </View>

        {breakfastEnabled && (
          <>
            <View style={styles.cardContent}>
              <TextInput
                style={styles.textInput}
                value={breakfastTime}
                onChangeText={setBreakfastTime}
                placeholder="08:00"
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              />
            </View>
            <View style={styles.presetButtons}>
              {['early', 'normal', 'late'].map((preset) => {
                const time = getPresetTime('breakfast', preset as any);
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetButton,
                      breakfastTime === time && styles.presetButtonActive,
                    ]}
                    onPress={() => setBreakfastTime(time)}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        breakfastTime === time && styles.presetButtonTextActive,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </Card>

      {/* Lunch */}
      <Card style={styles.card}>
        <View style={styles.mealHeader}>
          <Text style={styles.mealTitle}>🥙 Lunch</Text>
          <Switch
            value={lunchEnabled}
            onValueChange={setLunchEnabled}
            trackColor={{ false: THEME.colors.border, true: THEME.colors.primary + '50' }}
            thumbColor={lunchEnabled ? THEME.colors.primary : THEME.colors.textMuted}
          />
        </View>

        {lunchEnabled && (
          <>
            <View style={styles.cardContent}>
              <TextInput
                style={styles.textInput}
                value={lunchTime}
                onChangeText={setLunchTime}
                placeholder="13:00"
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              />
            </View>
            <View style={styles.presetButtons}>
              {['early', 'normal', 'late'].map((preset) => {
                const time = getPresetTime('lunch', preset as any);
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetButton, lunchTime === time && styles.presetButtonActive]}
                    onPress={() => setLunchTime(time)}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        lunchTime === time && styles.presetButtonTextActive,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </Card>

      {/* Dinner */}
      <Card style={styles.card}>
        <View style={styles.mealHeader}>
          <Text style={styles.mealTitle}>🍽️ Dinner</Text>
          <Switch
            value={dinnerEnabled}
            onValueChange={setDinnerEnabled}
            trackColor={{ false: THEME.colors.border, true: THEME.colors.primary + '50' }}
            thumbColor={dinnerEnabled ? THEME.colors.primary : THEME.colors.textMuted}
          />
        </View>

        {dinnerEnabled && (
          <>
            <View style={styles.cardContent}>
              <TextInput
                style={styles.textInput}
                value={dinnerTime}
                onChangeText={setDinnerTime}
                placeholder="19:00"
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              />
            </View>
            <View style={styles.presetButtons}>
              {['early', 'normal', 'late'].map((preset) => {
                const time = getPresetTime('dinner', preset as any);
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetButton, dinnerTime === time && styles.presetButtonActive]}
                    onPress={() => setDinnerTime(time)}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        dinnerTime === time && styles.presetButtonTextActive,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </Card>
    </View>
  );

  const renderSleepSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sleep Reminder Settings</Text>
      <Text style={styles.sectionDescription}>
        Set your bedtime and when to be reminded to start winding down.
      </Text>

      <Card style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.inputLabel}>Bedtime</Text>
          <TextInput
            style={styles.textInput}
            value={bedtime}
            onChangeText={setBedtime}
            placeholder="22:30"
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          />
        </View>
        <View style={styles.presetButtons}>
          {['21:30', '22:00', '22:30', '23:00'].map((time) => (
            <TouchableOpacity
              key={time}
              style={[styles.presetButton, bedtime === time && styles.presetButtonActive]}
              onPress={() => setBedtime(time)}
            >
              <Text
                style={[styles.presetButtonText, bedtime === time && styles.presetButtonTextActive]}
              >
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.inputLabel}>Wind Down Reminder (minutes before)</Text>
          <TextInput
            style={styles.textInput}
            value={sleepReminderMinutes}
            onChangeText={setSleepReminderMinutes}
            placeholder="30"
            keyboardType="number-pad"
            selectTextOnFocus
          />
        </View>
        <View style={styles.presetButtons}>
          {[15, 30, 45, 60].map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.presetButton,
                sleepReminderMinutes === minutes.toString() && styles.presetButtonActive,
              ]}
              onPress={() => setSleepReminderMinutes(minutes.toString())}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  sleepReminderMinutes === minutes.toString() && styles.presetButtonTextActive,
                ]}
              >
                {minutes}min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.infoText}>
          🌙 You'll receive two notifications: one to start winding down, and another at bedtime.
          Quality sleep is essential for recovery and performance.
        </Text>
      </Card>
    </View>
  );

  if (!type) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {type === 'workout' && renderWorkoutSettings()}
          {type === 'meals' && renderMealSettings()}
          {type === 'sleep' && renderSleepSettings()}

          <View style={styles.buttonContainer}>
            <Button
              title={isLoading ? 'Saving...' : 'Save Settings'}
              onPress={handleSave}
              variant="primary"
              size="lg"
              disabled={isLoading}
            />
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },

  cancelButton: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.medium,
  },

  title: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  content: {
    flex: 1,
  },

  section: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  sectionDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
    lineHeight: 20,
  },

  card: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },

  cardContent: {
    marginBottom: THEME.spacing.md,
  },

  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },

  mealTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  inputLabel: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  textInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    backgroundColor: THEME.colors.backgroundSecondary,
  },

  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: THEME.spacing.sm,
  },

  presetButton: {
    flex: 1,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.backgroundSecondary,
    alignItems: 'center',
  },

  presetButtonActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primary + '20',
  },

  presetButtonText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },

  presetButtonTextActive: {
    color: THEME.colors.primary,
  },

  infoCard: {
    padding: THEME.spacing.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
  },

  infoText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  buttonContainer: {
    paddingHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.lg,
  },

  bottomSpacing: {
    height: THEME.spacing.xl,
  },
});

export default NotificationEditModal;
