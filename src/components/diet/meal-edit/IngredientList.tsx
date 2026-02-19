import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rh, rw, rp } from "../../../utils/responsive";

interface IngredientListProps {
  ingredients: any[];
  onQuantityChange: (index: number, newQuantity: number) => void;
  onRemoveIngredient: (index: number) => void;
}

export const IngredientList: React.FC<IngredientListProps> = ({
  ingredients,
  onQuantityChange,
  onRemoveIngredient,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Ingredients ({ingredients.length})</Text>
      {ingredients.map((item, index) => (
        <View key={index} style={styles.ingredientRow}>
          <View style={styles.ingredientInfo}>
            <Text style={styles.ingredientName}>{item.name}</Text>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                onPress={() =>
                  onQuantityChange(index, Math.max(0, item.quantity - 10))
                }
                style={styles.quantityButton}
              >
                <Ionicons
                  name="remove"
                  size={rf(16)}
                  color={ResponsiveTheme.colors.primary}
                />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{item.quantity || 100}g</Text>
              <TouchableOpacity
                onPress={() => onQuantityChange(index, item.quantity + 10)}
                style={styles.quantityButton}
              >
                <Ionicons
                  name="add"
                  size={rf(16)}
                  color={ResponsiveTheme.colors.primary}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.ingredientCalories}>
              {Math.round(item.calories || 0)} cal
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onRemoveIngredient(index)}
            style={styles.removeButton}
          >
            <Ionicons
              name="trash-outline"
              size={rf(20)}
              color={ResponsiveTheme.colors.error}
            />
          </TouchableOpacity>
        </View>
      ))}
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
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(8),
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rf(12),
    padding: rp(12),
    marginBottom: rh(8),
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(4),
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginVertical: rh(4),
  },
  quantityButton: {
    padding: rp(4),
  },
  quantityText: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.text,
    marginHorizontal: rw(8),
    minWidth: rw(50),
    textAlign: "center",
  },
  ingredientCalories: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
  removeButton: {
    padding: rp(8),
  },
});
