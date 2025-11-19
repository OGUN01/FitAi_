import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native';
import { AnimatedPressable } from '../../components/ui/aurora/AnimatedPressable';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, Input, PasswordInput, THEME } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { RegisterCredentials } from '../../types/user';
import { migrationManager } from '../../services/migrationManager';
import { dataManager } from '../../services/dataManager';
import { GoogleIcon } from '../../components/icons/GoogleIcon';
import { AuroraBackground } from '../../components/ui/aurora/AuroraBackground';

interface GuestSignUpScreenProps {
  onBack: () => void;
  onSignUpSuccess: () => void;
}

export const GuestSignUpScreen: React.FC<GuestSignUpScreenProps> = ({ onBack, onSignUpSuccess }) => {
  const [formData, setFormData] = useState<RegisterCredentials>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<RegisterCredentials>>({});
  const [isLoading, setIsLoading] = useState(false);

  const { register, signInWithGoogle } = useAuth();

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
      console.log('🚀 GuestSignUp: Starting Google sign up with data migration...');
      
      // Check for guest data that needs migration
      const hasGuestData = await dataManager.hasGuestDataForMigration();
      console.log('🔍 GuestSignUp: Guest data check result:', hasGuestData);

      const response = await signInWithGoogle();

      if (response.success && response.user) {
        console.log('✅ GuestSignUp: Google authentication successful');
        
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
                    console.log('🔄 GuestSignUp: Starting guest data key migration...');
                    const keyMigrationResult = await dataManager.migrateGuestDataToUser(
                      response.user.id
                    );
                    
                    if (keyMigrationResult.success) {
                      console.log('✅ GuestSignUp: Guest data key migration successful:', keyMigrationResult.migratedKeys);
                    } else {
                      console.warn('⚠️ GuestSignUp: Guest data key migration had issues:', keyMigrationResult.errors);
                    }
                    
                    // Now start profile migration to remote storage
                    console.log('🔄 GuestSignUp: Starting remote profile migration...');
                    const migrationResult = await migrationManager.startProfileMigration(
                      response.user.id
                    );

                    if (migrationResult.success) {
                      console.log('✅ GuestSignUp: Complete migration successful');
                      Alert.alert(
                        'Welcome to FitAI!',
                        'Your profile data has been synced successfully to your Google account.',
                        [
                          {
                            text: 'Continue',
                            onPress: () => {
                              console.log('🎉 GuestSignUp: Calling onSignUpSuccess after migration');
                              onSignUpSuccess();
                            },
                          },
                        ]
                      );
                    } else {
                      console.warn('⚠️ GuestSignUp: Migration had issues, but continuing');
                      Alert.alert(
                        'Welcome to FitAI!',
                        'Your account has been created successfully. Some data may sync in the background.',
                        [
                          {
                            text: 'Continue',
                            onPress: () => {
                              console.log('🎉 GuestSignUp: Calling onSignUpSuccess despite migration issues');
                              onSignUpSuccess();
                            },
                          },
                        ]
                      );
                    }
                  } catch (migrationError) {
                    console.error('❌ GuestSignUp: Migration error:', migrationError);
                    Alert.alert(
                      'Welcome to FitAI!',
                      'Your account has been created successfully. Your data will be synced shortly.',
                      [
                        {
                          text: 'Continue',
                          onPress: () => {
                            console.log('🎉 GuestSignUp: Calling onSignUpSuccess after migration error');
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
                  console.log('🎉 GuestSignUp: Calling onSignUpSuccess (no migration needed)');
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
      console.log('🚀 GuestSignUp: Starting email sign up with data migration...');
      
      // Check if there's guest data before registering
      const hasGuestData = await dataManager.hasGuestDataForMigration();
      console.log('🔍 GuestSignUp: Guest data check result:', hasGuestData);

      // Ensure we trim and normalize the credentials before sending
      const trimmedCredentials = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
        confirmPassword: formData.confirmPassword.trim(),
      };
      
      console.log('🔐 GuestSignUp: Creating account for:', { email: trimmedCredentials.email });
      const result = await register(trimmedCredentials);

      if (result.success) {
        const alertTitle = 'Account Created Successfully!';
        let alertMessage =
          'Please check your email and click the verification link to activate your account. After verification, you can log in to access your synced data.';

        // If there's guest data, mention it will be preserved and synced
        if (hasGuestData) {
          alertMessage += '\n\n✨ Your profile data will be automatically synced when you log in after email verification.';
          console.log('✅ GuestSignUp: User has guest data - will trigger migration on login');
        }

        Alert.alert(alertTitle, alertMessage, [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to profile screen - user will login after email verification
              console.log('📧 GuestSignUp: Email signup successful, user needs to verify email');
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

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AnimatedPressable style={styles.backButton} onPress={onBack} scaleValue={0.97}>
            <Text style={styles.backIcon}>←</Text>
          </AnimatedPressable>
          <Text style={styles.title}>Complete Your Account</Text>
          <Text style={styles.subtitle}>
            Sign up to save your progress and sync across devices. Your profile data will be preserved.
          </Text>
        </View>

        <View style={styles.form}>
          {/* Google Sign-Up as Primary */}
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
            <Text style={styles.dividerText}>or sign up with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email form as secondary option */}
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
              placeholder="Create a password"
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              error={errors.password}
            />

            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              error={errors.confirmPassword}
            />

            <Button
              title="Create Account"
              onPress={handleEmailSignUp}
              variant="outline"
              size="lg"
              fullWidth
              loading={isLoading}
              style={styles.emailSignUpButton}
            />
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <AnimatedPressable onPress={onBack} scaleValue={0.97}>
              <Text style={styles.footerLink}>Sign In instead</Text>
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