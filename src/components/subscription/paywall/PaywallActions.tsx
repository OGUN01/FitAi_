import React from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SubscriptionPlan } from "../../../services/SubscriptionService";

interface PaywallActionsProps {
  selectedPlanData: SubscriptionPlan | undefined;
  isPurchasing: boolean;
  purchaseError: string | null;
  trialInfo: { isEligible: boolean };
  onPurchase: () => void;
  onRestore: () => void;
}

const PaywallActions: React.FC<PaywallActionsProps> = ({
  selectedPlanData,
  isPurchasing,
  purchaseError,
  trialInfo,
  onPurchase,
  onRestore,
}) => {
  return (
    <View style={styles.bottomActions}>
      {purchaseError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{purchaseError}</Text>
        </View>
      )}

      <Pressable
        onPress={onPurchase}
        disabled={isPurchasing || !selectedPlanData}
        style={[
          styles.purchaseButton,
          (isPurchasing || !selectedPlanData) && styles.purchaseButtonDisabled,
        ]}
      >
        {isPurchasing ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.purchaseButtonText}>
            {trialInfo.isEligible && selectedPlanData?.freeTrialDays
              ? `Start ${selectedPlanData.freeTrialDays}-Day Free Trial`
              : `Subscribe for ${selectedPlanData?.price || ""}`}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={onRestore} style={styles.restoreButton}>
        <Text style={styles.restoreButtonText}>Restore Previous Purchases</Text>
      </Pressable>

      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          Subscription automatically renews. Cancel anytime in your {"\n"}
          App Store or Google Play account settings.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  errorContainer: {
    padding: 12,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
  },
  purchaseButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  purchaseButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  purchaseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  restoreButton: {
    padding: 12,
    alignItems: "center",
  },
  restoreButtonText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
  },
  termsContainer: {
    marginTop: 8,
  },
  termsText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 16,
  },
});

export default PaywallActions;
