import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { Button, Input, PasswordInput, THEME } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { GoogleIcon } from "../../components/icons/GoogleIcon";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { LoginCredentials } from "../../types/user";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSignInSuccess: () => void;
}

type ViewMode = "welcome" | "signin";

const FEATURE_HIGHLIGHTS = [
  {
    emoji: "🤖",
    label: "AI-Powered Workouts",
    description: "Personalized plans that adapt to you",
  },
  {
    emoji: "🥗",
    label: "Smart Meal Planning",
    description: "Nutrition guidance built for your goals",
  },
  {
    emoji: "📊",
    label: "Track Your Progress",
    description: "Visualize gains and stay motivated",
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
  onSignInSuccess,
}) => {
  const [mode, setMode] = useState<ViewMode>("welcome");
  const [formData, setFormData] = useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [isLoading, setIsLoading] = useState(false);

  const { login, signInWithGoogle } = useAuth();

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
        password: formData.password.trim(),
      });

      if (result.success && result.user) {
        onSignInSuccess();
      } else {
        Alert.alert(
          "Sign In Failed",
          result.error || "Invalid email or password. Please try again.",
        );
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred during sign in.");
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
      } else {
        Alert.alert("Sign In Failed", response.error || "Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Google Sign In failed. Please try again.");
      console.error("Google Sign In error:", error);
    } finally {
      setIsLoading(false);
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
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.signInHeader}>
              <AnimatedPressable
                style={styles.backButton}
                onPress={switchToWelcome}
                scaleValue={0.97}
              >
                <Ionicons
                  name="arrow-back"
                  size={rf(22)}
                  color={ResponsiveTheme.colors.primary}
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
                  <Text style={styles.footerLink}>Get Started</Text>
                </AnimatedPressable>
              </View>
            </View>
          </ScrollView>
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
                  color={ResponsiveTheme.colors.primary}
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
                <Text style={styles.featureEmoji}>{feature.emoji}</Text>
                <View style={styles.featureTextBlock}>
                  <Text style={styles.featureLabel}>{feature.label}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={rf(16)}
                  color={`${ResponsiveTheme.colors.primary}80`}
                />
              </View>
            ))}
          </View>

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
          </View>
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

  scrollContent: {
    flexGrow: 1,
    paddingBottom: ResponsiveTheme.spacing.xl,
  },

  welcomeScrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: ResponsiveTheme.spacing.xl,
  },

  brandingSection: {
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: rh(40),
    paddingBottom: ResponsiveTheme.spacing.xl,
  },

  logoContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  logoIconWrapper: {
    width: rw(76),
    height: rw(76),
    borderRadius: rw(22),
    backgroundColor: `${ResponsiveTheme.colors.primary}18`,
    borderWidth: 1.5,
    borderColor: `${ResponsiveTheme.colors.primary}40`,
    alignItems: "center",
    justifyContent: "center",
  },

  appName: {
    fontSize: rf(52),
    fontWeight: ResponsiveTheme.fontWeight.extrabold,
    color: ResponsiveTheme.colors.text,
    letterSpacing: -1.5,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  tagline: {
    fontSize: rf(18),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.primary,
    textAlign: "center",
    letterSpacing: 0.3,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  taglineSecondary: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(22),
    maxWidth: rw(280),
  },

  featuresSection: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${ResponsiveTheme.colors.surface}CC`,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.border}80`,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.md,
  },

  featureEmoji: {
    fontSize: rf(26),
    width: rw(36),
    textAlign: "center",
  },

  featureTextBlock: {
    flex: 1,
  },

  featureLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(2),
  },

  featureDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },

  ctaSection: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.md,
  },

  signInPromptRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  signInHeader: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.lg,
    alignItems: "center",
  },

  backButton: {
    position: "absolute",
    left: ResponsiveTheme.spacing.lg,
    top: ResponsiveTheme.spacing.lg,
    zIndex: 1,
    padding: ResponsiveTheme.spacing.sm,
  },

  signInTitleBlock: {
    alignItems: "center",
    marginTop: rh(30),
  },

  signInTitle: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: "center",
  },

  signInSubtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(22),
    maxWidth: rw(280),
  },

  form: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
  },

  googleButton: {
    backgroundColor: "#4285F4",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
    elevation: 3,
    shadowColor: "#000",
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
    marginRight: ResponsiveTheme.spacing.sm,
  },

  googleButtonText: {
    color: "#FFFFFF",
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
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

  emailFormContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  signInButton: {
    marginTop: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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
});
