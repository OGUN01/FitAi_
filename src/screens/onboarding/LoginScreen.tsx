import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, Input, PasswordInput, THEME } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { LoginCredentials } from '../../types/user';
import { quickGoogleSignInTest } from '../../utils/quickGoogleTest';
import { migrationManager } from '../../services/migrationManager';
import { dataManager } from '../../services/dataManager';
import { GoogleIcon } from '../../components/icons/GoogleIcon';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onBack: () => void;
  onSignUp: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onBack, onSignUp }) => {
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [isLoading, setIsLoading] = useState(false);

  const { login, signInWithGoogle, resendEmailVerification } = useAuth();

  const updateField = (field: keyof LoginCredentials, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    console.log('🔐 LoginScreen: Starting login process', { email: formData.email });

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      console.log('🔐 LoginScreen: Calling login service...');
      // Ensure we trim the credentials before sending
      const trimmedCredentials = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
      };
      console.log('🔐 LoginScreen: Using credentials:', { email: trimmedCredentials.email });
      const result = await login(trimmedCredentials);
      console.log('🔐 LoginScreen: Login result:', {
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        // Check if user's email is verified
        if (result.user && !result.user.isEmailVerified) {
          Alert.alert(
            'Email Verification Required',
            'Please check your email and click the verification link to activate your account before logging in.',
            [
              { text: 'Resend Email', onPress: () => handleResendVerification(formData.email) },
              { text: 'OK' },
            ]
          );
          return;
        }

        console.log('🔐 LoginScreen: Login successful, user:', result.user?.email);

        // Check for guest data and trigger migration if needed
        if (result.user) {
          // CRITICAL: Check for guest data BEFORE setting userId in dataManager
          const hasGuestDataForMigration = await dataManager.hasGuestDataForMigration();
          console.log('🔍 LoginScreen: Guest data check result:', hasGuestDataForMigration);
          
          // Now set user ID in dataManager for future operations
          dataManager.setUserId(result.user.id);
          
          const hasLocalData = hasGuestDataForMigration;
          console.log('🔍 LoginScreen: Final local data check result:', hasLocalData);

          if (hasLocalData) {
            console.log('🚀 LoginScreen: Starting automatic migration of local data');

            // Show migration starting alert
            Alert.alert(
              'Syncing Your Data',
              'We found your profile data and are syncing it to your account. This will only take a moment.',
              [
                {
                  text: 'OK',
                  onPress: async () => {
                    try {
                      // First, migrate guest data to user-specific keys
                      console.log('🔄 LoginScreen: Starting guest data key migration...');
                      const keyMigrationResult = await dataManager.migrateGuestDataToUser(
                        result.user.id
                      );
                      
                      if (keyMigrationResult.success) {
                        console.log('✅ LoginScreen: Guest data key migration successful:', keyMigrationResult.migratedKeys);
                      } else {
                        console.warn('⚠️ LoginScreen: Guest data key migration had issues:', keyMigrationResult.errors);
                      }
                      
                      // Now start profile migration to remote storage
                      console.log('🔄 LoginScreen: Starting remote profile migration...');
                      const migrationResult = await migrationManager.startProfileMigration(
                        result.user.id
                      );

                      if (migrationResult.success) {
                        console.log('✅ LoginScreen: Migration completed successfully');
                        Alert.alert(
                          'Data Synced Successfully!',
                          'Your profile data has been synced to your account. Welcome back!',
                          [
                            {
                              text: 'Continue',
                              onPress: () => {
                                console.log(
                                  '🔐 LoginScreen: Calling onLoginSuccess after migration'
                                );
                                onLoginSuccess();
                              },
                            },
                          ]
                        );
                      } else {
                        console.warn('⚠️ LoginScreen: Migration failed, continuing anyway');
                        Alert.alert(
                          'Sync Issue',
                          'There was an issue syncing some data, but you can continue. Your local data is preserved.',
                          [
                            {
                              text: 'Continue',
                              onPress: () => {
                                console.log(
                                  '🔐 LoginScreen: Calling onLoginSuccess despite migration issues'
                                );
                                onLoginSuccess();
                              },
                            },
                          ]
                        );
                      }
                    } catch (migrationError) {
                      console.error('❌ LoginScreen: Migration error:', migrationError);
                      Alert.alert(
                        'Sync Issue',
                        'There was an issue syncing your data, but you can continue. Your local data is preserved.',
                        [
                          {
                            text: 'Continue',
                            onPress: () => {
                              console.log(
                                '🔐 LoginScreen: Calling onLoginSuccess after migration error'
                              );
                              onLoginSuccess();
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
            // No local data, proceed normally
            Alert.alert(
              'Success',
              'Welcome back! You will now be taken to complete your profile.',
              [
                {
                  text: 'Continue',
                  onPress: () => {
                    console.log('🔐 LoginScreen: Calling onLoginSuccess (no migration needed)');
                    onLoginSuccess();
                  },
                },
              ]
            );
          }
        }
      } else {
        // Check if error is related to email verification
        if (result.error?.includes('email') || result.error?.includes('confirm')) {
          Alert.alert(
            'Email Verification Required',
            'Please check your email and click the verification link to activate your account.',
            [
              { text: 'Resend Email', onPress: () => handleResendVerification(formData.email) },
              { text: 'OK' },
            ]
          );
        } else {
          console.log('🔐 LoginScreen: Login failed:', result.error);
          Alert.alert('Login Failed', result.error || 'Invalid credentials');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (email: string) => {
    setIsLoading(true);
    try {
      const result = await resendEmailVerification(email);
      if (result.success) {
        Alert.alert('Email Sent', 'Please check your email for the verification link.');
      } else {
        Alert.alert('Error', result.error || 'Failed to send verification email');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send verification email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    try {
      const response = await signInWithGoogle();

      if (response.success) {
        // CRITICAL: Check for guest data BEFORE setting userId in dataManager
        // This ensures we check guest keys instead of user-specific keys
        const hasGuestDataForMigration = await dataManager.hasGuestDataForMigration();
        console.log('🔍 LoginScreen: Google sign-in - Guest data check result:', hasGuestDataForMigration);
        
        // Now set user ID in dataManager for future operations
        if (response.user) {
          dataManager.setUserId(response.user.id);
        }
        
        const hasLocalData = hasGuestDataForMigration;
        console.log('🔍 LoginScreen: Google sign-in - Final local data check result:', hasLocalData);

        if (hasLocalData && response.user) {
          console.log('🚀 LoginScreen: Starting automatic migration for Google user');

          // Show migration starting alert
          Alert.alert(
            'Syncing Your Data',
            'We found your profile data and are syncing it to your account. This will only take a moment.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  try {
                    // First, migrate guest data to user-specific keys
                    console.log('🔄 LoginScreen: Starting guest data key migration...');
                    const keyMigrationResult = await dataManager.migrateGuestDataToUser(
                      response.user.id
                    );
                    
                    if (keyMigrationResult.success) {
                      console.log('✅ LoginScreen: Guest data key migration successful:', keyMigrationResult.migratedKeys);
                    } else {
                      console.warn('⚠️ LoginScreen: Guest data key migration had issues:', keyMigrationResult.errors);
                    }
                    
                    // Now start profile migration to remote storage
                    console.log('🔄 LoginScreen: Starting remote profile migration...');
                    const migrationResult = await migrationManager.startProfileMigration(
                      response.user.id
                    );

                    if (migrationResult.success) {
                      console.log('✅ LoginScreen: Google migration completed successfully');
                      Alert.alert(
                        'Data Synced Successfully!',
                        'Your profile data has been synced. Welcome to FitAI!',
                        [
                          {
                            text: 'Continue',
                            onPress: () => {
                              console.log(
                                '🚀 LoginScreen: Calling onLoginSuccess after Google migration'
                              );
                              onLoginSuccess();
                            },
                          },
                        ]
                      );
                    } else {
                      console.warn('⚠️ LoginScreen: Google migration failed, continuing anyway');
                      Alert.alert(
                        'Welcome to FitAI!',
                        "There was an issue syncing some data, but you can continue. Let's complete your profile setup.",
                        [
                          {
                            text: 'Continue Setup',
                            onPress: () => {
                              console.log(
                                '🚀 LoginScreen: Calling onLoginSuccess despite Google migration issues'
                              );
                              onLoginSuccess();
                            },
                          },
                        ]
                      );
                    }
                  } catch (migrationError) {
                    console.error('❌ LoginScreen: Google migration error:', migrationError);
                    Alert.alert(
                      'Welcome to FitAI!',
                      "There was an issue syncing your data, but you can continue. Let's complete your profile setup.",
                      [
                        {
                          text: 'Continue Setup',
                          onPress: () => {
                            console.log(
                              '🚀 LoginScreen: Calling onLoginSuccess after Google migration error'
                            );
                            onLoginSuccess();
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
          // No local data, handle normal Google sign-in flow
          if (response.onboardingRequired) {
            // New user or user who hasn't completed onboarding
            const message = response.isNewUser
              ? "Welcome to FitAI! Let's set up your personalized fitness profile to get started."
              : "Welcome back! Let's complete your profile setup to unlock all features.";

            Alert.alert('Welcome!', message, [
              {
                text: 'Continue Setup',
                onPress: () => {
                  console.log('🚀 LoginScreen: Redirecting to onboarding for Google user');
                  onLoginSuccess();
                },
              },
            ]);
          } else {
            // Returning user with complete onboarding
            Alert.alert(
              'Welcome Back!',
              'Great to see you again! Taking you back to your dashboard.',
              [
                {
                  text: 'Continue',
                  onPress: () => {
                    console.log(
                      '🏠 LoginScreen: Redirecting to main app for returning Google user'
                    );
                    onLoginSuccess();
                  },
                },
              ]
            );
          }
        }
      } else {
        Alert.alert('Google Sign-In Failed', response.error || 'Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Google Sign-In failed. Please try again.');
      console.error('Google Sign-In error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your fitness journey</Text>
        </View>

        <View style={styles.form}>
          {/* Google Sign-In as Primary */}
          <TouchableOpacity
            style={[styles.googlePrimaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <View style={styles.googleButtonContent}>
              <GoogleIcon size={20} style={styles.googleIcon} />
              <Text style={styles.googlePrimaryText}>Continue with Google</Text>
            </View>
            <Text style={styles.googleSubtext}>Recommended • No email verification needed</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or use email</Text>
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
              placeholder="Enter your password"
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              error={errors.password}
            />

            <Button
              title="Sign In with Email"
              onPress={handleLogin}
              variant="outline"
              size="lg"
              fullWidth
              loading={isLoading}
              style={styles.emailLoginButton}
            />
          </View>

          <Button
            title="Don't have an account? Sign Up"
            onPress={onSignUp}
            variant="ghost"
            size="md"
            fullWidth
            style={styles.signUpButton}
          />
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Back"
          onPress={onBack}
          variant="outline"
          size="md"
          style={styles.backButton}
        />
      </View>
    </SafeAreaView>
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
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingBottom: ResponsiveTheme.spacing.lg,
    alignItems: 'center',
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(22),
  },

  form: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
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

  emailLoginButton: {
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

  signUpButton: {
    marginTop: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  bottomSpacing: {
    height: ResponsiveTheme.spacing.xl,
  },

  footer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  backButton: {
    alignSelf: 'flex-start',
  },
});
