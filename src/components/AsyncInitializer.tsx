import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ResponsiveTheme } from "../utils/constants";
import { rf, rp } from "../utils/responsive";
import { initializeBackend } from "../utils/integration";
import { googleAuthService } from "../services/googleAuth";
import { migrationService } from "../services/migrationService";

interface AsyncInitializerProps {
  children: React.ReactNode;
  onInitializationComplete: () => void;
}

export const AsyncInitializer: React.FC<AsyncInitializerProps> = ({
  children,
  onInitializationComplete,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      const startTime = Date.now();
      const TIMEOUT_MS = 10000; // 10 second timeout

      try {

        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Initialization timeout after 10s")),
            TIMEOUT_MS,
          );
        });

        // Initialize with timeout
        await Promise.race([
          timeoutPromise,
          (async () => {
            try {
              // Initialize backend
              await initializeBackend();

              // Initialize Google Auth (skip if it fails)
              try {
                await googleAuthService.configure();
              } catch (authError) {
              }

              // Run data migrations (skip if it fails)
              try {
                await migrationService.runMigrations();
              } catch (migrationError) {
              }
            } catch (error) {
              throw error;
            }
          })(),
        ]);

        if (!mounted) return;

        const duration = Date.now() - startTime;
        setIsInitialized(true);
        onInitializationComplete();
      } catch (error) {
        if (!mounted) return;

        const duration = Date.now() - startTime;
        console.error(
          `❌ AsyncInitializer: Initialization failed after ${duration}ms:`,
          error,
        );
        setInitializationError(
          error instanceof Error ? error.message : "Initialization failed",
        );
        // Still mark as initialized to prevent infinite loading
        setIsInitialized(true);
        onInitializationComplete();
      }
    };

    initializeApp().catch((error) => {
      console.error(
        "[AsyncInitializer] Unhandled initialization error:",
        error,
      );
    });

    return () => {
      mounted = false;
    };
  }, [onInitializationComplete]);

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={ResponsiveTheme.colors.primary} />
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.background,
  },
  loadingText: {
    color: ResponsiveTheme.colors.text,
    fontSize: rf(16),
    marginTop: rp(16),
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  errorText: {
    color: ResponsiveTheme.colors.error || "#ff6b6b",
    fontSize: rf(14),
    marginTop: rp(8),
    textAlign: "center",
    paddingHorizontal: rp(20),
  },
});
