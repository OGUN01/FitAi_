import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { flatColors as colors } from "../../../theme/aurora-tokens";
import { rf, rh, rw, rp, rbr } from "../../../utils/responsive";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

interface MealTypeSelectorProps {
  selectedType: (typeof MEAL_TYPES)[number];
  onTypeChange: (type: (typeof MEAL_TYPES)[number]) => void;
}

export const MealTypeSelector: React.FC<MealTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Meal Type</Text>
      <View style={styles.typeSelector}>
        {MEAL_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              selectedType === type && styles.typeButtonActive,
            ]}
            onPress={() => onTypeChange(type)}
          >
            <Text
              style={[
                styles.typeButtonText,
                selectedType === type && styles.typeButtonTextActive,
              ]}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: rh(20),
  },
  label: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.text,
    marginBottom: rh(8),
  },
  typeSelector: {
    flexDirection: "row",
    gap: rw(8),
  },
  typeButton: {
    flex: 1,
    paddingVertical: rh(12),
    paddingHorizontal: rw(16),
    borderRadius: rbr(12),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center" as const,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.text,
  },
  typeButtonTextActive: {
    color: colors.white,
  },
});
