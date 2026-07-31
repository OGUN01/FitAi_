import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassButton } from '../ui/aurora/GlassButton';
import { flatColors as colors, spacing, borderRadius, typography } from '../../theme/aurora-tokens';
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_SOFT, TINT_ALPHA_MEDIUM } from '../../utils/colors';
import { rf, rp, rh, rw } from '../../utils/responsive';
import { MACRO_PILL_COLORS } from './macroColors';

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
  calories: colors.primary,
  protein: MACRO_PILL_COLORS.protein,
  carbs: MACRO_PILL_COLORS.carbs,
  fat: MACRO_PILL_COLORS.fat,
  fiber: MACRO_PILL_COLORS.fiber,
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 80) return colors.successAlt;
  if (confidence >= 60) return colors.warningAlt;
  return colors.errorAlt;
};

const getConfidenceLabel = (confidence: number) => {
  if (confidence >= 80) return 'High';
  if (confidence >= 60) return 'Medium';
  return 'Low';
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
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.successIconDisc}>
                <Ionicons name="checkmark-circle" size={rf(18)} color={colors.successAlt} />
              </View>
              <Text style={styles.title}>Meal Recognized</Text>
            </View>
            <View style={styles.headerBadges}>
              <View style={[styles.badge, { backgroundColor: `${confColor}20` }]}>
                <View style={[styles.badgeDot, { backgroundColor: confColor }]} />
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
          </Animated.View>

          {/* Food cards */}
          <Animated.View entering={FadeInDown.delay(60).duration(400)}>
            <ScrollView style={styles.foodList} showsVerticalScrollIndicator={false}>
              {recognizedFoods.map((food: any, idx: number) => (
                <View key={idx} style={styles.foodCard}>
                  <View style={styles.foodHeader}>
                    <View style={styles.foodIconDisc}>
                      <Ionicons name="restaurant-outline" size={rf(14)} color={colors.primary} />
                    </View>
                    <Text style={styles.foodName}>{food.localName || food.name}</Text>
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
          </Animated.View>

          {/* Total summary bar */}
          <Animated.View entering={FadeInDown.delay(120).duration(400)}>
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
                color={colors.textSecondary}
              />
              <Text style={styles.disclaimerText}>AI estimate — review before logging</Text>
            </View>
          </Animated.View>

          {/* Action buttons */}
          <Animated.View entering={FadeInDown.delay(180).duration(400)}>
            <GlassButton
              label="Accept & Log"
              onPress={onAccept}
              variant="primary"
              icon="checkmark-circle-outline"
              fullWidth
              style={styles.acceptButton}
              accessibilityLabel="Accept and log"
            />

            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={styles.outlineButton}
                activeOpacity={0.7}
                onPress={onAdjustPortions}
                accessibilityRole="button"
                accessibilityLabel="Adjust portions"
              >
                <Ionicons name="resize-outline" size={rf(16)} color={colors.primary} />
                <Text style={styles.outlineButtonText}>Adjust Portions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.outlineButton}
                activeOpacity={0.7}
                onPress={onFeedback}
                accessibilityRole="button"
                accessibilityLabel="Feedback"
              >
                <Ionicons name="chatbubble-outline" size={rf(16)} color={colors.primary} />
                <Text style={styles.outlineButtonText}>Feedback</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.7}
              onPress={onDismiss}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
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
  <View style={[styles.macroChip, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
    <Text style={[styles.macroChipLabel, { color }]}>{label}</Text>
    <Text style={[styles.macroChipValue, { color }]}>
      {value}
      {unit || ''}
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
    backgroundColor: colors.overlayDark,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: rp(32),
    maxHeight: rh(724),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  successIconDisc: {
    width: rw(34),
    height: rw(34),
    borderRadius: rw(17),
    backgroundColor: hexToRgba(colors.successAlt, TINT_ALPHA_LOW),
    borderWidth: 1,
    borderColor: hexToRgba(colors.successAlt, TINT_ALPHA_MEDIUM),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: rf(18),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rp(8),
    paddingVertical: rp(3),
    borderRadius: borderRadius.full,
    gap: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  mealTypeBadge: {
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_SOFT),
    paddingHorizontal: rp(8),
    paddingVertical: rp(3),
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
  },
  mealTypeText: {
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.primary,
  },
  foodList: {
    maxHeight: 280,
    marginBottom: spacing.sm,
  },
  foodCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  foodIconDisc: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  foodName: {
    fontSize: rf(14),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text,
    flex: 1,
  },
  foodServing: {
    fontSize: rf(12),
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  macroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: rp(7),
    paddingVertical: rp(3),
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  macroChipLabel: {
    fontSize: rf(10),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  macroChipValue: {
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.bold) as any,
    fontVariant: ['tabular-nums'],
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  totalItem: {
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: rf(11),
    color: colors.textSecondary,
    fontWeight: String(typography.fontWeight.semibold) as any,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  totalValue: {
    fontSize: rf(14),
    fontWeight: String(typography.fontWeight.bold) as any,
    fontVariant: ['tabular-nums'],
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  disclaimerText: {
    fontSize: rf(11),
    color: colors.textSecondary,
  },
  acceptButton: {
    marginBottom: spacing.sm,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  outlineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: rp(11),
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
  },
  outlineButtonText: {
    fontSize: rf(13),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.primary,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: rp(12),
  },
  cancelText: {
    fontSize: rf(13),
    color: colors.textSecondary,
  },
});
