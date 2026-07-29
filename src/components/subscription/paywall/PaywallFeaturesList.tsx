import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors } from "../../../theme/aurora-tokens";
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
      <Pressable
        onPress={onToggle}
        style={styles.featuresHeader}
        accessibilityRole="button"
        accessibilityLabel={
          showFeatures
            ? "Hide premium features"
            : `Show ${features.length} premium features`
        }
        accessibilityState={{ expanded: showFeatures }}
      >
        <Text style={styles.featuresTitle}>Premium Features</Text>
        <Ionicons
          name={showFeatures ? "chevron-up" : "chevron-down"}
          size={rf(20)}
          color={colors.textSecondary}
        />
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
    paddingHorizontal: rp(16),
    paddingBottom: rp(12),
  },
  featuresHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: rp(12),
    minHeight: 44,
  },
  featuresTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.text,
  },
  featuresList: {
    marginTop: rp(4),
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
    color: colors.textSecondary,
    flex: 1,
    lineHeight: rf(20),
  },
});

export default PaywallFeaturesList;
