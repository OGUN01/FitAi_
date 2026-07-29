/**
 * NutritionalNeedsSection — S5 review group ("Editorial Dark", no cards)
 *
 * The daily calorie target is THE hero number of the whole review: one huge
 * light Manrope figure — scale (not color) carries the hierarchy; the "kcal"
 * unit is the single accent kiss. Under it, protein / carbs / fat read as ONE
 * system: a proportional composition bar (segment widths = share of macro
 * energy) with a labeled triad beneath, each showing its % split. Water
 * closes the group as a quiet metric row.
 *
 * Tap targets navigate to the diet source screen. Values + the 4/4/9 kcal-per-gram
 * mapping come from calculatedData — no calorie math here, shares are display-only.
 */

import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SectionLabel, tokens, type as freshType } from "../../../components/onboarding/fresh";
import { AdvancedReviewData } from "../../../types/onboarding";
import { isValidMetric } from "../../../utils/validationUtils";

interface NutritionalNeedsSectionProps {
  calculatedData: AdvancedReviewData | null;
  onNavigateToTab?: (tabNumber: number) => void;
  /** Global reveal sequencing: ms offset added to every internal stagger. */
  enterDelay?: number;
}

/** Display-only energy share mapping (protein 4, carbs 4, fat 9 kcal/g). */
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

/** Thousands separator without Intl (Hermes-safe). */
const groupThousands = (n: number) =>
  n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

interface MacroShare {
  key: "protein" | "carbs" | "fat";
  label: string;
  grams: number | null;
  testID: string;
}

export const NutritionalNeedsSection: React.FC<
  NutritionalNeedsSectionProps
