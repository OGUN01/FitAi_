import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { usePaywall } from "../../hooks/usePaywall";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr } from "../../utils/responsive";
import { useAuthStore } from "../../stores/authStore";

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
  } = usePaywall();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );

  // Reset state every time the modal opens so there's no stale selection
  useEffect(() => {
    if (visible) {
      setSelectedPlanId(null);
      setBillingCycle("monthly");
    }
  }, [visible]);

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

  const handleDismiss = () => {
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

  const formatPrice = (priceMonthly: number, cycle: string) => {
    if (cycle === "yearly") {
      return `₹${priceMonthly * 12}/yr`;
    }
    return `₹${priceMonthly}/mo`;
  };

  const getYearlySavingsLabel = () => {
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
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* ── Header ─────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Choose Your Plan</Text>
                {displayReason ? (
                  <Text style={styles.headerReason}>{displayReason}</Text>
                ) : (
                  <Text style={styles.headerDesc}>
                    Unlock premium features and supercharge your fitness journey
                  </Text>
                )}
              </View>

              <Pressable onPress={handleDismiss} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── Billing Toggle (Monthly / Yearly) ───────── */}
            {plansUnavailable && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningBannerTitle}>Plans unavailable</Text>
                <Text style={styles.warningBannerText}>
                  {planLoadError ??
                    "We couldn't load live pricing right now. Please try again in a moment."}
                </Text>
              </View>
            )}

            {!isAuthenticated && (
              <View style={styles.authBanner}>
                <Text style={styles.authBannerTitle}>Sign in required</Text>
                <Text style={styles.authBannerText}>
                  You can compare plans here, but you need to sign in before starting a subscription.
                </Text>
              </View>
            )}

            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => { setBillingCycle("monthly"); setSelectedPlanId(null); }}
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
                onPress={() => { setBillingCycle("yearly"); setSelectedPlanId(null); }}
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
                {getYearlySavingsLabel() && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>
                      {getYearlySavingsLabel()}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* ── Plan Cards ──────────────────────────────── */}
            <View style={styles.plansList}>
              {/* Free Tier Card (static, always shown) */}
              <View
                style={[
                  styles.planCard,
                  isCurrentTier("free") && styles.planCardCurrent,
                ]}
              >
                {isCurrentTier("free") && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current Plan</Text>
                  </View>
                )}
                <Text style={styles.planName}>Free Plan</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceAmount}>₹0</Text>
                  <Text style={styles.pricePeriod}>/mo</Text>
                </View>
                <View style={styles.featureList}>
                  {(TIER_FEATURES.free ?? []).map((feat, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Text style={styles.featureCheck}>✓</Text>
                      <Text style={styles.featureText}>{feat}</Text>
                    </View>
                  ))}
                </View>
              </View>
              {displayPlans.map((plan) => {
                if (!plan) return null;
                const isSelected = effectiveSelectedId === plan.id;
                const isCurrent = isCurrentTier(plan.tier);
                const features = TIER_FEATURES[plan.tier] ?? [];

                return (
                  <Pressable
                    key={plan.id}
                    onPress={() => setSelectedPlanId(plan.id)}
                    disabled={isCurrent}
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardSelected,
                      isCurrent && styles.planCardCurrent,
                    ]}
                  >
                    {/* Badges */}
                    {plan.tier === "pro" && !isCurrent && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>
                          MOST POPULAR
                        </Text>
                      </View>
                    )}
                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>
                          Current Plan
                        </Text>
                      </View>
                    )}

                    <Text style={styles.planName}>{plan.name}</Text>

                    <View style={styles.priceRow}>
                      <Text style={styles.priceAmount}>
                        ₹{plan.price_monthly}
                      </Text>
                      <Text style={styles.pricePeriod}>/mo</Text>
                    </View>

                    {plan.billing_cycle === "yearly" && (
                      <Text style={styles.billedLabel}>
                        Billed ₹{plan.price_monthly * 12}/year
                      </Text>
                    )}

                    {/* Feature list */}
                    <View style={styles.featureList}>
                      {features.map((feat, i) => (
                        <View key={i} style={styles.featureRow}>
                          <Text style={styles.featureCheck}>✓</Text>
                          <Text style={styles.featureText}>{feat}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Selection ring */}
                    {isSelected && !isCurrent && (
                      <View style={styles.selectRing}>
                        <View style={styles.selectDot} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* ── Bottom Actions ────────────────────────────── */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleSubscribe}
              disabled={isLoading || !effectiveSelectedId || plansUnavailable}
              style={[
                styles.subscribeBtn,
                (isLoading || !effectiveSelectedId || plansUnavailable) &&
                  styles.subscribeBtnDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={ResponsiveTheme.colors.text} />
              ) : (
                <Text style={styles.subscribeBtnText}>
                  {plansUnavailable
                    ? "Plans unavailable"
                    : !isAuthenticated
                      ? "Sign in to subscribe"
                      : selectedPlanData
                    ? `Subscribe — ${formatPrice(selectedPlanData.price_monthly, selectedPlanData.billing_cycle)}`
                    : "Select a Plan"}
                </Text>
              )}
            </Pressable>

            <View style={styles.termsWrap}>
              <Text style={styles.termsText}>
                Subscription automatically renews. Cancel anytime from your
                account settings. Powered by Razorpay.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.overlayDark,
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderTopLeftRadius: rbr(24),
    borderTopRightRadius: rbr(24),
    maxHeight: "92%",
    minHeight: 420,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: ResponsiveTheme.colors.glassBorder,
    // Ensure flex column so ScrollView stretches between header and actions
    display: "flex",
    flexDirection: "column",
  },

  header: {
    paddingHorizontal: rp(16),
    paddingTop: rp(16),
    paddingBottom: rp(16),
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.glassBorder,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTextWrap: {
    flex: 1,
    marginRight: rp(12),
  },
  headerTitle: {
    fontSize: rf(22),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(6),
  },
  headerDesc: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
  },
  headerReason: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.errorLight,
    lineHeight: rf(20),
    fontWeight: "500",
  },
  closeBtn: {
    width: rp(32),
    height: rp(32),
    borderRadius: rbr(16),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "600",
  },

  scrollArea: {
    flex: 1,
    // On web, flex:1 inside a modal can collapse — provide a minimum so cards are always visible
    minHeight: 200,
  },

  scrollContent: {
    paddingHorizontal: rp(16),
    paddingBottom: rp(8),
  },
  warningBanner: {
    marginTop: rp(16),
    marginBottom: rp(8),
    padding: rp(12),
    borderRadius: rbr(12),
    backgroundColor: "rgba(239,68,68,0.10)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.30)",
  },
  warningBannerTitle: {
    fontSize: rf(13),
    fontWeight: "700",
    color: ResponsiveTheme.colors.errorLight,
    marginBottom: rp(4),
  },
  warningBannerText: {
    fontSize: rf(12),
    lineHeight: rf(18),
    color: ResponsiveTheme.colors.textSecondary,
  },
  authBanner: {
    marginBottom: rp(8),
    padding: rp(12),
    borderRadius: rbr(12),
    backgroundColor: "rgba(59,130,246,0.10)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
  },
  authBannerTitle: {
    fontSize: rf(13),
    fontWeight: "700",
    color: ResponsiveTheme.colors.primaryLight,
    marginBottom: rp(4),
  },
  authBannerText: {
    fontSize: rf(12),
    lineHeight: rf(18),
    color: ResponsiveTheme.colors.textSecondary,
  },

  toggleRow: {
    flexDirection: "row",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
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
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.3)',
    elevation: 2,
  },
  toggleText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
  },
  toggleTextActive: {
    color: ResponsiveTheme.colors.text,
  },
  savingsBadge: {
    marginLeft: rp(6),
    backgroundColor: ResponsiveTheme.colors.successTint,
    borderRadius: rbr(4),
    paddingHorizontal: rp(6),
    paddingVertical: rp(2),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.successTint,
  },
  savingsBadgeText: {
    fontSize: rf(11),
    fontWeight: "700",
    color: ResponsiveTheme.colors.successLight,
  },

  plansList: {
    gap: rp(14),
  },
  planCard: {
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassHighlight,
    borderRadius: rbr(16),
    padding: rp(18),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    position: "relative",
  },
  planCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: ResponsiveTheme.colors.primaryTint,
  },
  planCardCurrent: {
    borderColor: ResponsiveTheme.colors.glassSurface,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    opacity: 0.7,
  },

  popularBadge: {
    position: "absolute",
    top: rp(-10),
    right: rp(16),
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(8),
    paddingHorizontal: rp(10),
    paddingVertical: rp(3),
  },
  popularBadgeText: {
    fontSize: rf(10),
    fontWeight: "800",
    color: ResponsiveTheme.colors.text,
    letterSpacing: 0.5,
  },
  currentBadge: {
    position: "absolute",
    top: rp(-10),
    right: rp(16),
    backgroundColor: ResponsiveTheme.colors.textMuted,
    borderRadius: rbr(8),
    paddingHorizontal: rp(10),
    paddingVertical: rp(3),
  },
  currentBadgeText: {
    fontSize: rf(10),
    fontWeight: "800",
    color: ResponsiveTheme.colors.text,
  },

  planName: {
    fontSize: rf(18),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(8),
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: rp(4),
  },
  priceAmount: {
    fontSize: rf(28),
    fontWeight: "800",
    color: ResponsiveTheme.colors.text,
  },
  pricePeriod: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    marginLeft: rp(2),
  },
  billedLabel: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(4),
  },

  featureList: {
    marginTop: rp(12),
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(6),
  },
  featureCheck: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.success,
    fontWeight: "700",
    marginRight: rp(8),
    width: rp(18),
  },
  featureText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    flex: 1,
  },

  selectRing: {
    position: "absolute",
    top: rp(18),
    left: rp(18),
    width: rp(22),
    height: rp(22),
    borderRadius: rbr(11),
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  selectDot: {
    width: rp(12),
    height: rp(12),
    borderRadius: rbr(6),
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  actions: {
    paddingHorizontal: rp(16),
    paddingTop: rp(16),
    paddingBottom: rp(24),
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.glassBorder,
  },
  subscribeBtn: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(12),
    paddingVertical: rp(16),
    alignItems: "center",
    marginBottom: rp(12),
  },
  subscribeBtnDisabled: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    opacity: 0.6,
  },
  subscribeBtnText: {
    color: ResponsiveTheme.colors.text,
    fontSize: rf(16),
    fontWeight: "700",
  },
  termsWrap: {
    marginTop: rp(4),
  },
  termsText: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
    lineHeight: rf(16),
  },
});

export default PaywallModal;
