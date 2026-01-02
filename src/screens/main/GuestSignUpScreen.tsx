import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatedPressable } from '../../components/ui/aurora/AnimatedPressable';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, Input, PasswordInput, THEME } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { RegisterCredentials } from '../../types/user';
import { migrationManager } from '../../services/migrationManager';
import { dataBridge } from '../../services/DataBridge';
import { GoogleIcon } from '../../components/icons/GoogleIcon';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';
import {
  PersonalInfoService,
  DietPreferencesService,
  BodyAnalysisService,
  WorkoutPreferencesService,
  AdvancedReviewService,
} from '../../services/onboardingService';

interface GuestSignUpScreenProps {
  onBack: () => void;
  onSignUpSuccess: () => void;
}

export const GuestSignUpScreen: React.FC<GuestSignUpScreenProps> = ({ onBack, onSignUpSuccess }) => {
  // Mode: 'signup' or 'signin'
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  
  const [formData, setFormData] = useState<RegisterCredentials>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<RegisterCredentials>>({});
  const [isLoading, setIsLoading] = useState(false);

  const { register, login, signInWithGoogle } = useAuth();

  const updateField = (field: keyof RegisterCredentials, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterCredentials> = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);

    try {
      console.log('[ROCKET] GuestSignUp: Starting Google sign up with data migration...');
      
      // Check for guest data that needs migration
      const hasGuestData = await dataBridge.hasGuestDataForMigration();
      console.log('[SEARCH] GuestSignUp: Guest data check result:', hasGuestData);

      const response = await signInWithGoogle();

      if (response.success && response.user) {
        console.log('[CHECK] GuestSignUp: Google authentication successful');
        
        if (hasGuestData) {
          Alert.alert(
            'Syncing Your Data',
            'We\'re syncing your profile data to your Google account. This will only take a moment.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  try {
                    // First, migrate guest data to user-specific keys
                    console.log('[REFRESH] GuestSignUp: Starting guest data key migration...');
                    const keyMigrationResult = await dataBridge.migrateGuestDataToUser(
                      response.user.id
                    );
                    
                    if (keyMigrationResult.success) {
                      console.log('[CHECK] GuestSignUp: Guest data key migration successful:', keyMigrationResult.migratedKeys);
                    } else {
                      console.warn('[WARNING] GuestSignUp: Guest data key migration had issues:', keyMigrationResult.errors);
                    }
                    
                    // Now start profile migration to remote storage
                    console.log('[REFRESH] GuestSignUp: Starting remote profile migration...');
                    const migrationResult = await migrationManager.startProfileMigration(
                      response.user.id
                    );

                    if (migrationResult.success) {
                      console.log('[CHECK] GuestSignUp: Complete migration successful');
                      Alert.alert(
                        'Welcome to FitAI!',
                        'Your profile data has been synced successfully to your Google account.',
                        [
                          {
                            text: 'Continue',
                            onPress: () => {
                              console.log('[PARTY] GuestSignUp: Calling onSignUpSuccess after migration');
                              onSignUpSuccess();
                            },
                          },
                        ]
                      );
                    } else {
                      console.warn('[WARNING] GuestSignUp: Migration had issues, but continuing');
                      Alert.alert(
                        'Welcome to FitAI!',
                        'Your account has been created successfully. Some data may sync in the background.',
                        [
                          {
                            text: 'Continue',
                            onPress: () => {
                              console.log('[PARTY] GuestSignUp: Calling onSignUpSuccess despite migration issues');
                              onSignUpSuccess();
                            },
                          },
                        ]
                      );
                    }
                  } catch (migrationError) {
                    console.error('[ERROR] GuestSignUp: Migration error:', migrationError);
                    Alert.alert(
                      'Welcome to FitAI!',
                      'Your account has been created successfully. Your data will be synced shortly.',
                      [
                        {
                          text: 'Continue',
                          onPress: () => {
                            console.log('[PARTY] GuestSignUp: Calling onSignUpSuccess after migration error');
                            onSignUpSuccess();
                          },
                        },
                      ]
                    );
                  }
                },
              },
            ]
          );
        } else {
          // No guest data, proceed normally
          Alert.alert(
            'Welcome to FitAI!',
            'Your Google account has been connected successfully.',
            [
              {
                text: 'Continue',
                onPress: () => {
                  console.log('[PARTY] GuestSignUp: Calling onSignUpSuccess (no migration needed)');
                  onSignUpSuccess();
                },
              },
            ]
          );
        }
      } else {
        Alert.alert('Sign Up Failed', response.error || 'Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Google Sign Up failed. Please try again.');
      console.error('Google Sign Up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      console.log('[ROCKET] GuestSignUp: Starting email sign up with data migration...');
      
      // Check if there's guest data before registering
      const hasGuestData = await dataBridge.hasGuestDataForMigration();
      console.log('[SEARCH] GuestSignUp: Guest data check result:', hasGuestData);

      // Ensure we trim and normalize the credentials before sending
      const trimmedCredentials = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
        confirmPassword: formData.confirmPassword.trim(),
      };
      
      console.log('[LOCK] GuestSignUp: Creating account for:', { email: trimmedCredentials.email });
      const result = await register(trimmedCredentials);

      if (result.success) {
        const alertTitle = 'Account Created Successfully!';
        let alertMessage =
          'Please check your email and click the verification link to activate your account. After verification, you can log in to access your synced data.';

        // If there's guest data, mention it will be preserved and synced
        if (hasGuestData) {
          alertMessage += '\n\n[SPARKLE] Your profile data will be automatically synced when you log in after email verification.';
          console.log('[CHECK] GuestSignUp: User has guest data - will trigger migration on login');
        }

        Alert.alert(alertTitle, alertMessage, [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to profile screen - user will login after email verification
              console.log('[EMAIL] GuestSignUp: Email signup successful, user needs to verify email');
              onBack();
            },
          },
        ]);
      } else {
        Alert.alert('Sign Up Failed', result.error || 'Unable to create account. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during sign up.');
      console.error('Email sign up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email Sign In
  const handleEmailSignIn = async () => {
    // Simple validation for sign in
    const newErrors: Partial<RegisterCredentials> = {};
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      console.log('[LOCK] GuestSignUp: Signing in with email...');
      
      const trimmedCredentials = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
      };
      
      const result = await login(trimmedCredentials);

      if (result.success && result.user) {
        console.log('[CHECK] GuestSignUp: Email sign in successful');

        // Store userId for use in async callbacks (TypeScript narrowing doesn't persist)
        const userId = result.user.id;

        // Check for guest data to migrate (now checks onboarding_data key too)
        const hasGuestData = await dataBridge.hasGuestDataForMigration();

        if (hasGuestData) {
          Alert.alert(
            'Welcome Back!',
            'We found your local profile data. Would you like to sync it to your account?',
            [
              {
                text: 'Skip',
                style: 'cancel',
                onPress: () => onSignUpSuccess(),
              },
              {
                text: 'Sync Data',
                onPress: async () => {
                  try {
                    console.log('[REFRESH] GuestSignUp: Starting comprehensive data migration...');

                    // Step 1: Migrate local storage keys (now handles onboarding_data)
                    const keyMigrationResult = await dataBridge.migrateGuestDataToUser(userId);
                    console.log('[REFRESH] Key migration result:', keyMigrationResult);

                    // Step 2: Sync to database using migrationManager (handles personalInfo, fitnessGoals, diet, workout)
                    const migrationResult = await migrationManager.startProfileMigration(userId);
                    console.log('[REFRESH] Migration manager result:', migrationResult);

                    // Step 3: Sync bodyAnalysis and advancedReview directly from onboarding_data
                    // These are NOT handled by migrationManager/syncManager
                    const syncErrors: string[] = [];
                    try {
                      const onboardingDataStr = await AsyncStorage.getItem('onboarding_data');
                      if (onboardingDataStr) {
                        const onboardingData = JSON.parse(onboardingDataStr);

                        // Sync body analysis (critical for health calculations)
                        if (onboardingData.bodyAnalysis) {
                          const bodySuccess = await BodyAnalysisService.save(userId, onboardingData.bodyAnalysis);
                          if (!bodySuccess) syncErrors.push('bodyAnalysis');
                          else console.log('[REFRESH] BodyAnalysis synced to database');
                        }

                        // Sync advanced review (contains BMI, TDEE, water goals, etc.)
                        if (onboardingData.advancedReview) {
                          const reviewSuccess = await AdvancedReviewService.save(userId, onboardingData.advancedReview);
                          if (!reviewSuccess) syncErrors.push('advancedReview');
                          else console.log('[REFRESH] AdvancedReview synced to database');
                        }
                      }
                    } catch (syncError) {
                      console.error('[REFRESH] Error syncing additional data:', syncError);
                    }

                    // Determine overall success
                    const overallSuccess = keyMigrationResult.success || migrationResult.success;

                    if (overallSuccess && syncErrors.length === 0) {
                      Alert.alert('Success', 'Your data has been synced!', [
                        { text: 'Continue', onPress: () => onSignUpSuccess() }
                      ]);
                    } else if (overallSuccess) {
                      Alert.alert('Partial Sync', 'Most data was synced. You can continue.', [
                        { text: 'Continue', onPress: () => onSignUpSuccess() }
                      ]);
                    } else {
                      Alert.alert('Sync Issue', 'There was an issue syncing data. You can continue and try again later.', [
                        { text: 'Continue', onPress: () => onSignUpSuccess() }
                      ]);
                    }
                  } catch (error) {
                    console.error('[REFRESH] Migration error:', error);
                    Alert.alert('Error', 'Failed to sync data. You can continue and sync later.', [
                      { text: 'Continue', onPress: () => onSignUpSuccess() }
                    ]);
                  }
                },
              },
            ]
          );
        } else {
          Alert.alert('Welcome Back!', 'You have signed in successfully.', [
            { text: 'Continue', onPress: () => onSignUpSuccess() }
          ]);
        }
      } else {
        Alert.alert('Sign In Failed', result.error || 'Invalid email or password. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during sign in.');
      console.error('Email sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AnimatedPressable style={styles.backButton} onPress={onBack} scaleValue={0.97}>
            <Text style={styles.backIcon}>←</Text>
          </AnimatedPressable>
          <Text style={styles.title}>
            {mode === 'signup' ? 'Complete Your Account' : 'Welcome Back'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signup' 
              ? 'Sign up to save your progress and sync across devices. Your profile data will be preserved.'
              : 'Sign in to access your synced data and continue your fitness journey.'}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Google Sign-In/Up as Primary */}
          <AnimatedPressable
            style={[styles.googlePrimaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignUp}
            disabled={isLoading}
            scaleValue={0.95}
          >
            <View style={styles.googleButtonContent}>
              <GoogleIcon size={20} style={styles.googleIcon} />
              <Text style={styles.googlePrimaryText}>Continue with Google</Text>
            </View>
            <Text style={styles.googleSubtext}>Fastest • No email verification needed</Text>
          </AnimatedPressable>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              {mode === 'signup' ? 'or sign up with email' : 'or sign in with email'}
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email form */}
          <View style={styles.emailFormContainer}>
            <Input
              label="Email Address"
              placeholder="Enter your email address"
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <PasswordInput
              label="Password"
              placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              error={errors.password}
            />

            {mode === 'signup' && (
              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChangeText={(value) => updateField('confirmPassword', value)}
                error={errors.confirmPassword}
              />
            )}

            <Button
              title={mode === 'signup' ? 'Create Account' : 'Sign In'}
              onPress={mode === 'signup' ? handleEmailSignUp : handleEmailSignIn}
              variant="outline"
              size="lg"
              fullWidth
              loading={isLoading}
              style={styles.emailSignUpButton}
            />
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <AnimatedPressable 
              onPress={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setErrors({});
                setFormData({ email: '', password: '', confirmPassword: '' });
              }} 
              scaleValue={0.97}
            >
              <Text style={styles.footerLink}>
                {mode === 'signup' ? 'Sign In instead' : 'Sign Up instead'}
              </Text>
            </AnimatedPressable>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.lg,
    alignItems: 'center',
  },

  backButton: {
    position: 'absolute',
    left: ResponsiveTheme.spacing.lg,
    top: ResponsiveTheme.spacing.lg,
    zIndex: 1,
    padding: ResponsiveTheme.spacing.sm,
  },

  backIcon: {
    fontSize: rf(24),
    color: ResponsiveTheme.colors.primary,
    fontWeight: 'bold',
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: 'center',
    marginTop: rh(30),
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(22),
    maxWidth: rw(300),
  },

  form: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.xl,
  },

  // Google Primary Button Styles
  googlePrimaryButton: {
    backgroundColor: '#4285F4',
    borderRadius: ResponsiveTheme.borderRadius.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  googleIcon: {
    marginRight: ResponsiveTheme.spacing.sm,
  },

  googlePrimaryText: {
    color: '#FFFFFF',
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  googleSubtext: {
    color: '#FFFFFF',
    fontSize: ResponsiveTheme.fontSize.sm,
    textAlign: 'center',
    opacity: 0.9,
  },

  // Email Form Styles
  emailFormContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  emailSignUpButton: {
    marginTop: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
    borderColor: ResponsiveTheme.colors.border,
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: ResponsiveTheme.spacing.lg,
  },

  dividerLine: {
    flex: 1,
    height: rh(1),
    backgroundColor: ResponsiveTheme.colors.border,
    opacity: 0.3,
  },

  dividerText: {
    marginHorizontal: ResponsiveTheme.spacing.md,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontStyle: 'italic',
  },

  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  footerText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
  },

  footerLink: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  bottomSpacing: {
    height: ResponsiveTheme.spacing.xl,
  },
});