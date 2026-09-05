/**
 * MealPlanMethodLandingScreen — Step 1 of the custom Meal Builder flow.
 *
 * Clones BuildMethodLandingScreen's shell exactly (flat settings-style rows
 * with hairlines, 44px icon disc + title/description + trailing check
 * circle, sticky gradient "Continue" pill) — domain-agnostic and already
 * current. Three methods, genuinely useful given the dual-source
 * architecture:
 *  1. Start from your AI Plan (Recommended) — seeds the draft from the
 *     user's current AI-generated weekly plan.
 *  2. Use a template — an inline horizontal card carousel (the four
 *     TRADITIONAL_MEAL_COMBINATIONS + "My Saved Meals"), not a separate
 *     library screen.
 *  3. Build from scratch — blank week.
 *
 * No "Import Community" option — no public diet-template infrastructure
 * exists (out of scope, see the Phase 5 plan's Explicitly out of scope).
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { GlassHeader } from "../../components/ui/aurora/GlassHeader";
import {
  flatColors as colors,
  spacing,
  borderRadius,
} from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { rf, rw, rp } from "../../utils/responsive";
import { hexToRgba } from "../../utils/colors";
import { useReducedMotion } from "../../utils/accessibility/hooks";
import { useDietBuilderStore, WEEKDAYS } from "../../stores/dietBuilderStore";
import { useSavedMealsStore } from "../../stores/savedMealsStore";
import { INDIAN_FOOD_DATABASE } from "../../data/indianFoodDatabase";
import { TRADITIONAL_MEAL_COMBINATIONS } from "../../data/traditionalServingSizes";
import type { WeeklyMealPlan, DayMeal, MealItem } from "../../ai";

interface MealPlanMethodLandingScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

type MethodId = "ai" | "template" | "scratch";

interface Method {
  id: MethodId;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  badge?: string;
  badgeTint?: string;
}

const METHODS: Method[] = [
  {
    id: "ai",
    title: "Start from your AI Plan",
    description: "Tweak what's already generated — the fastest way to make it yours.",
    icon: "sparkles-outline",
    accent: colors.primary,
    badge: "Recommended",
    badgeTint: colors.primary,
  },
  {
    id: "template",
    title: "Use a template",
    description: "Regional thalis or one of your saved meals as a starting point.",
    icon: "restaurant-outline",
    accent: colors.purple,
  },
  {
    id: "scratch",
    title: "Build from scratch",
    description: "Blank week. Full control over every meal.",
    icon: "construct-outline",
    accent: colors.secondary,
  },
];

interface TemplateCard {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const REGIONAL_TEMPLATE_CARDS: TemplateCard[] = [
  { key: "north_indian_thali", title: "North Indian Thali", subtitle: "Rice, dal, sabji, roti", icon: "restaurant-outline" },
  { key: "south_indian_meal", title: "South Indian Meal", subtitle: "Rice, sambar, rasam", icon: "restaurant-outline" },
  { key: "gujarati_thali", title: "Gujarati Thali", subtitle: "Rice, dal, sabji, farsan", icon: "restaurant-outline" },
  { key: "punjabi_meal", title: "Punjabi Meal", subtitle: "Rice, dal, curry, lassi", icon: "restaurant-outline" },
];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Best-effort match of a traditional-combination component name (e.g.
 * "sabji", "roti") to the curated Indian food database, so the template
 * carousel seeds real nutrition rather than zeros. Falls back to a
 * zero-nutrition placeholder (logged) when nothing matches — never crashes
 * the seed.
 *
 * BUG FIX: previously went straight to a fuzzy substring `.find()`, which is
 * insertion-order-dependent and ambiguous — e.g. a generic component named
 * "curry" would match whichever specific dish key happens to CONTAIN "curry"
 * and was declared earliest (e.g. "fish curry"), never a purpose-built
 * generic "curry" entry declared later in the same object, even though the
 * generic entry is the intended match for a generic component name. Try an
 * EXACT key match first (the common case for single-word generic components
 * like "roti", "sabji", "raita" once those entries exist) before falling
 * back to the ambiguous substring search for genuinely multi-word/specific
 * component names. */
