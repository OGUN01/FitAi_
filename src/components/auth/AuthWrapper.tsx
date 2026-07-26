import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "../../hooks/useAuth";
import { useUserStore } from "../../stores/userStore";
import { initializeBackend } from "../../utils/integration";
import { rf, rp } from "../../utils/responsive";
import { THEME } from "../../utils/constants";
import { typography } from "../../theme/aurora-tokens";

interface AuthWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

/**
 * Authentication wrapper component
 * Handles authentication state and initialization.
 *
 * When the user is not authenticated and no `fallback` is provided, we render
 * a minimal loading-style placeholder rather than a dead "log in" UI: callers
 * are expected to pass an actual authentication screen via `fallback` (the
 * app's WelcomeScreen is the canonical auth entry). The placeholder is only a
 * fallback-of-the-fallback for misconfigured call sites.
 */
export const AuthWrapper: React.FC<AuthWrapperProps> = ({
  children,
  fallback,
  loadingComponent,
}) => {
  const { isAuthenticated, isInitialized, user } = useAuth();
  const profile = useUserStore((s) => s.profile);
  const getCompleteProfile = useUserStore((s) => s.getCompleteProfile);

  // Initialize backend on mount
  useEffect(() => {
    initializeBackend();
  }, []);

  // Load user profile when authenticated
  useEffect(() => {
    if (isAuthenticated && user && !profile) {
      getCompleteProfile(user.id);
    }
  }, [isAuthenticated, user, profile, getCompleteProfile]);

  // Show loading while initializing
  if (!isInitialized) {
    return (
      loadingComponent || (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Initializing FitAI...</Text>
        </View>
      )
    );
  }

  // Show fallback if not authenticated
  if (!isAuthenticated) {
    return fallback || <AuthenticationPlaceholder />;
  }

  // Show children if authenticated
  return <>{children}</>;
};

/**
 * Minimal placeholder shown only when a caller forgets to pass `fallback`.
 * This is intentionally NOT a real auth UI — it just tells the user to sign
 * in via the app's entry screen and avoids shipping a dead login form.
 */
const AuthenticationPlaceholder: React.FC = () => {
  return (
    <View style={styles.authContainer}>
      <ActivityIndicator size="large" color={THEME.colors.primary} />
      <Text style={styles.authTitle}>Welcome to FitAI</Text>
      <Text style={styles.authSubtitle}>Please sign in to continue.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.colors.background,
  },
  loadingText: {
    color: THEME.colors.text,
    marginTop: rp(16),
    fontSize: rf(16),
  },
  authContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.colors.background,
    padding: rp(20),
    gap: rp(8),
  },
  authTitle: {
    color: THEME.colors.text,
    fontSize: rf(32),
    fontWeight: typography.fontWeight.bold,
    marginTop: rp(16),
  },
  authSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: rf(16),
    textAlign: "center",
  },
});

export default AuthWrapper;
