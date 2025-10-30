import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Button, THEME } from '../../components/ui';
import { ResponsiveTheme } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import { useUser, useUserStats } from '../../hooks/useUser';
import { useDashboardIntegration } from '../../utils/integration';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { EditProvider, useEditActions, useEditStatus } from '../../contexts/EditContext';
import { EditOverlay } from '../../components/profile/EditOverlay';
import { dataManager } from '../../services/dataManager';
import { profileValidator } from '../../services/profileValidator';
import {
  NotificationsScreen,
  PrivacySecurityScreen,
  HelpSupportScreen,
  AboutFitAIScreen,
} from '../settings';
import { GuestSignUpScreen } from './GuestSignUpScreen';

// Internal ProfileScreen component
const ProfileScreenInternal: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user, isAuthenticated, isGuestMode, logout, guestId } = useAuth();
  const { profile, clearProfile } = useUser();
  const userStats = useUserStats();
  const { getHealthMetrics } = useDashboardIntegration();
  const { startEdit } = useEditActions();
  const { showOverlay, setShowOverlay } = useEditStatus();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [currentSettingsScreen, setCurrentSettingsScreen] = useState<string | null>(null);
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);

  // Subscription management
  const {
    subscriptionStatus,
    trialInfo,
    premiumFeatures,
    showPaywallModal,
    initialize: initializeSubscription,
    refreshSubscriptionStatus
  } = useSubscriptionStore();
  const [showSubscriptionScreen, setShowSubscriptionScreen] = useState(false);

  const healthMetrics = getHealthMetrics();

  // Premium features display list (derived from subscription store)
  const premiumFeaturesList = [
    {
      icon: '🤖',
      name: 'Unlimited AI Generations',
      description: 'Generate unlimited workouts and meal plans with AI',
      enabled: premiumFeatures?.unlimitedAI || false
    },
    {
      icon: '📊',
      name: 'Advanced Analytics',
      description: 'Detailed progress tracking and insights',
      enabled: premiumFeatures?.advancedAnalytics || false
    },
    {
      icon: '🎨',
      name: 'Custom Themes',
      description: 'Personalize your app appearance',
      enabled: premiumFeatures?.customThemes || false
    },
    {
      icon: '📤',
      name: 'Export Data',
      description: 'Export your fitness data and reports',
      enabled: premiumFeatures?.exportData || false
    },
    {
      icon: '🏆',
      name: 'Premium Achievements',
      description: 'Unlock exclusive badges and rewards',
      enabled: premiumFeatures?.premiumAchievements || false
    },
    {
      icon: '🚫',
      name: 'Ad-Free Experience',
      description: 'Enjoy FitAI without interruptions',
      enabled: premiumFeatures?.removeAds || false
    },
    {
      icon: '💪',
      name: 'Advanced Workouts',
      description: 'Access to premium workout templates',
      enabled: premiumFeatures?.advancedWorkouts || false
    },
    {
      icon: '🔄',
      name: 'Multi-Device Sync',
      description: 'Sync your data across all devices',
      enabled: premiumFeatures?.multiDeviceSync || false
    }
  ];

  // Check for profile edit intent on component mount
  useEffect(() => {
    const checkEditIntent = async () => {
      try {
        const intentData = await AsyncStorage.getItem('profileEditIntent');
        if (intentData) {
          const intent = JSON.parse(intentData);
          // Check if intent is recent (within last 5 minutes)
          const isRecent = Date.now() - intent.timestamp < 5 * 60 * 1000;

          if (isRecent && intent.section) {
            console.log('🎯 ProfileScreen: Found edit intent:', intent);
            // Clear the intent
            await AsyncStorage.removeItem('profileEditIntent');

            // Small delay to ensure component is fully mounted
            setTimeout(async () => {
              try {
                await startEdit(intent.section);
              } catch (error) {
                console.error('Failed to auto-start edit:', error);
                Alert.alert('Error', 'Failed to open editor. Please try again.');
              }
            }, 500);
          } else {
            // Clear old intent
            await AsyncStorage.removeItem('profileEditIntent');
          }
        }
      } catch (error) {
        console.error('Error checking edit intent:', error);
      }
    };

    checkEditIntent();
  }, [startEdit]);

  // Initialize subscription system
  useEffect(() => {
    initializeSubscription();
  }, [initializeSubscription]);

  // Edit Profile items (under pen icon)
  // Now navigates to comprehensive onboarding tabs with 170+ fields
  const editProfileItems = [
    {
      id: 1,
      title: 'Personal Information',
      subtitle: 'Update your profile details (10 fields)',
      icon: '👤',
      hasArrow: true,
      tabIndex: 1, // PersonalInfoTab
    },
    {
      id: 2,
      title: 'Diet Preferences',
      subtitle: 'Dietary preferences and health habits (27 fields)',
      icon: '🍎',
      hasArrow: true,
      tabIndex: 2, // DietPreferencesTab
    },
    {
      id: 3,
      title: 'Body Analysis',
      subtitle: 'Track your body measurements (30 fields)',
      icon: '📊',
      hasArrow: true,
      tabIndex: 3, // BodyAnalysisTab
    },
    {
      id: 4,
      title: 'Workout Preferences',
      subtitle: 'Customize your training style (22 fields)',
      icon: '🏋️',
      hasArrow: true,
      tabIndex: 4, // WorkoutPreferencesTab
    },
    {
      id: 5,
      title: 'Health Metrics',
      subtitle: 'View calculated health metrics (50+ fields)',
      icon: '📈',
      hasArrow: true,
      tabIndex: 5, // AdvancedReviewTab
    },
  ];

  // Main Settings items (on main profile screen)
  const settingsItems = [
    {
      id: 5,
      title: 'Subscription',
      subtitle: subscriptionStatus === 'active' 
        ? 'Manage your premium subscription'
        : subscriptionStatus === 'trialing'
        ? `${Math.ceil((trialInfo?.daysRemaining || 0))} days left in trial`
        : 'Upgrade to Premium',
      icon: subscriptionStatus === 'active' ? '👑' : subscriptionStatus === 'trialing' ? '⏰' : '💎',
      hasArrow: true,
      isPremium: subscriptionStatus === 'active' || subscriptionStatus === 'trialing',
    },
    {
      id: 6,
      title: 'Notifications',
      subtitle: 'Manage your alerts and reminders',
      icon: '🔔',
      hasArrow: true,
    },
    {
      id: 7,
      title: 'Privacy & Security',
      subtitle: 'Control your data and privacy',
      icon: '🔒',
      hasArrow: true,
    },
    {
      id: 8,
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      icon: '❓',
      hasArrow: true,
    },
    {
      id: 9,
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
      icon: '🏋️',
    },
    {
      label: 'Streak',
      value: userStats.currentStreak.toString(),
      icon: '🔥',
    },
    {
      label: 'Calories',
      value:
        userStats.totalCaloriesBurned > 1000
          ? `${(userStats.totalCaloriesBurned / 1000).toFixed(1)}k`
          : userStats.totalCaloriesBurned.toString(),
      icon: '⚡',
    },
    {
      label: 'Longest',
      value: userStats.longestStreak.toString(),
      icon: '⏱️',
    },
  ];

  // Helper functions
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          Alert.alert('Signed Out', 'You have been successfully signed out.');
        },
      },
    ]);
  };

  const handleEditProfile = () => {
    setShowEditProfile(true);
  };

  const handleEditProfileItemPress = async (item: any) => {
    setShowEditProfile(false); // Close the modal first

    console.log('🔍 ProfileScreen: handleEditProfileItemPress called with item:', {
      id: item.id,
      title: item.title,
      tabIndex: item.tabIndex,
      hasNavigation: !!navigation,
    });

    // NEW: Navigate to OnboardingContainer in edit mode instead of using EditContext
    if (navigation && item.tabIndex) {
      console.log(`🧭 ProfileScreen: Navigating to OnboardingContainer for tab ${item.tabIndex}`);
      navigation.navigate('OnboardingContainer', {
        editMode: true,
        initialTab: item.tabIndex,
        onEditComplete: () => {
          console.log('✅ ProfileScreen: Edit completed, refreshing profile');
          // Profile data will be automatically refreshed by useUser hook
        },
        onEditCancel: () => {
          console.log('❌ ProfileScreen: Edit cancelled');
        },
      });
      return;
    }

    console.warn('⚠️ ProfileScreen: Falling back to OLD EditContext (navigation or tabIndex missing)');


    // FALLBACK: Old EditContext approach (if navigation not available)
    try {
      switch (item.id) {
        case 1: // Personal Information
          await startEdit('personalInfo');
          break;
        case 2: // Diet Preferences
          await startEdit('dietPreferences');
          break;
        case 3: // Body Analysis
          Alert.alert(item.title, 'Please use the new comprehensive edit mode');
          break;
        case 4: // Workout Preferences
          await startEdit('workoutPreferences');
          break;
        case 5: // Health Metrics
          Alert.alert(item.title, 'View-only calculated health metrics');
          break;
        default:
          Alert.alert(item.title, `${item.title} editing feature coming soon!`);
      }
    } catch (error) {
      console.error('Failed to start edit:', error);
      Alert.alert('Error', 'Failed to open editor. Please try again.');
    }
  };

  // Edit functions are now handled by EditContext

  const handleSettingsItemPress = (item: any) => {
    switch (item.id) {
      case 5: // Subscription
        setShowSubscriptionScreen(true);
        break;
      case 6: // Notifications
        setCurrentSettingsScreen('notifications');
        break;
      case 7: // Privacy & Security
        setCurrentSettingsScreen('privacy');
        break;
      case 8: // Help & Support
        setCurrentSettingsScreen('help');
        break;
      case 9: // About FitAI
        setCurrentSettingsScreen('about');
        break;
      default:
        Alert.alert(item.title, `${item.title} feature coming soon!`);
    }
  };

  const handleCloseSettingsScreen = () => {
    setCurrentSettingsScreen(null);
  };

  // Handle sign up redirect to guest signup screen
  const handleSignUpRedirect = async () => {
    try {
      console.log('🔄 ProfileScreen: Opening guest signup screen...');
      
      // Show the guest signup screen instead of clearing data
      setShowGuestSignUp(true);
      
    } catch (error) {
      console.error('❌ ProfileScreen: Failed to open signup screen:', error);
      Alert.alert('Error', 'Unable to open sign up. Please try again.');
    }
  };

  // Handle successful signup from guest signup screen
  const handleGuestSignUpSuccess = () => {
    console.log('✅ ProfileScreen: Guest signup completed successfully');
    setShowGuestSignUp(false);
    // The app will automatically detect the new authenticated state
  };

  // Handle back from guest signup screen
  const handleGuestSignUpBack = () => {
    console.log('🔙 ProfileScreen: User went back from guest signup');
    setShowGuestSignUp(false);
  };

  const renderSettingsScreen = () => {
    switch (currentSettingsScreen) {
      case 'notifications':
        return <NotificationsScreen onBack={handleCloseSettingsScreen} />;
      case 'privacy':
        return <PrivacySecurityScreen onBack={handleCloseSettingsScreen} />;
      case 'help':
        return <HelpSupportScreen onBack={handleCloseSettingsScreen} />;
      case 'about':
        return <AboutFitAIScreen onBack={handleCloseSettingsScreen} />;
      default:
        return null;
    }
  };

  // If guest signup screen is active, render it
  if (showGuestSignUp) {
    return (
      <GuestSignUpScreen
        onBack={handleGuestSignUpBack}
        onSignUpSuccess={handleGuestSignUpSuccess}
      />
    );
  }

  // If a settings screen is active, render it instead of the main profile
  if (currentSettingsScreen) {
    return renderSettingsScreen();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View>
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
                  <Text style={styles.userEmail}>{user?.email || 'No email provided'}</Text>
                  <Text style={styles.memberSince}>
                    Member since{' '}
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Recently'}
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
                  <Text style={styles.statValue}>{healthMetrics?.bmi || '-'}</Text>
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
                    onPress={handleSignUpRedirect}
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
                <Card style={[
                  styles.menuCard,
                  (item as any).isPremium && styles.premiumMenuCard
                ]} variant="outlined">
                  <View style={styles.menuContent}>
                    <View style={[
                      styles.menuIcon,
                      (item as any).isPremium && styles.premiumMenuIcon
                    ]}>
                      <Text style={styles.menuIconText}>{item.icon}</Text>
                    </View>

                    <View style={styles.menuInfo}>
                      <Text style={[
                        styles.menuTitle,
                        (item as any).isPremium && styles.premiumMenuTitle
                      ]}>{item.title}</Text>
                      <Text style={[
                        styles.menuSubtitle,
                        (item as any).isPremium && styles.premiumMenuSubtitle
                      ]}>{item.subtitle}</Text>
                    </View>

                    {item.hasArrow && <Text style={[
                      styles.menuArrow,
                      (item as any).isPremium && styles.premiumMenuArrow
                    ]}>›</Text>}
                    
                    {(item as any).isPremium && (
                      <View style={styles.premiumBadge}>
                        <Text style={styles.premiumBadgeText}>PRO</Text>
                      </View>
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
        </View>
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
            <View>
              {/* Profile Picture Section */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Profile Picture</Text>
                <View style={styles.profilePictureEdit}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {getInitials(profile?.personalInfo?.name || user?.name)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changePictureButton}
                    onPress={() =>
                      Alert.alert('Change Picture', 'Profile picture editing coming soon!')
                    }
                  >
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

                        {item.hasArrow && <Text style={styles.menuArrow}>›</Text>}
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalBottomSpacing} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Subscription Management Modal */}
      <Modal
        visible={showSubscriptionScreen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSubscriptionScreen(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSubscriptionScreen(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Subscription</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            <View>
              {/* Current Subscription Status */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Current Plan</Text>
                <Card style={[
                  styles.subscriptionStatusCard,
                  subscriptionStatus === 'active' && styles.activeSubscriptionCard
                ]} variant="elevated">
                  <View style={styles.subscriptionStatusContent}>
                    <View style={styles.subscriptionStatusHeader}>
                      <Text style={styles.subscriptionStatusIcon}>
                        {subscriptionStatus === 'active' ? '👑' : 
                         subscriptionStatus === 'trialing' ? '⏰' : '💎'}
                      </Text>
                      <View style={styles.subscriptionStatusInfo}>
                        <Text style={styles.subscriptionStatusTitle}>
                          {subscriptionStatus === 'active' ? 'FitAI Premium' :
                           subscriptionStatus === 'trialing' ? 'Premium Trial' :
                           'FitAI Free'}
                        </Text>
                        <Text style={styles.subscriptionStatusSubtitle}>
                          {subscriptionStatus === 'active' ? 'Active subscription' :
                           subscriptionStatus === 'trialing' 
                             ? `${Math.ceil(trialInfo?.daysRemaining || 0)} days remaining`
                             : 'Limited features'}
                        </Text>
                      </View>
                    </View>
                    
                    {subscriptionStatus !== 'free' && trialInfo?.nextBillingDate && (
                      <View style={styles.subscriptionBillingInfo}>
                        <Text style={styles.subscriptionBillingText}>
                          Next billing: {new Date(trialInfo.nextBillingDate).toLocaleDateString()}
                        </Text>
                        <Text style={styles.subscriptionAmountText}>
                          ${trialInfo?.amount || '9.99'}/month
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              </View>

              {/* Premium Features Preview */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  {subscriptionStatus === 'free' ? 'Premium Features' : 'Your Premium Features'}
                </Text>
                {premiumFeaturesList.map((feature, index) => (
                  <Card key={index} style={styles.featureCard} variant="outlined">
                    <View style={styles.featureContent}>
                      <Text style={styles.featureIcon}>{feature.icon}</Text>
                      <View style={styles.featureInfo}>
                        <Text style={styles.featureTitle}>{feature.name}</Text>
                        <Text style={styles.featureDescription}>{feature.description}</Text>
                      </View>
                      <View style={[
                        styles.featureStatus,
                        feature.enabled && styles.featureActiveStatus
                      ]}>
                        <Text style={[
                          styles.featureStatusText,
                          feature.enabled && styles.featureActiveStatusText
                        ]}>
                          {feature.enabled ? '✓' : '🔒'}
                        </Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.modalSection}>
                {subscriptionStatus === 'free' ? (
                  <Button
                    title="Upgrade to Premium - $9.99/month"
                    onPress={() => {
                      setShowSubscriptionScreen(false);
                      // TODO: Open paywall
                      console.log('Opening paywall...');
                    }}
                    variant="primary"
                    size="lg"
                    style={styles.upgradeButton}
                  />
                ) : (
                  <View style={styles.subscriptionActions}>
                    <Button
                      title="Manage Billing"
                      onPress={() => {
                        Alert.alert('Manage Billing', 'Opening billing management...');
                      }}
                      variant="outlined"
                      size="md"
                      style={styles.actionButton}
                    />
                    <Button
                      title={subscriptionStatus === 'trialing' ? 'Cancel Trial' : 'Cancel Subscription'}
                      onPress={() => {
                        Alert.alert(
                          'Cancel Subscription',
                          'Are you sure you want to cancel your subscription? You\'ll lose access to premium features at the end of your billing period.',
                          [
                            { text: 'Keep Subscription', style: 'cancel' },
                            { 
                              text: 'Cancel', 
                              style: 'destructive',
                              onPress: () => {
                                Alert.alert('Subscription Cancelled', 'Your subscription has been cancelled.');
                              }
                            }
                          ]
                        );
                      }}
                      variant="outlined"
                      size="md"
                      style={[styles.actionButton, styles.cancelButton]}
                    />
                  </View>
                )}
              </View>

              <View style={styles.modalBottomSpacing} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Overlay */}
      <EditOverlay visible={showOverlay} onClose={() => setShowOverlay(false)} />
    </SafeAreaView>
  );
};

// Main ProfileScreen component with EditProvider
export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const handleEditComplete = async () => {
    console.log('✅ Profile edit completed');

    // Check if we should navigate back to a specific tab
    try {
      const intentData = await AsyncStorage.getItem('profileEditIntent');
      if (intentData) {
        const intent = JSON.parse(intentData);
        if (intent.fromScreen === 'Diet') {
          console.log('🔄 ProfileScreen: Navigating back to Diet tab after edit completion');
          // We need to access the main navigation to switch tabs
          // For now, we'll show a success message and let the user manually go back
          Alert.alert(
            'Profile Updated!',
            'Your diet preferences have been saved. You can now generate meal plans.',
            [{ text: 'OK' }]
          );
        }
        // Clear the intent
        await AsyncStorage.removeItem('profileEditIntent');
      }
    } catch (error) {
      console.error('Error handling edit completion:', error);
    }
  };

  return (
    <EditProvider
      onEditComplete={handleEditComplete}
      onEditCancel={() => {
        console.log('❌ Profile edit cancelled');
      }}
    >
      <ProfileScreenInternal navigation={navigation} />
    </EditProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  scrollView: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.md,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  editButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  editIcon: {
    fontSize: rf(20),
  },

  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  profileCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  avatarContainer: {
    position: 'relative',
    marginRight: ResponsiveTheme.spacing.md,
  },

  avatar: {
    width: rw(64),
    height: rh(64),
    borderRadius: rs(32),
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
  },

  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: rw(16),
    height: rh(16),
    borderRadius: rs(8),
    backgroundColor: ResponsiveTheme.colors.success,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  profileInfo: {
    flex: 1,
  },

  userName: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  userEmail: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  memberSince: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  statLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  statDivider: {
    width: rw(1),
    height: rh(24),
    backgroundColor: ResponsiveTheme.colors.border,
  },

  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.md,
  },

  quickStatCard: {
    width: '47%',
    padding: ResponsiveTheme.spacing.lg,
    alignItems: 'center',
  },

  quickStatIcon: {
    fontSize: rf(32),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  quickStatValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  quickStatLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  menuCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.lg,
  },

  menuIcon: {
    width: rw(40),
    height: rh(40),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.md,
  },

  menuIconText: {
    fontSize: rf(20),
  },

  menuInfo: {
    flex: 1,
  },

  menuTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
  },

  menuSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  menuArrow: {
    fontSize: rf(20),
    color: ResponsiveTheme.colors.textMuted,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  appInfoCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  appInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  appLogo: {
    width: rw(48),
    height: rh(48),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.md,
  },

  appLogoText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
  },

  appInfo: {
    flex: 1,
  },

  appName: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  appVersion: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  appDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  logoutCard: {
    borderColor: ResponsiveTheme.colors.error,
  },

  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: ResponsiveTheme.spacing.lg,
  },

  logoutIcon: {
    fontSize: rf(20),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  logoutText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.error,
  },

  bottomSpacing: {
    height: ResponsiveTheme.spacing.xl,
  },

  // Guest prompt styles
  guestPromptCard: {
    backgroundColor: ResponsiveTheme.colors.primary + '10',
    borderColor: ResponsiveTheme.colors.primary + '30',
  },

  guestPromptContent: {
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.lg,
  },

  guestPromptIcon: {
    fontSize: rf(32),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  guestPromptTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: 'center',
  },

  guestPromptSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(20),
  },

  guestPromptButton: {
    minWidth: rw(120),
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  modalCloseButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCloseText: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  modalTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  modalHeaderSpacer: {
    width: rw(32),
  },

  modalScrollView: {
    flex: 1,
  },

  modalSection: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  modalSectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  profilePictureEdit: {
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.lg,
  },

  changePictureButton: {
    marginTop: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  changePictureText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  modalBottomSpacing: {
    height: ResponsiveTheme.spacing.xxl,
  },

  // Premium menu item styles
  premiumMenuCard: {
    borderColor: ResponsiveTheme.colors.primary + '40',
    backgroundColor: ResponsiveTheme.colors.primary + '08',
  },

  premiumMenuIcon: {
    backgroundColor: ResponsiveTheme.colors.primary + '20',
  },

  premiumMenuTitle: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  premiumMenuSubtitle: {
    color: ResponsiveTheme.colors.primary + 'CC',
  },

  premiumMenuArrow: {
    color: ResponsiveTheme.colors.primary,
  },

  premiumBadge: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    paddingVertical: ResponsiveTheme.spacing.xxs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    marginLeft: ResponsiveTheme.spacing.sm,
  },

  premiumBadgeText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  // Subscription management modal styles
  subscriptionStatusCard: {
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  activeSubscriptionCard: {
    borderColor: ResponsiveTheme.colors.primary + '40',
    backgroundColor: ResponsiveTheme.colors.primary + '08',
  },

  subscriptionStatusContent: {
    flex: 1,
  },

  subscriptionStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  subscriptionStatusIcon: {
    fontSize: rf(32),
    marginRight: ResponsiveTheme.spacing.md,
  },

  subscriptionStatusInfo: {
    flex: 1,
  },

  subscriptionStatusTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  subscriptionStatusSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  subscriptionBillingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  subscriptionBillingText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  subscriptionAmountText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.primary,
  },

  // Premium features styles
  featureCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
    padding: ResponsiveTheme.spacing.md,
  },

  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  featureIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.md,
  },

  featureInfo: {
    flex: 1,
  },

  featureTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
  },

  featureDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  featureStatus: {
    width: rw(24),
    height: rh(24),
    borderRadius: rs(12),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: ResponsiveTheme.spacing.sm,
  },

  featureActiveStatus: {
    backgroundColor: ResponsiveTheme.colors.success,
  },

  featureStatusText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textMuted,
  },

  featureActiveStatusText: {
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  // Action buttons styles
  upgradeButton: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  subscriptionActions: {
    gap: ResponsiveTheme.spacing.sm,
  },

  actionButton: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  cancelButton: {
    borderColor: ResponsiveTheme.colors.error + '40',
  },
});
