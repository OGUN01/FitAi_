import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Card, THEME } from '../../components/ui';

export const ProfileScreen: React.FC = () => {
  const menuItems = [
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

  const quickStats = [
    { label: 'Workouts', value: '24', icon: '🏋️' },
    { label: 'Streak', value: '12', icon: '🔥' },
    { label: 'Calories', value: '7.2k', icon: '⚡' },
    { label: 'Hours', value: '18', icon: '⏱️' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.section}>
          <Card style={styles.profileCard} variant="elevated">
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>JD</Text>
                </View>
                <View style={styles.statusDot} />
              </View>
              
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>John Doe</Text>
                <Text style={styles.userEmail}>john.doe@email.com</Text>
                <Text style={styles.memberSince}>Member since Jan 2024</Text>
              </View>
            </View>
            
            <View style={styles.profileStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>72.5</Text>
                <Text style={styles.statLabel}>kg</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>175</Text>
                <Text style={styles.statLabel}>cm</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>22.4</Text>
                <Text style={styles.statLabel}>BMI</Text>
              </View>
            </View>
          </Card>
        </View>

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

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          {menuItems.map((item) => (
            <TouchableOpacity key={item.id}>
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
        <View style={styles.section}>
          <TouchableOpacity>
            <Card style={styles.logoutCard} variant="outlined">
              <View style={styles.logoutContent}>
                <Text style={styles.logoutIcon}>🚪</Text>
                <Text style={styles.logoutText}>Sign Out</Text>
              </View>
            </Card>
          </TouchableOpacity>
        </View>

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
});
