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
} from 'react-native';
import { Card, Button, THEME } from '../../components/ui';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  icon: string;
  time?: string;
}

interface NotificationsScreenProps {
  onBack?: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'water',
      title: 'Water Reminders',
      description: 'Get reminded to stay hydrated throughout the day',
      enabled: true,
      icon: '💧',
      time: '2 hours',
    },
    {
      id: 'workout',
      title: 'Workout Reminders',
      description: 'Never miss your scheduled workout sessions',
      enabled: true,
      icon: '🏋️',
      time: '30 min before',
    },
    {
      id: 'breakfast',
      title: 'Breakfast Reminder',
      description: 'Start your day with a healthy breakfast',
      enabled: true,
      icon: '🍳',
      time: '8:00 AM',
    },
    {
      id: 'lunch',
      title: 'Lunch Reminder',
      description: 'Time for a nutritious lunch break',
      enabled: true,
      icon: '🥙',
      time: '1:00 PM',
    },
    {
      id: 'dinner',
      title: 'Dinner Reminder',
      description: 'End your day with a balanced dinner',
      enabled: true,
      icon: '🍽️',
      time: '7:00 PM',
    },
    {
      id: 'sleep',
      title: 'Sleep Reminder',
      description: 'Get reminded when it\'s time to wind down',
      enabled: false,
      icon: '😴',
      time: '10:00 PM',
    },
    {
      id: 'progress',
      title: 'Progress Updates',
      description: 'Weekly summary of your fitness journey',
      enabled: true,
      icon: '📊',
      time: 'Weekly',
    },
  ]);

  const [hasChanges, setHasChanges] = useState(false);

  const toggleSetting = (settingId: string) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === settingId 
          ? { ...setting, enabled: !setting.enabled }
          : setting
      )
    );
    setHasChanges(true);
  };

  const handleTimePress = (settingId: string) => {
    const setting = settings.find(s => s.id === settingId);
    if (setting) {
      Alert.alert(
        'Set Time',
        `Configure ${setting.title} time`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set Time', onPress: () => {
            // TODO: Implement time picker
            Alert.alert('Time Picker', 'Time picker will be implemented here');
          }},
        ]
      );
    }
  };

  const saveSettings = async () => {
    try {
      // TODO: Save to storage/database
      console.log('Saving notification settings:', settings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setHasChanges(false);
      Alert.alert('Success', 'Notification settings saved successfully!');
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all notification settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSettings(prev => 
              prev.map(setting => ({ 
                ...setting, 
                enabled: setting.id !== 'sleep' // Sleep is disabled by default
              }))
            );
            setHasChanges(true);
          },
        },
      ]
    );
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
            Customize your notification preferences to stay on track with your fitness goals.
          </Text>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          
          {settings.map((setting) => (
            <Card key={setting.id} style={styles.settingCard} variant="outlined">
              <View style={styles.settingContent}>
                <View style={styles.settingInfo}>
                  <View style={styles.settingHeader}>
                    <Text style={styles.settingIcon}>{setting.icon}</Text>
                    <View style={styles.settingTexts}>
                      <Text style={styles.settingTitle}>{setting.title}</Text>
                      <Text style={styles.settingDescription}>{setting.description}</Text>
                      {setting.time && setting.enabled && (
                        <TouchableOpacity 
                          style={styles.timeButton}
                          onPress={() => handleTimePress(setting.id)}
                        >
                          <Text style={styles.timeText}>⏰ {setting.time}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
                
                <Switch
                  value={setting.enabled}
                  onValueChange={() => toggleSetting(setting.id)}
                  trackColor={{ 
                    false: THEME.colors.border, 
                    true: THEME.colors.primary + '50' 
                  }}
                  thumbColor={setting.enabled ? THEME.colors.primary : THEME.colors.textMuted}
                />
              </View>
            </Card>
          ))}
        </View>

        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          <Card style={styles.actionCard} variant="outlined">
            <TouchableOpacity onPress={resetToDefaults}>
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

        {/* Save Button */}
        {hasChanges && (
          <View style={styles.saveSection}>
            <Button
              title="Save Changes"
              onPress={saveSettings}
              variant="primary"
              size="lg"
              style={styles.saveButton}
            />
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
});