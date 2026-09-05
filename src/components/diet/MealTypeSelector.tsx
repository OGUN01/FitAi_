// 🍽️ Meal Type Selection Overlay for Food Scanning
// Enhanced UI component for selecting meal type before food recognition

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MealType } from '../../services/foodRecognitionService';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
  border,
} from '../../theme/aurora-tokens';
import { hexToRgba, TINT_ALPHA_LOW } from '../../utils/colors';
import { haptics } from '../../utils/haptics';
import { rf, rh, rw, rs, rp, rbr } from '../../utils/responsive';
import { BottomSheet } from '../ui/aurora/BottomSheet';

interface MealTypeSelectorProps {
  visible: boolean;
  onSelect: (mealType: MealType) => void;
  onClose: () => void;
}

interface MealTypeOption {
  type: MealType;
  label: string;
  emoji: string;
  description: string;
  suggestedTime: string;
  color: string;
}

const mealTypeOptions: MealTypeOption[] = [
  {
    type: 'breakfast',
    label: 'Breakfast',
    emoji: '🌅',
    description: 'Start your day with nutritious fuel',
    suggestedTime: '6:00 - 10:00 AM',
    color: colors.warningAlt, // amber
  },
  {
    type: 'lunch',
    label: 'Lunch',
    emoji: '☀️',
    description: 'Midday energy boost and nutrients',
    suggestedTime: '12:00 - 2:00 PM',
    color: colors.successAlt, // emerald
  },
  {
    type: 'dinner',
    label: 'Dinner',
    emoji: '🌙',
    description: 'Evening meal for recovery and rest',
    suggestedTime: '6:00 - 9:00 PM',
    color: colors.primaryLight, // coral
  },
  {
    type: 'snack',
    label: 'Snack',
    emoji: '🍎',
    description: 'Quick bite between meals',
    suggestedTime: 'Anytime',
    color: colors.primary, // orange
  },
];

export const MealTypeSelector: React.FC<MealTypeSelectorProps> = ({
  visible,
  onSelect,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<MealType | null>(null);

  const handleSelect = (mealType: MealType) => {
    setSelectedType(mealType);
    haptics.light();
    onSelect(mealType);
    setSelectedType(null);
  };

  const getCurrentTimeBasedSuggestion = (): MealType => {
    const hour = new Date().getHours();
    if (hour < 10) return 'breakfast';
    if (hour < 16) return 'lunch';
    if (hour < 22) return 'dinner';
    return 'snack';
  };

  const suggestedMeal = getCurrentTimeBasedSuggestion();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      showCloseButton={false}
      contentStyle={styles.content}
      testID="meal-type-sheet"
    >
      {/* ── Header — custom (emoji + title + subtitle + chevron-down close),
          per the AdjustmentWizard.tsx pattern. This also removes the legacy
          RN `Animated` API in favor of BottomSheet's standard Reanimated
          spring motion. ── */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerEmoji}>🍽️</Text>
          <Text style={styles.headerTitle}>Select Meal Type</Text>
          <Text style={styles.headerSubtitle}>
            Choose what type of meal you're scanning for better accuracy
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close meal type selector"
        >
          <Ionicons name="chevron-down" size={rf(20)} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Time-based suggestion */}
        <View style={styles.suggestionBanner}>
          <Ionicons
            name="bulb-outline"
            size={rf(16)}
            color={colors.primaryLight}
            style={styles.suggestionIcon}
          />
          <Text style={styles.suggestionText}>
            Based on current time, we suggest:{' '}
            <Text style={styles.suggestionMeal}>
              {mealTypeOptions.find((m) => m.type === suggestedMeal)?.label}
            </Text>
          </Text>
        </View>

        {/* Meal type options */}
        <View style={styles.optionsContainer}>
          {mealTypeOptions.map((option) => {
            const isSelected = selectedType === option.type;
            const isSuggested = option.type === suggestedMeal;

            return (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                  isSuggested && styles.optionCardSuggested,
                ]}
                onPress={() => handleSelect(option.type)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.optionContent}>
                  <View
                    style={[styles.optionEmoji, { backgroundColor: hexToRgba(option.color, TINT_ALPHA_LOW) }]}
                  >
                    <Text style={styles.optionEmojiText}>{option.emoji}</Text>
                  </View>

                  <View style={styles.optionInfo}>
                    <View style={styles.optionHeader}>
                      <Text style={styles.optionLabel}>{option.label}</Text>
                      {isSuggested && (
                        <View style={styles.suggestedBadge}>
                          <Text style={styles.suggestedBadgeText}>Suggested</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                    <Text style={styles.optionTime}>{option.suggestedTime}</Text>
                  </View>

                  <View style={[styles.selectIndicator, { borderColor: option.color }]}>
                    {isSelected && (
                      <View
                        style={[
                          styles.selectIndicatorInner,
                          { backgroundColor: option.color },
                        ]}
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer tip */}
        <View style={styles.footer}>
          <Ionicons
            name="ribbon-outline"
            size={rf(16)}
            color={colors.primary}
            style={styles.footerIcon}
          />
          <Text style={styles.footerText}>
            Selecting the correct meal type helps our AI provide more accurate nutrition
            analysis
          </Text>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  // BottomSheet already supplies the sheet surface, backdrop fade,
  // drag-to-dismiss, and safe-area padding this modal used to hand-roll —
  // this sheet's own header/scrollView carry their own padding, so the
  // shared wrapper's default content padding is zeroed here.
  content: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  // Explicit maxHeight so the ScrollView scrolls within a bound instead of
  // depending on BottomSheet's unconstrained flex chain (mirrors
  // PaywallModal.tsx's scrollArea).
  scrollView: {
    maxHeight: rh(500),
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerContent: {
    flex: 1,
    alignItems: 'center',
  },

  headerEmoji: {
    fontSize: rf(32),
    marginBottom: spacing.sm,
  },

  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(18),
  },

  closeButton: {
    width: Math.max(rw(44), 44),
    height: Math.max(rw(44), 44),
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: border.subtle,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: spacing.lg,
    top: spacing.lg,
  },

  suggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },

  suggestionIcon: {
    marginRight: spacing.sm,
  },

  suggestionText: {
    fontSize: fontSize.sm,
    color: colors.primaryLight,
    flex: 1,
  },

  suggestionMeal: {
    fontWeight: typography.fontWeight.semibold,
  },

  optionsContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  optionCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  optionCardSelected: {
    borderColor: colors.primary,
    transform: [{ scale: 0.98 }],
  },

  optionCardSuggested: {
    // Accent hairline border is the suggested-state signal — no cast glow
    // shadows on Editorial Dark.
    borderColor: colors.primaryLight,
  },

  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },

  optionEmoji: {
    width: rw(56),
    height: rh(56),
    borderRadius: rs(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },

  optionEmojiText: {
    fontSize: rf(24),
  },

  optionInfo: {
    flex: 1,
  },

  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  optionLabel: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },

  suggestedBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: rp(8),
    paddingVertical: rp(2),
    borderRadius: rs(8),
  },

  suggestedBadgeText: {
    fontSize: rf(10),
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },

  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: rf(16),
  },

  optionTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.medium,
  },

  selectIndicator: {
    width: rw(24),
    height: rh(24),
    borderRadius: rs(12),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },

  selectIndicatorInner: {
    width: rw(12),
    height: rh(12),
    borderRadius: rs(6),
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },

  footerIcon: {
    marginRight: spacing.sm,
  },

  footerText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: rf(16),
  },
});

export default MealTypeSelector;
