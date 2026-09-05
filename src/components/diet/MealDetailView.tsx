import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import type { DayMeal, MealItem } from '../../types/ai';
import { getMealTime, MealSchedule } from '../../utils/mealSchedule';
import { getMealPlanStatus } from './dietViewModel';
import { StatusPill } from './StatusPill';
import { Accordion } from './Accordion';
import { GlassButton } from '../ui/aurora/GlassButton';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { Confetti } from '../ui/aurora/Confetti';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { MACRO_PILL_COLORS } from './macroColors';
import {
  borderRadius,
  flatColors as colors,
  flatFontSize as fontSize,
  spacing,
  typography,
} from '../../theme/aurora-tokens';
import { rf, rw, rp, rh, rbr } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_SOFT } from '../../utils/colors';
import { crossPlatformAlert } from '../../utils/crossPlatformAlert';
import { haptics } from '../../utils/haptics';
import { fontFamilyForWeight } from '../../theme/fonts';

const MEAL_TYPE_ICONS: Record<DayMeal['type'], string> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'cafe-outline',
};

const MEAL_TYPE_LABELS: Record<DayMeal['type'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

// Approximates the header row's content height (backButton height +
// paddingVertical on both sides — see styles.header/backButton) so the
// overflow menu, now rendered in its own top-level Modal instead of nested
// under the header, still visually sits right below the "..." button.
const OVERFLOW_MENU_TOP_OFFSET = Math.max(rw(40), 44) + spacing.sm * 2;

export interface MealDetailViewProps {
  meal: DayMeal;
  isCompleted: boolean;
  /** 0-100 logged progress for the meal; drives the StatusPill so it matches
   * MealsTimeline (which derives status from progress, not just completed). */
  progress?: number | null;
  onBack: () => void;
  onLogMeal?: (meal: DayMeal) => void;
  onSwapMeal?: (meal: DayMeal) => void;
  onShareMeal?: (meal: DayMeal) => void;
  onEditMeal?: (meal: DayMeal) => void;
  onDeleteMeal?: (meal: DayMeal) => void;
  isCompleting?: boolean;
  isSwapping?: boolean;
  mealSchedule?: MealSchedule;
  /** ISO date of the day being viewed, for time-aware status derivation. */
  selectedDate?: string | null;
  testID?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Macro blocks — kcal is the hero metric (visually larger, stronger tint);
// P/C/F are secondary (smaller, lighter tint). Reflects the data hierarchy:
// calories is the headline number, macros are the breakdown.
// ────────────────────────────────────────────────────────────────────────────

interface HeroMacroBlockProps {
  value: number;
  label: string;
  unit?: string;
  color: string;
}

const HeroMacroBlock = React.memo(({ value, label, unit, color }: HeroMacroBlockProps) => (
  <View style={[styles.heroMacroBlock, { backgroundColor: hexToRgba(color, TINT_ALPHA_SOFT) }]}>
    <Text
      style={[styles.heroMacroValue, { color }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      {Math.round(value || 0)}
      {unit ? <Text style={styles.heroMacroUnit}>{unit}</Text> : null}
    </Text>
    <Text style={styles.heroMacroLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
));

interface MacroBlockProps {
  value: number;
  label: string;
  unit?: string;
  color: string;
}

const MacroBlock = React.memo(({ value, label, unit, color }: MacroBlockProps) => (
  <View style={[styles.macroBlock, { backgroundColor: hexToRgba(color, TINT_ALPHA_LOW) }]}>
    <Text
      style={[styles.macroBlockValue, { color }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      {Math.round(value || 0)}
      {unit ? <Text style={styles.macroBlockUnit}>{unit}</Text> : null}
    </Text>
    <Text style={styles.macroBlockLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
));

interface MetaChipProps {
  icon: string;
  text: string;
}

const MetaChip = React.memo(({ icon, text }: MetaChipProps) => (
  <View style={styles.metaChip}>
    <Ionicons
      name={icon as keyof typeof Ionicons.glyphMap}
      size={rf(13)}
      color={colors.textSecondary}
    />
    <Text style={styles.metaChipText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
      {text}
    </Text>
  </View>
));

// ────────────────────────────────────────────────────────────────────────────
// Ingredient row — cook-along: tappable to toggle a local "checked" visual
// state (strikethrough + reduced opacity + check-circle icon). Pure local UI
// state; no data mutation. Lets the user track progress as they cook.
// ────────────────────────────────────────────────────────────────────────────

interface FoodItemRowProps {
  item: MealItem;
  index: number;
  isLast: boolean;
  checked: boolean;
  onToggle: (index: number) => void;
}

const FoodItemRow = React.memo(({ item, index, isLast, checked, onToggle }: FoodItemRowProps) => {
  const name = item.name || item.food?.name || 'Food item';
  const quantityStr =
    typeof item.quantity === 'string' && item.quantity.length > 0
      ? item.quantity
      : `${item.amount || item.quantity || 1} ${item.unit || 'serving'}`;
  const calories = Math.round(item.calories || 0);

  return (
    <Pressable
      onPress={() => onToggle(index)}
      accessibilityRole="button"
      accessibilityLabel={`Mark ${name} as prepared`}
      accessibilityState={{ checked }}
      style={({ pressed }) => [
        styles.foodItem,
        isLast && styles.foodItemLast,
        pressed && styles.foodItemPressed,
      ]}
    >
      <View style={styles.foodItemCheckWrap}>
        {checked ? (
          <Ionicons name="checkmark-circle" size={rf(20)} color={colors.success} />
        ) : (
          <View style={styles.foodItemBullet} />
        )}
      </View>
      <View style={styles.foodItemLeft}>
        <Text
          style={[styles.foodItemName, checked && styles.foodItemNameChecked]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {name}
        </Text>
      </View>
      <View style={styles.foodItemRight}>
        <Text
          style={[styles.foodItemQuantity, checked && styles.foodItemTextChecked]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {quantityStr}
        </Text>
        <Text
          style={[styles.foodItemCalories, checked && styles.foodItemTextChecked]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {calories} cal
        </Text>
      </View>
    </Pressable>
  );
});

// ────────────────────────────────────────────────────────────────────────────
// Recipe step viewer — one step at a time with a progress dot indicator and
// Next/Back nav. Pure local state (currentStep). When there is only a single
// step it renders expanded with no navigation. Each step sits in a glass card.
// ────────────────────────────────────────────────────────────────────────────

interface StepViewerProps {
  steps: Array<{ step: number; instruction: string; timeRequired?: number }>;
}

const StepViewer: React.FC<StepViewerProps> = ({ steps }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const total = steps.length;

  if (total === 0) return null;

  if (total === 1) {
    const s = steps[0];
    return (
      <View style={styles.stepCard}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{s.step || 1}</Text>
        </View>
        <Text style={styles.stepText}>{s.instruction}</Text>
      </View>
    );
  }

  const s = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === total - 1;

  const goBack = () => {
    if (isFirst) return;
    haptics.light?.();
    setCurrentStep((p) => Math.max(0, p - 1));
  };
  const goNext = () => {
    if (isLast) return;
    haptics.light?.();
    setCurrentStep((p) => Math.min(total - 1, p + 1));
  };

  return (
    <View style={styles.stepViewer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepCounter}>
          Step {currentStep + 1} of {total}
        </Text>
      </View>

      {/* Single position indicator only: the "Step X of Y" counter above.
          (The numbered badge is kept for the single-step card, which has no
          counter.) */}
      <View style={styles.stepCard}>
        <Text style={styles.stepText}>{s.instruction}</Text>
      </View>

      <View style={styles.stepNav}>
        <Pressable
          onPress={goBack}
          disabled={isFirst}
          accessibilityRole="button"
          accessibilityLabel="Previous step"
          style={({ pressed }) => [
            styles.stepNavBtn,
            styles.stepNavBtnBack,
            isFirst && styles.stepNavBtnDisabled,
            pressed && !isFirst && styles.foodItemPressed,
          ]}
        >
          <Ionicons name="chevron-back" size={rf(16)} color={colors.primary} />
          <Text style={styles.stepNavBtnText}>Back</Text>
        </Pressable>
        <Pressable
          onPress={goNext}
          disabled={isLast}
          accessibilityRole="button"
          accessibilityLabel="Next step"
          style={({ pressed }) => [
            styles.stepNavBtn,
            styles.stepNavBtnNext,
            isLast && styles.stepNavBtnDisabled,
            pressed && !isLast && styles.foodItemPressed,
          ]}
        >
          <Text style={styles.stepNavBtnText}>Next</Text>
          <Ionicons name="chevron-forward" size={rf(16)} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
};

export const MealDetailView: React.FC<MealDetailViewProps> = ({
  meal,
  isCompleted,
  progress,
  onBack,
  onLogMeal,
  onSwapMeal,
  onShareMeal,
  onEditMeal,
  onDeleteMeal,
  isCompleting = false,
  isSwapping = false,
  mealSchedule,
  selectedDate,
  testID = 'meal-detail-view',
}) => {
  // Bottom safe-area inset — the sticky action bar (Mark as Completed /
  // Swap) sits at the screen bottom. The parent overlay's SafeAreaView only
  // guards `edges={['top']}`, so without this the CTAs crowd the home
  // indicator on notched devices. Apply to the sticky bar's bottom padding.
  const insets = useSafeAreaInsets();
  const [celebrate, setCelebrate] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);

  // Cook-along ingredient check state — local only, never mutates meal data.
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const toggleItem = useCallback((index: number) => {
    haptics.light?.();
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleBack = useCallback(() => onBack(), [onBack]);
  const handleLogMeal = useCallback(() => {
    // Celebration fires BEFORE the parent callback so the burst + haptic
    // land the instant the user commits the meal, then the parent does the
    // actual completion/log work. `haptics.celebration?.()` is optional-
    // chained because some test harnesses mock `haptics` as `{ trigger }` only.
    haptics.celebration?.();
    setCelebrate(true);
    onLogMeal?.(meal);
  }, [onLogMeal, meal]);
  const handleSwapMeal = useCallback(() => {
    onSwapMeal?.(meal);
  }, [onSwapMeal, meal]);
  const runOverflowAction = useCallback(
    (action: (meal: DayMeal) => void) => {
      setShowOverflow(false);
      action(meal);
    },
    [meal]
  );
  const handleDeleteMeal = useCallback(() => {
    if (!onDeleteMeal) return;
    setShowOverflow(false);
    crossPlatformAlert(
      'Delete Meal',
      `Delete ${meal.name || 'this meal'}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteMeal(meal),
        },
      ]
    );
  }, [meal, onDeleteMeal]);

  const mealLabel = MEAL_TYPE_LABELS[meal.type] ?? meal.type;
  const iconName = MEAL_TYPE_ICONS[meal.type] ?? 'restaurant-outline';
  const calories = Math.round(meal.totalCalories || 0);
  const protein = Math.round(meal.totalMacros?.protein || 0);
  const carbs = Math.round(meal.totalMacros?.carbohydrates || 0);
  const fat = Math.round(meal.totalMacros?.fat || 0);
  const fiber = Math.round(meal.totalMacros?.fiber || 0);

  // Status must match MealsTimeline, which derives from progress (0/1-99/100)
  // AND scheduled time, not just the boolean completed flag. Falls back to the
  // completed flag when no progress is supplied so the pill never reads
  // "upcoming" for a logged meal.
  const scheduledTime = useMemo(
    () => (mealSchedule ? getMealTime(meal.type, mealSchedule) : null),
    [meal.type, mealSchedule]
  );
  const status =
    progress != null
      ? getMealPlanStatus(progress, scheduledTime, selectedDate)
      : isCompleted
        ? 'completed'
        : 'upcoming';

  const prepTime = meal.preparationTime || meal.prepTime || null;

  const foodItems = useMemo(() => meal.items ?? meal.foods ?? [], [meal.items, meal.foods]);

  const cookingInstructions = useMemo(
    () => meal.cookingInstructions ?? [],
    [meal.cookingInstructions]
  );
  const instructionNotes = useMemo(
    () =>
      (meal.instructions ?? []).filter(
        (instruction) =>
          instruction.trim().length > 0 &&
          !cookingInstructions.some(
            (step) => step.instruction.trim().toLowerCase() === instruction.trim().toLowerCase()
          )
      ),
    [meal.instructions, cookingInstructions]
  );

  const heroImageUrl = meal.imageUrl || null;
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  // Hero image renders at its NATIVE aspect ratio so the full dish photo is
  // visible with no crop AND no empty side-bars (the two failure modes of
  // "cover" and "contain" in a mismatched box). The box itself is sized to
  // the image's aspect ratio: width = screen for landscape/square, or a
  // proportionally narrower centered width for tall portraits that would
  // otherwise exceed the max height. Because the box matches the image's
  // aspect, contain == cover (edge-to-edge, no crop, no gaps) and the image
  // looks properly aligned regardless of orientation.
  const [heroAspect, setHeroAspect] = useState<number | null>(null);
  const HERO_MAX_HEIGHT = rh(320);
  const HERO_FALLBACK_HEIGHT = rh(220);
  const heroBox = (() => {
    if (!heroAspect) {
      return { width: screenWidth, height: HERO_FALLBACK_HEIGHT };
    }
    const fullHeight = screenWidth / heroAspect; // natural height at full width
    if (fullHeight <= HERO_MAX_HEIGHT) {
      // Landscape/square — fill the screen width.
      return { width: screenWidth, height: fullHeight };
    }
    // Tall portrait — cap height, shrink width proportionally so the box
    // still matches the image aspect (no gaps), centered horizontally.
    return { width: HERO_MAX_HEIGHT * heroAspect, height: HERO_MAX_HEIGHT };
  })();
  const heroWidth = heroBox.width;
  const heroHeight = heroBox.height;

  useEffect(() => {
    if (!heroImageUrl) {
      setHeroAspect(null);
      return;
    }
    // Reset the previous meal's aspect so the box doesn't briefly render at a
    // stale ratio before Image.getSize resolves for the new URL.
    setHeroAspect(null);
    let cancelled = false;
    Image.getSize(
      heroImageUrl,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setHeroAspect(w / h);
      },
      () => {
        // Size fetch failed (network/CORS) — keep the 220px fallback height.
      }
    );
    return () => {
      cancelled = true;
    };
  }, [heroImageUrl]);

  // Hero parallax — the hero image translates at half the scroll velocity so
  // it reads as receding into the page as the user scrolls the content up.
  // Subtle (0.5× factor); keeps the native aspect-ratio sizing logic intact.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
  const heroParallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * 0.5 }],
  }));

  const insights = useMemo(() => {
    const result: string[] = [];
    if (protein > 0 && carbs > 0) {
      const ratio = (protein / carbs).toFixed(1);
      result.push(
        `Protein-to-carb ratio is ${ratio}:1 — ${ratio >= '1' ? 'great for muscle recovery' : 'balanced for sustained energy'}.`
      );
    }
    if (fiber >= 8) {
      result.push(`High fiber content (${fiber}g) supports digestion and satiety.`);
    } else if (fiber > 0) {
      result.push(`Contains ${fiber}g of fiber for digestive support.`);
    }
    if (calories > 0) {
      if (calories < 300) {
        result.push(`Light meal at ${calories} kcal — ideal for a snack or light course.`);
      } else if (calories < 600) {
        result.push(`Balanced ${calories} kcal meal — fits most daily calorie targets.`);
      } else {
        result.push(`Hearty ${calories} kcal meal — consider portion sizes if tracking calories.`);
      }
    }
    if (fat > 0 && protein > 0) {
      if (fat > protein) {
        result.push(`Higher fat-to-protein ratio — satiating and suitable for low-carb diets.`);
      } else {
        result.push(`Protein-forward profile with ${protein}g — supports muscle maintenance.`);
      }
    }
    return result.length > 0
      ? result
      : ['Detailed nutrition insights will be available after AI analysis.'];
  }, [protein, carbs, fiber, calories, fat]);

  const mealName = meal.name || mealLabel;

  return (
    <View style={styles.container} testID={testID}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <AnimatedPressable
            onPress={handleBack}
            scaleValue={0.92}
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel="Back to meals list"
            testID="meal-detail-back"
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={rf(22)} color={colors.text} />
          </AnimatedPressable>
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Meal Details
          </Text>
          <AnimatedPressable
            onPress={() => setShowOverflow((visible) => !visible)}
            disabled={!onShareMeal && !onEditMeal && !onDeleteMeal}
            scaleValue={0.92}
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel="Meal options"
            accessibilityState={{
              disabled: !onShareMeal && !onEditMeal && !onDeleteMeal,
              expanded: showOverflow,
            }}
            testID="meal-detail-overflow"
            style={[
              styles.backButton,
              !onShareMeal && !onEditMeal && !onDeleteMeal && styles.headerButtonDisabled,
            ]}
          >
            <Ionicons name="ellipsis-horizontal" size={rf(22)} color={colors.text} />
          </AnimatedPressable>
        </View>
      </SafeAreaView>

      {/* Was an absolutely-positioned View nested inside the header's
          SafeAreaView, a sibling of the Animated.ScrollView body below it.
          Since the ScrollView is declared later in the tree, it painted (and
          crucially, touch-dispatched) ON TOP of the menu wherever the two
          visually overlapped — the menu was visible in screenshots but its
          items silently never received taps. A transparent Modal renders in
          its own top-level native window, immune to any sibling ordering. */}
      {showOverflow ? (
        <Modal
          visible={showOverflow}
          transparent
          animationType="fade"
          onRequestClose={() => setShowOverflow(false)}
        >
          <Pressable
            style={styles.overflowBackdrop}
            onPress={() => setShowOverflow(false)}
            accessibilityLabel="Close meal options"
          >
            <View
              style={[styles.overflowMenu, { top: insets.top + OVERFLOW_MENU_TOP_OFFSET }]}
              accessibilityRole="menu"
            >
              {onShareMeal ? (
                <Pressable
                  style={styles.overflowItem}
                  accessibilityRole="menuitem"
                  onPress={() => runOverflowAction(onShareMeal)}
                >
                  <Ionicons name="share-outline" size={rf(18)} color={colors.text} />
                  <Text style={styles.overflowText}>Share</Text>
                </Pressable>
              ) : null}
              {onEditMeal ? (
                <Pressable
                  style={styles.overflowItem}
                  accessibilityRole="menuitem"
                  onPress={() => runOverflowAction(onEditMeal)}
                >
                  <Ionicons name="create-outline" size={rf(18)} color={colors.text} />
                  <Text style={styles.overflowText}>Edit</Text>
                </Pressable>
              ) : null}
              {onDeleteMeal ? (
                <Pressable
                  style={styles.overflowItem}
                  accessibilityRole="menuitem"
                  onPress={handleDeleteMeal}
                >
                  <Ionicons name="trash-outline" size={rf(18)} color={colors.error} />
                  <Text style={[styles.overflowText, { color: colors.error }]}>Delete Meal</Text>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        </Modal>
      ) : null}

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Hero — image (or placeholder) with a bottom gradient scrim so the
            overlaid meal name + time caption read cleanly, a 1px inner hair-
            line border, and a subtle success-tinted vignette when the meal is
            already completed. Parallax: the hero translates slower than the
            scrolling content for a depth cue. */}
        <Animated.View style={[styles.heroParallaxWrap, heroParallaxStyle]}>
          {heroImageUrl ? (
            <View style={styles.heroContainer}>
              <Image
                source={{ uri: heroImageUrl }}
                style={[styles.heroImage, { width: heroWidth, height: heroHeight }]}
                resizeMode="cover"
              />
              <LinearGradient
                colors={[hexToRgba(colors.background, 0), hexToRgba(colors.background, 0.6)]}
                style={[styles.heroScrim, { width: heroWidth, height: rh(140) }]}
                pointerEvents="none"
              />
              {isCompleted ? (
                <View
                  style={[styles.heroSuccessVignette, { width: heroWidth, height: heroHeight }]}
                  pointerEvents="none"
                />
              ) : null}
              <View style={styles.heroInnerBorder} pointerEvents="none" />
              <View style={[styles.heroOverlay, { width: heroWidth }]}>
                <Text
                  style={styles.heroOverlayName}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {mealName}
                </Text>
                {scheduledTime ? (
                  <Text style={styles.heroOverlayTime} numberOfLines={1}>
                    Scheduled: {scheduledTime}
                    {prepTime ? `  ·  ${prepTime} min prep` : ''}
                  </Text>
                ) : prepTime ? (
                  <Text style={styles.heroOverlayTime} numberOfLines={1}>
                    {prepTime} min prep
                  </Text>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={[styles.heroPlaceholderWrap, { width: screenWidth }]}>
              <View style={[styles.heroPlaceholder, { width: screenWidth }]}>
                <Ionicons name="restaurant-outline" size={rf(48)} color={colors.textMuted} />
              </View>
              <LinearGradient
                colors={[hexToRgba(colors.background, 0), hexToRgba(colors.background, 0.6)]}
                style={[styles.heroScrim, { width: screenWidth, height: rh(140) }]}
                pointerEvents="none"
              />
              <View style={styles.heroInnerBorder} pointerEvents="none" />
              <View style={[styles.heroOverlay, { width: screenWidth }]}>
                <Text
                  style={styles.heroOverlayName}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {mealName}
                </Text>
                {scheduledTime ? (
                  <Text style={styles.heroOverlayTime} numberOfLines={1}>
                    Scheduled: {scheduledTime}
                    {prepTime ? `  ·  ${prepTime} min prep` : ''}
                  </Text>
                ) : prepTime ? (
                  <Text style={styles.heroOverlayTime} numberOfLines={1}>
                    {prepTime} min prep
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.headerSection}>
          {/* The meal-type label itself lives in the screen header — this row
              carries only new info (type icon + status pill). */}
          <View style={styles.typeRow}>
            <View style={styles.typeIconWrap}>
              <Ionicons
                name={iconName as keyof typeof Ionicons.glyphMap}
                size={rf(16)}
                color={colors.primary}
              />
            </View>
            <View style={styles.statusPillWrap}>
              <StatusPill status={status} size="md" />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(300)} style={styles.macroStrip}>
          <HeroMacroBlock value={calories} label="kcal" color={colors.primary} />
          <MacroBlock value={protein} label="Protein" unit="g" color={MACRO_PILL_COLORS.protein} />
          <MacroBlock value={carbs} label="Carbs" unit="g" color={MACRO_PILL_COLORS.carbs} />
          <MacroBlock value={fat} label="Fat" unit="g" color={MACRO_PILL_COLORS.fat} />
          <MacroBlock value={fiber} label="Fiber" unit="g" color={MACRO_PILL_COLORS.fiber} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(300)} style={styles.metaChipsRow}>
          <MetaChip
            icon="time-outline"
            text={prepTime ? `${prepTime} min prep` : 'Prep time unavailable'}
          />
          <MetaChip
            icon="flame-outline"
            text={
              meal.cookingTime || meal.cookTime
                ? `${meal.cookingTime || meal.cookTime} min cook`
                : 'Cook time unavailable'
            }
          />
          <MetaChip icon="barbell-outline" text={meal.difficulty || 'Difficulty unavailable'} />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(320).duration(300)}
          style={styles.accordionSection}
        >
          <Accordion
            title="Ingredients"
            subtitle={foodItems.length > 0 ? `${foodItems.length} items` : undefined}
            defaultOpen={true}
          >
            {foodItems.length > 0 ? (
              <View style={styles.foodItemsList}>
                {foodItems.map((item, index) => (
                  <FoodItemRow
                    key={item.id || `food-item-${index}`}
                    item={item}
                    index={index}
                    isLast={index === foodItems.length - 1}
                    checked={checkedItems.has(index)}
                    onToggle={toggleItem}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.emptySectionText}>No ingredient details available.</Text>
            )}
          </Accordion>

          <Accordion title="Recipe" subtitle="Meal overview" defaultOpen={false}>
            {meal.description ? (
              <Text style={styles.sectionBodyText}>{meal.description}</Text>
            ) : (
              <Text style={styles.emptySectionText}>No recipe overview available.</Text>
            )}
          </Accordion>

          <Accordion
            title="Instructions"
            subtitle={
              cookingInstructions.length > 0 ? `${cookingInstructions.length} steps` : undefined
            }
            defaultOpen={false}
          >
            {cookingInstructions.length > 0 ? (
              <StepViewer steps={cookingInstructions} />
            ) : instructionNotes.length > 0 ? (
              <View style={styles.instructionList}>
                {instructionNotes.map((instruction, index) => (
                  <Text key={`instruction-${index}`} style={styles.sectionBodyText}>
                    {index + 1}. {instruction}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.emptySectionText}>No preparation instructions available.</Text>
            )}
          </Accordion>

          <Accordion title="Nutrition Insights" subtitle="Smart notes" defaultOpen={false}>
            <View style={styles.insightsList}>
              {insights.map((insight, index) => (
                <View key={`insight-${index}`} style={styles.insightRow}>
                  <Ionicons name="nutrition-outline" size={rf(14)} color={colors.successBright} />
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))}
            </View>
          </Accordion>
        </Animated.View>

        <View style={styles.bottomSpacing} />
      </Animated.ScrollView>

      <View style={[styles.stickyActions, { paddingBottom: Math.max(insets.bottom, rp(24)) }]}>
        <View style={styles.actionRow}>
          <GlassButton
            label={isCompleted ? 'Completed' : 'Mark as Completed'}
            onPress={handleLogMeal}
            variant="success"
            icon={isCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
            loading={isCompleting}
            disabled={isCompleted || !onLogMeal || isSwapping}
            fullWidth
          />
          <GlassButton
            label="Swap This Meal"
            onPress={handleSwapMeal}
            variant="secondary"
            icon="swap-horizontal-outline"
            loading={isSwapping}
            disabled={!onSwapMeal || isCompleting || isCompleted}
            fullWidth
          />
        </View>
      </View>

      {/* Celebration burst — mounted at the view root (not inside the
        ScrollView) so it overlays the top of the viewport regardless of
        scroll position. Fires once on "Mark as Completed" via `celebrate`,
        then resets via onComplete. */}
      <Confetti
        trigger={celebrate}
        particleCount={30}
        // Burst from bottom-center (above the "Mark as Completed" CTA) so the
        // celebration reads as rising from the action the user just took, not
        // from the top-left viewport corner. Measuring the exact button
        // position is avoided pre-launch for timing-robustness.
        origin={{ x: screenWidth / 2, y: screenHeight - 120 }}
        onComplete={() => setCelebrate(false)}
        style={styles.confettiOverlay}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.xl,
    fontFamily: fontFamilyForWeight('bold'),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text,
  },
  headerButtonDisabled: {
    opacity: 0.35,
  },
  overflowBackdrop: {
    flex: 1,
  },
  overflowMenu: {
    // `top` is set inline (insets.top + OVERFLOW_MENU_TOP_OFFSET) — this
    // now renders inside a full-screen Modal, not nested under the header,
    // so it has no header box to anchor `top: '100%'` against any more.
    position: 'absolute' as const,
    right: spacing.md,
    minWidth: rw(170),
    padding: spacing.xs,
    borderRadius: rbr(borderRadius.md),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  overflowItem: {
    minHeight: 44,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  overflowText: {
    fontSize: fontSize.sm,
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: rh(120),
    // Breathing room between the staggered sections (hero → header → macros →
    // chips → description → accordions) so the detail doesn't read cramped.
    gap: spacing.sm,
  },
  // ── Hero ──────────────────────────────────────────────────────────────
  heroParallaxWrap: {
    // Wraps the hero so the parallax transform applies to the whole hero
    // block (image + overlays) as a unit.
  },
  heroContainer: {
    position: 'relative' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.backgroundSecondary,
  },
  heroImage: {
    height: rh(220),
    borderRadius: rbr(borderRadius.lg),
    overflow: 'hidden' as const,
  },
  heroPlaceholderWrap: {
    position: 'relative' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.backgroundSecondary,
  },
  heroPlaceholder: {
    height: rh(220),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: rbr(borderRadius.lg),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  heroScrim: {
    position: 'absolute' as const,
    bottom: 0,
    borderBottomLeftRadius: rbr(borderRadius.lg),
    borderBottomRightRadius: rbr(borderRadius.lg),
  },
  // Subtle 1px inner hairline border framing the hero.
  heroInnerBorder: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: rbr(borderRadius.lg),
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Very low-opacity success tint layered over the hero when the meal is
  // already completed — a quiet celebratory cue without obscuring the dish.
  heroSuccessVignette: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    borderRadius: rbr(borderRadius.lg),
    backgroundColor: hexToRgba(colors.success, 0.08),
  },
  heroOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    zIndex: 2,
  },
  heroOverlayName: {
    fontSize: fontSize.xl,
    fontFamily: fontFamilyForWeight('bold'),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: rf(26),
  },
  heroOverlayTime: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  // ── Header section ─────────────────────────────────────────────────────
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  typeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  typeIconWrap: {
    width: rw(32),
    height: rw(32),
    borderRadius: rbr(borderRadius.md),
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  statusPillWrap: {
    marginLeft: 'auto' as const,
  },
  // ── Macro strip ────────────────────────────────────────────────────────
  macroStrip: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.lg,
  },
  // kcal hero block — visually emphasized (larger number, stronger tint).
  heroMacroBlock: {
    flex: 1.4,
    alignItems: 'center' as const,
    paddingVertical: spacing.md,
    borderRadius: rbr(borderRadius.md),
  },
  heroMacroValue: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamilyForWeight('extrabold'),
    fontWeight: String(typography.fontWeight.extrabold) as any,
    fontVariant: ['tabular-nums'],
  },
  heroMacroUnit: {
    fontSize: fontSize.sm,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  heroMacroLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  // P/C/F secondary blocks — smaller, lighter tint.
  macroBlock: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: spacing.sm,
    borderRadius: rbr(borderRadius.md),
  },
  macroBlockValue: {
    fontSize: fontSize.md,
    fontFamily: fontFamilyForWeight('bold'),
    fontWeight: String(typography.fontWeight.bold) as any,
    fontVariant: ['tabular-nums'],
  },
  macroBlockUnit: {
    fontSize: fontSize.xs,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  macroBlockLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  // ── Meta chips ─────────────────────────────────────────────────────────
  metaChipsRow: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  metaChip: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  metaChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
  // ── Accordion section ──────────────────────────────────────────────────
  accordionSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  foodItemsList: {
    marginTop: spacing.xs,
  },
  foodItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  foodItemLast: {
    borderBottomWidth: 0,
  },
  foodItemPressed: {
    opacity: 0.7,
  },
  foodItemCheckWrap: {
    width: rw(28),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: spacing.sm,
  },
  foodItemBullet: {
    width: rw(8),
    height: rw(8),
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
  },
  foodItemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  foodItemName: {
    fontSize: fontSize.md,
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text,
  },
  foodItemNameChecked: {
    textDecorationLine: 'line-through' as const,
    opacity: 0.4,
  },
  foodItemTextChecked: {
    opacity: 0.4,
  },
  foodItemRight: {
    alignItems: 'flex-end' as const,
    gap: rp(2),
  },
  foodItemQuantity: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  foodItemCalories: {
    fontSize: fontSize.sm,
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  // ── Recipe step viewer ─────────────────────────────────────────────────
  stepViewer: {
    marginTop: spacing.xs,
  },
  stepHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.sm,
  },
  stepCounter: {
    fontSize: fontSize.xs,
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.textSecondary,
  },
  stepCard: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: rbr(borderRadius.lg),
    backgroundColor: colors.backgroundTertiary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stepBadge: {
    width: rw(24),
    height: rw(24),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  stepBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: rf(20),
  },
  stepNav: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stepNavBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: rbr(borderRadius.md),
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stepNavBtnBack: {},
  stepNavBtnNext: {},
  stepNavBtnDisabled: {
    opacity: 0.4,
  },
  stepNavBtnText: {
    fontSize: fontSize.sm,
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.primary,
  },
  // ── Insights ──────────────────────────────────────────────────────────
  insightsList: {
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  insightRow: {
    flexDirection: 'row' as const,
    gap: spacing.xs,
    alignItems: 'flex-start' as const,
  },
  insightText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: rf(20),
  },
  instructionList: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sectionBodyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: rf(20),
    paddingVertical: spacing.xs,
  },
  emptySectionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  bottomSpacing: {
    height: rh(20),
  },
  stickyActions: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: rp(24),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  actionRow: {
    gap: spacing.sm,
  },
  confettiOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
});

export default MealDetailView;