function componentToMealItem(componentName: string, grams: number): MealItem {
  const lower = componentName.toLowerCase();
  const matchKey =
    (lower in INDIAN_FOOD_DATABASE ? lower : undefined) ??
    Object.keys(INDIAN_FOOD_DATABASE).find(
      (key) => key.includes(lower) || lower.includes(key),
    );
  const entry = matchKey ? INDIAN_FOOD_DATABASE[matchKey] : null;
  if (!entry) {
    console.error("[MealPlanMethodLandingScreen] no nutrition match for template component:", componentName);
  }
  const per100g = entry?.nutritionPer100g ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const ratio = grams / 100;
  const now = new Date().toISOString();
  const name = entry?.name ?? componentName;
  return {
    foodId: `template_${lower.replace(/\s+/g, "_")}`,
    food: {
      id: `template_${lower.replace(/\s+/g, "_")}`,
      name,
      category: "grains",
      nutrition: {
        calories: per100g.calories,
        macros: {
          protein: per100g.protein,
          carbohydrates: per100g.carbs,
          fat: per100g.fat,
          fiber: per100g.fiber,
        },
        servingSize: 100,
        servingUnit: "g",
      },
      allergens: [],
      dietaryLabels: [],
      verified: false,
      createdAt: now,
      updatedAt: now,
    },
    name,
    quantity: grams,
    unit: "g",
    calories: Math.round(per100g.calories * ratio),
    macros: {
      protein: round1(per100g.protein * ratio),
      carbohydrates: round1(per100g.carbs * ratio),
      fat: round1(per100g.fat * ratio),
      fiber: round1((per100g.fiber ?? 0) * ratio),
    },
  };
}

function recomputeTotals(items: MealItem[]): { totalCalories: number; totalMacros: DayMeal["totalMacros"] } {
  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.macros.protein,
      carbohydrates: acc.carbohydrates + item.macros.carbohydrates,
      fat: acc.fat + item.macros.fat,
      fiber: acc.fiber + (item.macros.fiber ?? 0),
    }),
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 },
  );
  return {
    totalCalories: Math.round(totals.calories),
    totalMacros: {
      protein: round1(totals.protein),
      carbohydrates: round1(totals.carbohydrates),
      fat: round1(totals.fat),
      fiber: round1(totals.fiber),
    },
  };
}

/** Build a full-week plan seeding every day's lunch from one regional thali
 * combination — a fast, food-complete starting point. */
function buildRegionalTemplatePlan(templateKey: string): WeeklyMealPlan {
  const combo = TRADITIONAL_MEAL_COMBINATIONS[templateKey as keyof typeof TRADITIONAL_MEAL_COMBINATIONS];
  const items = Object.entries(combo.components).map(([name, grams]) => componentToMealItem(name, grams));
  const { totalCalories, totalMacros } = recomputeTotals(items);
  const meals: DayMeal[] = WEEKDAYS.map((day) => ({
    id: `template_${templateKey}_${day}_${Date.now()}`,
    type: "lunch",
    name: REGIONAL_TEMPLATE_CARDS.find((c) => c.key === templateKey)?.title ?? "Thali",
    description: "",
    items: items.map((it) => ({ ...it })),
    totalCalories,
    totalMacros,
    preparationTime: 0,
    difficulty: "easy",
    tags: ["template"],
    dayOfWeek: day,
    isPersonalized: false,
    aiGenerated: false,
    createdAt: new Date().toISOString(),
  }));
  return {
    id: `custom_meal_week_${Date.now()}`,
    weekNumber: 1,
    meals,
    planTitle: "My Custom Meal Plan",
    planDescription: `Started from the ${templateKey.replace(/_/g, " ")} template`,
    totalEstimatedCalories: totalCalories * meals.length,
  };
}

