import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, border } from "../../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../../theme/fonts";
import { rf, rp, rbr } from "../../../utils/responsive";

interface TrustItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const TrustItem: React.FC<TrustItemProps> = ({ icon, label }) => (
  <View style={styles.item}>
    <View style={styles.iconWrap}>
      <Ionicons name={icon} size={rf(13)} color={colors.success.light} />
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
  // Transparent, not another glass/surface fill — this row sits inside the
  // paywall's own BottomSheet surface already; a second background here
  // would be a nested card, which DESIGN.md's "max 1 surface depth" rule
  // bans. Dividers between items are the only separators.
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: `${colors.success.DEFAULT}26`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: rp(6),
  },
  label: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: rf(11),
    color: colors.text.secondary,
    flexShrink: 1,
  },
  divider: {
    width: 1,
    height: rp(14),
    backgroundColor: border.DEFAULT,
    marginHorizontal: rp(10),
  },
});

export default TrustRow;
