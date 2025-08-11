import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { THEME } from '../utils/constants';
import { rf, rp } from '../utils/responsive';
import { initializeBackend } from '../utils/integration';
import { googleAuthService } from '../services/googleAuth';
import { migrationService } from '../services/migrationService';

interface AsyncInitializerProps {
  children: React.ReactNode;
  onInitializationComplete: () => void;
}

export const AsyncInitializer: React.FC<AsyncInitializerProps> = ({
  children,
  onInitializationComplete,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      const startTime = Date.now();
      const TIMEOUT_MS = 10000; // 10 second timeout

      try {
        console.log('🚀 AsyncInitializer: Starting app initialization...');

        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Initialization timeout after 10s')), TIMEOUT_MS);
        });

        // Initialize with timeout
        await Promise.race([
          timeoutPromise,
          (async () => {
            try {
              // Initialize backend
              console.log('🔄 AsyncInitializer: Initializing backend...');
              await initializeBackend();
              console.log('✅ AsyncInitializer: Backend initialized');

              // Initialize Google Auth (skip if it fails)
              try {
                console.log('🔄 AsyncInitializer: Configuring Google Auth...');
                await googleAuthService.configure();
                console.log('✅ AsyncInitializer: Google Auth initialized');
              } catch (authError) {
                console.warn(
                  '⚠️ AsyncInitializer: Google Auth initialization failed (non-critical):',
                  authError
                );
              }

              // Run data migrations (skip if it fails)
              try {
                console.log('🔄 AsyncInitializer: Running migrations...');
                await migrationService.runMigrations();
                console.log('✅ AsyncInitializer: Migrations completed');
              } catch (migrationError) {
                console.warn(
                  '⚠️ AsyncInitializer: Migration failed (non-critical):',
                  migrationError
                );
              }
            } catch (error) {
              throw error;
            }
          })(),
        ]);

        const duration = Date.now() - startTime;
        console.log(
          `✅ AsyncInitializer: All initialization completed successfully in ${duration}ms`
        );
        setIsInitialized(true);
        onInitializationComplete();
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ AsyncInitializer: Initialization failed after ${duration}ms:`, error);
        setInitializationError(error instanceof Error ? error.message : 'Initialization failed');
        // Still mark as initialized to prevent infinite loading
        setIsInitialized(true);
        onInitializationComplete();
      }
    };

    initializeApp();
  }, [onInitializationComplete]);

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" backgroundColor={THEME.colors.background} />
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Initializing FitAI...</Text>
        {initializationError && (
          <Text style={styles.errorText}>Warning: {initializationError}</Text>
        )}
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
  },
  loadingText: {
    color: THEME.colors.text,
    fontSize: rf(16),
    marginTop: rp(16),
    fontWeight: THEME.fontWeight.medium,
  },
  errorText: {
    color: THEME.colors.error || '#ff6b6b',
    fontSize: rf(14),
    marginTop: rp(8),
    textAlign: 'center',
    paddingHorizontal: rp(20),
  },
});
