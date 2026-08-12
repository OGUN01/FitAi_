import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography, border } from "../../theme/aurora-tokens";
import { GlassButton } from "../../components/ui/aurora/GlassButton";
import { UnderlineInput } from "../../components/onboarding/aurora/UnderlineInput";
import { useAuth } from "../../hooks/useAuth";
import { RegisterCredentials } from "../../types/user";
import { GoogleIcon } from "../../components/icons/GoogleIcon";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { BottomSheet } from "../../components/ui/aurora/BottomSheet";
// Note: Migration is now handled automatically by auth.ts - no manual migration needed in this screen
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { dataBridge } from "../../services/DataBridge";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  // Forgot-password in-app sheet (replaces the native browser window.prompt on web).
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);
  const [forgotPasswordSubmitting, setForgotPasswordSubmitting] = useState(false);

  const { register, login, signInWithGoogle, resetPassword } = useAuth();

  const updateField = (field: keyof RegisterCredentials, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleForgotPassword = () => {
    // Pre-fill with whatever's already in the Email field (works on both
    // native and web) and let the in-app sheet handle validation/submission —
    // no OS-level prompt, matches the Aurora design system.
    setForgotPasswordEmail(formData.email.trim());
    setForgotPasswordError(null);
    setForgotPasswordVisible(true);
  };

  const closeForgotPasswordSheet = () => {
    setForgotPasswordVisible(false);
    setForgotPasswordError(null);
  };

  const handleForgotPasswordSubmit = async () => {
    const trimmedEmail = forgotPasswordEmail.trim();

    if (!trimmedEmail) {
      setForgotPasswordError("Email is required");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setForgotPasswordError("Please enter a valid email address");
      return;
    }

    setForgotPasswordError(null);
    setForgotPasswordSubmitting(true);
    try {
      const result = await resetPassword(trimmedEmail.toLowerCase());
      setForgotPasswordSubmitting(false);
      setForgotPasswordVisible(false);
      crossPlatformAlert(
        result.success ? 'Password Reset Email Sent' : 'Reset Failed',
        result.success
          ? 'Check your inbox for a link to reset your password.'
          : result.error || 'Unable to send reset email. Please try again.',
      );
    } catch (err) {
      setForgotPasswordSubmitting(false);
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
      } else if (response.error === 'Sign-in was cancelled') {
        // User-initiated cancellation (dismissed the Google account picker) is
        // not an error — dismiss silently, same as best-in-class apps do.
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

      // Ensure we trim and normalize the credentials before sending.
      // NOTE: password/confirmPassword are NOT trimmed — leading/trailing
      // spaces may be intentional parts of a real password.
      const trimmedCredentials = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      };

      const result = await register(trimmedCredentials);

      if (result.success) {
        // Email verification required before login
        // Migration will happen automatically when user logs in after verification.
        // Only mention syncing when there's actually guest data to sync, and
        // scope the claim to what migration actually covers today (profile
        // and onboarding preferences — NOT workout/meal history, which stays
        // local-only until DataBridge migrates those tables too).
        const hasGuestData = await dataBridge.hasGuestDataForMigration().catch(() => false);
        const syncNote = hasGuestData
          ? ' After verification, you can log in and your saved profile and preferences will be automatically synced.'
          : '';
          crossPlatformAlert(
            'Account Created Successfully!',
            `Please check your email and click the verification link to activate your account.${syncNote}`,
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
        password: formData.password,
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <AnimatedPressable
              style={styles.backButton}
              onPress={onBack}
              scaleValue={0.97}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons
                name="arrow-back"
                size={rf(22)}
                color={colors.primary}
              />
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
                  ? [styles.googlePrimaryButton, styles.buttonDisabled]
                  : styles.googlePrimaryButton
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
                Fastest - No email verification needed
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
              <UnderlineInput
                label="Email Address"
                placeholder="Enter your email address"
                value={formData.email}
                onChangeText={(value) => updateField("email", value)}
                keyboardType="email-address"
                autoCapitalize="none"
                accentColor={errors.email ? colors.error : undefined}
                containerStyle={styles.fieldContainer}
              />
              {errors.email ? (
                <Text style={styles.fieldError}>{errors.email}</Text>
              ) : null}

              <View style={styles.passwordFieldWrap}>
                <UnderlineInput
                  label="Password"
                  placeholder={
                    mode === "signup"
                      ? "Create a password"
                      : "Enter your password"
                  }
                  value={formData.password}
                  onChangeText={(value) => updateField("password", value)}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  accentColor={errors.password ? colors.error : undefined}
                  containerStyle={styles.fieldContainer}
                />
                <AnimatedPressable
                  onPress={() => setPasswordVisible((prev) => !prev)}
                  scaleValue={0.9}
                  // Absolute anchor lives on the outer wrapper (containerStyle),
                  // size-only on the inner Pressable (style) — same
                  // wrapper-anchoring fix as WelcomeScreen's eye toggle.
                  containerStyle={styles.eyeToggleAnchor}
                  style={styles.eyeToggle}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    passwordVisible ? "Hide password" : "Show password"
                  }
                >
                  <Ionicons
                    name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                    size={rf(20)}
                    color={colors.textSecondary}
                  />
                </AnimatedPressable>
              </View>
              {errors.password ? (
                <Text style={styles.fieldError}>{errors.password}</Text>
              ) : null}

              {mode === "signup" && (
                <View style={styles.passwordFieldWrap}>
                  <UnderlineInput
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChangeText={(value) =>
                      updateField("confirmPassword", value)
                    }
                    secureTextEntry={!confirmPasswordVisible}
                    autoCapitalize="none"
                    accentColor={
                      errors.confirmPassword ? colors.error : undefined
                    }
                    containerStyle={styles.fieldContainer}
                  />
                  <AnimatedPressable
                    onPress={() => setConfirmPasswordVisible((prev) => !prev)}
                    scaleValue={0.9}
                    containerStyle={styles.eyeToggleAnchor}
                    style={styles.eyeToggle}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      confirmPasswordVisible
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    <Ionicons
                      name={
                        confirmPasswordVisible
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={rf(20)}
                      color={colors.textSecondary}
                    />
                  </AnimatedPressable>
                </View>
              )}
              {mode === "signup" && errors.confirmPassword ? (
                <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
              ) : null}

              {mode === 'signin' && (
                <AnimatedPressable
                  onPress={handleForgotPassword}
                  scaleValue={0.97}
                  style={styles.forgotPasswordContainer}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password"
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </AnimatedPressable>
              )}


              <GlassButton
                label={mode === "signup" ? "Create Account" : "Sign In"}
                onPress={
                  mode === "signup" ? handleEmailSignUp : handleEmailSignIn
                }
                variant="primary"
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
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={
                  mode === "signup" ? "Switch to sign in" : "Switch to sign up"
                }
              >
                <Text style={styles.footerLink}>
                  {mode === "signup" ? "Sign In instead" : "Sign Up instead"}
                </Text>
              </AnimatedPressable>
            </View>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomSheet
        visible={forgotPasswordVisible}
        onClose={closeForgotPasswordSheet}
        title="Reset Password"
        dismissOnDrag={!forgotPasswordSubmitting}
        closeOnOverlayPress={!forgotPasswordSubmitting}
      >
        <Text style={styles.forgotSheetSubtitle}>
          Enter your email address and we&apos;ll send you a link to reset your password.
        </Text>
        <UnderlineInput
          label="Email Address"
          placeholder="Enter your email address"
          value={forgotPasswordEmail}
          onChangeText={(value) => {
            setForgotPasswordEmail(value);
            if (forgotPasswordError) setForgotPasswordError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          accentColor={forgotPasswordError ? colors.error : undefined}
          containerStyle={styles.fieldContainer}
        />
        {forgotPasswordError ? (
          <Text style={styles.fieldError}>{forgotPasswordError}</Text>
        ) : null}
        <GlassButton
          label="Send Reset Link"
          onPress={handleForgotPasswordSubmit}
          variant="primary"
          fullWidth
          loading={forgotPasswordSubmitting}
          disabled={forgotPasswordSubmitting}
          style={styles.emailSignUpButton}
        />
      </BottomSheet>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollView: {
    flex: 1,
  },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: "center" as const,
  },

  backButton: {
    position: "absolute",
    left: spacing.lg,
    top: spacing.lg,
    zIndex: 1,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
    marginTop: rh(30),
  },

  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(22),
    maxWidth: rw(300),
  },

  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },

  // Google Primary Button Styles — flat brand fill + hairline (no elevation).
  googlePrimaryButton: {
    backgroundColor: "#4285F4",
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: border.subtle,
  },


  buttonDisabled: {
    opacity: 0.6,
  },

  googleButtonContent: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: spacing.xs,
  },

  googleIcon: {
    marginRight: spacing.sm,
  },

  googlePrimaryText: {
    color: "#FFFFFF",
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },

  googleSubtext: {
    color: "#FFFFFF",
    fontSize: fontSize.sm,
    textAlign: "center",
    opacity: 0.9,
  },

  // Email Form Styles
  emailFormContainer: {
    marginTop: spacing.sm,
  },

  fieldContainer: {
    marginBottom: spacing.sm,
  },

  fieldError: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },

  // UnderlineInput password field with absolute-positioned eye toggle.
  passwordFieldWrap: {
    position: "relative",
    justifyContent: "center",
  },

  eyeToggleAnchor: {
    position: "absolute",
    right: 0,
    top: spacing.sm,
  },

  eyeToggle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  emailSignUpButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },

  forgotPasswordContainer: {
    alignSelf: 'flex-end' as const,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    // Meet the 44px WCAG touch floor (padding:xs alone left ~28px).
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },

  forgotPasswordText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },


  dividerContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginVertical: spacing.lg,
  },

  dividerLine: {
    flex: 1,
    height: rh(1),
    backgroundColor: colors.border,
    opacity: 0.3,
  },

  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: "italic",
  },

  footerContainer: {
    flexDirection: "row",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },

  footerText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },

  footerLink: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },

  bottomSpacing: {
    height: spacing.xl,
  },

  forgotSheetSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: rf(20),
    marginBottom: spacing.md,
  },
});
