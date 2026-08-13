/**
 * ForgotPasswordSheet — shared in-app "forgot password" flow.
 *
 * Single source of truth for the reset-password BottomSheet used by every
 * auth entry point (WelcomeScreen sign-in, GuestSignUpScreen sign-in).
 * Replaces the raw browser `window.prompt(...)` that used to run on web —
 * a native OS dialog that broke out of the Aurora glass/gradient design
 * language mid-flow — with a BottomSheet + UnderlineInput that matches the
 * rest of the system on both web and native.
 */

import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { BottomSheet } from "./BottomSheet";
import { GlassButton } from "./GlassButton";
import { UnderlineInput } from "../../onboarding/aurora/UnderlineInput";
import { colors, spacing, typography } from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";
import { crossPlatformAlert } from "../../../utils/crossPlatformAlert";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ForgotPasswordSheetProps {
  /** Controls visibility. */
  visible: boolean;
  /** Close handler (overlay tap, drag-dismiss, close button, or post-submit). */
  onClose: () => void;
  /** Pre-fill the email field with whatever's already in the caller's form. */
  initialEmail?: string;
  /** Reset-password call (from `useAuth()`). */
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

export const ForgotPasswordSheet: React.FC<ForgotPasswordSheetProps> = ({
  visible,
  onClose,
  initialEmail = "",
  resetPassword,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  // Re-seed with the caller's current email + clear stale errors each time
  // the sheet opens.
  useEffect(() => {
    if (visible) {
      setEmail(initialEmail);
      setError(null);
    }
  }, [visible, initialEmail]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (submitLockRef.current) return;

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Email is required");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setError(null);
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const result = await resetPassword(trimmedEmail.toLowerCase());
      onClose();
      crossPlatformAlert(
        result.success ? "Password Reset Email Sent" : "Reset Failed",
        result.success
          ? "Check your inbox for a link to reset your password."
          : result.error || "Unable to send reset email. Please try again.",
      );
    } catch (err) {
      crossPlatformAlert("Error", "Failed to send reset email. Please try again.");
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Reset Password"
      dismissOnDrag={!submitting}
      closeOnOverlayPress={!submitting}
    >
      <Text style={styles.subtitle}>
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </Text>
      <UnderlineInput
        label="Email Address"
        placeholder="Enter your email address"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (error) setError(null);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={() => {
          void handleSubmit();
        }}
        editable={!submitting}
        accentColor={error ? colors.error.DEFAULT : undefined}
        containerStyle={styles.fieldContainer}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      <GlassButton
        label="Send Reset Link"
        onPress={handleSubmit}
        variant="primary"
        fullWidth
        loading={submitting}
        disabled={submitting}
        style={styles.submitButton}
      />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  subtitle: {
    fontFamily: "Manrope_400Regular",
    fontSize: typography.fontSize.caption,
    color: colors.text.secondary,
    lineHeight: rf(20),
    marginBottom: spacing.md,
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
  submitButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
});

export default ForgotPasswordSheet;
