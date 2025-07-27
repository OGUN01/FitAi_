import React, { useState } from 'react';
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

interface PrivacySecurityScreenProps {
  onBack?: () => void;
}

export const PrivacySecurityScreen: React.FC<PrivacySecurityScreenProps> = ({ onBack }) => {
  const [settings, setSettings] = useState({
    dataSharing: false,
    analytics: true,
    crashReports: true,
    locationTracking: false,
    biometricAuth: false,
    autoLock: true,
    profileVisibility: 'private',
  });

  const [hasChanges, setHasChanges] = useState(false);

  const toggleSetting = (key: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
    setHasChanges(true);
  };

  const handleDataExport = () => {
    Alert.alert(
      'Export Data',
      'Your data export will be prepared and sent to your email address. This may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Export', 
          onPress: () => {
            Alert.alert('Export Started', 'Your data export has been initiated. You will receive an email when it\'s ready.');
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? This will permanently delete your account and all associated data.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: () => {
                    // TODO: Implement account deletion
                    Alert.alert('Account Deletion', 'Account deletion process will be implemented here.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const saveSettings = async () => {
    try {
      console.log('Saving privacy settings:', settings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setHasChanges(false);
      Alert.alert('Success', 'Privacy settings saved successfully!');
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Privacy & Security</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Data Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Privacy</Text>
          
          <Card style={styles.settingCard} variant="outlined">
            <View style={styles.settingContent}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>📊</Text>
                <View style={styles.settingTexts}>
                  <Text style={styles.settingTitle}>Data Sharing</Text>
                  <Text style={styles.settingDescription}>
                    Allow sharing anonymous usage data to improve the app
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.dataSharing}
                onValueChange={() => toggleSetting('dataSharing')}
                trackColor={{ false: THEME.colors.border, true: THEME.colors.primary + '50' }}
                thumbColor={settings.dataSharing ? THEME.colors.primary : THEME.colors.textMuted}
              />
            </View>
          </Card>

          <Card style={styles.settingCard} variant="outlined">
            <View style={styles.settingContent}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>📈</Text>
                <View style={styles.settingTexts}>
                  <Text style={styles.settingTitle}>Analytics</Text>
                  <Text style={styles.settingDescription}>
                    Help us improve by sharing app usage analytics
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.analytics}
                onValueChange={() => toggleSetting('analytics')}
                trackColor={{ false: THEME.colors.border, true: THEME.colors.primary + '50' }}
                thumbColor={settings.analytics ? THEME.colors.primary : THEME.colors.textMuted}
              />
            </View>
          </Card>

          <Card style={styles.settingCard} variant="outlined">
            <View style={styles.settingContent}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>🐛</Text>
                <View style={styles.settingTexts}>
                  <Text style={styles.settingTitle}>Crash Reports</Text>
                  <Text style={styles.settingDescription}>
                    Automatically send crash reports to help fix issues
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.crashReports}
                onValueChange={() => toggleSetting('crashReports')}
                trackColor={{ false: THEME.colors.border, true: THEME.colors.primary + '50' }}
                thumbColor={settings.crashReports ? THEME.colors.primary : THEME.colors.textMuted}
              />
            </View>
          </Card>

          <Card style={styles.settingCard} variant="outlined">
            <View style={styles.settingContent}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>📍</Text>
                <View style={styles.settingTexts}>
                  <Text style={styles.settingTitle}>Location Tracking</Text>
                  <Text style={styles.settingDescription}>
                    Allow location access for workout tracking and nearby features
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.locationTracking}
                onValueChange={() => toggleSetting('locationTracking')}
                trackColor={{ false: THEME.colors.border, true: THEME.colors.primary + '50' }}
                thumbColor={settings.locationTracking ? THEME.colors.primary : THEME.colors.textMuted}
              />
            </View>
          </Card>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <Card style={styles.settingCard} variant="outlined">
            <View style={styles.settingContent}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>🔐</Text>
                <View style={styles.settingTexts}>
                  <Text style={styles.settingTitle}>Biometric Authentication</Text>
                  <Text style={styles.settingDescription}>
                    Use fingerprint or face recognition to secure your app
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.biometricAuth}
                onValueChange={() => toggleSetting('biometricAuth')}
                trackColor={{ false: THEME.colors.border, true: THEME.colors.primary + '50' }}
                thumbColor={settings.biometricAuth ? THEME.colors.primary : THEME.colors.textMuted}
              />
            </View>
          </Card>

          <Card style={styles.settingCard} variant="outlined">
            <View style={styles.settingContent}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingIcon}>🔒</Text>
                <View style={styles.settingTexts}>
                  <Text style={styles.settingTitle}>Auto-Lock</Text>
                  <Text style={styles.settingDescription}>
                    Automatically lock the app when it goes to background
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.autoLock}
                onValueChange={() => toggleSetting('autoLock')}
                trackColor={{ false: THEME.colors.border, true: THEME.colors.primary + '50' }}
                thumbColor={settings.autoLock ? THEME.colors.primary : THEME.colors.textMuted}
              />
            </View>
          </Card>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <Card style={styles.actionCard} variant="outlined">
            <TouchableOpacity onPress={handleDataExport}>
              <View style={styles.actionContent}>
                <Text style={styles.actionIcon}>📤</Text>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionTitle}>Export My Data</Text>
                  <Text style={styles.actionDescription}>
                    Download a copy of all your personal data
                  </Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card style={styles.actionCard} variant="outlined">
            <TouchableOpacity onPress={() => Alert.alert('Privacy Policy', 'Privacy policy will be displayed here.')}>
              <View style={styles.actionContent}>
                <Text style={styles.actionIcon}>📄</Text>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionTitle}>Privacy Policy</Text>
                  <Text style={styles.actionDescription}>
                    Read our complete privacy policy
                  </Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card style={styles.actionCard} variant="outlined">
            <TouchableOpacity onPress={() => Alert.alert('Terms of Service', 'Terms of service will be displayed here.')}>
              <View style={styles.actionContent}>
                <Text style={styles.actionIcon}>📋</Text>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionTitle}>Terms of Service</Text>
                  <Text style={styles.actionDescription}>
                    Review our terms and conditions
                  </Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          
          <Card style={[styles.actionCard, styles.dangerCard]} variant="outlined">
            <TouchableOpacity onPress={handleDeleteAccount}>
              <View style={styles.actionContent}>
                <Text style={styles.dangerIcon}>⚠️</Text>
                <View style={styles.actionInfo}>
                  <Text style={styles.dangerActionTitle}>Delete Account</Text>
                  <Text style={styles.actionDescription}>
                    Permanently delete your account and all data
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
  
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  
  dangerTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.error,
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
  
  actionCard: {
    marginBottom: THEME.spacing.sm,
  },
  
  dangerCard: {
    borderColor: THEME.colors.error + '50',
    backgroundColor: THEME.colors.error + '05',
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
  
  dangerIcon: {
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
  
  dangerActionTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.error,
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