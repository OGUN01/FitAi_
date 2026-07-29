/**
 * FuelTab — S4 "Fuel" ("Better than 2026" redesign).
 *
 * One focal question: "How do you eat?" Three answer-as-tap inputs:
 *   - Diet type: 5 large tappable tiles with a food glyph (accent ring + tint on select)
 *   - Meals: 4 toggle pills (Breakfast/Lunch/Dinner/Snacks) with off-state strike-through
 *   - Cooking skill: 3-step horizontal StepperRow with a live readout
 * Pure black, amber accent, QuestionHero + ScreenFrame + NavRail.
 *
 * Data wiring UNCHANGED: uses useDietPreferences → updateDietPreferences.
 * (allergies, cuisine, habits, readiness toggles — gone entirely from this screen.)
 */

import React, { useMemo, useCallback, useEffect } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { hexToRgba, TINT_ALPHA_LOW } from "../../../utils/colors";
import {
  ScreenFrame,
  StepperRow,
  TogglePillRow,
} from "../../../components/onboarding/aurora";
import type {
  StepperOption,
  TogglePillItem,
} from "../../../components/onboarding/aurora";
import { DietPreferencesData } from "../../../types/onboarding";
import { useDietPreferences } from "../../../hooks/onboarding/useDietPreferences";

const ACCENT = "#FBBF24";

interface FuelTabProps {
  data: DietPreferencesData | null;
  onUpdate: (data: Partial<DietPreferencesData>) => void;
  onNext: () => void;
  onBack: () => void;
  isAutoSaving?: boolean;
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
}

const fireSelection = () => Haptics.selectionAsync().catch(() => {});

// ── Diet type tiles (5) ────────────────────────────────────────────────────
// Values match DietPreferencesData["diet_type"] enum + the legacy DIET_TYPE_OPTIONS.
interface DietTypeOption {
  value: DietPreferencesData["diet_type"];
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}

const DIET_TYPE_OPTIONS: DietTypeOption[] = [
  { value: "non-veg", label: "Non-Veg", icon: "nutrition-outline" },
  { value: "vegetarian", label: "Vegetarian", icon: "leaf-outline" },
  { value: "vegan", label: "Vegan", icon: "flower-outline" },
  { value: "pescatarian", label: "Pescatarian", icon: "fish-outline" },
  { value: "balanced", label: "Balanced", icon: "restaurant-outline" },
];

// ── Meal toggle items ──────────────────────────────────────────────────────
const MEAL_ITEMS: TogglePillItem[] = [
  { id: "breakfast_enabled", label: "Breakfast" },
  { id: "lunch_enabled", label: "Lunch" },
  { id: "dinner_enabled", label: "Dinner" },
  { id: "snacks_enabled", label: "Snacks" },
];