export const MealPlanMethodLandingScreen: React.FC<MealPlanMethodLandingScreenProps> = ({ navigation }) => {
  const [selectedId, setSelectedId] = useState<MethodId | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const hydrateFromAiPlan = useDietBuilderStore((s) => s.hydrateFromAiPlan);
  const hydrateFromPlan = useDietBuilderStore((s) => s.hydrateFromPlan);
  const startBlankWeek = useDietBuilderStore((s) => s.startBlankWeek);
  const savedMeals = useSavedMealsStore((s) => s.meals);

  const canContinue =
    selectedId === "ai" ||
    selectedId === "scratch" ||
    (selectedId === "template" && Boolean(selectedTemplateKey));

  const handleSelect = (method: Method) => {
    setSelectedId(method.id);
    if (method.id !== "template") setSelectedTemplateKey(null);
  };

  const savedMealsPlan = useMemo<WeeklyMealPlan | null>(() => {
    if (savedMeals.length === 0) return null;
    const today = WEEKDAYS[new Date().getDay()];
    const meals: DayMeal[] = savedMeals.slice(0, 6).map((sm, idx) => {
      const items: MealItem[] = sm.ingredients.map((ing) => {
        const protein = parseFloat(ing.protein) || 0;
        const carbs = parseFloat(ing.carbs) || 0;
        const fat = parseFloat(ing.fat) || 0;
        const fiber = parseFloat(ing.fiber) || 0;
        const grams = parseFloat(ing.grams) || 0;
        const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);
        return {
          foodId: `saved_${ing.name.toLowerCase().replace(/\s+/g, "_")}`,
          food: {
            id: `saved_${ing.name.toLowerCase().replace(/\s+/g, "_")}`,
            name: ing.name,
            category: "proteins",
            nutrition: {
              calories,
              macros: { protein, carbohydrates: carbs, fat, fiber },
              servingSize: grams || 100,
              servingUnit: "g",
            },
            allergens: [],
            dietaryLabels: [],
            verified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          name: ing.name,
          quantity: grams,
          unit: "g",
          calories,
          macros: { protein, carbohydrates: carbs, fat, fiber },
        };
      });
      const { totalCalories, totalMacros } = recomputeTotals(items);
      const mealType = ["breakfast", "lunch", "dinner", "snack"].includes(sm.mealType)
        ? (sm.mealType as DayMeal["type"])
        : "snack";
      return {
        id: `saved_seed_${sm.id}_${idx}`,
        type: mealType,
        name: sm.name,
        description: "",
        items,
        totalCalories,
        totalMacros,
        preparationTime: 0,
        difficulty: "easy",
        tags: ["saved"],
        dayOfWeek: today,
        isPersonalized: true,
        aiGenerated: false,
        createdAt: new Date().toISOString(),
      };
    });
    return {
      id: `custom_meal_week_${Date.now()}`,
      weekNumber: 1,
      meals,
      planTitle: "My Custom Meal Plan",
      planDescription: "Started from my saved meals",
      totalEstimatedCalories: meals.reduce((sum, m) => sum + m.totalCalories, 0),
    };
  }, [savedMeals]);

  const handleContinue = () => {
    if (!canContinue) return;
    if (selectedId === "ai") {
      hydrateFromAiPlan();
    } else if (selectedId === "scratch") {
      startBlankWeek();
    } else if (selectedId === "template" && selectedTemplateKey) {
      if (selectedTemplateKey === "saved_meals") {
        hydrateFromPlan(savedMealsPlan ?? { id: `custom_meal_week_${Date.now()}`, weekNumber: 1, meals: [], planTitle: "My Custom Meal Plan", planDescription: "", totalEstimatedCalories: 0 });
      } else {
        hydrateFromPlan(buildRegionalTemplatePlan(selectedTemplateKey));
      }
    }
    navigation.navigate("MealBuilder");
  };

  return (
    <AuroraBackground theme="space" animated={!reducedMotion} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <GlassHeader
          eyebrow="MEAL PLAN"
          onBack={() => navigation.goBack()}
          backAccessibilityLabel="Back to diet tab"
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={reducedMotion ? undefined : FadeInUp.delay(80).duration(450)}>
            <Text style={styles.title}>Build your meal plan</Text>
            <Text style={styles.subtitle}>Pick a starting point — you can always switch later.</Text>
          </Animated.View>

          <View style={styles.methodList}>
            {METHODS.map((method, index) => {
              const selected = selectedId === method.id;
              return (
                <Animated.View key={method.id} entering={reducedMotion ? undefined : FadeInUp.delay(160 + index * 80).duration(450)}>
                  <AnimatedPressable
                    onPress={() => handleSelect(method)}
                    scaleValue={0.98}
                    springConfig="smooth"
                    hapticType="light"
                    accessibilityRole="button"
                    accessibilityLabel={`${method.title}. ${method.description}${method.badge ? ` ${method.badge}.` : ""}`}
                    accessibilityState={{ selected }}
                    style={[styles.methodRow, index < METHODS.length - 1 && styles.methodRowSeparator]}
                  >
                    <View style={[styles.iconDisc, { backgroundColor: hexToRgba(method.accent, 0.12) }]}>
                      <Ionicons name={method.icon} size={rf(20)} color={method.accent} />
                    </View>
                    <View style={styles.methodText}>
                      <View style={styles.titleRow}>
                        <Text style={styles.methodTitle}>{method.title}</Text>
                        {method.badge ? (
                          <View style={[styles.badge, { backgroundColor: hexToRgba(method.badgeTint ?? method.accent, 0.12) }]}>
                            <Text style={[styles.badgeText, { color: method.badgeTint }]}>{method.badge}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.methodDescription}>{method.description}</Text>
                    </View>
                    <View style={[styles.checkCircle, selected ? styles.checkCircleSelected : styles.checkCircleUnselected]}>
                      {selected ? <Ionicons name="checkmark" size={rf(14)} color={colors.white} /> : null}
                    </View>
                  </AnimatedPressable>

                  {/* Inline template carousel — only when "Use a template" is selected */}
                  {method.id === "template" && selected && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.carousel}
                      contentContainerStyle={styles.carouselContent}
                    >
                      {REGIONAL_TEMPLATE_CARDS.map((card) => {
                        const cardSelected = selectedTemplateKey === card.key;
                        return (
                          <AnimatedPressable
                            key={card.key}
                            onPress={() => setSelectedTemplateKey(card.key)}
                            scaleValue={0.96}
                            hapticType="light"
                            accessibilityRole="button"
                            accessibilityLabel={`${card.title}. ${card.subtitle}`}
                            accessibilityState={{ selected: cardSelected }}
                            style={[styles.templateCard, cardSelected && styles.templateCardSelected]}
                          >
                            <Ionicons name={card.icon} size={rf(22)} color={cardSelected ? colors.primary : colors.textSecondary} />
                            <Text style={styles.templateCardTitle} numberOfLines={2}>{card.title}</Text>
                            <Text style={styles.templateCardSubtitle} numberOfLines={1}>{card.subtitle}</Text>
                          </AnimatedPressable>
                        );
                      })}
                      {savedMealsPlan && (
                        <AnimatedPressable
                          onPress={() => setSelectedTemplateKey("saved_meals")}
                          scaleValue={0.96}
                          hapticType="light"
                          accessibilityRole="button"
                          accessibilityLabel="My Saved Meals"
                          accessibilityState={{ selected: selectedTemplateKey === "saved_meals" }}
                          style={[styles.templateCard, selectedTemplateKey === "saved_meals" && styles.templateCardSelected]}
                        >
                          <Ionicons
                            name="bookmark-outline"
                            size={rf(22)}
                            color={selectedTemplateKey === "saved_meals" ? colors.primary : colors.textSecondary}
                          />
                          <Text style={styles.templateCardTitle} numberOfLines={2}>My Saved Meals</Text>
                          <Text style={styles.templateCardSubtitle} numberOfLines={1}>{savedMeals.length} saved</Text>
                        </AnimatedPressable>
                      )}
                    </ScrollView>
                  )}
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <AnimatedPressable
            onPress={handleContinue}
            disabled={!canContinue}
            scaleValue={0.97}
            hapticType="medium"
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !canContinue }}
            style={[styles.cta, !canContinue && styles.ctaDisabled]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Continue</Text>
              <Ionicons name="arrow-forward" size={rf(18)} color={colors.white} />
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: rp(spacing.lg), paddingBottom: rp(spacing.xl) },
  title: {
    fontSize: rf(28),
    fontFamily: FONT_FAMILY.extrabold,
    fontWeight: "800",
    color: colors.text,
    lineHeight: rf(34),
    letterSpacing: -0.3,
    marginBottom: rp(spacing.sm),
  },
  subtitle: {
    fontSize: rf(14),
    color: colors.textSecondary,
    lineHeight: rf(20),
    marginBottom: rp(spacing.lg),
  },
  methodList: {
    borderTopWidth: 1,
    borderTopColor: hexToRgba(colors.white, 0.06),
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.md),
    paddingVertical: rp(spacing.md),
    minHeight: 44,
  },
  methodRowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(colors.white, 0.06),
  },
  iconDisc: {
    width: rw(44),
    height: rw(44),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  methodText: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: rp(spacing.sm),
    marginBottom: rp(2),
  },
  methodTitle: { color: colors.text, fontSize: rf(15), fontWeight: "600", flexShrink: 1 },
  methodDescription: { color: colors.textSecondary, fontSize: rf(12), lineHeight: rf(18) },
  badge: {
    paddingVertical: rp(2),
    paddingHorizontal: rp(spacing.sm),
    minHeight: 22,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
  },
  badgeText: { fontSize: rf(11), fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" },
  checkCircle: {
    width: rw(26),
    height: rw(26),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: rp(spacing.xs),
  },
  checkCircleSelected: { backgroundColor: colors.primary },
  checkCircleUnselected: { borderWidth: 1, borderColor: hexToRgba(colors.white, 0.25) },
  carousel: { marginBottom: rp(spacing.md) },
  carouselContent: { gap: rp(spacing.sm), paddingRight: rp(spacing.lg) },
  templateCard: {
    width: rw(140),
    padding: rp(spacing.md),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: hexToRgba(colors.white, 0.1),
    backgroundColor: colors.backgroundSecondary,
    gap: rp(spacing.xs),
  },
  templateCardSelected: {
    borderColor: colors.primary,
    backgroundColor: hexToRgba(colors.primary, 0.1),
  },
  templateCardTitle: { color: colors.text, fontSize: rf(13), fontWeight: "600" },
  templateCardSubtitle: { color: colors.textSecondary, fontSize: rf(11) },
  footer: { paddingHorizontal: rp(spacing.lg), paddingTop: rp(spacing.sm), paddingBottom: rp(spacing.sm) },
  cta: { borderRadius: borderRadius.xl, overflow: "hidden", minHeight: 52 },
  ctaDisabled: { opacity: 0.4 },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(spacing.sm),
    paddingVertical: rp(spacing.md),
    paddingHorizontal: rp(spacing.xl),
    minHeight: 52,
  },
  ctaText: { fontSize: rf(15), fontFamily: FONT_FAMILY.bold, fontWeight: "700", color: colors.white },
});

export default MealPlanMethodLandingScreen;
