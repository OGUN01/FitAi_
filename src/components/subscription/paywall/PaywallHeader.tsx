import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors } from "../../../theme/aurora-tokens";
import { rf, rp, rbr } from "../../../utils/responsive";
import { headingA11yProps } from "../../../utils/accessibility/props";

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
        <View style={styles.headerText} {...headingA11yProps(title, 1)}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerDescription}>{description}</Text>
        </View>

        <Pressable
          onPress={onClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close paywall"
        >
          <Ionicons name="close" size={rf(20)} color={colors.textSecondary} />
        </Pressable>
      </View>

      {trialInfo.isEligible && (
        <LinearGradient
          colors={[colors.primaryTint, "rgba(255,107,53,0.04)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.trialBanner}
        >
          <Ionicons
            name="gift"
            size={rf(18)}
            color={colors.primaryLight}
            style={styles.trialIcon}
          />
          <View style={styles.trialTextWrap}>
            <Text style={styles.trialTitle}>Start your FREE trial today</Text>
            <Text style={styles.trialDescription}>
              Try all premium features free for 7–14 days
            </Text>
          </View>
        </LinearGradient>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: rp(16),
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
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
    fontWeight: "800",
    color: colors.text,
    marginBottom: rp(6),
  },
  headerDescription: {
    fontSize: rf(14),
    color: colors.textSecondary,
    lineHeight: rf(20),
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: rp(16),
    padding: rp(12),
    borderRadius: rbr(12),
    borderWidth: 1,
    borderColor: colors.primaryFaded,
  },
  trialIcon: {
    marginRight: rp(10),
  },
  trialTextWrap: {
    flex: 1,
  },
  trialTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: colors.primaryLight,
    marginBottom: rp(2),
  },
  trialDescription: {
    fontSize: rf(13),
    color: colors.primary,
  },
});

export default PaywallHeader;
