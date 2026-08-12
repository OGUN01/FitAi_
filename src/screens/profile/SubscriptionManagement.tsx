import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import {
  flatColors as colors,
  spacing,
  surface,
  border,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
import { rf, rw, rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { useSubscriptionStore } from "../../stores/subscriptionStore";
import razorpayService from "../../services/RazorpayService";
import { RazorpayServiceError } from "../../services/RazorpayService";
import { usePaywall } from "../../hooks/usePaywall";
import { TIER_FEATURES } from "../../utils/subscriptionUi";
import PaywallModal from "../../components/subscription/PaywallModal";

// ============================================================================
// Types
// ============================================================================

interface SubscriptionManagementProps {
  onBack?: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

// Editorial Dark: one flat accent color per tier (no gradient filler). The
// plan badge is a hairline-bordered tinted chip, not a gradient pill.
const TIER_ACCENT: Record<string, string> = {
  free: colors.muted,
  basic: colors.blue,
  pro: colors.primaryLight,
};

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  active: { label: "Active", color: colors.successAlt, icon: "checkmark-circle" },
  authenticated: { label: "Processing", color: colors.warningAlt, icon: "time" },
  paused: { label: "Paused", color: colors.warningAlt, icon: "pause-circle" },
  cancelled: { label: "Cancelled", color: colors.errorAlt, icon: "close-circle" },
  pending: { label: "Pending", color: colors.muted, icon: "time" },
};

function normalizeLifecycleStatus(status?: string): "active" | "paused" | "cancelled" {
  if (status === "paused") return "paused";
  if (status === "cancelled") return "cancelled";
  return "active";
}

function formatDate(value: string | number | null): string {
  if (value == null) return "-";
  try {
    const date =
      typeof value === "number"
        ? new Date(value * 1000)
        : /^\d+$/.test(value)
          ? new Date(Number(value) * 1000)
          : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    // undefined locale → device locale, so dates format as the user expects
    return date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

// Upgrade CTA shows the NEXT tier's feature list, read from the same sources
// as the paywall (server planFeaturesByTier, shared TIER_FEATURES fallback) —
// never a third hardcoded copy.
const NEXT_TIER: Record<string, string> = {
  free: "basic",
  basic: "pro",
};

// ============================================================================
// Component
// ============================================================================

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  onBack,
}) => {
  const {
    currentPlan,
    subscriptionStatus,
    usage,
    features,
    currentPeriodEnd,
    applyLifecycleUpdate,
    fetchSubscriptionStatus,
  } = useSubscriptionStore();

  const { triggerPaywall, showPaywall, dismiss, paywallReason, planFeaturesByTier } = usePaywall();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const tier = currentPlan?.tier ?? "free";
  const planName = currentPlan?.name ?? "Free Plan";
  const tierAccent = TIER_ACCENT[tier] ?? TIER_ACCENT.free;
  const statusInfo = (tier !== "free" && subscriptionStatus) ? (STATUS_CONFIG[subscriptionStatus] ?? null) : null;

  const nextTier = NEXT_TIER[tier];
  const nextTierBenefits = nextTier
    ? (planFeaturesByTier[nextTier] ?? TIER_FEATURES[nextTier] ?? [])
    : [];

  // ---- Usage calculations ----
  const aiMonthly = usage.ai_generation.monthly;
  const scanDaily = usage.barcode_scan.daily;

  const aiProgress =
    features.unlimited_ai
      ? 100
      : aiMonthly.limit != null && aiMonthly.limit > 0
        ? Math.min((aiMonthly.current / aiMonthly.limit) * 100, 100)
        : 0;

  const scanProgress =
    features.unlimited_scans
      ? 100
      : scanDaily.limit != null && scanDaily.limit > 0
        ? Math.min((scanDaily.current / scanDaily.limit) * 100, 100)
        : 0;

  // ---- Action handlers ----

  const handleCancel = useCallback(() => {
    haptics.medium();
    crossPlatformAlert(
      "Cancel Subscription?",
      `Your subscription will remain active until ${formatDate(currentPeriodEnd)}. After that, you'll be downgraded to the Free plan.`,
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Cancel Subscription",
          style: "destructive",
          onPress: async () => {
            setActionLoading("cancel");
            try {
              const result = await razorpayService.cancelSubscription();
              applyLifecycleUpdate({
                status: normalizeLifecycleStatus(result.status),
                current_period_end: result.current_period_end ?? currentPeriodEnd,
              });
              await fetchSubscriptionStatus();
              crossPlatformAlert(
                "Subscription Cancelled",
                `You can continue using premium features until ${formatDate(
                  result.current_period_end ?? currentPeriodEnd,
                )}.`,
              );
            } catch (error) {
              const message =
                error instanceof RazorpayServiceError
                  ? error.message
                  : "Failed to cancel subscription. Please try again.";
              crossPlatformAlert("Error", message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  }, [applyLifecycleUpdate, currentPeriodEnd, fetchSubscriptionStatus]);

  const handlePause = useCallback(() => {
    haptics.medium();
    crossPlatformAlert(
      "Pause Subscription?",
      "Billing pauses immediately and you'll lose premium access until you resume. You can resume anytime.",
      [
        { text: "Keep Active", style: "cancel" },
        {
          text: "Pause",
          onPress: async () => {
            setActionLoading("pause");
            try {
              const result = await razorpayService.pauseSubscription();
              applyLifecycleUpdate({
                status: normalizeLifecycleStatus(result.status),
              });
              // Mirror handleCancel/handleResume: re-derive features/usage from
              // the server immediately instead of leaving canUseFeature() out
              // of sync with isPremium() until the 5-minute focus revalidation.
              await fetchSubscriptionStatus();
              crossPlatformAlert(
                "Subscription Paused",
                result.message ?? "Your subscription has been paused. Resume anytime to continue.",
              );
            } catch (error) {
              const message =
                error instanceof RazorpayServiceError
                  ? error.message
                  : "Failed to pause subscription. Please try again.";
              crossPlatformAlert("Error", message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  }, [applyLifecycleUpdate, fetchSubscriptionStatus]);

  const handleResume = useCallback(async () => {
    haptics.medium();
    setActionLoading("resume");
    try {
      const result = await razorpayService.resumeSubscription();
      applyLifecycleUpdate({
        status: normalizeLifecycleStatus(result.status),
      });
      await fetchSubscriptionStatus();
      crossPlatformAlert(
        "Subscription Resumed",
        result.message ?? "Welcome back! Your premium features are active again.",
      );
    } catch (error) {
      const message =
        error instanceof RazorpayServiceError
          ? error.message
          : "Failed to resume subscription. Please try again.";
      crossPlatformAlert("Error", message);
    } finally {
      setActionLoading(null);
    }
  }, [applyLifecycleUpdate, fetchSubscriptionStatus]);

  const handleUpgrade = useCallback(() => {
    haptics.light();
    const reason =
      tier === "free"
        ? "Upgrade to unlock more AI generations and unlimited scans"
        : "Upgrade to Pro for unlimited AI generations and personal coaching";
    triggerPaywall(reason);
  }, [tier, triggerPaywall]);

  // ---- Render helpers ----

  const renderProgressBar = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    current: number,
    limit: number | null,
    isUnlimited: boolean,
    progress: number,
    color: string,
  ) => {
    // Flat fill — one token color, no gradient. Warning state when nearing the
    // cap so the user notices before they hit the limit.
    const fillColor = isUnlimited
      ? color
      : progress > 80 && limit != null && limit > 0
        ? colors.errorAlt
        : limit == null
          ? colors.muted
          : color;
    return (
      <View style={styles.usageRow}>
        <View style={styles.usageHeader}>
          <View style={styles.usageLabelRow}>
            <Ionicons name={icon} size={rf(16)} color={color} />
            <Text style={styles.usageLabel}>{label}</Text>
          </View>
          <Text style={styles.usageCount}>
            {isUnlimited ? (
              <Text style={[styles.unlimitedBadge, { color }]}>Unlimited</Text>
            ) : limit != null ? (
              `${current} / ${limit}`
            ) : (
              `${current}`
            )}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${isUnlimited ? 100 : progress}%` as `${number}%` },
              { backgroundColor: fillColor },
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={styles.header}
        >
          {onBack && (
            <AnimatedPressable
              onPress={() => {
                haptics.light();
                onBack();
              }}
              style={styles.backButton}
            >
              <Ionicons
                name="chevron-back"
                size={rf(24)}
                color={colors.text}
              />
            </AnimatedPressable>
          )}
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ---- Current Plan Section ---- */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View style={styles.card}>
              <View style={styles.planHeader}>
                <View
                  style={[
                    styles.planBadge,
                    {
                      backgroundColor: tierAccent + "20",
                      borderColor: tierAccent + "55",
                    },
                  ]}
                >
                  <Ionicons name="diamond" size={rf(14)} color={tierAccent} />
                  <Text style={[styles.planBadgeText, { color: tierAccent }]}>
                    {TIER_LABELS[tier] ?? "Free"}
                  </Text>
                </View>

                {statusInfo && tier !== "free" && (
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusInfo.color + "20" },
                    ]}
                  >
                    <Ionicons
                      name={statusInfo.icon}
                      size={rf(14)}
                      color={statusInfo.color}
                    />
                    <Text
                      style={[styles.statusText, { color: statusInfo.color }]}
                    >
                      {statusInfo.label}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.planName}>{planName}</Text>

              {tier === "free" && (
                <Text style={styles.planDescription}>
                  Basic fitness tracking with limited AI features
                </Text>
              )}

              {currentPlan?.billing_cycle && (
                <Text style={styles.billingCycle}>
                  Billed {currentPlan.billing_cycle}
                </Text>
              )}

              {currentPeriodEnd && subscriptionStatus === "active" && (
                <View style={styles.renewalRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={rf(14)}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.renewalText}>
                    Renews on {formatDate(currentPeriodEnd)}
                  </Text>
                </View>
              )}

              {currentPeriodEnd && subscriptionStatus === "cancelled" && (
                <View style={styles.renewalRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={rf(14)}
                    color={colors.errorAlt}
                  />
                  <Text style={[styles.renewalText, { color: colors.errorAlt }]}>
                    Access until {formatDate(currentPeriodEnd)}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* ---- Usage Section ---- */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="bar-chart-outline"
                  size={rf(18)}
                  color={colors.text}
                />
                <Text style={styles.sectionTitle}>Usage</Text>
              </View>

              {renderProgressBar(
                "AI Generations",
                "sparkles",
                aiMonthly.current,
                aiMonthly.limit,
                features.unlimited_ai,
                aiProgress,
                colors.primaryLight,
              )}

              {renderProgressBar(
                "AI Food Scans",
                "scan-outline",
                scanDaily.current,
                scanDaily.limit,
                features.unlimited_scans,
                scanProgress,
                colors.blue,
              )}

              {/* Feature flags */}
              <View style={styles.featureRow}>
                <FeatureFlag
                  label="Analytics"
                  enabled={features.analytics}
                  icon="analytics-outline"
                />
                <FeatureFlag
                  label="Coaching"
                  enabled={features.coaching}
                  icon="fitness-outline"
                />
              </View>
            </View>
          </Animated.View>

          {/* ---- Actions Section ---- */}
          {(subscriptionStatus && tier !== "free") || subscriptionStatus === "cancelled" ? (
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="settings-outline"
                    size={rf(18)}
                    color={colors.text}
                  />
                  <Text style={styles.sectionTitle}>Manage</Text>
                </View>

                {subscriptionStatus === "active" && (
                  <>
                    <AnimatedPressable
                      onPress={handlePause}
                      style={styles.actionButton}
                      disabled={actionLoading !== null}
                    >
                      <Ionicons
                        name="pause-circle-outline"
                        size={rf(20)}
                        color={colors.warningAlt}
                      />
                      <Text style={styles.actionText}>
                        {actionLoading === "pause"
                          ? "Pausing..."
                          : "Pause Subscription"}
                      </Text>
                    </AnimatedPressable>

                    <AnimatedPressable
                      onPress={handleCancel}
                      style={[styles.actionButton, styles.destructiveButton]}
                      disabled={actionLoading !== null}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={rf(20)}
                        color={colors.errorAlt}
                      />
                      <Text style={[styles.actionText, styles.destructiveText]}>
                        {actionLoading === "cancel"
                          ? "Cancelling..."
                          : "Cancel Subscription"}
                      </Text>
                    </AnimatedPressable>
                  </>
                )}

                {subscriptionStatus === "paused" && (
                  <AnimatedPressable
                    onPress={handleResume}
                    style={[styles.actionButton, styles.resumeButton]}
                    disabled={actionLoading !== null}
                  >
                    <Ionicons
                      name="play-circle-outline"
                      size={rf(20)}
                      color={colors.successAlt}
                    />
                    <Text style={[styles.actionText, { color: colors.successAlt }]}>
                      {actionLoading === "resume"
                        ? "Resuming..."
                        : "Resume Subscription"}
                    </Text>
                  </AnimatedPressable>
                )}

                {subscriptionStatus === "cancelled" && (
                  <AnimatedPressable
                    onPress={handleUpgrade}
                    style={[styles.actionButton, styles.resumeButton]}
                  >
                    <Ionicons
                      name="arrow-up-circle-outline"
                      size={rf(20)}
                      color={colors.primaryLight}
                    />
                    <Text style={[styles.actionText, { color: colors.primaryLight }]}>
                      Resubscribe
                    </Text>
                  </AnimatedPressable>
                )}

                {subscriptionStatus === "authenticated" && (
                  <View style={styles.pendingNotice}>
                    <Ionicons
                      name="time-outline"
                      size={rf(18)}
                      color={colors.warningAlt}
                    />
                    <Text style={styles.pendingNoticeText}>
                      Payment received. Premium access is being confirmed.
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          ) : null}

          {/* ---- Upgrade CTA ---- */}
          {(tier === "free" || tier === "basic") && (
              <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                <AnimatedPressable onPress={handleUpgrade} style={styles.upgradeCta}>
                  <View style={styles.upgradeCtaContent}>
                    <View style={styles.upgradeCtaIcon}>
                      <Ionicons
                        name="rocket-outline"
                        size={rf(28)}
                        color={colors.primaryLight}
                      />
                    </View>
                    <View style={styles.upgradeCtaText}>
                      <Text style={styles.upgradeCtaTitle}>
                        {tier === "free"
                          ? "Upgrade to Basic"
                          : "Upgrade to Pro"}
                      </Text>
                      <Text style={styles.upgradeCtaSubtitle}>
                        Unlock more powerful features
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={rf(20)}
                      color={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.upgradeBenefits}>
                    {nextTierBenefits.map(
                      (benefit, index) => (
                        <View key={index} style={styles.benefitRow}>
                          <Ionicons
                            name="checkmark-circle"
                            size={rf(14)}
                            color={colors.successBright}
                          />
                          <Text style={styles.benefitText}>{benefit}</Text>
                        </View>
                      ),
                    )}
                  </View>
                </AnimatedPressable>
              </Animated.View>
            )}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
      <PaywallModal visible={showPaywall} onClose={dismiss} reason={paywallReason ?? undefined} />
    </AuroraBackground>
  );
};

// ============================================================================
// Sub-component: FeatureFlag
// ============================================================================

const FeatureFlag: React.FC<{
  label: string;
  enabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}> = ({ label, enabled, icon }) => (
  <View style={styles.featureFlag}>
    <Ionicons
      name={icon}
      size={rf(16)}
      color={enabled ? colors.successAlt : colors.muted}
    />
    <Text
      style={[styles.featureFlagLabel, !enabled && styles.featureFlagDisabled]}
    >
      {label}
    </Text>
    <Ionicons
      name={enabled ? "checkmark-circle" : "lock-closed"}
      size={rf(12)}
      color={enabled ? colors.successAlt : colors.muted}
    />
  </View>
);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rw(16),
    paddingVertical: rh(12),
  },
  backButton: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    backgroundColor: colors.glassSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    ...typography.variants.sectionTitle,
    color: colors.text,
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: rw(44),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: rw(16),
    paddingBottom: spacing.xl,
  },

  // Card — flat surface + hairline (Editorial Dark: no glass/elevation).
  card: {
    marginBottom: rh(10),
    padding: rw(16),
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.lg,
  },

  // Plan section
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: rh(8),
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rw(12),
    paddingVertical: rh(6),
    borderRadius: rw(20),
    gap: rw(6),
    borderWidth: 1,
  },
  planBadgeText: {
    fontSize: rf(13),
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rw(10),
    paddingVertical: rh(4),
    borderRadius: rw(12),
    gap: rw(4),
  },
  statusText: {
    fontSize: rf(12),
    fontWeight: "600",
  },
  planName: {
    fontSize: rf(22),
    fontWeight: "800",
    color: colors.text,
    marginBottom: rh(4),
  },
  planDescription: {
    fontSize: rf(13),
    color: colors.textSecondary,
    marginBottom: rh(4),
    lineHeight: rf(18),
  },
  billingCycle: {
    fontSize: rf(13),
    color: colors.textSecondary,
    marginBottom: rh(8),
    textTransform: "capitalize",
  },
  renewalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
    marginTop: rh(8),
  },
  renewalText: {
    fontSize: rf(13),
    color: colors.textSecondary,
  },

  // Usage section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(8),
    marginBottom: rh(10),
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: colors.text,
  },
  usageRow: {
    marginBottom: rh(10),
  },
  usageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rh(6),
  },
  usageLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
  },
  usageLabel: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.text,
  },
  usageCount: {
    fontSize: rf(13),
    color: colors.textSecondary,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  unlimitedBadge: {
    fontWeight: "700",
    fontSize: rf(13),
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    height: rh(8),
    borderRadius: rw(4),
    backgroundColor: colors.glassSurface,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: rw(4),
  },

  // Feature flags
  featureRow: {
    flexDirection: "row",
    gap: rw(12),
    marginTop: rh(4),
  },
  featureFlag: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
    paddingVertical: rh(6),
    paddingHorizontal: rw(10),
    borderRadius: rw(10),
    backgroundColor: colors.glassSurface,
  },
  featureFlagLabel: {
    flex: 1,
    fontSize: rf(12),
    fontWeight: "600",
    color: colors.text,
  },
  featureFlagDisabled: {
    color: colors.muted,
  },

  // Action buttons
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(12),
    paddingVertical: rh(14),
    paddingHorizontal: rw(16),
    borderRadius: rw(12),
    backgroundColor: colors.glassSurface,
    marginBottom: rh(10),
  },
  actionText: {
    flex: 1,
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.text,
  },
  destructiveButton: {
    backgroundColor: colors.errorTint,
  },
  destructiveText: {
    color: colors.errorAlt,
  },
  resumeButton: {
    backgroundColor: colors.successTint,
  },
  pendingNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(10),
    marginTop: rh(4),
    paddingVertical: rh(10),
    paddingHorizontal: rw(12),
    borderRadius: rw(12),
    backgroundColor: colors.warningTint,
  },
  pendingNoticeText: {
    flex: 1,
    fontSize: rf(13),
    color: colors.textSecondary,
    lineHeight: rf(18),
  },

  // Upgrade CTA — flat accent surface (hairline + tint), not a gradient.
  upgradeCta: {
    borderRadius: rw(16),
    padding: rw(14),
    marginBottom: rh(16),
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryFaded,
  },
  upgradeCtaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(12),
  },
  upgradeCtaIcon: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(14),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryFaded,
  },
  upgradeCtaText: {
    flex: 1,
  },
  upgradeCtaTitle: {
    fontSize: rf(18),
    fontWeight: "800",
    color: colors.text,
    marginBottom: rh(2),
  },
  upgradeCtaSubtitle: {
    fontSize: rf(13),
    color: colors.textSecondary,
  },
  upgradeBenefits: {
    marginTop: rh(10),
    gap: rh(6),
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(8),
  },
  benefitText: {
    fontSize: rf(13),
    color: colors.textSecondary,
    fontWeight: "500",
  },

  // Bottom
  bottomSpacing: {
    height: rh(180),
  },
});

export default SubscriptionManagement;
