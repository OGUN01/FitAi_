import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native';
import { BlurView } from 'expo-blur';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { haptics } from '../../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, THEME } from '../../components/ui';
import { ResponsiveTheme } from '../../utils/constants';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../../components/ui/aurora/GlassCard';
import { AnimatedPressable } from '../../components/ui/aurora/AnimatedPressable';
import { gradients, toLinearGradientProps } from '../../theme/gradients';
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
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';

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
  const [pressedSetting, setPressedSetting] = useState<string | null>(null);
  const [settingAnimations, setSettingAnimations] = useState<Record<string, { chevron: Animated.Value; slide: Animated.Value }>>({});
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  // Micro-interaction animation refs
  const avatarScale = useRef(new Animated.Value(1)).current;
  const streakFlicker = useRef(new Animated.Value(1)).current;
  const stat1Count = useRef(new Animated.Value(0)).current;
  const stat2Count = useRef(new Animated.Value(0)).current;
  const stat3Count = useRef(new Animated.Value(0)).current;
  const stat4Count = useRef(new Animated.Value(0)).current;

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
      icon: 'robot-outline',
      name: 'Unlimited AI Generations',
      description: 'Generate unlimited workouts and meal plans with AI',
      enabled: premiumFeatures?.unlimitedAI || false
    },
    {
      icon: 'stats-chart-outline',
      name: 'Advanced Analytics',
      description: 'Detailed progress tracking and insights',
      enabled: premiumFeatures?.advancedAnalytics || false
    },
    {
      icon: 'color-palette-outline',
      name: 'Custom Themes',
      description: 'Personalize your app appearance',
      enabled: premiumFeatures?.customThemes || false
    },
    {
      icon: 'share-outline',
      name: 'Export Data',
      description: 'Export your fitness data and reports',
      enabled: premiumFeatures?.exportData || false
    },
    {
      icon: 'trophy-outline',
      name: 'Premium Achievements',
      description: 'Unlock exclusive badges and rewards',
      enabled: premiumFeatures?.premiumAchievements || false
    },
    {
      icon: 'close-circle-outline',
      name: 'Ad-Free Experience',
      description: 'Enjoy FitAI without interruptions',
      enabled: premiumFeatures?.removeAds || false
    },
    {
      icon: 'barbell-outline',
      name: 'Advanced Workouts',
      description: 'Access to premium workout templates',
      enabled: premiumFeatures?.advancedWorkouts || false
    },
    {
      icon: 'sync-outline',
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
            console.log('[ProfileScreen] Found edit intent:', intent);
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

  // Micro-interaction: Stat cards count-up animation on mount
  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(stat1Count, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(stat2Count, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(stat3Count, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(stat4Count, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  // Micro-interaction: Streak badge flame flicker animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(streakFlicker, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(streakFlicker, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Edit Profile items (under pen icon)
  // Now navigates to comprehensive onboarding tabs with 170+ fields
  const editProfileItems = [
    {
      id: 1,
      title: 'Personal Information',
      subtitle: 'Update your profile details (10 fields)',
      icon: 'person-outline',
      hasArrow: true,
      tabIndex: 1, // PersonalInfoTab
    },
    {
      id: 2,
      title: 'Diet Preferences',
      subtitle: 'Dietary preferences and health habits (27 fields)',
      icon: 'nutrition-outline',
      hasArrow: true,
      tabIndex: 2, // DietPreferencesTab
    },
    {
      id: 3,
      title: 'Body Analysis',
      subtitle: 'Track your body measurements (30 fields)',
      icon: 'stats-chart-outline',
      hasArrow: true,
      tabIndex: 3, // BodyAnalysisTab
    },
    {
      id: 4,
      title: 'Workout Preferences',
      subtitle: 'Customize your training style (22 fields)',
      icon: 'barbell-outline',
      hasArrow: true,
      tabIndex: 4, // WorkoutPreferencesTab
    },
    {
      id: 5,
      title: 'Health Metrics',
      subtitle: 'View calculated health metrics (50+ fields)',
      icon: 'trending-up-outline',
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
      icon: subscriptionStatus === 'active' ? 'crown-outline' : subscriptionStatus === 'trialing' ? 'time-outline' : 'diamond-outline',
      hasArrow: true,
      isPremium: subscriptionStatus === 'active' || subscriptionStatus === 'trialing',
    },
    {
      id: 6,
      title: 'Notifications',
      subtitle: 'Manage your alerts and reminders',
      icon: 'notifications-outline',
      hasArrow: true,
    },
    {
      id: 7,
      title: 'Privacy & Security',
      subtitle: 'Control your data and privacy',
      icon: 'lock-closed-outline',
      hasArrow: true,
    },
    {
      id: 8,
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      icon: 'help-circle-outline',
      hasArrow: true,
    },
    {
      id: 9,
      title: 'About FitAI',
      subtitle: 'App version and information',
      icon: 'information-circle-outline',
      hasArrow: true,
    },
  ];

  // Real user stats from hooks
  const quickStats = [
    {
      label: 'Workouts',
      value: userStats.totalWorkouts.toString(),
      icon: 'barbell-outline',
    },
    {
      label: 'Streak',
      value: userStats.currentStreak.toString(),
      icon: 'flame-outline',
    },
    {
      label: 'Calories',
      value:
        userStats.totalCaloriesBurned > 1000
          ? `${(userStats.totalCaloriesBurned / 1000).toFixed(1)}k`
          : userStats.totalCaloriesBurned.toString(),
      icon: 'flash-outline',
    },
    {
      label: 'Longest',
      value: userStats.longestStreak.toString(),
      icon: 'timer-outline',
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
    setShowLogoutConfirmation(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirmation(false);
    logout();
    haptics.impact('medium');
  };

  const cancelLogout = () => {
    setShowLogoutConfirmation(false);
    haptics.impact('light');
  };

  const handleEditProfile = () => {
    setShowEditProfile(true);
  };

  const handleEditProfileItemPress = async (item: any) => {
    setShowEditProfile(false); // Close the modal first

    console.log('[DEBUG] ProfileScreen: handleEditProfileItemPress called with item:', {
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
          console.log('[SUCCESS] ProfileScreen: Edit completed, refreshing profile');
          // Profile data will be automatically refreshed by useUser hook
        },
        onEditCancel: () => {
          console.log('[ERROR] ProfileScreen: Edit cancelled');
        },
      });
      return;
    }

    console.warn('[ProfileScreen] WARNING: Falling back to OLD EditContext (navigation or tabIndex missing)');


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

  // Get or create animation values for a setting row
  const getSettingAnimation = (id: string) => {
    if (!settingAnimations[id]) {
      const newAnims = {
        chevron: new Animated.Value(0),
        slide: new Animated.Value(0),
      };
      setSettingAnimations(prev => ({ ...prev, [id]: newAnims }));
      return newAnims;
    }
    return settingAnimations[id];
  };

  // Trigger chevron rotation + slide animation on setting press
  const triggerSettingAnimation = (id: string) => {
    const anims = getSettingAnimation(id);

    // Chevron rotation + slide
    Animated.parallel([
      Animated.sequence([
        Animated.timing(anims.chevron, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(anims.chevron, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(anims.slide, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(anims.slide, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  // Edit functions are now handled by EditContext

  const handleSettingsItemPress = (item: any) => {
    // Trigger animation
    if (item.id) {
      triggerSettingAnimation(item.id);
    }

    // Original logic

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
      console.log('[ProfileScreen] Opening guest signup screen...');
      
      // Show the guest signup screen instead of clearing data
      setShowGuestSignUp(true);
      
    } catch (error) {
      console.error('[ERROR] ProfileScreen: Failed to open signup screen:', error);
      Alert.alert('Error', 'Unable to open sign up. Please try again.');
    }
  };

  // Handle successful signup from guest signup screen
  const handleGuestSignUpSuccess = () => {
    console.log('[SUCCESS] ProfileScreen: Guest signup completed successfully');
    setShowGuestSignUp(false);
    // The app will automatically detect the new authenticated state
  };

  // Handle back from guest signup screen
  const handleGuestSignUpBack = () => {
    console.log('[NAV] ProfileScreen: User went back from guest signup');
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
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View>
          {/* HeroSection - Aurora Design */}
          <LinearGradient
            {...(toLinearGradientProps(gradients.background.deepSpace) as any)}
            style={styles.heroSection}
          >
            <View style={styles.heroContent}>
              {/* Avatar with Edit Button */}
              <View style={styles.largeAvatarContainer}>
                <AnimatedPressable
                  onPress={() => {
                    // Scale animation on tap
                    Animated.sequence([
                      Animated.timing(avatarScale, {
                        toValue: 0.9,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                      Animated.spring(avatarScale, {
                        toValue: 1,
                        tension: 100,
                        friction: 5,
                        useNativeDriver: true,
                      }),
                    ]).start();
                    handleEditProfile();
                  }}
                  scaleValue={0.95}
                  hapticFeedback={true}
                  hapticType="medium"
                >
                  <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
                    <View style={styles.largeAvatar}>
                      <Text style={styles.largeAvatarText}>
                        {getInitials(profile?.personalInfo?.name || user?.name)}
                      </Text>
                    </View>
                    <View style={styles.editBadge}>
                      <Ionicons name="create-outline" size={rf(16)} color={ResponsiveTheme.colors.white} />
                    </View>
                  </Animated.View>
                </AnimatedPressable>
              </View>

              {/* User Info */}
              <Text style={styles.heroName}>
                {profile?.personalInfo?.name || user?.name || 'Anonymous User'}
              </Text>
              <Text style={styles.heroMemberSince}>
                Member since{' '}
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Recently'}
              </Text>

              {/* Streak Badge (Floating) */}
              <GlassCard elevation={2} blurIntensity="medium" padding="sm" borderRadius="lg" style={styles.streakBadge}>
                <Ionicons name="flame-outline" size={rf(20)} color={ResponsiveTheme.colors.primary} />
                <Text style={styles.streakNumber}>{userStats?.currentStreak || 0}</Text>
                <Text style={styles.streakLabel}>Day Streak</Text>
              </GlassCard>
            </View>
          </LinearGradient>

          {/* Guest User Sign-up Prompt */}
          {isGuestMode && (
            <View style={styles.section}>
              <GlassCard style={styles.guestPromptCard} elevation={2} padding="lg" blurIntensity="light" borderRadius="lg">
                <View style={styles.guestPromptContent}>
                  <Ionicons name="lock-closed-outline" size={rf(32)} color={ResponsiveTheme.colors.primary} style={styles.guestPromptIcon} />
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
              </GlassCard>
            </View>
          )}

          {/* 2x2 Quick Stats Grid - Aurora Design */}
          <View style={styles.section}>
            <View style={styles.quickStatsGrid}>
              <GlassCard elevation={1} padding="md" blurIntensity="light" borderRadius="lg" style={styles.quickStatCard}>
                <Ionicons name="barbell-outline" size={rf(32)} color={ResponsiveTheme.colors.primary} style={styles.quickStatIcon} />
                <Text style={styles.quickStatValue}>{userStats?.totalWorkouts || 0}</Text>
                <Text style={styles.quickStatLabel}>Total Workouts</Text>
              </GlassCard>

              <GlassCard elevation={1} padding="md" blurIntensity="light" borderRadius="lg" style={styles.quickStatCard}>
                <Ionicons name="scale-outline" size={rf(32)} color={ResponsiveTheme.colors.primary} style={styles.quickStatIcon} />
                <Text style={styles.quickStatValue}>-2.5</Text>
                <Text style={styles.quickStatLabel}>Weight Lost (kg)</Text>
              </GlassCard>

              <GlassCard elevation={1} padding="md" blurIntensity="light" borderRadius="lg" style={styles.quickStatCard}>
                <Ionicons name="flame-outline" size={rf(32)} color={ResponsiveTheme.colors.primary} style={styles.quickStatIcon} />
                <Text style={styles.quickStatValue}>{userStats?.currentStreak || 0}</Text>
                <Text style={styles.quickStatLabel}>Streak Days</Text>
              </GlassCard>

              <GlassCard elevation={1} padding="md" blurIntensity="light" borderRadius="lg" style={styles.quickStatCard}>
                <Ionicons name="trophy-outline" size={rf(32)} color={ResponsiveTheme.colors.primary} style={styles.quickStatIcon} />
                <Text style={styles.quickStatValue}>12</Text>
                <Text style={styles.quickStatLabel}>Achievements</Text>
              </GlassCard>
            </View>
          </View>

          {/* Account Section - Aurora Design */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <GlassCard elevation={1} padding="none" blurIntensity="light" borderRadius="lg">
              <AnimatedPressable
                onPress={() => handleSettingsItemPress({ id: 'personal-info' })}
                onPressIn={() => setPressedSetting('personal-info')}
                onPressOut={() => setPressedSetting(null)}
                scaleValue={0.98}
                hapticFeedback={true}
                hapticType="light"
              >
                <Animated.View
                  style={[
                    styles.settingRow,
                    pressedSetting === 'personal-info' && styles.settingRowPressed,
                    {
                      transform: [
                        {
                          translateX: settingAnimations['personal-info']?.slide.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 5],
                          }) || 0,
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons name="person-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.settingIcon} />
                  <Text style={styles.settingLabel}>Personal Information</Text>
                  <Animated.Text
                    style={[
                      styles.settingArrow,
                      {
                        transform: [
                          {
                            rotate: settingAnimations['personal-info']?.chevron.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '90deg'],
                            }) || '0deg',
                          },
                        ],
                      },
                    ]}
                  >
                    ›
                  </Animated.Text>
                </Animated.View>
              </AnimatedPressable>
              <View style={styles.settingDivider} />
              <AnimatedPressable
                onPress={() => handleSettingsItemPress({ id: 'goals' })}
                onPressIn={() => setPressedSetting('goals')}
                onPressOut={() => setPressedSetting(null)}
                scaleValue={0.98}
                hapticFeedback={true}
                hapticType="light"
              >
                <Animated.View
                  style={[
                    styles.settingRow,
                    pressedSetting === 'goals' && styles.settingRowPressed,
                    {
                      transform: [
                        {
                          translateX: settingAnimations['goals']?.slide.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 5],
                          }) || 0,
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons name="target-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.settingIcon} />
                  <Text style={styles.settingLabel}>Goals & Preferences</Text>
                  <Animated.Text
                    style={[
                      styles.settingArrow,
                      {
                        transform: [
                          {
                            rotate: settingAnimations['goals']?.chevron.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '90deg'],
                            }) || '0deg',
                          },
                        ],
                      },
                    ]}
                  >
                    ›
                  </Animated.Text>
                </Animated.View>
              </AnimatedPressable>
              <View style={styles.settingDivider} />
              <AnimatedPressable
                onPress={() => handleSettingsItemPress({ id: 'measurements' })}
                onPressIn={() => setPressedSetting('measurements')}
                onPressOut={() => setPressedSetting(null)}
                scaleValue={0.98}
                hapticFeedback={true}
                hapticType="light"
              >
                <Animated.View
                  style={[
                    styles.settingRow,
                    pressedSetting === 'measurements' && styles.settingRowPressed,
                    {
                      transform: [
                        {
                          translateX: settingAnimations['measurements']?.slide.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 5],
                          }) || 0,
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons name="ruler-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.settingIcon} />
                  <Text style={styles.settingLabel}>Body Measurements</Text>
                  <Animated.Text
                    style={[
                      styles.settingArrow,
                      {
                        transform: [
                          {
                            rotate: settingAnimations['measurements']?.chevron.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '90deg'],
                            }) || '0deg',
                          },
                        ],
                      },
                    ]}
                  >
                    ›
                  </Animated.Text>
                </Animated.View>
              </AnimatedPressable>
            </GlassCard>
          </View>

          {/* Preferences Section - Aurora Design */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <GlassCard elevation={1} padding="none" blurIntensity="light" borderRadius="lg">
              <AnimatedPressable onPress={() => setCurrentSettingsScreen('notifications')} scaleValue={0.98}>
                <View style={styles.settingRow}>
                  <Ionicons name="notifications-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.settingIcon} />
                  <Text style={styles.settingLabel}>Notifications</Text>
                  <Text style={styles.settingArrow}>›</Text>
                </View>
              </AnimatedPressable>
              <View style={styles.settingDivider} />
              <AnimatedPressable onPress={() => Alert.alert('Theme', 'Theme selection coming soon!')} scaleValue={0.98}>
                <View style={styles.settingRow}>
                  <Ionicons name="color-palette-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.settingIcon} />
                  <Text style={styles.settingLabel}>Theme Preference</Text>
                  <Text style={styles.settingArrow}>›</Text>
                </View>
              </AnimatedPressable>
              <View style={styles.settingDivider} />
              <AnimatedPressable onPress={() => Alert.alert('Units', 'Units selection coming soon!')} scaleValue={0.98}>
                <View style={styles.settingRow}>
                  <Ionicons name="speedometer-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.settingIcon} />
                  <Text style={styles.settingLabel}>Units</Text>
                  <Text style={styles.settingArrow}>›</Text>
                </View>
              </AnimatedPressable>
              <View style={styles.settingDivider} />
              <AnimatedPressable onPress={() => Alert.alert('Language', 'Language selection coming soon!')} scaleValue={0.98}>
                <View style={styles.settingRow}>
                  <Ionicons name="globe-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.settingIcon} />
                  <Text style={styles.settingLabel}>Language</Text>
                  <Text style={styles.settingArrow}>›</Text>
                </View>
              </AnimatedPressable>
            </GlassCard>
          </View>

          {/* App Section - Aurora Design */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App</Text>
            <GlassCard elevation={1} padding="none" blurIntensity="light" borderRadius="lg">
              <AnimatedPressable onPress={() => setCurrentSettingsScreen('privacy')} scaleValue={0.98}>
                <View style={styles.settingRow}>
                  <Ionicons name="lock-closed-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.settingIcon} />
                  <Text style={styles.settingLabel}>Privacy & Security</Text>
                  <Text style={styles.settingArrow}>›</Text>
                </View>
              </AnimatedPressable>
              <View style={styles.settingDivider} />
              <AnimatedPressable onPress={() => setCurrentSettingsScreen('help')} scaleValue={0.98}>
                <View style={styles.settingRow}>
                  <Ionicons name="help-circle-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.settingIcon} />
                  <Text style={styles.settingLabel}>Help & Support</Text>
                  <Text style={styles.settingArrow}>›</Text>
                </View>
              </AnimatedPressable>
              <View style={styles.settingDivider} />
              <AnimatedPressable onPress={() => setCurrentSettingsScreen('about')} scaleValue={0.98}>
                <View style={styles.settingRow}>
                  <Ionicons name="information-circle-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.settingIcon} />
                  <Text style={styles.settingLabel}>About</Text>
                  <Text style={styles.settingArrow}>›</Text>
                </View>
              </AnimatedPressable>
              <View style={styles.settingDivider} />
              <AnimatedPressable onPress={() => Alert.alert('Terms & Privacy', 'Opening legal documents...')} scaleValue={0.98}>
                <View style={styles.settingRow}>
                  <Ionicons name="document-text-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.settingIcon} />
                  <Text style={styles.settingLabel}>Terms & Privacy Policy</Text>
                  <Text style={styles.settingArrow}>›</Text>
                </View>
              </AnimatedPressable>
            </GlassCard>
          </View>

          {/* Data Section - Aurora Design */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data</Text>
            <GlassCard elevation={1} padding="none" blurIntensity="light" borderRadius="lg">
              <AnimatedPressable onPress={() => Alert.alert('Export Data', 'Export feature coming soon!')} scaleValue={0.98}>
                <View style={styles.settingRow}>
                  <Ionicons name="stats-chart-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.settingIcon} />
                  <Text style={styles.settingLabel}>Export Data</Text>
                  <Text style={styles.settingArrow}>›</Text>
                </View>
              </AnimatedPressable>
              <View style={styles.settingDivider} />
              <AnimatedPressable onPress={() => Alert.alert('Sync', 'Sync settings coming soon!')} scaleValue={0.98}>
                <View style={styles.settingRow}>
                  <Ionicons name="sync-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.settingIcon} />
                  <Text style={styles.settingLabel}>Sync Settings</Text>
                  <Text style={styles.settingArrow}>›</Text>
                </View>
              </AnimatedPressable>
              <View style={styles.settingDivider} />
              <AnimatedPressable onPress={() => Alert.alert('Clear Cache', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Clear', style: 'destructive' }])} scaleValue={0.98}>
                <View style={styles.settingRow}>
                  <Ionicons name="trash-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.settingIcon} />
                  <Text style={styles.settingLabel}>Clear Cache</Text>
                  <Text style={styles.settingArrow}>›</Text>
                </View>
              </AnimatedPressable>
            </GlassCard>
          </View>

          {/* App Info */}
          <View style={styles.section}>
            <GlassCard style={styles.appInfoCard} elevation={1} padding="md" blurIntensity="light" borderRadius="lg">
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
            </GlassCard>
          </View>

          {/* Logout Button */}
          {isAuthenticated && (
            <View style={styles.section}>
              <AnimatedPressable onPress={handleSignOut} scaleValue={0.97}>
                <GlassCard style={styles.logoutCard} elevation={1} padding="md" blurIntensity="light" borderRadius="lg">
                  <View style={styles.logoutContent}>
                    <Ionicons name="log-out-outline" size={rf(20)} color={ResponsiveTheme.colors.error} style={styles.logoutIcon} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                  </View>
                </GlassCard>
              </AnimatedPressable>
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
            <AnimatedPressable
              style={styles.modalCloseButton}
              onPress={() => setShowEditProfile(false)}
              scaleValue={0.95}
            >
              <Ionicons name="close" size={rf(24)} color={ResponsiveTheme.colors.text} />
            </AnimatedPressable>
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
                  <AnimatedPressable
                    style={styles.changePictureButton}
                    onPress={() =>
                      Alert.alert('Change Picture', 'Profile picture editing coming soon!')
                    }
                    scaleValue={0.95}
                  >
                    <Text style={styles.changePictureText}>Change Picture</Text>
                  </AnimatedPressable>
                </View>
              </View>

              {/* Edit Profile Items */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Profile Settings</Text>

                {editProfileItems.map((item) => (
                  <AnimatedPressable key={item.id} onPress={() => handleEditProfileItemPress(item)} scaleValue={0.97}>
                    <GlassCard style={styles.menuCard} elevation={1} padding="md" blurIntensity="light" borderRadius="lg">
                      <View style={styles.menuContent}>
                        <View style={styles.menuIcon}>
                          <Ionicons name={item.icon as any} size={rf(20)} color={ResponsiveTheme.colors.primary} />
                        </View>

                        <View style={styles.menuInfo}>
                          <Text style={styles.menuTitle}>{item.title}</Text>
                          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                        </View>

                        {item.hasArrow && <Text style={styles.menuArrow}>›</Text>}
                      </View>
                    </GlassCard>
                  </AnimatedPressable>
                ))}
              </View>

              <View style={styles.modalBottomSpacing} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Logout Confirmation Blur Dialog */}
      <Modal
        visible={showLogoutConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <BlurView intensity={80} style={styles.blurContainer}>
          <View style={styles.confirmationDialog}>
            <GlassCard elevation={5} blurIntensity="strong" padding="lg" borderRadius="xl">
              <View style={styles.confirmationIconContainer}>
                <Ionicons name="log-out-outline" size={rf(48)} color={ResponsiveTheme.colors.error} />
              </View>
              <Text style={styles.confirmationTitle}>Sign Out</Text>
              <Text style={styles.confirmationMessage}>
                Are you sure you want to sign out? Your progress will be saved.
              </Text>

              <View style={styles.confirmationActions}>
                <AnimatedPressable
                  style={[styles.confirmationButton, styles.confirmationButtonCancel]}
                  onPress={cancelLogout}
                  scaleValue={0.95}
                  hapticFeedback={true}
                  hapticType="light"
                >
                  <Text style={styles.confirmationButtonTextCancel}>Cancel</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  style={[styles.confirmationButton, styles.confirmationButtonConfirm]}
                  onPress={confirmLogout}
                  scaleValue={0.95}
                  hapticFeedback={true}
                  hapticType="medium"
                >
                  <LinearGradient
                    {...toLinearGradientProps(gradients.button.danger)}
                    style={styles.confirmationButtonGradient}
                  >
                    <Text style={styles.confirmationButtonText}>Sign Out</Text>
                  </LinearGradient>
                </AnimatedPressable>
              </View>
            </GlassCard>
          </View>
        </BlurView>
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
            <AnimatedPressable
              style={styles.modalCloseButton}
              onPress={() => setShowSubscriptionScreen(false)}
              scaleValue={0.95}
            >
              <Ionicons name="close" size={rf(24)} color={ResponsiveTheme.colors.text} />
            </AnimatedPressable>
            <Text style={styles.modalTitle}>Subscription</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            <View>
              {/* Current Subscription Status */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Current Plan</Text>
                <GlassCard style={[
                  styles.subscriptionStatusCard,
                  subscriptionStatus === 'active' && styles.activeSubscriptionCard
                ]} elevation={2} padding="lg" blurIntensity="light" borderRadius="lg">
                  <View style={styles.subscriptionStatusContent}>
                    <View style={styles.subscriptionStatusHeader}>
                      <Ionicons
                        name={subscriptionStatus === 'active' ? 'crown-outline' :
                              subscriptionStatus === 'trialing' ? 'time-outline' : 'diamond-outline'}
                        size={rf(32)}
                        color={ResponsiveTheme.colors.primary}
                        style={styles.subscriptionStatusIcon}
                      />
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
                </GlassCard>
              </View>

              {/* Premium Features Preview */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  {subscriptionStatus === 'free' ? 'Premium Features' : 'Your Premium Features'}
                </Text>
                {premiumFeaturesList.map((feature, index) => (
                  <GlassCard key={index} style={styles.featureCard} elevation={1} padding="md" blurIntensity="light" borderRadius="lg">
                    <View style={styles.featureContent}>
                      <Ionicons name={feature.icon as any} size={rf(24)} color={ResponsiveTheme.colors.primary} style={styles.featureIcon} />
                      <View style={styles.featureInfo}>
                        <Text style={styles.featureTitle}>{feature.name}</Text>
                        <Text style={styles.featureDescription}>{feature.description}</Text>
                      </View>
                      <View style={[
                        styles.featureStatus,
                        feature.enabled && styles.featureActiveStatus
                      ]}>
                        <Ionicons
                          name={feature.enabled ? 'checkmark' : 'lock-closed-outline'}
                          size={rf(12)}
                          color={feature.enabled ? ResponsiveTheme.colors.white : ResponsiveTheme.colors.textMuted}
                        />
                      </View>
                    </View>
                  </GlassCard>
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
    </AuroraBackground>
  );
};

// Main ProfileScreen component with EditProvider
export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const handleEditComplete = async () => {
    console.log('[SUCCESS] Profile edit completed');

    // Check if we should navigate back to a specific tab
    try {
      const intentData = await AsyncStorage.getItem('profileEditIntent');
      if (intentData) {
        const intent = JSON.parse(intentData);
        if (intent.fromScreen === 'Diet') {
          console.log('[ProfileScreen] Navigating back to Diet tab after edit completion');
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
        console.log('[ERROR] Profile edit cancelled');
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

  // Aurora Hero Section Styles
  heroSection: {
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingBottom: ResponsiveTheme.spacing.xxl,
    alignItems: 'center',
  },

  heroContent: {
    alignItems: 'center',
  },

  largeAvatarContainer: {
    position: 'relative',
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  largeAvatar: {
    width: rw(120),
    height: rh(120),
    borderRadius: rs(60),
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  largeAvatarText: {
    fontSize: rf(48),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
  },

  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: rw(36),
    height: rh(36),
    borderRadius: rs(18),
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: ResponsiveTheme.colors.background,
  },


  heroName: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  heroMemberSince: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
  },


  streakNumber: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  streakLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Setting Row Styles (for Account/Preferences/App/Data sections)
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  settingRowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  settingIcon: {
    marginRight: ResponsiveTheme.spacing.md,
  },

  settingLabel: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
  },

  settingArrow: {
    fontSize: rf(24),
    color: ResponsiveTheme.colors.textSecondary,
  },

  settingDivider: {
    height: 1,
    backgroundColor: ResponsiveTheme.colors.border,
    opacity: 0.3,
    marginHorizontal: ResponsiveTheme.spacing.lg,
  },

  // Logout Confirmation Dialog Styles
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  confirmationDialog: {
    width: '100%',
    maxWidth: rw(400),
  },

  confirmationIconContainer: {
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  confirmationTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  confirmationMessage: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
    lineHeight: rf(22),
  },

  confirmationActions: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
  },

  confirmationButton: {
    flex: 1,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: 'hidden',
  },

  confirmationButtonCancel: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    padding: ResponsiveTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmationButtonConfirm: {
    overflow: 'hidden',
  },

  confirmationButtonGradient: {
    padding: ResponsiveTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmationButtonTextCancel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  confirmationButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.white,
  },
});
