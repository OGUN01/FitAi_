import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { usePaywall } from "../../hooks/usePaywall";
import { colors, border } from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { rf, rp, rh, rbr } from "../../utils/responsive";
import { getPaywallPrimaryLabel, TIER_FEATURES } from "../../utils/subscriptionUi";
import { useAuthStore } from "../../stores/authStore";
import { GlassButton } from "../ui/aurora/GlassButton";
import { BottomSheet } from "../ui/aurora/BottomSheet";
import { SlidingSegmentedControl } from "../ui/aurora/SlidingSegmentedControl";
import { SkeletonLoader } from "../ui/aurora/SkeletonLoader";
import PlanCard from "./paywall/PlanCard";
import TrustRow from "./paywall/TrustRow";
import haptics from "../../utils/haptics";
import { useReducedMotion } from "../../utils/accessibility/hooks";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  reason?: string;
}

const PaywallModal: React.FC<PaywallModalProps> = ({
  visible,
  onClose,
  reason,
}) => {
  const reducedMotion = useReducedMotion();
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
    reloadPlans,
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
    // Mark the load as attempted when plans arrive OR when the fetch failed
    // (planLoadError set, plans empty) — otherwise the skeleton would spin
    // forever and the "Plans unavailable" banner would never show.
    if (visible && (plans.length > 0 || planLoadError != null)) {
      setDidAttemptLoad(true);
    }
  }, [visible, plans, planLoadError]);

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
  // Compares tier AND billing_cycle — a Pro-monthly subscriber must NOT see
  // the Pro-yearly card (which the modal defaults to) marked "Current Plan",
  // since that silently blocks the monthly→yearly upsell. Free has no
  // billing cycle, so tier alone is sufficient there.
  const isCurrentPlan = (tier: string, billingCycle?: string) => {
    if (!currentPlan || currentPlan.tier !== tier) return false;
    if (tier === "free") return true;
    return currentPlan.billing_cycle === billingCycle;
  };
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

  const selectedIsCurrentPlan = selectedPlanData
    ? isCurrentPlan(selectedPlanData.tier, selectedPlanData.billing_cycle)
    : false;

  const handleSubscribe = async () => {
    if (!effectiveSelectedId || selectedIsCurrentPlan) return;
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
    isCurrentPlan: selectedIsCurrentPlan,
  });

  return (
    <BottomSheet
      visible={visible}
      onClose={handleDismiss}
      showCloseButton={false}
      contentStyle={styles.content}
      testID="paywall-sheet"
    >
      {/* ── Aurora Header — custom (not BottomSheet's default title row) so
          the Manrope font/typography and the "Go Premium" visual identity
          are preserved, per the AdjustmentWizard.tsx pattern. ── */}
      <View style={styles.header}>
        <View style={styles.heroRow}>
          <View style={styles.crownBadge}>
            <Ionicons name="diamond" size={rf(26)} color={colors.primary.light} />
          </View>

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
            <Ionicons name="close" size={rf(18)} color={colors.text.secondary} />
          </Pressable>
        </View>

        {displayReason ? (
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(200)}
            style={styles.reasonRow}
          >
            <Ionicons name="lock-open-outline" size={rf(13)} color={colors.primary.light} />
            <Text style={styles.headerReason}>{displayReason}</Text>
          </Animated.View>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Banners ─────────────────────────────────── */}
        {plansUnavailable && didAttemptLoad && (
          <Animated.View
            entering={reducedMotion ? undefined : FadeInUp.duration(250)}
            style={styles.warningBanner}
          >
            <Ionicons name="cloud-offline-outline" size={rf(18)} color={colors.error.light} style={styles.bannerIcon} />
            <View style={styles.bannerTextWrap}>
              <Text style={styles.warningBannerTitle}>Plans unavailable</Text>
              <Text style={styles.warningBannerText}>
                {planLoadError ??
                  "We couldn't load live pricing right now. Please try again in a moment."}
              </Text>
              <Pressable
                onPress={() => { haptics.light(); reloadPlans(); }}
                accessibilityRole="button"
                accessibilityLabel="Retry loading plans"
                style={styles.bannerRetryBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.bannerRetryText}>Retry</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {!isAuthenticated && (
          <Animated.View
            entering={reducedMotion ? undefined : FadeInUp.duration(250)}
            style={styles.authBanner}
          >
            <Ionicons name="person-circle-outline" size={rf(18)} color={colors.info.DEFAULT} style={styles.bannerIcon} />
            <View style={styles.bannerTextWrap}>
              <Text style={styles.authBannerTitle}>Sign in required</Text>
              <Text style={styles.authBannerText}>
                Compare plans freely — sign in only when you're ready to subscribe.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ── Billing Toggle ──────────────────────────── */}
        <View style={styles.toggleWrap}>
          <SlidingSegmentedControl
            options={[
              { id: "monthly", label: "Monthly" },
              { id: "yearly", label: "Yearly" },
            ]}
            selectedId={billingCycle}
            onSelect={(id) => {
              setBillingCycle(id as "monthly" | "yearly");
              setSelectedPlanId(null);
            }}
            variant="flat"
            style={styles.toggleRow}
            testIDPrefix="paywall-billing-toggle"
          />
          {/* "Save X%" pill floats over the Yearly (right) segment — the
              shared control's options don't carry a child badge natively. */}
          {yearlySavingsLabel && (
            <View style={styles.savingsBadge} pointerEvents="none">
              <Text style={styles.savingsBadgeText}>{yearlySavingsLabel}</Text>
            </View>
          )}
        </View>

        {/* ── Plans Skeleton (initial load) ───────────── */}
        {isInitialLoading ? (
          <View style={styles.skeletonWrap} accessibilityLabel="Loading plans">
            <SkeletonLoader variant="card" height={rh(170)} borderRadius={rbr(16)} />
            <SkeletonLoader variant="card" height={rh(190)} borderRadius={rbr(16)} />
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
              isCurrent={isCurrentPlan("free")}
              onSelect={() => {}}
            />

            {displayPlans.map((plan, i) => {
              if (!plan) return null;
              const isSelected = effectiveSelectedId === plan.id;
              const isCurrent = isCurrentPlan(plan.tier, plan.billing_cycle);
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
                  monthlyOnly={billingCycle === "yearly" && plan.billing_cycle === "monthly"}
                  onSelect={() => { haptics.selection(); setSelectedPlanId(plan.id); }}
                />
              );
            })}
          </View>
        )}

        {/* ── Trust row ───────────────────────────────── */}
        {!isInitialLoading && (
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(300)}
            style={styles.trustWrap}
          >
            <TrustRow />
          </Animated.View>
        )}
      </ScrollView>

      {/* ── Bottom Actions ────────────────────────────── */}
      <View style={styles.actions}>
        <GlassButton
          label={subscribeLabel}
          onPress={handleSubscribe}
          variant="primary"
          fullWidth
          loading={isLoading}
          disabled={
            !effectiveSelectedId ||
            plansUnavailable ||
            isInitialLoading ||
            selectedIsCurrentPlan
          }
          accessibilityLabel={subscribeLabel}
          style={styles.subscribeBtn}
        />

        {/* Legal auto-renew disclosure only — the trust phrases
            (secure/cancel/auto-renew) are already shown by TrustRow. */}
        <Text style={styles.termsText}>
          Recurring billing: your subscription renews automatically each
          period until you cancel it from Profile → Subscription.
        </Text>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  // BottomSheet already supplies the sheet surface (GlassCard), backdrop
  // fade, drag-to-dismiss, and safe-area padding — this sheet's own
  // header/scrollArea/actions carry their own horizontal padding below, so
  // BottomSheet's default content padding is zeroed out here.
  content: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },

  /* Header */
  header: {
    paddingHorizontal: rp(16),
    paddingTop: rp(2),
    paddingBottom: rp(14),
    borderBottomWidth: 1,
    borderBottomColor: border.subtle,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Flat accent chip with hairline — replaces the gradient crown disc.
  crownBadge: {
    width: rp(52),
    height: rp(52),
    borderRadius: rbr(16),
    alignItems: "center",
    justifyContent: "center",
    marginRight: rp(12),
    backgroundColor: `${colors.primary.DEFAULT}1A`,
    borderWidth: 1,
    borderColor: `${colors.primary.DEFAULT}4D`,
  },
  headerTextWrap: {
    flex: 1,
    marginRight: rp(8),
  },
  headerTitle: {
    fontSize: rf(24),
    fontFamily: FONT_FAMILY.extrabold,
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: rf(13),
    color: colors.text.secondary,
    marginTop: rp(2),
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(6),
    marginTop: rp(10),
    backgroundColor: `${colors.primary.DEFAULT}1A`,
    borderRadius: rbr(8),
    paddingHorizontal: rp(8),
    paddingVertical: rp(6),
    alignSelf: "flex-start",
  },
  headerReason: {
    fontSize: rf(12),
    color: colors.primary.light,
    fontFamily: FONT_FAMILY.semibold,
    flexShrink: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Scroll */
  scrollArea: {
    flex: 1,
    minHeight: 200,
    // Explicit cap (mirrors SearchSheet.tsx's `list` style) so the scroll
    // region has a deterministic bound instead of depending on BottomSheet's
    // ancestor maxHeight propagating through an unconstrained flex chain —
    // this content is taller (banners + 2 plan cards + trust row) than the
    // other BottomSheet consumers audited alongside this one.
    maxHeight: rh(460),
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
    backgroundColor: `${colors.error.DEFAULT}26`,
    borderWidth: 1,
    borderColor: `${colors.error.DEFAULT}4D`,
  },
  warningBannerTitle: {
    fontSize: rf(13),
    fontFamily: FONT_FAMILY.bold,
    color: colors.error.light,
    marginBottom: rp(2),
  },
  warningBannerText: {
    fontSize: rf(12),
    lineHeight: rf(18),
    color: colors.text.secondary,
  },
  bannerRetryBtn: {
    marginTop: rp(8),
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
  },
  bannerRetryText: {
    fontSize: rf(13),
    fontFamily: FONT_FAMILY.bold,
    color: colors.primary.light,
  },
  // Governed info-token tint, not a freehand hardcoded Tailwind blue — see
  // DESIGN.md's semantic-color section (colors.info is the "Sign in
  // required" notice's correct token, same family as colors.info.DEFAULT
  // used for its icon/title below).
  authBanner: {
    flexDirection: "row",
    marginTop: rp(14),
    padding: rp(12),
    borderRadius: rbr(12),
    backgroundColor: `${colors.info.DEFAULT}1A`,
    borderWidth: 1,
    borderColor: `${colors.info.DEFAULT}40`,
  },
  authBannerTitle: {
    fontSize: rf(13),
    fontFamily: FONT_FAMILY.bold,
    color: colors.info.DEFAULT,
    marginBottom: rp(2),
  },
  authBannerText: {
    fontSize: rf(12),
    lineHeight: rf(18),
    color: colors.text.secondary,
  },

  /* Toggle */
  toggleWrap: {
    position: "relative",
    marginTop: rp(16),
    marginBottom: rp(20),
  },
  toggleRow: {
    width: "100%",
  },
  savingsBadge: {
    position: "absolute",
    top: -rp(8),
    right: rp(4),
    backgroundColor: `${colors.success.DEFAULT}26`,
    borderRadius: rbr(4),
    paddingHorizontal: rp(6),
    paddingVertical: rp(2),
    borderWidth: 1,
    borderColor: `${colors.success.DEFAULT}26`,
  },
  savingsBadgeText: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.bold,
    color: colors.success.light,
  },

  /* Plans */
  plansList: {
    gap: rp(14),
  },
  skeletonWrap: {
    gap: rp(14),
  },

  /* Trust */
  trustWrap: {
    marginTop: rp(18),
  },

  /* Actions */
  actions: {
    paddingHorizontal: rp(16),
    paddingTop: rp(14),
    paddingBottom: rp(6),
    borderTopWidth: 1,
    borderTopColor: border.subtle,
  },
  subscribeBtn: {
    marginBottom: rp(10),
  },
  termsText: {
    fontSize: rf(11),
    color: colors.text.tertiary,
    textAlign: "center",
    lineHeight: rf(16),
  },
});

export default PaywallModal;
