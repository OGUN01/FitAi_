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
                <ActivityIndicator color="#fff" />
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
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
    color: "#111827",
    marginBottom: 6,
  },
  headerDesc: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  headerReason: {
    fontSize: 14,
    color: "#dc2626",
    lineHeight: 20,
    fontWeight: "500",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },

  toggleRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 4,
    marginTop: 16,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  toggleTextActive: {
    color: "#111827",
  },
  savingsBadge: {
    marginLeft: 6,
    backgroundColor: "#dcfce7",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16a34a",
  },

  plansList: {
    gap: 14,
  },
  planCard: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 18,
    backgroundColor: "#fff",
    position: "relative",
  },
  planCardSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  planCardCurrent: {
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    opacity: 0.7,
  },

  popularBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: "#f97316",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  currentBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: "#6b7280",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },

  planName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
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
    color: "#111827",
  },
  pricePeriod: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 2,
  },
  billedLabel: {
    fontSize: 12,
    color: "#6b7280",
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
    color: "#22c55e",
    fontWeight: "700",
    marginRight: 8,
    width: 18,
  },
  featureText: {
    fontSize: 13,
    color: "#374151",
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
    borderColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  selectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3b82f6",
  },

  actions: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  subscribeBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  subscribeBtnDisabled: {
    backgroundColor: "#9ca3af",
  },
  subscribeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  termsWrap: {
    marginTop: 4,
  },
  termsText: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 16,
  },
});

export default PaywallModal;
