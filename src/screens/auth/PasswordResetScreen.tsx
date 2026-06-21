/**
 * PasswordResetScreen — Supabase `type=recovery` landing screen.
 *
 * This screen is reached when a Supabase password-reset email deep link is
 * opened. In the PKCE flow (current Supabase default), the recovery link
 * embeds a `code` that Supabase's SDK exchanges automatically on app open —
 * by the time this screen mounts, `supabase.auth.getSession()` returns the
 * recovery session established by the link. The user then enters a new
 * password and we finalize with `supabase.auth.updateUser({ password })`.
 *
 * If no session exists when the screen mounts (link expired / already used
 * / opened on a device that didn't receive the code), we surface an
 * "invalid or expired" state with a path to request a new reset link rather
 * than silently failing on submit.
 *
 * Visual style mirrors WelcomeScreen (AuroraBackground space + SafeAreaView
 * + ScrollView + Input/PasswordInput/Button primitives). Reuses existing
 * UI components — no new design language.
 *
 * Ownership: this file is part of the deep-link password-reset flow. The
 * screen is rendered conditionally from App.tsx via a `passwordResetToken`
 * state flag driven by `useAuthDeepLinks`. Navigation back to login is done
 * via the `onBackToLogin` / `onRequestNewReset` props (App.tsx owns the
 * conditional render state, so it clears the flag).
 */

import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../services/supabase";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { Button, Input, PasswordInput } from "../../components/ui";
import { rf, rh, rw } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface PasswordResetScreenProps {
  /** Recovery token from the deep link, if any (diagnostic; not required for PKCE). */
  token?: string;
  /** Clear the password-reset overlay and return to the auth/welcome flow. */
  onBackToLogin: () => void;
  /** Navigate the user to the request-reset flow (e.g. reopen WelcomeScreen). */
  onRequestNewReset: () => void;
}

type ScreenState = "loading" | "ready" | "invalid" | "success";

const PASSWORD_MIN_LENGTH = 8;

/**
 * Real validation — no fake checks.
 * - min 8 chars
 * - at least one number OR symbol (non-letter)
 * - passwords match
 */
