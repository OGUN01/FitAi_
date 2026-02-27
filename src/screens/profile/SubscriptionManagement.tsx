import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { useSubscriptionStore } from "../../stores/subscriptionStore";
import razorpayService from "../../services/RazorpayService";
import { RazorpayServiceError } from "../../services/RazorpayService";
import { usePaywall } from "../../hooks/usePaywall";
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

const TIER_COLORS: Record<string, readonly [string, string]> = {
  free: ["#6B7280", "#9CA3AF"] as const,
  basic: ["#3B82F6", "#60A5FA"] as const,
  pro: ["#FF8A5C", "#A78BFA"] as const,
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
  active: { label: "Active", color: "#10B981", icon: "checkmark-circle" },
  paused: { label: "Paused", color: "#F59E0B", icon: "pause-circle" },
  cancelled: { label: "Cancelled", color: "#EF4444", icon: "close-circle" },
  pending: { label: "Pending", color: "#6B7280", icon: "time" },
};

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  try {
    return new Date(isoDate).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const NEXT_TIER_BENEFITS: Record<string, string[]> = {
  free: [
    "Unlimited food scans",
    "10 AI generations per day",
    "Detailed analytics",
  ],
  basic: [
    "Unlimited AI generations",
    "Unlimited food scans",
    "Personal coaching",
    "Advanced analytics",
  ],
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
    fetchSubscriptionStatus,
    isLoading: storeLoading,
  } = useSubscriptionStore();

  const { triggerPaywall, showPaywall, dismiss, paywallReason } = usePaywall();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const tier = currentPlan?.tier ?? "free";
  const planName = currentPlan?.name ?? "Free Plan";
  const tierColors = TIER_COLORS[tier] ?? TIER_COLORS.free;
  const statusInfo = (tier !== "free" && subscriptionStatus) ? (STATUS_CONFIG[subscriptionStatus] ?? null) : null;

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
              await razorpayService.cancelSubscription();
              await fetchSubscriptionStatus();
              crossPlatformAlert(
                "Subscription Cancelled",
                `You can continue using premium features until ${formatDate(currentPeriodEnd)}.`,
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
  }, [currentPeriodEnd, fetchSubscriptionStatus]);

  const handlePause = useCallback(() => {
    haptics.medium();
    crossPlatformAlert(
      "Pause Subscription?",
      "Your subscription will be paused immediately. You can resume anytime.",
      [
        { text: "Keep Active", style: "cancel" },
        {
          text: "Pause",
          onPress: async () => {
            setActionLoading("pause");
            try {
              await razorpayService.pauseSubscription();
              await fetchSubscriptionStatus();
              crossPlatformAlert(
                "Subscription Paused",
                "Your subscription has been paused. Resume anytime to continue.",
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
  }, [fetchSubscriptionStatus]);

  const handleResume = useCallback(async () => {
    haptics.medium();
    setActionLoading("resume");
    try {
      await razorpayService.resumeSubscription();
      await fetchSubscriptionStatus();
      crossPlatformAlert(
        "Subscription Resumed",
        "Welcome back! Your premium features are active again.",
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
  }, [fetchSubscriptionStatus]);

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
  ) => (
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
        <LinearGradient
          colors={
            isUnlimited
              ? ([color, color + "CC"] as const)
              : progress > 80 && limit != null && limit > 0
                ? (["#EF4444", "#F87171"] as const)
                : limit == null
                  ? (["#6B7280", "#9CA3AF"] as const)
                  : ([color, color + "CC"] as const)
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.progressFill,
            { width: `${isUnlimited ? 100 : progress}%` as `${number}%` },
          ]}
        />
      </View>
    </View>
  );

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
                color={ResponsiveTheme.colors.text}
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
            <GlassCard style={styles.card}>
              <View style={styles.planHeader}>
                <LinearGradient
                  colors={tierColors}
                  style={styles.planBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="diamond" size={rf(14)} color="#FFF" />
                  <Text style={styles.planBadgeText}>
                    {TIER_LABELS[tier] ?? "Free"}
                  </Text>
                </LinearGradient>

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
                    color={ResponsiveTheme.colors.textSecondary}
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
                    color="#EF4444"
                  />
                  <Text style={[styles.renewalText, { color: "#EF4444" }]}>
                    Access until {formatDate(currentPeriodEnd)}
                  </Text>
                </View>
              )}
            </GlassCard>
          </Animated.View>

          {/* ---- Usage Section ---- */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <GlassCard style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="bar-chart-outline"
                  size={rf(18)}
                  color={ResponsiveTheme.colors.text}
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
                "#FF8A5C",
              )}

              {renderProgressBar(
                "Food Scans",
                "scan-outline",
                scanDaily.current,
                scanDaily.limit,
                features.unlimited_scans,
                scanProgress,
                "#3B82F6",
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
            </GlassCard>
          </Animated.View>

          {/* ---- Actions Section ---- */}
          {(subscriptionStatus && tier !== "free") || subscriptionStatus === "cancelled" ? (
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <GlassCard style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="settings-outline"
                    size={rf(18)}
                    color={ResponsiveTheme.colors.text}
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
                        color="#F59E0B"
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
                        color="#EF4444"
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
                      color="#10B981"
                    />
                    <Text style={[styles.actionText, { color: "#10B981" }]}>
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
                      color="#FF8A5C"
                    />
                    <Text style={[styles.actionText, { color: "#FF8A5C" }]}>
                      Resubscribe
                    </Text>
                  </AnimatedPressable>
                )}
              </GlassCard>
            </Animated.View>
          ) : null}

          {/* ---- Upgrade CTA ---- */}
          {(tier === "free" || tier === "basic") && (
              <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                <AnimatedPressable onPress={handleUpgrade}>
                  <LinearGradient
                    colors={
                      tier === "free"
                        ? (["#3B82F6", "#2563EB"] as const)
                        : (["#FF8A5C", "#7C3AED"] as const)
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.upgradeCta}
                  >
                    <View style={styles.upgradeCtaContent}>
                      <Ionicons
                        name="rocket-outline"
                        size={rf(28)}
                        color="#FFF"
                      />
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
                        color="#FFF"
                      />
                    </View>

                    <View style={styles.upgradeBenefits}>
                      {(NEXT_TIER_BENEFITS[tier] ?? []).map(
                        (benefit, index) => (
                          <View key={index} style={styles.benefitRow}>
                            <Ionicons
                              name="checkmark-circle"
                              size={rf(14)}
                              color="#A7F3D0"
                            />
                            <Text style={styles.benefitText}>{benefit}</Text>
                          </View>
                        ),
                      )}
                    </View>
                  </LinearGradient>
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
      color={enabled ? "#10B981" : "#6B728080"}
    />
    <Text
      style={[styles.featureFlagLabel, !enabled && styles.featureFlagDisabled]}
    >
      {label}
    </Text>
    <Ionicons
      name={enabled ? "checkmark-circle" : "lock-closed"}
      size={rf(12)}
      color={enabled ? "#10B981" : "#6B728080"}
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
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: rf(18),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: rw(36),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: rw(16),
    paddingBottom: ResponsiveTheme.spacing.xl,
  },

  // Card
  card: {
    marginBottom: rh(10),
    padding: rw(16),
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
  },
  planBadgeText: {
    color: "#FFF",
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
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(4),
  },
  planDescription: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rh(4),
    lineHeight: rf(18),
  },
  billingCycle: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
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
    color: ResponsiveTheme.colors.textSecondary,
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
    color: ResponsiveTheme.colors.text,
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
    color: ResponsiveTheme.colors.text,
  },
  usageCount: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "500",
  },
  unlimitedBadge: {
    fontWeight: "700",
    fontSize: rf(13),
  },
  progressTrack: {
    height: rh(8),
    borderRadius: rw(4),
    backgroundColor: "rgba(255,255,255,0.08)",
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
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  featureFlagLabel: {
    flex: 1,
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  featureFlagDisabled: {
    color: "rgba(107,114,128,0.5)",
  },

  // Action buttons
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(12),
    paddingVertical: rh(14),
    paddingHorizontal: rw(16),
    borderRadius: rw(12),
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: rh(10),
  },
  actionText: {
    flex: 1,
    fontSize: rf(15),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  destructiveButton: {
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  destructiveText: {
    color: "#EF4444",
  },
  resumeButton: {
    backgroundColor: "rgba(16,185,129,0.08)",
  },

  // Upgrade CTA
  upgradeCta: {
    borderRadius: rw(16),
    padding: rw(14),
    marginBottom: rh(16),
  },
  upgradeCtaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(12),
  },
  upgradeCtaText: {
    flex: 1,
  },
  upgradeCtaTitle: {
    fontSize: rf(18),
    fontWeight: "800",
    color: "#FFF",
    marginBottom: rh(2),
  },
  upgradeCtaSubtitle: {
    fontSize: rf(13),
    color: "rgba(255,255,255,0.8)",
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
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },

  // Bottom
  bottomSpacing: {
    height: rh(180),
  },
});

export default SubscriptionManagement;
