import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rp } from "../../utils/responsive";
import { gradients, toLinearGradientProps } from "../../theme/gradients";

export interface ScanResultData {
  recognizedFoods: any[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  confidence: number;
  mealType: string;
  imageUri: string;
}

interface ScanResultModalProps {
  visible: boolean;
  scanResult: ScanResultData | null;
  onAccept: () => void;
  onAdjustPortions: () => void;
  onFeedback: () => void;
  onDismiss: () => void;
}

const MACRO_COLORS = {
  calories: "#F97316",
  protein: "#3B82F6",
  carbs: "#F59E0B",
  fat: "#10B981",
  fiber: "#8B5CF6",
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 80) return "#10B981";
  if (confidence >= 60) return "#F59E0B";
  return "#EF4444";
};

const getConfidenceLabel = (confidence: number) => {
  if (confidence >= 80) return "High";
  if (confidence >= 60) return "Medium";
  return "Low";
};

export const ScanResultModal: React.FC<ScanResultModalProps> = ({
  visible,
  scanResult,
  onAccept,
  onAdjustPortions,
  onFeedback,
  onDismiss,
}) => {
  if (!scanResult) return null;

  const {
    recognizedFoods,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    totalFiber,
    confidence,
    mealType,
  } = scanResult;

  const confColor = getConfidenceColor(confidence);
  const confLabel = getConfidenceLabel(confidence);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons
                name="checkmark-circle"
                size={rf(22)}
                color="#10B981"
              />
              <Text style={styles.title}>Meal Recognized</Text>
            </View>
            <View style={styles.headerBadges}>
              <View
                style={[styles.badge, { backgroundColor: `${confColor}20` }]}
              >
                <View
                  style={[styles.badgeDot, { backgroundColor: confColor }]}
                />
                <Text style={[styles.badgeText, { color: confColor }]}>
                  {confLabel} {confidence}%
                </Text>
              </View>
              <View style={styles.mealTypeBadge}>
                <Text style={styles.mealTypeText}>
                  {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* Food cards */}
          <ScrollView
            style={styles.foodList}
            showsVerticalScrollIndicator={false}
          >
            {recognizedFoods.map((food: any, idx: number) => (
              <View key={idx} style={styles.foodCard}>
                <View style={styles.foodHeader}>
                  <Text style={styles.foodName}>
                    {food.localName || food.name}
                  </Text>
                  <Text style={styles.foodServing}>
                    {food.userGrams ?? food.estimatedGrams ?? 100}g
                  </Text>
                </View>
                <View style={styles.macroRow}>
                  <MacroChip
                    label="Cal"
                    value={Math.round(food.nutrition?.calories || 0)}
                    color={MACRO_COLORS.calories}
                  />
                  <MacroChip
                    label="P"
                    value={Math.round((food.nutrition?.protein || 0) * 10) / 10}
                    unit="g"
                    color={MACRO_COLORS.protein}
                  />
                  <MacroChip
                    label="C"
                    value={Math.round((food.nutrition?.carbs || 0) * 10) / 10}
                    unit="g"
                    color={MACRO_COLORS.carbs}
                  />
                  <MacroChip
                    label="F"
                    value={Math.round((food.nutrition?.fat || 0) * 10) / 10}
                    unit="g"
                    color={MACRO_COLORS.fat}
                  />
                  <MacroChip
                    label="Fb"
                    value={Math.round((food.nutrition?.fiber || 0) * 10) / 10}
                    unit="g"
                    color={MACRO_COLORS.fiber}
                  />
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Total summary bar */}
          <View style={styles.totalBar}>
            <TotalItem
              label="Calories"
              value={Math.round(totalCalories)}
              color={MACRO_COLORS.calories}
            />
            <TotalItem
              label="Protein"
              value={`${Math.round(totalProtein * 10) / 10}g`}
              color={MACRO_COLORS.protein}
            />
            <TotalItem
              label="Carbs"
              value={`${Math.round(totalCarbs * 10) / 10}g`}
              color={MACRO_COLORS.carbs}
            />
            <TotalItem
              label="Fat"
              value={`${Math.round(totalFat * 10) / 10}g`}
              color={MACRO_COLORS.fat}
            />
          </View>

          {/* AI disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons
              name="information-circle-outline"
              size={rf(14)}
              color={ResponsiveTheme.colors.textSecondary}
            />
            <Text style={styles.disclaimerText}>
              AI estimate — review before logging
            </Text>
          </View>

          {/* Action buttons */}
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.8}
            onPress={onAccept}
          >
            <LinearGradient
              {...toLinearGradientProps(gradients.button.primary)}
              style={styles.primaryButtonGradient}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={rf(18)}
                color="#fff"
              />
              <Text style={styles.primaryButtonText}>Accept & Log</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.secondaryRow}>
            <TouchableOpacity
              style={styles.outlineButton}
              activeOpacity={0.7}
              onPress={onAdjustPortions}
            >
              <Ionicons
                name="resize-outline"
                size={rf(16)}
                color={ResponsiveTheme.colors.primary}
              />
              <Text style={styles.outlineButtonText}>Adjust Portions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outlineButton}
              activeOpacity={0.7}
              onPress={onFeedback}
            >
              <Ionicons
                name="chatbubble-outline"
                size={rf(16)}
                color={ResponsiveTheme.colors.primary}
              />
              <Text style={styles.outlineButtonText}>Feedback</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.7}
            onPress={onDismiss}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const MacroChip: React.FC<{
  label: string;
  value: number;
  unit?: string;
  color: string;
}> = ({ label, value, unit, color }) => (
  <View style={[styles.macroChip, { backgroundColor: `${color}15` }]}>
    <Text style={[styles.macroChipLabel, { color }]}>{label}</Text>
    <Text style={[styles.macroChipValue, { color }]}>
      {value}
      {unit || ""}
    </Text>
  </View>
);

