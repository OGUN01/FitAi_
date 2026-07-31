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
import { GlassButton } from "../../components/ui/aurora/GlassButton";
import { UnderlineInput } from "../../components/onboarding/aurora/UnderlineInput";
import { useAuth } from "../../hooks/useAuth";
import { GoogleIcon } from "../../components/icons/GoogleIcon";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import {
  colors,
  surface,
  border,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
import { LoginCredentials } from "../../types/user";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_MEDIUM } from "../../utils/colors";

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
  const [passwordVisible, setPasswordVisible] = useState(false);

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
                // Same wrapper-anchoring fix as the eye toggle: the absolute
                // position must sit on the outer wrapper (containerStyle) or
                // web anchors the button to AnimatedPressable's 0×0 inner
                // wrapper — it landed center-screen under the title and was
                // unclickable.
                containerStyle={styles.backButtonAnchor}
                style={styles.backButton}
                onPress={switchToWelcome}
                scaleValue={0.97}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons
                  name="arrow-back"
                  size={rf(22)}
                  color={colors.primary.DEFAULT}
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
                <UnderlineInput
                  label="Email Address"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChangeText={(value) => updateField("email", value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  accentColor={
                    errors.email ? colors.error.DEFAULT : undefined
                  }
                  containerStyle={styles.fieldContainer}
                />
                {errors.email ? (
                  <Text style={styles.fieldError}>{errors.email}</Text>
                ) : null}

                <View style={styles.passwordFieldWrap}>
                  <UnderlineInput
                    label="Password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChangeText={(value) => updateField("password", value)}
                    secureTextEntry={!passwordVisible}
                    autoCapitalize="none"
                    accentColor={
                      errors.password ? colors.error.DEFAULT : undefined
                    }
                    containerStyle={styles.fieldContainer}
                  />
                  <AnimatedPressable
                    onPress={() => setPasswordVisible((prev) => !prev)}
                    scaleValue={0.9}
                    // The absolute anchor MUST live on the outer wrapper
                    // (containerStyle), not the inner Pressable (style):
                    // AnimatedPressable wraps the Pressable in a 0-height
                    // Animated.View, and on web that wrapper becomes the
                    // containing block — the eye landed below the field,
                    // overlapped by "Forgot Password?", and was unclickable.
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
                      color={colors.text.secondary}
                    />
                  </AnimatedPressable>
                </View>
                {errors.password ? (
                  <Text style={styles.fieldError}>{errors.password}</Text>
                ) : null}

                <AnimatedPressable
                  onPress={handleForgotPassword}
                  scaleValue={0.97}
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </AnimatedPressable>

                <GlassButton
                  label="Sign In"
                  onPress={handleEmailSignIn}
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                  style={styles.signInButton}
                />
              </View>

              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>
                  {"Don't have an account? "}
                </Text>
                <AnimatedPressable
                  onPress={onGetStarted}
                  scaleValue={0.97}
                  accessibilityRole="link"
                  accessibilityLabel="Sign up for a new account"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
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
                  color={colors.primary.DEFAULT}
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
                    color={colors.primary.DEFAULT}
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
          <GlassButton
            label="Get Started"
            onPress={onGetStarted}
            variant="primary"
            fullWidth
          />

          <View style={styles.signInPromptRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <AnimatedPressable
              onPress={switchToSignIn}
              scaleValue={0.97}
              accessibilityRole="link"
              accessibilityLabel="Sign in to your account"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.footerLink}>Sign In</Text>
            </AnimatedPressable>
          </View>
          <View style={styles.signInPromptRow}>
            <AnimatedPressable
              onPress={handleContinueAsGuest}
              scaleValue={0.97}
              accessibilityRole="button"
              accessibilityLabel="Continue as guest"
              accessibilityHint="Explore the app without creating an account"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
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
    backgroundColor: surface[0],
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
    backgroundColor: hexToRgba(colors.primary.DEFAULT, TINT_ALPHA_LOW),
    borderWidth: 1.5,
    borderColor: hexToRgba(colors.primary.DEFAULT, TINT_ALPHA_MEDIUM),
    alignItems: "center",
    justifyContent: "center",
  },

  appName: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: rf(52),
    color: colors.text.primary,
    letterSpacing: -1.5,
    marginBottom: spacing.sm,
  },

  tagline: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: rf(18),
    color: colors.primary.DEFAULT,
    textAlign: "center",
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
  },

  taglineSecondary: {
    fontFamily: "Manrope_400Regular",
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
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
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },

  featureIconWrap: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    backgroundColor: hexToRgba(colors.primary.DEFAULT, TINT_ALPHA_LOW),
    borderWidth: 1.5,
    borderColor: hexToRgba(colors.primary.DEFAULT, TINT_ALPHA_MEDIUM),
    alignItems: "center",
    justifyContent: "center",
  },

  featureTextBlock: {
    flex: 1,
  },

  featureLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: typography.fontSize.body,
    color: colors.text.primary,
    marginBottom: rh(2),
  },

  featureDescription: {
    fontFamily: "Manrope_400Regular",
    fontSize: typography.fontSize.caption,
    color: colors.text.secondary,
    lineHeight: rf(18),
  },

  ctaSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: border.subtle,
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

  backButtonAnchor: {
    position: "absolute",
    left: spacing.lg,
    top: spacing.lg,
    zIndex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  signInTitleBlock: {
    alignItems: "center",
    marginTop: rh(30),
  },

  signInTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: typography.fontSize.h1,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },

  signInSubtitle: {
    fontFamily: "Manrope_400Regular",
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: rf(22),
    maxWidth: rw(280),
  },

  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  // Google brand blue is a brand asset (not a design-system color), kept as a
  // literal. Shadows removed per Aurora 2026 (border hairline + surface tint
  // instead of elevation).
  googleButton: {
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
    alignItems: "center",
    justifyContent: "center",
  },

  googleIcon: {
    marginRight: spacing.sm,
  },

  googleButtonText: {
    flexShrink: 1,
    color: colors.text.primary,
    fontSize: typography.fontSize.h3,
    fontFamily: "Manrope_600SemiBold",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: border.subtle,
    opacity: 0.3,
  },

  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: typography.fontSize.caption,
    color: colors.text.secondary,
    fontStyle: "italic",
  },

  emailFormContainer: {
    marginTop: spacing.sm,
  },

  fieldContainer: {
    marginBottom: spacing.sm,
  },

  fieldError: {
    fontFamily: "Manrope_500Medium",
    fontSize: typography.fontSize.xs,
    color: colors.error.DEFAULT,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },

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

  signInButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },

  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },

  forgotPasswordText: {
    fontSize: typography.fontSize.caption,
    color: colors.primary.DEFAULT,
    fontFamily: "Manrope_500Medium",
  },

  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },

  footerText: {
    fontSize: typography.fontSize.body,
    color: colors.text.secondary,
  },

  footerLink: {
    fontSize: typography.fontSize.body,
    color: colors.primary.DEFAULT,
    fontFamily: "Manrope_500Medium",
  },
});
