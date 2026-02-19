import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SubscriptionPlan } from "../../../services/SubscriptionService";

interface PaywallPlanCardProps {
  plan: SubscriptionPlan;
  isSelected: boolean;
  badge: { text: string; color: string } | null;
  onSelect: (planId: string) => void;
  trialInfo: { isEligible: boolean };
}

const PaywallPlanCard: React.FC<PaywallPlanCardProps> = ({
  plan,
  isSelected,
  badge,
  onSelect,
  trialInfo,
}) => {
  return (
    <Pressable
      onPress={() => onSelect(plan.id)}
      style={[
        styles.planCard,
        isSelected ? styles.planCardSelected : styles.planCardUnselected,
      ]}
    >
      {badge && (
        <View style={[styles.badge, { backgroundColor: badge.color }]}>
          <Text style={styles.badgeText}>{badge.text}</Text>
        </View>
      )}

      <View style={styles.planContent}>
        <View style={styles.planInfo}>
          <Text style={styles.planName}>{plan.name}</Text>

          <Text style={styles.planDescription}>{plan.description}</Text>

          {plan.freeTrialDays && trialInfo.isEligible && (
            <Text style={styles.trialText}>
              {plan.freeTrialDays} days free trial
            </Text>
          )}
        </View>

        <View style={styles.planPricing}>
          <Text style={styles.planPrice}>{plan.price}</Text>

          {plan.originalPrice && (
            <Text style={styles.originalPrice}>{plan.originalPrice}</Text>
          )}

          <Text style={styles.planPeriod}>
            {plan.period === "lifetime"
              ? "one time"
              : `per ${plan.period.slice(0, -2)}`}
          </Text>
        </View>
      </View>

      <View style={styles.selectionIndicator}>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  planCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  planCardSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  planCardUnselected: {
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  badge: {
    position: "absolute",
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },
  planContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planInfo: {
    flex: 1,
    marginRight: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  trialText: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "600",
  },
  planPricing: {
    alignItems: "flex-end",
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  originalPrice: {
    fontSize: 14,
    color: "#9ca3af",
    textDecorationLine: "line-through",
  },
  planPeriod: {
    fontSize: 12,
    color: "#6b7280",
  },
  selectionIndicator: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 24,
    height: 24,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default PaywallPlanCard;
