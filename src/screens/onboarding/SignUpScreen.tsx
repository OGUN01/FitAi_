import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, Input, PasswordInput, THEME } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { RegisterCredentials } from '../../types/user';
import { migrationManager } from '../../services/migrationManager';
import { dataManager } from '../../services/dataManager';

interface SignUpScreenProps {
  onSignUpSuccess: () => void;
  onBack: () => void;
  onLogin: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ onSignUpSuccess, onBack, onLogin }) => {
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

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Check if there's local guest data before registering
      const hasLocalData = await dataManager.hasLocalData();
      console.log('🔍 SignUpScreen: Local data check result:', hasLocalData);

      // Ensure we trim and normalize the credentials before sending
      const trimmedCredentials = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
        confirmPassword: formData.confirmPassword.trim(),
      };
      console.log('🔐 SignUpScreen: Using credentials:', { email: trimmedCredentials.email });
      const result = await register(trimmedCredentials);

      if (result.success) {
        const alertTitle = 'Registration Successful!';
        let alertMessage =
          'Please check your email and click the verification link to activate your account. After verification, you can log in to continue.';

        // If there's local data, mention it will be preserved
        if (hasLocalData) {
          alertMessage += '\n\nYour profile data will be automatically synced when you log in.';
          console.log('✅ SignUpScreen: User has local data - will trigger migration on login');
        }

        Alert.alert(alertTitle, alertMessage, [
          {
            text: 'OK',
            onPress: () => {
              // After user acknowledges the message, redirect to login screen
              onSignUpSuccess();
            },
          },
        ]);
      } else {
        Alert.alert('Registration Failed', result.error || 'Please try again');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);

    try {
      // Check if there's local guest data before Google sign-up
      const hasLocalData = await dataManager.hasLocalData();
      console.log('🔍 SignUpScreen: Google sign-up - Local data check result:', hasLocalData);

      const response = await signInWithGoogle();

      if (response.success) {
        // Google sign-up is immediate (no email verification)
        let alertMessage = "Welcome to FitAI! Let's set up your profile.";

        if (hasLocalData) {
          alertMessage =
            "Welcome to FitAI! Your profile data will be automatically synced. Let's set up your profile.";
          console.log('✅ SignUpScreen: Google user has local data - will trigger migration');
        }

        Alert.alert('Google Sign-Up Successful!', alertMessage, [
          { text: 'Continue', onPress: onSignUpSuccess },
        ]);
      } else {
        Alert.alert('Google Sign-Up Failed', response.error || 'Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Google Sign-Up failed. Please try again.');
      console.error('Google Sign-Up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join FitAI and start your fitness journey</Text>
        </View>

        <View style={styles.form}>
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
            placeholder="Create a strong password"
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
            onPress={handleSignUp}
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            style={styles.signUpButton}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="🔍 Continue with Google"
            onPress={handleGoogleSignUp}
            variant="outline"
            size="lg"
            fullWidth
            loading={isLoading}
            style={styles.googleButton}
          />

          <Button
            title="Already have an account? Sign In"
            onPress={onLogin}
            variant="ghost"
            size="md"
            fullWidth
            style={styles.loginButton}
          />
        </View>
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  header: {
    alignItems: 'center',
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingBottom: ResponsiveTheme.spacing.lg,
  },

  title: {
    fontSize: rf(28),
    fontWeight: 'bold',
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(24),
  },

  form: {
    paddingVertical: ResponsiveTheme.spacing.lg,
  },

  signUpButton: {
    marginTop: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: ResponsiveTheme.spacing.lg,
  },

  dividerLine: {
    flex: 1,
    height: rh(1),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  dividerText: {
    color: ResponsiveTheme.colors.textMuted,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    fontSize: rf(14),
  },

  googleButton: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  loginButton: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  footer: {
    padding: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.md,
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: ResponsiveTheme.spacing.xl,
  },
});
