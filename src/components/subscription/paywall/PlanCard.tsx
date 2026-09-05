import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../ui/aurora/AnimatedPressable";
import { colors, surface, border } from "../../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../../theme/fonts";
import { radioA11yProps } from "../../../utils/accessibility/props";
import { formatINR } from "../../../utils/subscriptionUi";
import { rf, rp, rbr } from "../../../utils/responsive";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

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
  const reducedMotion = useReducedMotion();
  const a11yLabel =
    `${name}, ${formatINR(pricePerMonth)} per month` +
    (billingCycle === "yearly" ? `, billed ${formatINR(pricePerMonth * 12)} yearly` : "") +
    (isCurrent ? ", current plan" : "") +
    (recommended ? ", recommended" : "");

  const body = (
    <>
      {badgeLabel && !isCurrent && (
        <View style={styles.badgeWrap} pointerEvents="none">
          {/* Flat fill, not a gradient — DESIGN.md's de-gradient rule (a
              pricing-tier pill isn't a genuine brand moment). */}
          <View style={styles.badge}>
            <Ionicons name="star" size={rf(10)} color={colors.background.DEFAULT} />
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
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
            color={colors.text.tertiary}
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
              color={colors.success.light}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>{feat}</Text>
          </View>
        ))}
      </View>
    </>
  );

  const entering = reducedMotion ? undefined : FadeInDown.duration(350).delay(index * 80);

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
    borderColor: border.subtle,
    borderRadius: rbr(16),
    padding: rp(18),
    backgroundColor: surface[1],
    overflow: "visible",
  },
  cardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: `${colors.primary.DEFAULT}1A`,
  },
  cardCurrent: {
    borderColor: border.subtle,
    backgroundColor: surface[2],
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
    backgroundColor: colors.primary.DEFAULT,
  },
  badgeText: {
    fontFamily: FONT_FAMILY.extrabold,
    fontSize: rf(10),
    // Near-black on the solid accent fill — white-on-#FF6B35 fails WCAG
    // (~2.84:1); matches the GlassButton primary-variant label convention.
    color: colors.background.DEFAULT,
    letterSpacing: 0.6,
  },
  currentBadge: {
    position: "absolute",
    top: rp(-11),
    right: rp(14),
    backgroundColor: surface[2],
    borderRadius: rbr(10),
    paddingHorizontal: rp(10),
    paddingVertical: rp(4),
  },
  currentBadgeText: {
    fontFamily: FONT_FAMILY.extrabold,
    fontSize: rf(10),
    color: colors.text.primary,
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
    borderColor: colors.text.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: rp(10),
  },
  radioSelected: {
    borderColor: colors.primary.DEFAULT,
  },
  radioDot: {
    width: rp(10),
    height: rp(10),
    borderRadius: rbr(5),
    backgroundColor: colors.primary.DEFAULT,
  },
  includedIcon: {
    marginRight: rp(10),
  },
  planName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: rf(17),
    color: colors.text.primary,
    flexShrink: 1,
    marginRight: rp(8),
  },
  billedPill: {
    marginLeft: "auto",
    backgroundColor: `${colors.success.DEFAULT}26`,
    borderRadius: rbr(6),
    paddingHorizontal: rp(6),
    paddingVertical: rp(2),
  },
  billedPillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: rf(10),
    color: colors.success.light,
  },
  monthlyOnlyPill: {
    marginLeft: "auto",
    backgroundColor: surface[2],
    borderRadius: rbr(6),
    paddingHorizontal: rp(6),
    paddingVertical: rp(2),
  },
  monthlyOnlyPillText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: rf(10),
    color: colors.text.secondary,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: rp(10),
  },
  priceAmount: {
    fontFamily: FONT_FAMILY.extrabold,
    fontSize: rf(30),
    color: colors.text.primary,
  },
  pricePeriod: {
    fontSize: rf(14),
    color: colors.text.secondary,
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
    color: colors.text.secondary,
    flex: 1,
    lineHeight: rf(18),
  },
});

export default PlanCard;
