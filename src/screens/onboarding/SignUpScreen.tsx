import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { Button, Input, PasswordInput, THEME } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { RegisterCredentials } from "../../types/user";
import { migrationManager } from "../../services/migrationManager";
import { dataBridge } from "../../services/DataBridge";
import { GoogleIcon } from "../../components/icons/GoogleIcon";

interface SignUpScreenProps {
  onSignUpSuccess: () => void;
  onBack: () => void;
  onLogin: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onSignUpSuccess,
  onBack,
  onLogin,
}) => {
  const [formData, setFormData] = useState<RegisterCredentials>({
    email: "",
    password: "",
    confirmPassword: "",
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

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Check if there's local guest data before registering
      const hasLocalData = await dataBridge.hasLocalData();
      console.log("🔍 SignUpScreen: Local data check result:", hasLocalData);

      // Ensure we trim and normalize the credentials before sending
      const trimmedCredentials = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
        confirmPassword: formData.confirmPassword.trim(),
      };
      console.log("🔐 SignUpScreen: Using credentials:", {
        email: trimmedCredentials.email,
      });
      const result = await register(trimmedCredentials);

      if (result.success) {
        const alertTitle = "Registration Successful!";
        let alertMessage =
          "Please check your email and click the verification link to activate your account. After verification, you can log in to continue.";

        // If there's local data, mention it will be preserved
        if (hasLocalData) {
          alertMessage +=
            "\n\nYour profile data will be automatically synced when you log in.";
          console.log(
            "✅ SignUpScreen: User has local data - will trigger migration on login",
          );
        }

        Alert.alert(alertTitle, alertMessage, [
          {
            text: "OK",
            onPress: () => {
              // After user acknowledges the message, redirect to login screen
              onSignUpSuccess();
            },
          },
        ]);
      } else {
        Alert.alert("Registration Failed", result.error || "Please try again");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);

    try {
      // Check if there's local guest data before Google sign-up
      const hasLocalData = await dataBridge.hasLocalData();
      console.log(
        "🔍 SignUpScreen: Google sign-up - Local data check result:",
        hasLocalData,
      );

      const response = await signInWithGoogle();

      if (response.success) {
        // Google sign-up is immediate (no email verification)
        let alertMessage = "Welcome to FitAI! Let's set up your profile.";

        if (hasLocalData) {
          alertMessage =
            "Welcome to FitAI! Your profile data will be automatically synced. Let's set up your profile.";
          console.log(
            "✅ SignUpScreen: Google user has local data - will trigger migration",
          );
        }

        Alert.alert("Google Sign-Up Successful!", alertMessage, [
          { text: "Continue", onPress: onSignUpSuccess },
        ]);
      } else {
        Alert.alert(
          "Google Sign-Up Failed",
          response.error || "Please try again.",
        );
      }
    } catch (error) {
      Alert.alert("Error", "Google Sign-Up failed. Please try again.");
      console.error("Google Sign-Up error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Join FitAI</Text>
          <Text style={styles.subtitle}>
            Start your personalized fitness journey today
          </Text>
        </View>

        <View style={styles.form}>
          {/* Google Sign-Up as Primary */}
          <TouchableOpacity
            style={[
              styles.googlePrimaryButton,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleGoogleSignUp}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <View style={styles.googleButtonContent}>
              <GoogleIcon size={20} style={styles.googleIcon} />
              <Text style={styles.googlePrimaryText}>Continue with Google</Text>
            </View>
            <Text style={styles.googleSubtext}>
              Instant access • No email verification
            </Text>
          </TouchableOpacity>

          <View style={styles.benefitsContainer}>
            <View style={styles.benefitRow}>
              <Ionicons
                name="checkmark-circle"
                size={rf(16)}
                color={ResponsiveTheme.colors.success}
              />
              <Text style={styles.benefitText}>One-click sign up</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons
                name="checkmark-circle"
                size={rf(16)}
                color={ResponsiveTheme.colors.success}
              />
              <Text style={styles.benefitText}>No password to remember</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons
                name="checkmark-circle"
                size={rf(16)}
                color={ResponsiveTheme.colors.success}
              />
              <Text style={styles.benefitText}>Start immediately</Text>
            </View>
          </View>

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
              onChangeText={(value) => updateField("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <PasswordInput
              label="Password"
              placeholder="Create a strong password"
              value={formData.password}
              onChangeText={(value) => updateField("password", value)}
              error={errors.password}
            />

            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(value) => updateField("confirmPassword", value)}
              error={errors.confirmPassword}
            />

            <Button
              title="Create Account with Email"
              onPress={handleSignUp}
              variant="outline"
              size="lg"
              fullWidth
              loading={isLoading}
              style={styles.emailSignUpButton}
            />

            <Text style={styles.emailNote}>Requires email verification</Text>
          </View>

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
    alignItems: "center",
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingBottom: ResponsiveTheme.spacing.lg,
  },

  title: {
    fontSize: rf(28),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: "center",
  },

  subtitle: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(24),
  },

  form: {
    paddingVertical: ResponsiveTheme.spacing.lg,
  },

  // Google Primary Button Styles
  googlePrimaryButton: {
    backgroundColor: "#4285F4",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
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

  // Benefits Section
  benefitsContainer: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  checkmark: {
    color: "#34A853",
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    marginRight: ResponsiveTheme.spacing.sm,
  },

  benefitText: {
    color: ResponsiveTheme.colors.textSecondary,
    fontSize: ResponsiveTheme.fontSize.sm,
  },

  // Email Form Styles
  emailFormContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  emailSignUpButton: {
    marginTop: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.sm,
    borderColor: ResponsiveTheme.colors.border,
  },

  emailNote: {
    textAlign: "center",
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontStyle: "italic",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: ResponsiveTheme.spacing.lg,
  },

  dividerLine: {
    flex: 1,
    height: rh(1),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    opacity: 0.3,
  },

  dividerText: {
    color: ResponsiveTheme.colors.textMuted,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    fontSize: rf(13),
    fontStyle: "italic",
  },

  loginButton: {
    marginTop: ResponsiveTheme.spacing.lg,
  },

  footer: {
    padding: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.md,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingHorizontal: ResponsiveTheme.spacing.xl,
  },
});
