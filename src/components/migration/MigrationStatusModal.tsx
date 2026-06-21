import React from "react";
import { View, Text, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
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
              color={colors.primary}
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
    backgroundColor: colors.overlayDark,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    width: "100%",
    maxWidth: rw(400),
    shadowColor: colors.black,
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
    marginBottom: spacing.xl,
  },
  spinner: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(22),
  },
  progressContainer: {
    marginBottom: spacing.xl,
  },
  progressBar: {
    height: rh(8),
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.full,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    fontWeight: typography.fontWeight.medium,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.success || colors.primary,
    marginBottom: spacing.xs,
    textAlign: "center",
    fontWeight: typography.fontWeight.medium,
  },
  footerSubtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(16),
  },
});
