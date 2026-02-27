import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { Button, Input, PasswordInput } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { RegisterCredentials } from "../../types/user";
import { GoogleIcon } from "../../components/icons/GoogleIcon";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
// Note: Migration is now handled automatically by auth.ts - no manual migration needed in this screen
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

interface GuestSignUpScreenProps {
  onBack: () => void;
  onSignUpSuccess: () => void;
}

export const GuestSignUpScreen: React.FC<GuestSignUpScreenProps> = ({
  onBack,
  onSignUpSuccess,
}) => {
  // Mode: 'signup' or 'signin'
  const [mode, setMode] = useState<"signup" | "signin">("signup");

  const [formData, setFormData] = useState<RegisterCredentials>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<RegisterCredentials>>({});
  const [isLoading, setIsLoading] = useState(false);

  const { register, login, signInWithGoogle, resetPassword } = useAuth();

  const updateField = (field: keyof RegisterCredentials, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleForgotPassword = async () => {
    let email: string | null = null;
    if (Platform.OS === 'web') {
      email = window.prompt('Enter your email address to reset your password:');
    } else {
      // On native, pre-fill with current email if available
      email = formData.email.trim() || null;
      if (!email) {
        crossPlatformAlert(
          'Forgot Password',
          'Please enter your email address in the Email field first, then tap Forgot Password.',
        );
        return;
      }
    }

    if (!email || !email.trim()) return;

    try {
      const result = await resetPassword(email.trim().toLowerCase());
      crossPlatformAlert(
        result.success ? 'Password Reset Email Sent' : 'Reset Failed',
        result.success
          ? 'Check your inbox for a link to reset your password.'
          : result.error || 'Unable to send reset email. Please try again.',
      );
    } catch (err) {
      crossPlatformAlert('Error', 'Failed to send reset email. Please try again.');
    }
  };


  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterCredentials> = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);

    try {

      const response = await signInWithGoogle();

      if (response.success && response.user) {
        // Migration is now handled automatically by auth.ts in the background
        // No need for blocking alerts - just proceed immediately
        onSignUpSuccess();
      } else if (Platform.OS === 'web' && response.success && !response.user) {
        // Web OAuth flow is redirect-based: signInWithGoogleWeb() returns success
        // after initiating the redirect, but the user hasn't completed sign-in yet.
        // The actual sign-in completes when the browser redirects back to the callback URL.
        // Don't show a failure alert — the redirect is in progress.
      } else {
          crossPlatformAlert('Sign Up Failed', response.error || 'Please try again.');
      }
    } catch (error) {
      crossPlatformAlert('Error', 'Google Sign Up failed. Please try again.');
      console.error("Google Sign Up error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {

      // Ensure we trim and normalize the credentials before sending
      const trimmedCredentials = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
        confirmPassword: formData.confirmPassword.trim(),
      };

      const result = await register(trimmedCredentials);

      if (result.success) {
        // Email verification required before login
        // Migration will happen automatically when user logs in after verification
          crossPlatformAlert(
            'Account Created Successfully!',
            'Please check your email and click the verification link to activate your account. After verification, you can log in and your profile data will be automatically synced.',
            [
              {
                text: 'OK',
                onPress: () => {
                  onBack();
                },
              },
            ],
          );
      } else {
          crossPlatformAlert(
            'Sign Up Failed',
            result.error || 'Unable to create account. Please try again.',
          );
      }
    } catch (error) {
        crossPlatformAlert('Error', 'An unexpected error occurred during sign up.');
      console.error("Email sign up error:", error);
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
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {

      const trimmedCredentials = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
      };

      const result = await login(trimmedCredentials);

      if (result.success && result.user) {
        // Migration is now handled automatically by auth.ts in the background
        // No need for blocking alerts - just proceed immediately
        onSignUpSuccess();
      } else {
          crossPlatformAlert(
            'Sign In Failed',
            result.error || 'Invalid email or password. Please try again.',
          );
      }
    } catch (error) {
      crossPlatformAlert('Error', 'An unexpected error occurred during sign in.');
      console.error("Email sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <AnimatedPressable
              style={styles.backButton}
              onPress={onBack}
              scaleValue={0.97}
            >
              <Text style={styles.backIcon}>←</Text>
            </AnimatedPressable>
            <Text style={styles.title}>
              {mode === "signup" ? "Complete Your Account" : "Welcome Back"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "signup"
                ? "Sign up to save your progress and sync across devices. Your profile data will be preserved."
                : "Sign in to access your synced data and continue your fitness journey."}
            </Text>
          </View>

          <View style={styles.form}>
            {/* Google Sign-In/Up as Primary */}
            <AnimatedPressable
              style={
                isLoading
                  ? [styles.googlePrimaryButton, ...(Platform.OS !== 'web' ? [styles.googlePrimaryButtonShadow] : []), styles.buttonDisabled]
                  : [styles.googlePrimaryButton, ...(Platform.OS !== 'web' ? [styles.googlePrimaryButtonShadow] : [])]
              }
              onPress={handleGoogleSignUp}
              disabled={isLoading}
              scaleValue={0.95}
            >
              <View style={styles.googleButtonContent}>
                <GoogleIcon size={20} style={styles.googleIcon} />
                <Text style={styles.googlePrimaryText}>
                  Continue with Google
                </Text>
              </View>
              <Text style={styles.googleSubtext}>
                Fastest • No email verification needed
              </Text>
            </AnimatedPressable>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                {mode === "signup"
                  ? "or sign up with email"
                  : "or sign in with email"}
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email form */}
            <View style={styles.emailFormContainer}>
              <Input
                label="Email Address"
                placeholder="Enter your email address"
                value={formData.email}
                onChangeText={(value) => updateField("email", value)}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />

              <PasswordInput
                label="Password"
                placeholder={
                  mode === "signup"
                    ? "Create a password"
                    : "Enter your password"
                }
                value={formData.password}
                onChangeText={(value) => updateField("password", value)}
                error={errors.password}
              />

              {mode === "signup" && (
                <PasswordInput
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={(value) =>
                    updateField("confirmPassword", value)
                  }
                  error={errors.confirmPassword}
                />
              )}

              {mode === 'signin' && (
                <AnimatedPressable
                  onPress={handleForgotPassword}
                  scaleValue={0.97}
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </AnimatedPressable>
              )}


              <Button
                title={mode === "signup" ? "Create Account" : "Sign In"}
                onPress={
                  mode === "signup" ? handleEmailSignUp : handleEmailSignIn
                }
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
                style={styles.emailSignUpButton}
              />
            </View>

            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>
                {mode === "signup"
                  ? "Already have an account? "
                  : "Don't have an account? "}
              </Text>
              <AnimatedPressable
                onPress={() => {
                  setMode(mode === "signup" ? "signin" : "signup");
                  setErrors({});
                  setFormData({ email: "", password: "", confirmPassword: "" });
                }}
                scaleValue={0.97}
              >
                <Text style={styles.footerLink}>
                  {mode === "signup" ? "Sign In instead" : "Sign Up instead"}
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
    alignItems: "center" as const,
  },

  backButton: {
    position: "absolute",
    left: ResponsiveTheme.spacing.lg,
    top: ResponsiveTheme.spacing.lg,
    zIndex: 1,
    padding: ResponsiveTheme.spacing.sm,
  },

  backIcon: {
    fontSize: rf(24),
    color: ResponsiveTheme.colors.primary,
    fontWeight: "bold",
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: "center",
    marginTop: rh(30),
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(22),
    maxWidth: rw(300),
  },

  form: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.xl,
  },

  // Google Primary Button Styles
  googlePrimaryButton: {
    backgroundColor: "#4285F4",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
    elevation: 3,
  },
  googlePrimaryButtonShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },


  buttonDisabled: {
    opacity: 0.6,
  },

  googleButtonContent: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  googleIcon: {
    marginRight: ResponsiveTheme.spacing.sm,
  },

  googlePrimaryText: {
    color: "#FFFFFF",
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  googleSubtext: {
    color: "#FFFFFF",
    fontSize: ResponsiveTheme.fontSize.sm,
    textAlign: "center",
    opacity: 0.9,
  },

  // Email Form Styles
  emailFormContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  emailSignUpButton: {
    marginTop: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  forgotPasswordContainer: {
    alignSelf: 'flex-end' as const,
    marginTop: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.sm,
    padding: ResponsiveTheme.spacing.xs,
  },

  forgotPasswordText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },


  dividerContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
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
    fontStyle: "italic",
  },

  footerContainer: {
    flexDirection: "row",
    justifyContent: "center" as const,
    alignItems: "center" as const,
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
