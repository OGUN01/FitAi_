import React from "react";
import { View, Text, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rh, rw } from '../../utils/responsive';


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
              color={ResponsiveTheme.colors.primary}
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
    backgroundColor: ResponsiveTheme.colors.overlayDark,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  container: {
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    paddingHorizontal: ResponsiveTheme.spacing.xl,
    paddingVertical: ResponsiveTheme.spacing.xxl,
    width: "100%",
    maxWidth: rw(400),
    shadowColor: ResponsiveTheme.colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  spinner: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  title: {
    fontSize: ResponsiveTheme.fontSize.xl,
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
  },
  progressContainer: {
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  progressBar: {
    height: rh(8),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.full,
    overflow: "hidden",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  progressText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.success || ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: "center",
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  footerSubtext: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(16),
  },
});