const TotalItem: React.FC<{
  label: string;
  value: string | number;
  color: string;
}> = ({ label, value, color }) => (
  <View style={styles.totalItem}>
    <Text style={styles.totalLabel}>{label}</Text>
    <Text style={[styles.totalValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderTopLeftRadius: ResponsiveTheme.borderRadius.xl,
    borderTopRightRadius: ResponsiveTheme.borderRadius.xl,
    padding: ResponsiveTheme.spacing.lg,
    paddingBottom: rp(32),
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  title: {
    fontSize: rf(18),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rp(8),
    paddingVertical: rp(3),
    borderRadius: ResponsiveTheme.borderRadius.sm,
    gap: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: rf(11),
    fontWeight: "600",
  },
  mealTypeBadge: {
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
    paddingHorizontal: rp(8),
    paddingVertical: rp(3),
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  mealTypeText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  foodList: {
    maxHeight: 280,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  foodCard: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  foodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  foodName: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },
  foodServing: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "500",
    marginLeft: ResponsiveTheme.spacing.sm,
  },
  macroRow: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.xs,
    flexWrap: "wrap",
  },
  macroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: rp(7),
    paddingVertical: rp(3),
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  macroChipLabel: {
    fontSize: rf(10),
    fontWeight: "600",
  },
  macroChipValue: {
    fontSize: rf(11),
    fontWeight: "700",
  },
  totalBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  totalItem: {
    alignItems: "center",
  },
  totalLabel: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "500",
    marginBottom: 2,
  },
  totalValue: {
    fontSize: rf(14),
    fontWeight: "700",
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  disclaimerText: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
  },
  primaryButton: {
    marginBottom: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: "hidden",
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.xs,
    paddingVertical: rp(14),
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  primaryButtonText: {
    fontSize: rf(15),
    fontWeight: "700",
    color: "#fff",
  },
  secondaryRow: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  outlineButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.xs,
    paddingVertical: rp(11),
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary,
  },
  outlineButtonText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: rp(8),
  },
  cancelText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
  },
});
