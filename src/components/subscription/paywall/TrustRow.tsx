import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors } from "../../../theme/aurora-tokens";
import { rf, rp, rbr } from "../../../utils/responsive";

interface TrustItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const TrustItem: React.FC<TrustItemProps> = ({ icon, label }) => (
  <View style={styles.item}>
    <View style={styles.iconWrap}>
      <Ionicons name={icon} size={rf(13)} color={colors.successLight} />
    </View>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const TrustRow: React.FC = () => {
  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel="Secure payments by Razorpay. Cancel anytime. Auto-renews."
    >
      <TrustItem icon="shield-checkmark" label="Secure · Razorpay" />
      <View style={styles.divider} />
      <TrustItem icon="close-circle-outline" label="Cancel anytime" />
      <View style={styles.divider} />
      <TrustItem icon="repeat" label="Auto-renews" />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glassSurface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: rbr(12),
    paddingVertical: rp(10),
    paddingHorizontal: rp(8),
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  iconWrap: {
    width: rp(22),
    height: rp(22),
    borderRadius: rbr(11),
    backgroundColor: colors.successTint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: rp(6),
  },
  label: {
    fontSize: rf(11),
    fontWeight: "600",
    color: colors.textSecondary,
    flexShrink: 1,
  },
  divider: {
    width: 1,
    height: rp(14),
    backgroundColor: colors.glassBorder,
    marginHorizontal: rp(10),
  },
});

export default TrustRow;
