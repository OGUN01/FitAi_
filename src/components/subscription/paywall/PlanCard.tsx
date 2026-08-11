import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../ui/aurora/AnimatedPressable";
import { flatColors as colors } from "../../../theme/aurora-tokens";
import { radioA11yProps } from "../../../utils/accessibility/props";
import { formatINR } from "../../../utils/subscriptionUi";
import { rf, rp, rbr } from "../../../utils/responsive";

export interface PlanCardProps {
  name: string;
  pricePerMonth: number;
  billingCycle: "monthly" | "yearly";
  features: string[];
  isSelected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
  recommended?: boolean;
  badgeLabel?: string;
  index?: number;
  isStatic?: boolean;
  /** True when the Yearly tab is selected but this specific plan only has a
   * monthly billing option (e.g. Basic has no yearly Razorpay plan). Shows a
   * neutral pill so the toggle's partial effect is explained instead of the
   * card silently staying unchanged next to a re-priced sibling card. */
  monthlyOnly?: boolean;
}

/**
 * Feature-row icon, matched to what the copy actually says rather than
 * cycled by list position — a "5th item gets a leaf icon" mismatch reads as
 * templated on the highest-scrutiny paywall screen. Falls back to a generic
 * checkmark for anything that doesn't match a known keyword.
 */
const getFeatureIcon = (
  feature: string,
): keyof typeof Ionicons.glyphMap => {
  const f = feature.toLowerCase();
  if (f.includes("scan")) return "camera-outline";
  if (f.includes("coach")) return "person-outline";
  if (f.includes("support")) return "headset-outline";
  if (f.includes("export") || f.includes("data")) return "cloud-download-outline";
  if (f.includes("analytic") || f.includes("insight") || f.includes("dashboard")) return "analytics-outline";
  if (f.includes("ai ") || f.includes("generation")) return "flash-outline";
  return "checkmark-circle";
};

const PlanCard: React.FC<PlanCardProps> = ({
  name,
  pricePerMonth,
  billingCycle,
  features,
  isSelected,
  isCurrent,
  onSelect,
  recommended = false,
  badgeLabel,
  index = 0,
  isStatic = false,
  monthlyOnly = false,
}) => {
  const a11yLabel =
    `${name}, ${formatINR(pricePerMonth)} per month` +
    (billingCycle === "yearly" ? `, billed ${formatINR(pricePerMonth * 12)} yearly` : "") +
    (isCurrent ? ", current plan" : "") +
    (recommended ? ", recommended" : "");

  const body = (
    <>
      {badgeLabel && !isCurrent && (
        <View style={styles.badgeWrap} pointerEvents="none">
          <LinearGradient
            colors={[colors.primaryLight, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.badge}
          >
            <Ionicons name="star" size={rf(10)} color={colors.white} />
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </LinearGradient>
        </View>
      )}
      {isCurrent && (
        <View style={styles.currentBadge} pointerEvents="none">
          <Text style={styles.currentBadgeText}>Current Plan</Text>
        </View>
      )}

      <View style={styles.titleRow}>
        {isStatic ? (
          <Ionicons
            name="checkmark-circle"
            size={rf(20)}
            color={colors.textMuted}
            style={styles.includedIcon}
          />
        ) : (
          <View style={[styles.radio, isSelected && styles.radioSelected]}>
            {isSelected && <View style={styles.radioDot} />}
          </View>
        )}
        <Text style={styles.planName} numberOfLines={1}>
          {name}
        </Text>
        {billingCycle === "yearly" && (
          <View style={styles.billedPill}>
            <Text style={styles.billedPillText}>{formatINR(pricePerMonth * 12)}/yr billed</Text>
          </View>
        )}
        {monthlyOnly && billingCycle === "monthly" && (
          <View style={styles.monthlyOnlyPill}>
            <Text style={styles.monthlyOnlyPillText}>Monthly only</Text>
          </View>
        )}
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.priceAmount}>{formatINR(pricePerMonth)}</Text>
        <Text style={styles.pricePeriod}>/month</Text>
      </View>

      <View style={styles.featureList}>
        {features.map((feat, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons
              name={getFeatureIcon(feat)}
              size={rf(14)}
              color={colors.successLight}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>{feat}</Text>
          </View>
        ))}
      </View>
    </>
  );

  const entering = FadeInDown.duration(350).delay(index * 80);

  if (isStatic) {
    return (
      <Animated.View
        entering={entering}
        style={[styles.card, isCurrent && styles.cardCurrent]}
        {...radioA11yProps(a11yLabel, isSelected, isCurrent)}
      >
        {body}
      </Animated.View>
    );
  }

  return (
    <AnimatedPressable
      onPress={onSelect}
      disabled={isCurrent}
      hapticType="selection"
      style={[styles.card, isSelected && styles.cardSelected, isCurrent && styles.cardCurrent]}
      {...radioA11yProps(a11yLabel, isSelected, isCurrent)}
    >
      {body}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: rbr(16),
    padding: rp(18),
    backgroundColor: colors.backgroundSecondary,
    overflow: "visible",
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  cardCurrent: {
    borderColor: colors.glassSurface,
    backgroundColor: colors.backgroundTertiary,
    opacity: 0.7,
  },
  badgeWrap: {
    position: "absolute",
    top: rp(-11),
    right: rp(14),
    borderRadius: rbr(10),
    overflow: "hidden",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
    paddingHorizontal: rp(10),
    paddingVertical: rp(4),
    borderRadius: rbr(10),
  },
  badgeText: {
    fontSize: rf(10),
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.6,
  },
  currentBadge: {
    position: "absolute",
    top: rp(-11),
    right: rp(14),
    backgroundColor: colors.textMuted,
    borderRadius: rbr(10),
    paddingHorizontal: rp(10),
    paddingVertical: rp(4),
  },
  currentBadgeText: {
    fontSize: rf(10),
    fontWeight: "800",
    color: colors.text,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(8),
  },
  radio: {
    width: rp(20),
    height: rp(20),
    borderRadius: rbr(10),
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: rp(10),
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: rp(10),
    height: rp(10),
    borderRadius: rbr(5),
    backgroundColor: colors.primary,
  },
  includedIcon: {
    marginRight: rp(10),
  },
  planName: {
    fontSize: rf(17),
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
    marginRight: rp(8),
  },
  billedPill: {
    marginLeft: "auto",
    backgroundColor: colors.successTint,
    borderRadius: rbr(6),
    paddingHorizontal: rp(6),
    paddingVertical: rp(2),
  },
  billedPillText: {
    fontSize: rf(10),
    fontWeight: "700",
    color: colors.successLight,
  },
  monthlyOnlyPill: {
    marginLeft: "auto",
    backgroundColor: colors.backgroundTertiary,
    borderRadius: rbr(6),
    paddingHorizontal: rp(6),
    paddingVertical: rp(2),
  },
  monthlyOnlyPillText: {
    fontSize: rf(10),
    fontWeight: "700",
    color: colors.textSecondary,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: rp(10),
  },
  priceAmount: {
    fontSize: rf(30),
    fontWeight: "800",
    color: colors.text,
  },
  pricePeriod: {
    fontSize: rf(14),
    color: colors.textSecondary,
    marginLeft: rp(3),
  },
  featureList: {
    marginTop: rp(4),
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(6),
  },
  featureIcon: {
    marginRight: rp(8),
    width: rp(18),
  },
  featureText: {
    fontSize: rf(13),
    color: colors.textSecondary,
    flex: 1,
    lineHeight: rf(18),
  },
});

export default PlanCard;
