import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, borderRadius } from "../../../theme/aurora-tokens";

interface PaywallHeaderProps {
  title: string;
  description: string;
  onClose: () => void;
  trialInfo: { isEligible: boolean };
}

const PaywallHeader: React.FC<PaywallHeaderProps> = ({
  title,
  description,
  onClose,
  trialInfo,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerDescription}>{description}</Text>
        </View>

        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </Pressable>
      </View>

      {trialInfo.isEligible && (
        <View style={styles.trialBanner}>
          <Text style={styles.trialTitle}>🎁 Start your FREE trial today!</Text>
          <Text style={styles.trialDescription}>
            Try all premium features free for 7-14 days
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  headerDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.tertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.text.secondary,
  },
  trialBanner: {
    marginTop: spacing.md,
    padding: 12,
    backgroundColor: "rgba(255, 107, 53, 0.12)",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.3)",
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary.light,
    marginBottom: 4,
  },
  trialDescription: {
    fontSize: 14,
    color: colors.primary.DEFAULT,
  },
});

export default PaywallHeader;