// ── Cooking skill steps (3) ───────────────────────────────────────────────
// The type allows a 4th value ("not_applicable") which is intentionally deferred
// from this streamlined screen — only the 3 core skill levels are presented.
const COOKING_SKILL_OPTIONS: StepperOption[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

export const FuelTab: React.FC<FuelTabProps> = ({
  data,
  onUpdate,
  onNext,
  onBack,
  isEditingFromReview,
  onReturnToReview,
}) => {
  const { formData, updateField } = useDietPreferences({ data, onUpdate });

  // Push each field change to the parent immediately so the store stays in sync.
  // useDietPreferences only auto-saves when a validationResult is supplied; the
  // redesigned flow passes none, so we bridge the gap here.
  const handleField = useCallback(
    <K extends keyof DietPreferencesData>(field: K, value: DietPreferencesData[K]) => {
      updateField(field, value);
      onUpdate({ [field]: value } as Partial<DietPreferencesData>);
    },
    [updateField, onUpdate],
  );

  // One-shot mount-sync: useDietPreferences seeds local formData with smart
  // defaults (all meals enabled) that the completion gate + S4 Next require.
  // Without this, those defaults never reach the store (the hook only
  // auto-saves when a validationResult is supplied, which this flow omits),
  // so a user who accepts the meal defaults would fail "≥1 meal enabled".
  // Idempotent for returning users (formData initializes from `data`).
  useEffect(() => {
    onUpdate(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMealToggle = useCallback(
    (id: string, next: boolean) => {
      // Prevent turning off the last enabled meal — mirrors toggleMealPreference.
      if (!next) {
        const others = MEAL_ITEMS.filter((m) => m.id !== id).some(
          (m) => formData[m.id as keyof DietPreferencesData] === true,
        );
        if (!others) return;
      }
      fireSelection();
      handleField(id as keyof DietPreferencesData, next);
    },
    [formData, handleField],
  );

  // Live-validity for the Next gate: diet_type truthy AND ≥1 meal enabled.
  const canAdvance = useMemo(() => {
    return (
      !!formData.diet_type &&
      (formData.breakfast_enabled ||
        formData.lunch_enabled ||
        formData.dinner_enabled ||
        formData.snacks_enabled)
    );
  }, [
    formData.diet_type,
    formData.breakfast_enabled,
    formData.lunch_enabled,
    formData.dinner_enabled,
    formData.snacks_enabled,
  ]);

  const cookingReadout = useMemo(() => {
    const match = COOKING_SKILL_OPTIONS.find(
      (o) => o.id === formData.cooking_skill_level,
    );
    return match ? match.label : "Select skill";
  }, [formData.cooking_skill_level]);

  return (
    <ScreenFrame
      question="How do you eat?"
      reassurance="So your meals actually fit your life."
      onBack={onBack}
      onNext={onNext}
      nextLabel={isEditingFromReview ? "Review" : "Next"}
      disabled={!canAdvance}
      isEditingFromReview={isEditingFromReview}
      onReturnToReview={onReturnToReview}
      bloomColor={ACCENT}
      testID="onboarding-fuel-tab"
    >
      {/* Diet type — 5 tappable tiles */}
      <View>
        <Text style={styles.fieldLabel}>Diet type</Text>
        <View style={styles.dietGrid}>
          {DIET_TYPE_OPTIONS.map((opt) => (
            <DietTypeTile
              key={opt.value}
              label={opt.label}
              icon={opt.icon}
              selected={formData.diet_type === opt.value}
              accentColor={ACCENT}
              testID={`onboarding-diet-type-${opt.value}`}
              onPress={() => {
                fireSelection();
                handleField("diet_type", opt.value);
              }}
            />
          ))}
        </View>
      </View>

      {/* Meals — 4 toggle pills */}
      <View>
        <Text style={styles.fieldLabel}>Meals</Text>
        <TogglePillRow
          items={MEAL_ITEMS}
          value={{
            breakfast_enabled: formData.breakfast_enabled,
            lunch_enabled: formData.lunch_enabled,
            dinner_enabled: formData.dinner_enabled,
            snacks_enabled: formData.snacks_enabled,
          }}
          onToggle={handleMealToggle}
          accentColor={ACCENT}
          testID="onboarding-meals"
        />
      </View>

      {/* Cooking skill — 3-step stepper */}
      <View>
        <Text style={styles.fieldLabel}>Cooking skill</Text>
        <StepperRow
          options={COOKING_SKILL_OPTIONS}
          value={formData.cooking_skill_level}
          onSelect={(id) => {
            fireSelection();
            handleField(
              "cooking_skill_level",
              id as DietPreferencesData["cooking_skill_level"],
            );
          }}
          accentColor={ACCENT}
          readout={cookingReadout}
          testID="onboarding-cooking-skill"
        />
      </View>
    </ScreenFrame>
  );
};

// ── Diet type tile (mirrors YouTab's GenderTile) ────────────────────────────
interface DietTypeTileProps {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  selected: boolean;
  accentColor: string;
  testID: string;
  onPress: () => void;
}

const DietTypeTile: React.FC<DietTypeTileProps> = ({
  label,
  icon,
  selected,
  accentColor,
  testID,
  onPress,
}) => {
  const scale = useSharedValue(1);
  React.useEffect(() => {
    scale.value = withSpring(selected ? 1.03 : 1, { damping: 14, stiffness: 150 });
  }, [selected]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const selectedBg = hexToRgba(accentColor, TINT_ALPHA_LOW);

  return (
    <Animated.View style={[styles.dietTileWrap, animStyle]}>
      <Pressable
        onPress={onPress}
        testID={testID}
        style={[
          styles.dietTile,
          selected
            ? { backgroundColor: selectedBg, borderColor: accentColor }
            : { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.08)" },
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
      >
        <Ionicons
          name={icon}
          size={26}
          color={selected ? accentColor : colors.text.secondary}
          style={styles.dietIcon}
        />
        <Text
          style={[styles.dietLabel, { color: selected ? colors.text.primary : colors.text.secondary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fieldLabel: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    lineHeight: typography.variants.caption.fontSize * typography.variants.caption.lineHeight,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  dietGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  dietTileWrap: {
    // 5 tiles: 2-per-row wrap leaves the 5th centered — give each ~47% so two
    // fit per row with a gap, matching YouTab's gender grid rhythm.
    flexBasis: "47%",
    flexGrow: 1,
  },
  dietTile: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    minHeight: 92,
  },
  dietIcon: {
    marginBottom: spacing.xs,
  },
  dietLabel: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: typography.variants.cardHeadline.fontSize,
    lineHeight: typography.variants.cardHeadline.fontSize * typography.variants.cardHeadline.lineHeight,
  },
});

export default FuelTab;
