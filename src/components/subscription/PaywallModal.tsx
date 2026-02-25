import React, { useState, useMemo } from "react";
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
import { colors, spacing, borderRadius } from "../../theme/aurora-tokens";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  reason?: string;
}

const TIER_FEATURES: Record<string, string[]> = {
  basic: [
    "10 AI generations per day",
    "Unlimited barcode scans",
    "Basic analytics dashboard",
  ],
  pro: [
    "Unlimited AI generations",
    "Unlimited barcode scans",
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
  const { plans, currentPlan, isLoading, paywallReason, subscribe, dismiss } =
    usePaywall();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "yearly",
  );

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
            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => setBillingCycle("monthly")}
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
                onPress={() => setBillingCycle("yearly")}
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
              disabled={isLoading || !effectiveSelectedId}
              style={[
                styles.subscribeBtn,
                (isLoading || !effectiveSelectedId) &&
                  styles.subscribeBtnDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.text.primary} />
              ) : (
                <Text style={styles.subscribeBtnText}>
                  {selectedPlanData
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
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: "92%",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },

  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 6,
  },
  headerDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  headerReason: {
    fontSize: 14,
    color: colors.error.light,
    lineHeight: 20,
    fontWeight: "500",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.tertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: "600",
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },

  toggleRow: {
    flexDirection: "row",
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginTop: spacing.md,
    marginBottom: spacing.md + 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  toggleBtnActive: {
    backgroundColor: colors.background.secondary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  toggleTextActive: {
    color: colors.text.primary,
  },
  savingsBadge: {
    marginLeft: 6,
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.4)",
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.success.light,
  },

  plansList: {
    gap: 14,
  },
  planCard: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: borderRadius.xl,
    padding: 18,
    backgroundColor: "rgba(26, 31, 46, 0.8)",
    position: "relative",
  },
  planCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: "rgba(255, 107, 53, 0.1)",
  },
  planCardCurrent: {
    borderColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: colors.background.tertiary,
    opacity: 0.7,
  },

  popularBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  currentBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: colors.text.muted,
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.text.primary,
  },

  planName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text.primary,
  },
  pricePeriod: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 2,
  },
  billedLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },

  featureList: {
    marginTop: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  featureCheck: {
    fontSize: 14,
    color: colors.success.DEFAULT,
    fontWeight: "700",
    marginRight: 8,
    width: 18,
  },
  featureText: {
    fontSize: 13,
    color: colors.text.secondary,
    flex: 1,
  },

  selectRing: {
    position: "absolute",
    top: 18,
    left: 18,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
  },
  selectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.DEFAULT,
  },

  actions: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  subscribeBtn: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  subscribeBtnDisabled: {
    backgroundColor: colors.background.tertiary,
    opacity: 0.6,
  },
  subscribeBtnText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  termsWrap: {
    marginTop: 4,
  },
  termsText: {
    fontSize: 11,
    color: colors.text.muted,
    textAlign: "center",
    lineHeight: 16,
  },
});

export default PaywallModal;
