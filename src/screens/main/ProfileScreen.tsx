import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Card, Button, THEME } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useUser, useUserStats } from '../../hooks/useUser';
import { useDashboardIntegration } from '../../utils/integration';

export const ProfileScreen: React.FC = () => {
  const { user, isAuthenticated, isGuestMode, logout } = useAuth();
  const { profile } = useUser();
  const userStats = useUserStats();
  const { getHealthMetrics } = useDashboardIntegration();
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const healthMetrics = getHealthMetrics();
  
  // Edit Profile items (under pen icon)
  const editProfileItems = [
    {
      id: 1,
      title: 'Personal Information',
      subtitle: 'Update your profile details',
      icon: '👤',
      hasArrow: true,
    },
    {
      id: 2,
      title: 'Fitness Goals',
      subtitle: 'Modify your fitness objectives',
      icon: '🎯',
      hasArrow: true,
    },
    {
      id: 3,
      title: 'Workout Preferences',
      subtitle: 'Customize your training style',
      icon: '🏋️',
      hasArrow: true,
    },
    {
      id: 4,
      title: 'Nutrition Settings',
      subtitle: 'Dietary preferences and restrictions',
      icon: '🍎',
      hasArrow: true,
    },
  ];

  // Main Settings items (on main profile screen)
  const settingsItems = [
    {
      id: 5,
      title: 'Notifications',
      subtitle: 'Manage your alerts and reminders',
      icon: '🔔',
      hasArrow: true,
    },
    {
      id: 6,
      title: 'Privacy & Security',
      subtitle: 'Control your data and privacy',
      icon: '🔒',
      hasArrow: true,
    },
    {
      id: 7,
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      icon: '❓',
      hasArrow: true,
    },
    {
      id: 8,
      title: 'About FitAI',
      subtitle: 'App version and information',
      icon: 'ℹ️',
      hasArrow: true,
    },
  ];

  // Real user stats from hooks
  const quickStats = [
    { 
      label: 'Workouts', 
      value: userStats.totalWorkouts.toString(), 
      icon: '🏋️' 
    },
    { 
      label: 'Streak', 
      value: userStats.currentStreak.toString(), 
      icon: '🔥' 
    },
    { 
      label: 'Calories', 
      value: userStats.totalCaloriesBurned > 1000 
        ? `${(userStats.totalCaloriesBurned / 1000).toFixed(1)}k` 
        : userStats.totalCaloriesBurned.toString(), 
      icon: '⚡' 
    },
    { 
      label: 'Longest', 
      value: userStats.longestStreak.toString(), 
      icon: '⏱️' 
    },
  ];

  // Helper functions
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => {
            logout();
            Alert.alert('Signed Out', 'You have been successfully signed out.');
          }
        },
      ]
    );
  };

  const handleEditProfile = () => {
    setShowEditProfile(true);
  };

  const handleEditProfileItemPress = (item: any) => {
    Alert.alert(item.title, `${item.title} editing feature coming soon!`);
  };

  const handleSettingsItemPress = (item: any) => {
    Alert.alert(item.title, `${item.title} feature coming soon!`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.section}>
          <Card style={styles.profileCard} variant="elevated">
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getInitials(profile?.personalInfo?.name || user?.name)}
                  </Text>
                </View>
                <View style={styles.statusDot} />
              </View>
              
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>
                  {profile?.personalInfo?.name || user?.name || 'Anonymous User'}
                </Text>
                <Text style={styles.userEmail}>
                  {user?.email || 'No email provided'}
                </Text>
                <Text style={styles.memberSince}>
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'}
                </Text>
              </View>
            </View>
            
            <View style={styles.profileStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {healthMetrics?.weight || profile?.personalInfo?.weight || '-'}
                </Text>
                <Text style={styles.statLabel}>kg</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {healthMetrics?.height || profile?.personalInfo?.height || '-'}
                </Text>
                <Text style={styles.statLabel}>cm</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {healthMetrics?.bmi || '-'}
                </Text>
                <Text style={styles.statLabel}>BMI</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Guest User Sign-up Prompt */}
        {isGuestMode && (
          <View style={styles.section}>
            <Card style={styles.guestPromptCard} variant="elevated">
              <View style={styles.guestPromptContent}>
                <Text style={styles.guestPromptIcon}>🔐</Text>
                <Text style={styles.guestPromptTitle}>Create Your Account</Text>
                <Text style={styles.guestPromptSubtitle}>
                  Save your progress and sync across devices by creating a free account
                </Text>
                <Button
                  title="Sign Up Now"
                  onPress={() => setShowSignUpPrompt(true)}
                  variant="primary"
                  size="md"
                  style={styles.guestPromptButton}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.quickStatsGrid}>
            {quickStats.map((stat, index) => (
              <Card key={index} style={styles.quickStatCard} variant="outlined">
                <Text style={styles.quickStatIcon}>{stat.icon}</Text>
                <Text style={styles.quickStatValue}>{stat.value}</Text>
                <Text style={styles.quickStatLabel}>{stat.label}</Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Settings Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          {settingsItems.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => handleSettingsItemPress(item)}>
              <Card style={styles.menuCard} variant="outlined">
                <View style={styles.menuContent}>
                  <View style={styles.menuIcon}>
                    <Text style={styles.menuIconText}>{item.icon}</Text>
                  </View>
                  
                  <View style={styles.menuInfo}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  
                  {item.hasArrow && (
                    <Text style={styles.menuArrow}>›</Text>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Card style={styles.appInfoCard} variant="outlined">
            <View style={styles.appInfoContent}>
              <View style={styles.appLogo}>
                <Text style={styles.appLogoText}>FitAI</Text>
              </View>
              <View style={styles.appInfo}>
                <Text style={styles.appName}>FitAI</Text>
                <Text style={styles.appVersion}>Version 1.0.0</Text>
                <Text style={styles.appDescription}>
                  Your AI-powered fitness companion for a healthier lifestyle
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Logout Button */}
        {isAuthenticated && (
          <View style={styles.section}>
            <TouchableOpacity onPress={handleSignOut}>
              <Card style={styles.logoutCard} variant="outlined">
                <View style={styles.logoutContent}>
                  <Text style={styles.logoutIcon}>🚪</Text>
                  <Text style={styles.logoutText}>Sign Out</Text>
                </View>
              </Card>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowEditProfile(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            {/* Profile Picture Section */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Profile Picture</Text>
              <View style={styles.profilePictureEdit}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getInitials(profile?.personalInfo?.name || user?.name)}
                  </Text>
                </View>
                <TouchableOpacity style={styles.changePictureButton} onPress={() => Alert.alert('Change Picture', 'Profile picture editing coming soon!')}>
                  <Text style={styles.changePictureText}>Change Picture</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Edit Profile Items */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Profile Settings</Text>
              
              {editProfileItems.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => handleEditProfileItemPress(item)}>
                  <Card style={styles.menuCard} variant="outlined">
                    <View style={styles.menuContent}>
                      <View style={styles.menuIcon}>
                        <Text style={styles.menuIconText}>{item.icon}</Text>
                      </View>
                      
                      <View style={styles.menuInfo}>
                        <Text style={styles.menuTitle}>{item.title}</Text>
                        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                      </View>
                      
                      {item.hasArrow && (
                        <Text style={styles.menuArrow}>›</Text>
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBottomSpacing} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.md,
  },
  
  title: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  
  editButton: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  editIcon: {
    fontSize: 20,
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
  
  profileCard: {
    padding: THEME.spacing.lg,
  },
  
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  
  avatarContainer: {
    position: 'relative',
    marginRight: THEME.spacing.md,
  },
  
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  avatarText: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.white,
  },
  
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.colors.success,
    borderWidth: 2,
    borderColor: THEME.colors.backgroundTertiary,
  },
  
  profileInfo: {
    flex: 1,
  },
  
  userName: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },
  
  userEmail: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },
  
  memberSince: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.xs,
  },
  
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: THEME.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  
  statItem: {
    alignItems: 'center',
  },
  
  statValue: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  
  statLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.xs,
  },
  
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: THEME.colors.border,
  },
  
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.md,
  },
  
  quickStatCard: {
    width: '47%',
    padding: THEME.spacing.lg,
    alignItems: 'center',
  },
  
  quickStatIcon: {
    fontSize: 32,
    marginBottom: THEME.spacing.sm,
  },
  
  quickStatValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },
  
  quickStatLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },
  
  menuCard: {
    marginBottom: THEME.spacing.sm,
  },
  
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },
  
  menuIconText: {
    fontSize: 20,
  },
  
  menuInfo: {
    flex: 1,
  },
  
  menuTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
  },
  
  menuSubtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },
  
  menuArrow: {
    fontSize: 20,
    color: THEME.colors.textMuted,
    fontWeight: THEME.fontWeight.bold,
  },
  
  appInfoCard: {
    padding: THEME.spacing.lg,
  },
  
  appInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  appLogo: {
    width: 48,
    height: 48,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },
  
  appLogoText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.white,
  },
  
  appInfo: {
    flex: 1,
  },
  
  appName: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },
  
  appVersion: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },
  
  appDescription: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.xs,
  },
  
  logoutCard: {
    borderColor: THEME.colors.error,
  },
  
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  
  logoutIcon: {
    fontSize: 20,
    marginRight: THEME.spacing.sm,
  },
  
  logoutText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.error,
  },
  
  bottomSpacing: {
    height: THEME.spacing.xl,
  },

  // Guest prompt styles
  guestPromptCard: {
    backgroundColor: THEME.colors.primary + '10',
    borderColor: THEME.colors.primary + '30',
  },

  guestPromptContent: {
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },

  guestPromptIcon: {
    fontSize: 32,
    marginBottom: THEME.spacing.sm,
  },

  guestPromptTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
    textAlign: 'center',
  },

  guestPromptSubtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
    lineHeight: 20,
  },

  guestPromptButton: {
    minWidth: 120,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },

  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCloseText: {
    fontSize: 16,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
  },

  modalTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },

  modalHeaderSpacer: {
    width: 32,
  },

  modalScrollView: {
    flex: 1,
  },

  modalSection: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },

  modalSectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  profilePictureEdit: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.lg,
  },

  changePictureButton: {
    marginTop: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
  },

  changePictureText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
  },

  modalBottomSpacing: {
    height: THEME.spacing.xxl,
  },
});
