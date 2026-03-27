import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rp, rbr } from "../../../utils/responsive";

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

        <Pressable
          onPress={onClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close paywall"
        >
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
    padding: rp(16),
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.glassBorder,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerText: {
    flex: 1,
    marginRight: rp(16),
  },
  headerTitle: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(8),
  },
  headerDescription: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
  },
  closeButton: {
    width: Math.max(rp(32), 44),
    height: Math.max(rp(32), 44),
    borderRadius: Math.max(rbr(16), 22),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: rf(24),
    color: ResponsiveTheme.colors.textSecondary,
  },
  trialBanner: {
    marginTop: rp(16),
    padding: rp(12),
    backgroundColor: ResponsiveTheme.colors.primaryTint,
    borderRadius: rbr(8),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primaryFaded,
  },
  trialTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primaryLight,
    marginBottom: rp(4),
  },
  trialDescription: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.primary,
  },
});

export default PaywallHeader;