const validateNewPassword = (
  password: string,
  confirmPassword: string,
): { password?: string; confirmPassword?: string } => {
  const errors: { password?: string; confirmPassword?: string } = {};

  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`;
  } else if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    errors.password = "Password must include at least one number or symbol";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your new password";
  } else if (password && confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
};

export const PasswordResetScreen: React.FC<PasswordResetScreenProps> = ({
  token,
  onBackToLogin,
  onRequestNewReset,
}) => {
  const [state, setState] = useState<ScreenState>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref guard: the session-check effect only needs to run once on mount.
  // Without this, a re-render triggered by a parent state change (e.g. App.tsx
  // flipping the passwordResetToken flag) could re-trigger the async session
  // check and overwrite a settled state. CLAUDE.md #10.
  const sessionCheckedRef = useRef(false);

  useEffect(() => {
    if (sessionCheckedRef.current) return;
    sessionCheckedRef.current = true;

    let cancelled = false;
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (cancelled) return;

        // A session here means the recovery link's code was exchanged by the
        // SDK and the recovery session is active — we can update the password.
        if (error) {
          console.error("[PasswordResetScreen] getSession error:", error);
        }
        if (session) {
          setState("ready");
        } else {
          setState("invalid");
        }
      } catch (error) {
        if (cancelled) return;
        console.error("[PasswordResetScreen] Failed to read recovery session:", error);
        setState("invalid");
      }
    };

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (field: "password" | "confirmPassword", value: string) => {
    if (field === "password") {
      setPassword(value);
    } else {
      setConfirmPassword(value);
    }
    if (errors[field] || submitError) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      setSubmitError(null);
    }
  };

  const handleSubmit = async () => {
    const validationErrors = validateNewPassword(password, confirmPassword);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error("[PasswordResetScreen] updateUser failed:", error);
        setSubmitError(error.message || "Failed to update password. Please try again.");
        return;
      }

      setState("success");
    } catch (error) {
      console.error("[PasswordResetScreen] updateUser threw:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHeader = (title: string, subtitle: string, onBack?: () => void) => (
    <View style={styles.header}>
      {onBack && (
        <AnimatedPressable
          style={styles.backButton}
          onPress={onBack}
          scaleValue={0.97}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons
            name="arrow-back"
            size={rf(22)}
            color={ResponsiveTheme.colors.primary}
          />
        </AnimatedPressable>
      )}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );

  if (state === "loading") {
    return (
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
          <View style={styles.centeredState}>
            <Text style={styles.statusText}>Verifying your reset link…</Text>
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  if (state === "invalid") {
    return (
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderHeader(
              "Link Invalid or Expired",
              "This password reset link is no longer valid. Reset links can only be used once and expire after a short time.",
              onBackToLogin,
            )}
            <View style={styles.form}>
              <View style={styles.noticeCard}>
                <Ionicons
                  name="alert-circle-outline"
                  size={rf(40)}
                  color={ResponsiveTheme.colors.error}
                />
                <Text style={styles.noticeText}>
                  Please request a new password reset link to continue.
                </Text>
              </View>

              <Button
                title="Request New Reset Link"
                onPress={onRequestNewReset}
                variant="primary"
                size="lg"
                fullWidth
                style={styles.actionButton}
              />

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Remembered your password? </Text>
                <AnimatedPressable onPress={onBackToLogin} scaleValue={0.97}>
                  <Text style={styles.footerLink}>Back to Login</Text>
                </AnimatedPressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  if (state === "success") {
    return (
      <AuroraBackground theme="space" animated={true} intensity={0.3}>
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderHeader(
              "Password Updated",
              "Your password has been changed successfully. You can now sign in with your new password.",
            )}
            <View style={styles.form}>
              <View style={styles.noticeCard}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={rf(48)}
                  color={ResponsiveTheme.colors.primary}
                />
                <Text style={styles.noticeText}>
                  For your security, please sign in again with your new password.
                </Text>
              </View>

              <Button
                title="Back to Login"
                onPress={onBackToLogin}
                variant="primary"
                size="lg"
                fullWidth
                style={styles.actionButton}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  // state === "ready" — show the password reset form
  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderHeader(
            "Set a New Password",
            "Enter a new password for your FitAI account.",
            onBackToLogin,
          )}

          <View style={styles.form}>
            <View style={styles.emailFormContainer}>
              <PasswordInput
                label="New Password"
                placeholder="Enter your new password"
                value={password}
                onChangeText={(value) => updateField("password", value)}
                error={errors.password}
              />

              <PasswordInput
                label="Confirm New Password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChangeText={(value) => updateField("confirmPassword", value)}
                error={errors.confirmPassword}
              />

              {submitError && (
                <View style={styles.submitErrorContainer}>
                  <Ionicons
                    name="alert-circle"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.error}
                  />
                  <Text style={styles.submitErrorText}>{submitError}</Text>
                </View>
              )}

              <Button
                title="Update Password"
                onPress={handleSubmit}
                variant="primary"
                size="lg"
                fullWidth
                loading={isSubmitting}
                disabled={isSubmitting}
                style={styles.actionButton}
              />

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Link not working? </Text>
                <AnimatedPressable onPress={onRequestNewReset} scaleValue={0.97}>
                  <Text style={styles.footerLink}>Request a new one</Text>
                </AnimatedPressable>
              </View>
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

  centeredState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  statusText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  header: {
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

  titleBlock: {
    alignItems: "center",
    marginTop: rh(30),
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: "center",
  },

  subtitle: {
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

  emailFormContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  noticeCard: {
    alignItems: "center",
    backgroundColor: `${ResponsiveTheme.colors.surface}CC`,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.border}80`,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    paddingVertical: ResponsiveTheme.spacing.xl,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  noticeText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(22),
  },

  submitErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    backgroundColor: `${ResponsiveTheme.colors.error}15`,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.error}40`,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  submitErrorText: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.error,
    lineHeight: rf(18),
  },

  actionButton: {
    marginTop: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
    flexWrap: "wrap",
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
