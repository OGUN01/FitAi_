import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, borderRadius } from "../../../theme/aurora-tokens";

interface PaywallFeaturesListProps {
  features: string[];
  showFeatures: boolean;
  onToggle: () => void;
  getFeatureIcon: (feature: string) => string;
}

const PaywallFeaturesList: React.FC<PaywallFeaturesListProps> = ({
  features,
  showFeatures,
  onToggle,
  getFeatureIcon,
}) => {
  return (
    <View style={styles.featuresSection}>
      <Pressable onPress={onToggle} style={styles.featuresHeader}>
        <Text style={styles.featuresTitle}>Premium Features</Text>
        <Text style={styles.featuresToggle}>{showFeatures ? "⌃" : "⌄"}</Text>
      </Pressable>

      {showFeatures && (
        <View style={styles.featuresList}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{getFeatureIcon(feature)}</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  featuresSection: {
    padding: spacing.md,
    paddingTop: 0,
  },
  featuresHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
  },
  featuresToggle: {
    fontSize: 24,
    color: colors.text.secondary,
  },
  featuresList: {
    marginTop: spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: colors.text.secondary,
    flex: 1,
  },
});

export default PaywallFeaturesList;
