import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { usePaywall } from "../../hooks/usePaywall";
import { flatColors as colors } from "../../theme/aurora-tokens";
import { rf, rp, rh, rbr } from "../../utils/responsive";
import { getPaywallPrimaryLabel } from "../../utils/subscriptionUi";
import { useAuthStore } from "../../stores/authStore";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import AuroraSpinner from "../ui/aurora/AuroraSpinner";
import PlanCard from "./paywall/PlanCard";
import TrustRow from "./paywall/TrustRow";
import haptics from "../../utils/haptics";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  reason?: string;
}

const TIER_FEATURES: Record<string, string[]> = {
  free: [
    "10 AI generations per month",
    "10 AI food scans per day",
    "Basic progress tracking",
  ],
  basic: [
    "10 AI generations per day",
    "Unlimited AI food scans",
    "Basic analytics dashboard",
  ],
  pro: [
    "Unlimited AI generations",
    "Unlimited AI food scans",
    "Advanced analytics & insights",
    "Personalized AI coaching",
    "Priority support",
    "Export your data",
  ],
};

const PaywallModal: React.FC<PaywallModalProps> = ({
  visible,
  onClose,
  reason,
}) => {
  const {
    plans,
    currentPlan,
    isLoading,
    paywallReason,
    subscribe,
    dismiss,
    plansSource,
    planLoadError,
    planFeaturesByTier,
  } = usePaywall();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "yearly",
  );
  const [didAttemptLoad, setDidAttemptLoad] = useState(false);

  // Reset state every time the modal opens so there's no stale selection.
  // Default to "yearly" — the recommended best-value plan.
  useEffect(() => {
    if (visible) {
      setSelectedPlanId(null);
      setBillingCycle("yearly");
      setDidAttemptLoad(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && plans.length > 0) {
      setDidAttemptLoad(true);
    }
  }, [visible, plans]);

  const displayPlans = useMemo(() => {
    const basicPlan = plans.find(
      (p) => p.tier === "basic" && p.billing_cycle === "monthly",
    );
    const proPlan = plans.find(
      (p) => p.tier === "pro" && p.billing_cycle === billingCycle,
    );
    return [basicPlan, proPlan].filter(Boolean);
  }, [plans, billingCycle]);

  const effectiveSelectedId = useMemo(() => {
    if (selectedPlanId) return selectedPlanId;
    const proPlan = displayPlans.find((p) => p?.tier === "pro");
    return proPlan?.id ?? displayPlans[0]?.id ?? null;
  }, [selectedPlanId, displayPlans]);

  const selectedPlanData = plans.find((p) => p.id === effectiveSelectedId);
  const displayReason = reason ?? paywallReason;
  const isCurrentTier = (tier: string) => currentPlan?.tier === tier;
  const plansUnavailable = plansSource !== "server";
  const isInitialLoading = !didAttemptLoad && plansSource === "fallback";

  const yearlySavingsLabel = useMemo(() => {
    const monthlyPro = plans.find(
      (p) => p.tier === "pro" && p.billing_cycle === "monthly",
    );
    const yearlyPro = plans.find(
      (p) => p.tier === "pro" && p.billing_cycle === "yearly",
    );
    if (!monthlyPro || !yearlyPro) return null;
    const monthlyTotal = monthlyPro.price_monthly * 12;
    const yearlyTotal = yearlyPro.price_monthly * 12;
    const pct = Math.round(((monthlyTotal - yearlyTotal) / monthlyTotal) * 100);
    return pct > 0 ? `Save ${pct}%` : null;
  }, [plans]);

  const handleDismiss = () => {
    haptics.light();
    dismiss();
    onClose();
  };

  const handleSubscribe = async () => {
    if (!effectiveSelectedId) return;
    const success = await subscribe(effectiveSelectedId);
    if (success) {
      onClose();
    }
  };

  const subscribeLabel = getPaywallPrimaryLabel({
    plansUnavailable,
    isAuthenticated,
    selectedPlanPrice: selectedPlanData?.price_monthly,
    billingCycle: selectedPlanData?.billing_cycle,
  }).replace("INR ", "₹");

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* ── Aurora Header ─────────────────────────────── */}
          <LinearGradient
            colors={[
              colors.primaryTint,
              colors.backgroundSecondary,
            ]}
            locations={[0, 1]}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
              <View style={styles.heroRow}>
                <LinearGradient
                  colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.crownBadge}
                >
                  <Ionicons name="diamond" size={rf(26)} color={colors.white} />
                </LinearGradient>

                <View style={styles.headerTextWrap}>
                  <Text style={styles.headerTitle}>Go Premium</Text>
                  <Text style={styles.headerSubtitle}>
                    Unlock the full FitAI experience
                  </Text>
                </View>

                <Pressable
                  onPress={handleDismiss}
                  accessibilityRole="button"
                  accessibilityLabel="Close paywall"
                  accessibilityHint="Dismisses the subscription screen"
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={rf(18)} color={colors.textSecondary} />
                </Pressable>
              </View>

              {displayReason ? (
                <Animated.View entering={FadeIn.duration(200)} style={styles.reasonRow}>
                  <Ionicons name="lock-open-outline" size={rf(13)} color={colors.primaryLight} />
                  <Text style={styles.headerReason}>{displayReason}</Text>
                </Animated.View>
              ) : null}
            </View>
          </LinearGradient>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── Banners ─────────────────────────────────── */}
            {plansUnavailable && didAttemptLoad && (
              <Animated.View entering={FadeInUp.duration(250)} style={styles.warningBanner}>
                <Ionicons name="cloud-offline-outline" size={rf(18)} color={colors.errorLight} style={styles.bannerIcon} />
                <View style={styles.bannerTextWrap}>
                  <Text style={styles.warningBannerTitle}>Plans unavailable</Text>
                  <Text style={styles.warningBannerText}>
                    {planLoadError ??
                      "We couldn't load live pricing right now. Please try again in a moment."}
                  </Text>
                </View>
              </Animated.View>
            )}

            {!isAuthenticated && (
              <Animated.View entering={FadeInUp.duration(250)} style={styles.authBanner}>
                <Ionicons name="person-circle-outline" size={rf(18)} color={colors.blue} style={styles.bannerIcon} />
                <View style={styles.bannerTextWrap}>
                  <Text style={styles.authBannerTitle}>Sign in required</Text>
                  <Text style={styles.authBannerText}>
                    Compare plans freely — sign in only when you're ready to subscribe.
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* ── Billing Toggle ──────────────────────────── */}
            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => { haptics.selection(); setBillingCycle("monthly"); setSelectedPlanId(null); }}
                accessibilityRole="button"
                accessibilityLabel="Monthly billing"
                accessibilityState={{ selected: billingCycle === "monthly" }}
                style={[
                  styles.toggleBtn,
                  billingCycle === "monthly" && styles.toggleBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    billingCycle === "monthly" && styles.toggleTextActive,
                  ]}
                >
                  Monthly
                </Text>
              </Pressable>

              <Pressable
                onPress={() => { haptics.selection(); setBillingCycle("yearly"); setSelectedPlanId(null); }}
                accessibilityRole="button"
                accessibilityLabel="Yearly billing"
                accessibilityState={{ selected: billingCycle === "yearly" }}
                style={[
                  styles.toggleBtn,
                  billingCycle === "yearly" && styles.toggleBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    billingCycle === "yearly" && styles.toggleTextActive,
                  ]}
                >
                  Yearly
                </Text>
                {yearlySavingsLabel && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>{yearlySavingsLabel}</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* ── Plans Skeleton (initial load) ───────────── */}
            {isInitialLoading ? (
              <View style={styles.skeletonWrap} accessibilityLabel="Loading plans">
                <View style={[styles.skeletonCard, { height: rh(170) }]} />
                <View style={[styles.skeletonCard, { height: rh(190) }]} />
              </View>
            ) : (
              /* ── Plan Cards ────────────────────────────── */
              <View style={styles.plansList}>
                {/* Free tier (static) */}
                <PlanCard
                  key="free"
                  index={0}
                  isStatic
                  name="Free Plan"
                  pricePerMonth={0}
                  billingCycle="monthly"
                  features={planFeaturesByTier.free ?? TIER_FEATURES.free ?? []}
                  isSelected={false}
                  isCurrent={isCurrentTier("free")}
                  onSelect={() => {}}
                />

                {displayPlans.map((plan, i) => {
                  if (!plan) return null;
                  const isSelected = effectiveSelectedId === plan.id;
                  const isCurrent = isCurrentTier(plan.tier);
                  const features =
                    planFeaturesByTier[plan.tier] ??
                    TIER_FEATURES[plan.tier] ??
                    [];
                  const isPro = plan.tier === "pro";
                  const badgeLabel = isPro
                    ? billingCycle === "yearly" && yearlySavingsLabel
                      ? "BEST VALUE"
                      : "MOST POPULAR"
                    : undefined;

                  return (
                    <PlanCard
                      key={plan.id}
                      index={i + 1}
                      name={plan.name}
                      pricePerMonth={plan.price_monthly}
                      billingCycle={plan.billing_cycle}
                      features={features}
                      isSelected={isSelected}
                      isCurrent={isCurrent}
                      recommended={isPro && !isCurrent}
                      badgeLabel={isCurrent ? undefined : badgeLabel}
                      onSelect={() => { haptics.selection(); setSelectedPlanId(plan.id); }}
                    />
                  );
                })}
              </View>
            )}

            {/* ── Trust row ───────────────────────────────── */}
            {!isInitialLoading && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.trustWrap}>
                <TrustRow />
              </Animated.View>
            )}
          </ScrollView>

          {/* ── Bottom Actions ────────────────────────────── */}
          <View style={styles.actions}>
            <AnimatedPressable
              onPress={handleSubscribe}
              disabled={
                isLoading || !effectiveSelectedId || plansUnavailable || isInitialLoading
              }
              accessibilityRole="button"
              accessibilityLabel={subscribeLabel}
              accessibilityState={{
                disabled:
                  isLoading || !effectiveSelectedId || plansUnavailable || isInitialLoading,
                busy: isLoading,
              }}
              hapticType="medium"
              style={styles.subscribeShadowWrap}
            >
              <LinearGradient
                colors={
                  isLoading || !effectiveSelectedId || plansUnavailable || isInitialLoading
                    ? [colors.backgroundTertiary, colors.backgroundTertiary]
                    : [colors.primaryLight, colors.primary, colors.primaryDark]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.subscribeBtn}
              >
                {isLoading ? (
                  <View style={styles.subscribeLoadingRow}>
                    <AuroraSpinner size="sm" theme="white" customSize={rf(20)} />
                    <Text style={styles.subscribeBtnText}>Processing…</Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.subscribeBtnText,
                      (plansUnavailable || isInitialLoading) && styles.subscribeBtnTextMuted,
                    ]}
                  >
                    {subscribeLabel}
                  </Text>
                )}
              </LinearGradient>
            </AnimatedPressable>

            <Text style={styles.termsText}>
              Subscription auto-renews. Cancel anytime from account settings.{" "}
              Secure payments via Razorpay.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: rbr(24),
    borderTopRightRadius: rbr(24),
    maxHeight: rh(2208),
    minHeight: rh(420),
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.glassBorder,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  /* Header */
  headerGradient: {
    borderTopLeftRadius: rbr(24),
    borderTopRightRadius: rbr(24),
  },
  header: {
    paddingHorizontal: rp(16),
    paddingTop: rp(18),
    paddingBottom: rp(14),
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  crownBadge: {
    width: rp(52),
    height: rp(52),
    borderRadius: rbr(16),
    alignItems: "center",
    justifyContent: "center",
    marginRight: rp(12),
  },
  headerTextWrap: {
    flex: 1,
    marginRight: rp(8),
  },
  headerTitle: {
    fontSize: rf(24),
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: rf(13),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(6),
    marginTop: rp(10),
    backgroundColor: colors.primaryTint,
    borderRadius: rbr(8),
    paddingHorizontal: rp(8),
    paddingVertical: rp(6),
    alignSelf: "flex-start",
  },
  headerReason: {
    fontSize: rf(12),
    color: colors.primaryLight,
    fontWeight: "600",
    flexShrink: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Scroll */
  scrollArea: {
    flex: 1,
    minHeight: 200,
  },
  scrollContent: {
    paddingHorizontal: rp(16),
    paddingBottom: rp(12),
    paddingTop: rp(2),
  },

  /* Banners */
  bannerIcon: {
    marginRight: rp(10),
    marginTop: rp(1),
  },
  bannerTextWrap: {
    flex: 1,
  },
  warningBanner: {
    flexDirection: "row",
    marginTop: rp(14),
    padding: rp(12),
    borderRadius: rbr(12),
    backgroundColor: colors.errorTint,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.30)",
  },
  warningBannerTitle: {
    fontSize: rf(13),
    fontWeight: "700",
    color: colors.errorLight,
    marginBottom: rp(2),
  },
  warningBannerText: {
    fontSize: rf(12),
    lineHeight: rf(18),
    color: colors.textSecondary,
  },
  authBanner: {
    flexDirection: "row",
    marginTop: rp(14),
    padding: rp(12),
    borderRadius: rbr(12),
    backgroundColor: "rgba(59,130,246,0.10)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
  },
  authBannerTitle: {
    fontSize: rf(13),
    fontWeight: "700",
    color: colors.blue,
    marginBottom: rp(2),
  },
  authBannerText: {
    fontSize: rf(12),
    lineHeight: rf(18),
    color: colors.textSecondary,
  },

  /* Toggle */
  toggleRow: {
    flexDirection: "row",
    backgroundColor: colors.backgroundTertiary,
    borderRadius: rbr(12),
    padding: rp(4),
    marginTop: rp(16),
    marginBottom: rp(20),
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(10),
    borderRadius: rbr(8),
  },
  toggleBtnActive: {
    backgroundColor: colors.backgroundSecondary,
    boxShadow: "0px 1px 2px rgba(0,0,0,0.3)",
    elevation: 2,
  },
  toggleText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.text,
  },
  savingsBadge: {
    marginLeft: rp(6),
    backgroundColor: colors.successTint,
    borderRadius: rbr(4),
    paddingHorizontal: rp(6),
    paddingVertical: rp(2),
    borderWidth: 1,
    borderColor: colors.successTint,
  },
  savingsBadgeText: {
    fontSize: rf(11),
    fontWeight: "700",
    color: colors.successLight,
  },

  /* Plans */
  plansList: {
    gap: rp(14),
  },
  skeletonWrap: {
    gap: rp(14),
  },
  skeletonCard: {
    borderRadius: rbr(16),
    backgroundColor: colors.glassSurface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },

  /* Trust */
  trustWrap: {
    marginTop: rp(18),
  },

  /* Actions */
  actions: {
    paddingHorizontal: rp(16),
    paddingTop: rp(14),
    paddingBottom: rp(20),
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    backgroundColor: colors.backgroundSecondary,
  },
  subscribeShadowWrap: {
    borderRadius: rbr(14),
    overflow: "hidden",
    marginBottom: rp(10),
  },
  subscribeBtn: {
    borderRadius: rbr(14),
    paddingVertical: rp(16),
    alignItems: "center",
    justifyContent: "center",
  },
  subscribeLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(10),
  },
  subscribeBtnText: {
    color: colors.white,
    fontSize: rf(16),
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  subscribeBtnTextMuted: {
    color: colors.textMuted,
  },
  termsText: {
    fontSize: rf(11),
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: rf(16),
  },
});

export default PaywallModal;
