import React from "react";
import { View, Text, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { THEME } from "../ui";

interface MigrationStatusModalProps {
  visible: boolean;
  progress?: {
    message: string;
    percentage?: number;
  };
  onComplete?: () => void;
}

export const MigrationStatusModal: React.FC<MigrationStatusModalProps> = ({
  visible,
  progress,
  onComplete,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <ActivityIndicator
              size="large"
              color={THEME.colors.primary}
              style={styles.spinner}
            />
            <Text style={styles.title}>Syncing Your Data</Text>
            <Text style={styles.subtitle}>
              {progress?.message ||
                "Migrating your profile data to your account..."}
            </Text>
          </View>

          {progress?.percentage !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress.percentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{progress.percentage}%</Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              🔒 Your data is being securely transferred
            </Text>
            <Text style={styles.footerSubtext}>
              This process ensures no data is lost during migration
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: THEME.spacing.lg,
  },
  container: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.xxl,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: THEME.spacing.xl,
  },
  spinner: {
    marginBottom: THEME.spacing.lg,
  },
  title: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  progressContainer: {
    marginBottom: THEME.spacing.xl,
  },
  progressBar: {
    height: 8,
    backgroundColor: THEME.colors.backgroundTertiary,
    borderRadius: THEME.borderRadius.full,
    overflow: "hidden",
    marginBottom: THEME.spacing.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.full,
  },
  progressText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    fontWeight: THEME.fontWeight.medium,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.success || THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
    textAlign: "center",
    fontWeight: THEME.fontWeight.medium,
  },
  footerSubtext: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    lineHeight: 16,
  },
});