> = ({ calculatedData, onNavigateToTab, enterDelay = 0 }) => {
  if (!calculatedData) return null;

  // Nutritional needs derive from S3 (diet type/preferences) + the metabolic
  // profile. Tap navigates to S3 (Fuel) — the diet source screen.
  const goToDiet = () => onNavigateToTab?.(3);

  const caloriesValid = isValidMetric(calculatedData.daily_calories);
  const calories = caloriesValid ? Math.round(calculatedData.daily_calories!) : null;

  const macros: MacroShare[] = [
    {
      key: "protein",
      label: "Protein",
      grams: isValidMetric(calculatedData.daily_protein_g)
        ? Math.round(calculatedData.daily_protein_g!)
        : null,
      testID: "tile-protein",
    },
    {
      key: "carbs",
      label: "Carbs",
      grams: isValidMetric(calculatedData.daily_carbs_g)
        ? Math.round(calculatedData.daily_carbs_g!)
        : null,
      testID: "tile-carbs",
    },
    {
      key: "fat",
      label: "Fats",
      grams: isValidMetric(calculatedData.daily_fat_g)
        ? Math.round(calculatedData.daily_fat_g!)
        : null,
      testID: "tile-fats",
    },
  ];

  // Energy share per macro — drives both the bar widths and the % captions.
  const macroKcal = macros.map((m) =>
    m.grams != null ? m.grams * KCAL_PER_G[m.key] : 0,
  );
  const macroKcalTotal = macroKcal.reduce((a, b) => a + b, 0);
  const shares = macroKcal.map((kcal, i) =>
    macros[i].grams != null && macroKcalTotal > 0 ? kcal / macroKcalTotal : null,
  );
  // Minimum visible sliver so a very small share still reads on the bar.
  const barFlex = shares.map((s) => (s != null ? Math.max(s, 0.04) : 0));
  const barFlexTotal = barFlex.reduce((a, b) => a + b, 0);

  const segmentColors = [tokens.ink, tokens.ink2, tokens.ink3];

  return (
    <View style={styles.section}>
      <SectionLabel>Daily nutritional needs</SectionLabel>
      <Text style={styles.caption}>
        Your fuel target — calories from your TDEE and goal, macros split by
        your diet type.
      </Text>

      {/* ── Calorie hero — the biggest number on the screen ── */}
      <Animated.View
        entering={FadeInDown.duration(300).delay(enterDelay)}
      >
        <Pressable
          onPress={goToDiet}
          style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Daily Calories: ${calories ?? "—"} kcal`}
          accessibilityHint="Tap to edit"
          testID="tile-calories"
        >
          <Text style={styles.heroNumber}>
            {calories != null ? groupThousands(calories) : "—"}
          </Text>
          <Text style={styles.heroUnitLine}>
            <Text style={styles.heroUnitAccent}>kcal</Text>
            <Text style={styles.heroUnitRest}> per day</Text>
          </Text>
        </Pressable>
      </Animated.View>

      {/* ── Macro composition — one system: bar + labeled triad ── */}
      <Animated.View entering={FadeInDown.duration(300).delay(enterDelay + 120)}>
        <View
          style={styles.macroBar}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {macros.map((m, i) =>
            shares[i] != null ? (
              <View
                key={m.key}
                style={[
                  styles.macroSegment,
                  {
                    flexGrow: barFlex[i] / barFlexTotal,
                    backgroundColor: segmentColors[i],
                  },
                ]}
              />
            ) : null,
          )}
        </View>
      </Animated.View>

      <View style={styles.macroTriad}>
        {macros.map((m, i) => (
          <Animated.View
            key={m.key}
            style={styles.macroCell}
            entering={FadeInDown.duration(250).delay(enterDelay + 160 + i * 50)}
          >
            <Pressable
              onPress={goToDiet}
              style={({ pressed }) => [styles.macroPressable, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${m.label}: ${m.grams ?? "—"} g`}
              accessibilityHint="Tap to edit"
              testID={m.testID}
            >
              <Text style={styles.macroLabel} numberOfLines={1}>
                {m.label}
              </Text>
              <Text style={styles.macroValue} numberOfLines={1}>
                {m.grams ?? "—"}
                <Text style={styles.macroUnit}>{"  g"}</Text>
              </Text>
              <Text style={styles.macroShare}>
                {shares[i] != null ? `${Math.round(shares[i]! * 100)}% of energy` : "—"}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      {/* ── Water — quiet row closing the group ── */}
      <Animated.View entering={FadeInDown.duration(250).delay(enterDelay + 340)}>
        <Pressable
          onPress={goToDiet}
          style={({ pressed }) => [styles.waterRow, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Water: ${
            isValidMetric(calculatedData.daily_water_ml)
              ? (calculatedData.daily_water_ml! / 1000).toFixed(1)
              : "—"
          } L`}
          accessibilityHint="Tap to edit"
          testID="tile-water"
        >
          <Text style={styles.waterLabel} numberOfLines={1}>
            Water
          </Text>
          <Text style={styles.waterValue} numberOfLines={1}>
            {isValidMetric(calculatedData.daily_water_ml)
              ? (calculatedData.daily_water_ml! / 1000).toFixed(1)
              : "—"}
            <Text style={styles.waterUnit}>{"  L"}</Text>
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 36,
  },
  caption: {
    marginTop: 8,
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: tokens.ink2,
  },
  pressed: {
    opacity: 0.6,
  },

  // ── Calorie hero ──
  hero: {
    marginTop: 12,
    paddingTop: 12,
    paddingBottom: 20,
    minHeight: 44,
    justifyContent: "center",
  },
  heroNumber: {
    ...freshType.hero,
    lineHeight: 68,
    fontVariant: ["tabular-nums"],
  },
  heroUnitLine: {
    marginTop: 2,
  },
  heroUnitAccent: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.4,
    color: tokens.accent,
  },
  heroUnitRest: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    letterSpacing: 0.4,
    color: tokens.ink3,
  },

  // ── Macro system ──
  macroBar: {
    flexDirection: "row",
    gap: 2,
    height: 4,
  },
  macroSegment: {
    flexBasis: 0,
    height: 4,
    borderRadius: 2,
  },
  macroTriad: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: tokens.hairline,
  },
  macroCell: {
    flex: 1,
  },
  macroPressable: {
    minHeight: 44,
    paddingVertical: 16,
    paddingRight: 12,
    justifyContent: "center",
  },
  macroLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: tokens.ink3,
  },
  macroValue: {
    marginTop: 6,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 22,
    color: tokens.ink,
    fontVariant: ["tabular-nums"],
  },
  macroUnit: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: tokens.ink3,
  },
  macroShare: {
    marginTop: 3,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink3,
  },

  // ── Water row ──
  waterRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.hairline,
  },
  waterLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: tokens.ink3,
  },
  waterValue: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 22,
    color: tokens.ink,
    fontVariant: ["tabular-nums"],
  },
  waterUnit: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: tokens.ink3,
  },
});
