import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rp } from "../../../utils/responsive";

interface QuickAddOptionsProps {
  onQuickAdd: (amountML: number) => void;
  onShowCustomInput: () => void;
}

const quickOptions = [
  { label: "250ml", amount: 250, icon: "water-outline" as const },
  { label: "500ml", amount: 500, icon: "water" as const },
  { label: "1L", amount: 1000, icon: "beaker-outline" as const },
];

export const QuickAddOptions: React.FC<QuickAddOptionsProps> = ({
  onQuickAdd,
  onShowCustomInput,
}) => {
  return (
    <>
      <Text style={styles.sectionTitle}>Quick Add</Text>
      <View style={styles.quickOptionsContainer}>
        {quickOptions.map((option) => (
          <TouchableOpacity
            key={option.label}
            style={styles.quickOption}
            onPress={() => onQuickAdd(option.amount)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["rgba(255, 107, 53, 0.2)", "rgba(255, 138, 92, 0.2)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quickOptionGradient}
            >
              <Ionicons
                name={option.icon}
                size={rf(28)}
                color={ResponsiveTheme.colors.primary}
              />
              <Text style={styles.quickOptionLabel}>{option.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.customButton}
        onPress={onShowCustomInput}
        activeOpacity={0.7}
      >
        <Ionicons
          name="add-circle-outline"
          size={20}
          color={ResponsiveTheme.colors.primary}
        />
        <Text style={styles.customButtonText}>Custom Amount</Text>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: rp(12),
  },
  quickOptionsContainer: {
    flexDirection: "row",
    gap: rp(12),
    marginBottom: rp(20),
  },
  quickOption: {
    flex: 1,
  },
  quickOptionGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(20),
    borderRadius: ResponsiveTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.3)",
  },
  quickOptionLabel: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#fff",
    marginTop: rp(8),
  },
  customButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(8),
    paddingVertical: rp(14),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.3)",
    borderStyle: "dashed",
  },
  customButtonText: {
    fontSize: rf(14),
    fontWeight: "500",
    color: ResponsiveTheme.colors.primary,
  },
});
