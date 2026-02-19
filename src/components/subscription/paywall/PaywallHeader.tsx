import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

interface PaywallHeaderProps {
  title: string;
  description: string;
  onClose: () => void;
  trialInfo: { isEligible: boolean };
}

const PaywallHeader: React.FC<PaywallHeaderProps> = ({
  title,
  description,
  onClose,
  trialInfo,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerDescription}>{description}</Text>
        </View>

        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </Pressable>
      </View>

      {trialInfo.isEligible && (
        <View style={styles.trialBanner}>
          <Text style={styles.trialTitle}>🎁 Start your FREE trial today!</Text>
          <Text style={styles.trialDescription}>
            Try all premium features free for 7-14 days
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerText: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: "#6b7280",
  },
  trialBanner: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#dbeafe",
    borderRadius: 8,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: 4,
  },
  trialDescription: {
    fontSize: 14,
    color: "#1e40af",
  },
});

export default PaywallHeader;
