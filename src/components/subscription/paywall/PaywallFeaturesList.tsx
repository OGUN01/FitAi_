import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rp } from "../../../utils/responsive";

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
    padding: rp(16),
    paddingTop: 0,
  },
  featuresHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: rp(12),
  },
  featuresTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  featuresToggle: {
    fontSize: rf(24),
    color: ResponsiveTheme.colors.textSecondary,
  },
  featuresList: {
    marginTop: rp(8),
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(8),
  },
  featureIcon: {
    fontSize: rf(20),
    marginRight: rp(12),
  },
  featureText: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    flex: 1,
  },
});

export default PaywallFeaturesList;
