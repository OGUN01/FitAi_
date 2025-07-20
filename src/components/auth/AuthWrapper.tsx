import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useUser } from '../../hooks/useUser';
import { initializeBackend } from '../../utils/integration';

interface AuthWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

/**
 * Authentication wrapper component
 * Handles authentication state and initialization
 */
export const AuthWrapper: React.FC<AuthWrapperProps> = ({
  children,
  fallback,
  loadingComponent,
}) => {
  const { isAuthenticated, isInitialized, user } = useAuth();
  const { profile, getCompleteProfile } = useUser();

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
          <ActivityIndicator size="large" color="#ff6b35" />
          <Text style={styles.loadingText}>Initializing FitAI...</Text>
        </View>
      )
    );
  }

  // Show fallback if not authenticated
  if (!isAuthenticated) {
    return fallback || <AuthenticationScreen />;
  }

  // Show children if authenticated
  return <>{children}</>;
};

/**
 * Simple authentication screen placeholder
 * Replace with your actual login/register screens
 */
const AuthenticationScreen: React.FC = () => {
  return (
    <View style={styles.authContainer}>
      <Text style={styles.authTitle}>Welcome to FitAI</Text>
      <Text style={styles.authSubtitle}>Please log in to continue</Text>
      {/* Add your login/register components here */}
    </View>
  );
};

const styles = {
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#0a0f1c',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#0a0f1c',
    padding: 20,
  },
  authTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold' as const,
    marginBottom: 8,
  },
  authSubtitle: {
    color: '#8e9aaf',
    fontSize: 16,
    textAlign: 'center' as const,
  },
};

export default AuthWrapper;
