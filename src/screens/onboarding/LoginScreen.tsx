import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, Input, PasswordInput, THEME } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { LoginCredentials } from '../../types/user';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onBack: () => void;
  onSignUp: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onBack,
  onSignUp,
}) => {
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [isLoading, setIsLoading] = useState(false);

  const { login, signInWithGoogle, resendEmailVerification } = useAuth();

  const updateField = (field: keyof LoginCredentials, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
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
        password: formData.password.trim()
      };
      console.log('🔐 LoginScreen: Using credentials:', { email: trimmedCredentials.email });
      const result = await login(trimmedCredentials);
      console.log('🔐 LoginScreen: Login result:', { success: result.success, error: result.error });

      if (result.success) {
        // Check if user's email is verified
        if (result.user && !result.user.isEmailVerified) {
          Alert.alert(
            'Email Verification Required',
            'Please check your email and click the verification link to activate your account before logging in.',
            [
              { text: 'Resend Email', onPress: () => handleResendVerification(formData.email) },
              { text: 'OK' }
            ]
          );
          return;
        }

        console.log('🔐 LoginScreen: Login successful, user:', result.user?.email);

        Alert.alert('Success', 'Welcome back! You will now be taken to complete your profile.', [
          { text: 'Continue', onPress: () => {
            console.log('🔐 LoginScreen: Calling onLoginSuccess');
            onLoginSuccess();
          }}
        ]);
      } else {
        // Check if error is related to email verification
        if (result.error?.includes('email') || result.error?.includes('confirm')) {
          Alert.alert(
            'Email Verification Required',
            'Please check your email and click the verification link to activate your account.',
            [
              { text: 'Resend Email', onPress: () => handleResendVerification(formData.email) },
              { text: 'OK' }
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
        Alert.alert('Success', 'Google Sign-In successful!', [
          { text: 'Continue', onPress: onLoginSuccess }
        ]);
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
          <Text style={styles.subtitle}>
            Sign in to continue your fitness journey
          </Text>
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
            placeholder="Enter your password"
            value={formData.password}
            onChangeText={(value) => updateField('password', value)}
            error={errors.password}
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            style={styles.loginButton}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="🔍 Continue with Google"
            onPress={handleGoogleSignIn}
            variant="outline"
            size="lg"
            fullWidth
            loading={isLoading}
            style={styles.googleButton}
          />

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

  loginButton: {
    marginTop: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: ResponsiveTheme.spacing.md,
  },

  dividerLine: {
    flex: 1,
    height: rh(1),
    backgroundColor: ResponsiveTheme.colors.border,
  },

  dividerText: {
    marginHorizontal: ResponsiveTheme.spacing.md,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  googleButton: {
    marginBottom: ResponsiveTheme.spacing.md,
    borderColor: ResponsiveTheme.colors.border,
  },

  signUpButton: {
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
