import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { Button, Input, PasswordInput } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { GoogleIcon } from "../../components/icons/GoogleIcon";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { LoginCredentials } from "../../types/user";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

interface WelcomeScreenProps {
  onGetStarted: () => void;
  /**
   * Called when the user taps "Continue as Guest". If omitted, the guest link
   * falls back to `onGetStarted` (backward-compatible). Previously this link was
   * hard-wired to `onGetStarted`, so "Continue as Guest" actually launched the
   * full sign-up flow — see src/docs/VERIFIED-FINDINGS.md (UX-1).
   */
  onContinueAsGuest?: () => void;
  onSignInSuccess: () => void;
}

type ViewMode = "welcome" | "signin";

const FEATURE_HIGHLIGHTS = [
  {
    icon: "sparkles" as keyof typeof Ionicons.glyphMap,
    label: "AI-Powered Workouts",
    description: "Personalized plans that adapt to you",
  },
  {
    icon: "nutrition" as keyof typeof Ionicons.glyphMap,
    label: "Smart Meal Planning",
    description: "Nutrition guidance built for your goals",
  },
  {
    icon: "stats-chart" as keyof typeof Ionicons.glyphMap,
    label: "Track Your Progress",
    description: "Visualize gains and stay motivated",
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
  onContinueAsGuest,
  onSignInSuccess,
}) => {
  // Guest entry: use the dedicated handler if provided; otherwise fall back to
  // onGetStarted so the link still does *something* (backward compatibility).
  const handleContinueAsGuest = onContinueAsGuest ?? onGetStarted;
  const [mode, setMode] = useState<ViewMode>("welcome");
  const [formData, setFormData] = useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [isLoading, setIsLoading] = useState(false);

  const { login, signInWithGoogle, resetPassword } = useAuth();

  const updateField = (field: keyof LoginCredentials, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateSignInForm = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSignIn = async () => {
    if (!validateSignInForm()) return;

    setIsLoading(true);
    try {
      const result = await login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (result.success && result.user) {
        onSignInSuccess();
      } else {
        crossPlatformAlert(
          "Sign In Failed",
          result.error || "Invalid email or password. Please try again.",
        );
      }
    } catch (error) {
      crossPlatformAlert("Error", "An unexpected error occurred during sign in.");
      console.error("Email sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const response = await signInWithGoogle();

      if (response.success && response.user) {
        onSignInSuccess();
      } else if (Platform.OS === "web" && response.success && !response.user) {
        // Web OAuth is redirect-based: signInWithGoogleWeb() returns success
        // after initiating the redirect, but the user hasn't completed sign-in
        // yet. The browser is navigating to Google — don't show a failure alert.
      } else {
        crossPlatformAlert("Sign In Failed", response.error || "Please try again.");
      }
    } catch (error) {
      crossPlatformAlert("Error", "Google Sign In failed. Please try again.");
      console.error("Google Sign In error:", error);
    } finally {
      setIsLoading(false);
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

  const switchToSignIn = () => {
    setMode("signin");
    setErrors({});
    setFormData({ email: "", password: "" });
  };

  const switchToWelcome = () => {
    setMode("welcome");
    setErrors({});
    setFormData({ email: "", password: "" });
  };

  if (mode === "signin") {
    return (
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.signInHeader}>
              <AnimatedPressable
                style={styles.backButton}
                onPress={switchToWelcome}
                scaleValue={0.97}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons
                  name="arrow-back"
                  size={rf(22)}
                  color={colors.primary}
                />
              </AnimatedPressable>
              <View style={styles.signInTitleBlock}>
                <Text style={styles.signInTitle}>Welcome Back</Text>
                <Text style={styles.signInSubtitle}>
                  Sign in to continue your fitness journey
                </Text>
              </View>
            </View>

            <View style={styles.form}>
              <AnimatedPressable
                style={
                  isLoading
                    ? [styles.googleButton, styles.buttonDisabled]
                    : styles.googleButton
                }
                onPress={handleGoogleSignIn}
                disabled={isLoading}
                scaleValue={0.95}
              >
                <View style={styles.googleButtonContent}>
                  <GoogleIcon size={20} style={styles.googleIcon} />
                  <Text style={styles.googleButtonText}>
                    Continue with Google
                  </Text>
                </View>
              </AnimatedPressable>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or sign in with email</Text>
                <View style={styles.dividerLine} />
              </View>

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
                  placeholder="Enter your password"
                  value={formData.password}
                  onChangeText={(value) => updateField("password", value)}
                  error={errors.password}
                />

                <AnimatedPressable
                  onPress={handleForgotPassword}
                  scaleValue={0.97}
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </AnimatedPressable>

                <Button
                  title="Sign In"
                  onPress={handleEmailSignIn}
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isLoading}
                  style={styles.signInButton}
                />
              </View>

              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>
                  {"Don't have an account? "}
                </Text>
                <AnimatedPressable onPress={onGetStarted} scaleValue={0.97}>
                  <Text style={styles.footerLink}>Sign Up</Text>
                </AnimatedPressable>
              </View>
            </View>
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.welcomeScrollContent}
        >
          <View style={styles.brandingSection}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIconWrapper}>
                <Ionicons
                  name="fitness"
                  size={rf(36)}
                  color={colors.primary}
                />
              </View>
            </View>

            <Text style={styles.appName}>FitAI</Text>
            <Text style={styles.tagline}>
              Your AI-Powered Fitness Companion
            </Text>
            <Text style={styles.taglineSecondary}>
              Workouts, nutrition, and insights — all personalized just for you.
            </Text>
          </View>

          <View style={styles.featuresSection}>
            {FEATURE_HIGHLIGHTS.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIconWrap}>
                  <Ionicons
                    name={feature.icon}
                    size={rf(22)}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.featureTextBlock}>
                  <Text style={styles.featureLabel}>{feature.label}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.ctaSection}>
          <Button
            title="Get Started"
            onPress={onGetStarted}
            variant="primary"
            size="lg"
            fullWidth
            pulse
          />

          <View style={styles.signInPromptRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <AnimatedPressable onPress={switchToSignIn} scaleValue={0.97}>
              <Text style={styles.footerLink}>Sign In</Text>
            </AnimatedPressable>
          </View>
          <View style={styles.signInPromptRow}>
            <AnimatedPressable onPress={handleContinueAsGuest} scaleValue={0.97}>
              <Text style={styles.footerLink}>Continue as Guest</Text>
            </AnimatedPressable>
          </View>
        </View>
      </SafeAreaView>
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

  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },

  welcomeScrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.md,
  },

  brandingSection: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: rh(40),
    paddingBottom: spacing.xl,
  },

  logoContainer: {
    marginBottom: spacing.md,
  },

  logoIconWrapper: {
    width: rw(76),
    height: rw(76),
    borderRadius: rw(22),
    backgroundColor: `${colors.primary}18`,
    borderWidth: 1.5,
    borderColor: `${colors.primary}40`,
    alignItems: "center",
    justifyContent: "center",
  },

  appName: {
    fontSize: rf(52),
    fontWeight: typography.fontWeight.extrabold,
    color: colors.text,
    letterSpacing: -1.5,
    marginBottom: spacing.sm,
  },

  tagline: {
    fontSize: rf(18),
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
    textAlign: "center",
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
  },

  taglineSecondary: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(22),
    maxWidth: rw(280),
  },

  featuresSection: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },

  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.surface}CC`,
    borderWidth: 1,
    borderColor: `${colors.border}80`,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },

  featureEmoji: {
    fontSize: rf(26),
    width: rw(36),
    textAlign: "center",
  },

  featureIconWrap: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    backgroundColor: `${colors.primary}18`,
    borderWidth: 1.5,
    borderColor: `${colors.primary}40`,
    alignItems: "center",
    justifyContent: "center",
  },

  featureTextBlock: {
    flex: 1,
  },

  featureLabel: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: rh(2),
  },

  featureDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: rf(18),
  },

  ctaSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}40`,
  },

  signInPromptRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  signInHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: "center",
  },

  backButton: {
    position: "absolute",
    left: spacing.lg,
    top: spacing.lg,
    zIndex: 1,
    padding: spacing.sm,
  },

  signInTitleBlock: {
    alignItems: "center",
    marginTop: rh(30),
  },

  signInTitle: {
    fontSize: fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },

  signInSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(22),
    maxWidth: rw(280),
  },

  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  googleButton: {
    backgroundColor: "#4285F4",
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  googleButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  googleIcon: {
    marginRight: spacing.sm,
  },

  googleButtonText: {
    flexShrink: 1,
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
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

  emailFormContainer: {
    marginTop: spacing.sm,
  },

  signInButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },

  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.xs,
  },

  forgotPasswordText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },

  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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
});
