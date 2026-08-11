/**
 * S3 "Fuel" — CookingPreferencesSection (blueprint §3 S3, §5 S3, §6 input map)
 *
 * Fresh "Editorial Dark" — PEAK pass. The wall of near-identical OptionRows
 * is gone; the section now reads as three compact beats:
 *
 *  1. Cooking skill: a single-select Pill rail (identity icon → accent
 *     checkmark) with a LIVE selection caption underneath — the chosen
 *     level's description + time window animates in on change (segmented
 *     chip + dynamic description, the 2026 pattern). Saves ~170px vs rows.
 *  2. Max cooking time: accent key number + the existing aurora RangeSlider;
 *     replaced by a note when cooking_skill_level === "not_applicable"
 *     (logic unchanged).
 *  3. Food budget: same rail + live caption treatment. The caption's weekly
 *     range is localized from the S1 country via getBudgetRanges() (display-
 *     only — only budget_level is ever persisted).
 *  4. Cooking methods (10, multi): icon Pill grid inside a CollapsibleSection
 *     (default collapsed); the collapsed subtitle names the selection, not
 *     just the count. Hidden entirely when not_applicable (unchanged).
 *
 * Blocks are still separated by hairline Rules — hierarchy from type and
 * space. Presentation-only redesign — props contract (formData, updateField)
 * unchanged; the skill → max_prep_time side-effects are byte-identical.
 */

import React, { useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { DietPreferencesData } from "../../../types/onboarding";
import {
  COOKING_SKILL_LEVELS,
  BUDGET_LEVELS,
} from "../../../screens/onboarding/tabs/DietPreferencesConstants";
import { getBudgetRanges, type BudgetTier } from "../../../utils/currency";
import { RangeSlider } from "../aurora/RangeSlider";
import {
  SectionLabel,
  Rule,
  Pill,
  CollapsibleSection,
  tokens,
  type as typeScale,
} from "../fresh";
import { countWithPreview } from "./selectionPreview";

type IoniconName = keyof typeof Ionicons.glyphMap;

const COOKING_METHODS: { id: string; label: string; icon: IoniconName }[] = [
  { id: "grilling", label: "Grilling", icon: "flame-outline" },
  { id: "steaming", label: "Steaming", icon: "water-outline" },
  { id: "air_frying", label: "Air Frying", icon: "flash-outline" },
  { id: "sauteing", label: "Sauteing", icon: "restaurant-outline" },
  { id: "baking", label: "Baking", icon: "cube-outline" },
  { id: "boiling", label: "Boiling", icon: "beaker-outline" },
  { id: "stir_frying", label: "Stir Frying", icon: "bonfire-outline" },
  { id: "slow_cooking", label: "Slow Cooking", icon: "time-outline" },
  { id: "pressure_cooking", label: "Pressure Cook", icon: "speedometer-outline" },
  { id: "raw_no_cook", label: "Raw / No Cook", icon: "leaf-outline" },
];

interface CookingPreferencesSectionProps {
  formData: DietPreferencesData;
  updateField: <K extends keyof DietPreferencesData>(
    field: K,
    value: DietPreferencesData[K],
  ) => void;
  /**
   * S1 country selection (display-only) — localizes the food-budget range
   * strings via getBudgetRanges(). Optional: null/undefined → USD defaults.
   */
  country?: string | null;
}

export const CookingPreferencesSection: React.FC<
  CookingPreferencesSectionProps
> = ({ formData, updateField, country }) => {
  const [methodsOpen, setMethodsOpen] = useState(false);
  const isNotApplicable = formData.cooking_skill_level === "not_applicable";
  const methodsCount = (formData.cooking_methods || []).length;

  const selectedSkill = COOKING_SKILL_LEVELS.find(
    (s) => s.level === formData.cooking_skill_level,
  );
  const selectedBudget = BUDGET_LEVELS.find(
    (b) => b.level === formData.budget_level,
  );
  // Display-only localization — what gets stored stays budget_level only.
  const budgetRanges = getBudgetRanges(country);
  const selectedMethodNames = COOKING_METHODS.filter((m) =>
    (formData.cooking_methods || []).includes(m.id),
  ).map((m) => m.label);

  return (
    <View>
      {/* Beat 1 — Cooking skill: compact rail + live caption. */}
      <View>
        <SectionLabel style={styles.blockLabel}>Cooking Skill Level</SectionLabel>
        <View style={styles.pillRow}>
          {COOKING_SKILL_LEVELS.map((s) => {
            const selected = formData.cooking_skill_level === s.level;
            return (
              <Pill
                key={s.level}
                label={s.title}
                icon={selected ? "checkmark" : (s.iconName as IoniconName)}
                selected={selected}
                onPress={() => {
                  updateField(
                    "cooking_skill_level",
                    s.level as DietPreferencesData["cooking_skill_level"],
                  );
                  if (s.level === "not_applicable") {
                    updateField("max_prep_time_minutes", null);
                  } else if (formData.max_prep_time_minutes === null) {
                    updateField("max_prep_time_minutes", 30);
                  }
                }}
                testID={`cooking-skill-${s.level}`}
              />
            );
          })}
        </View>
        {selectedSkill && (
          <Animated.Text
            key={selectedSkill.level}
            entering={FadeInDown.duration(180)}
            style={styles.selectionCaption}
            numberOfLines={1}
          >
            {selectedSkill.description}
            {selectedSkill.timeRange !== "N/A"
              ? ` · ${selectedSkill.timeRange}`
              : ""}
          </Animated.Text>
        )}
      </View>

      <Rule spacing={24} />

      {/* Beat 2 — Max cooking time: slider (or N/A note). */}
      <View>
        <View style={styles.sliderHeader}>
          <SectionLabel>Maximum Cooking Time</SectionLabel>
          {!isNotApplicable && (
            <Text style={styles.sliderValueWrap}>
              <Text style={styles.sliderValue}>
                {formData.max_prep_time_minutes ?? 30}
              </Text>
              <Text style={styles.sliderUnit}> min</Text>
            </Text>
          )}
        </View>
        {isNotApplicable ? (
          <Text style={styles.note} numberOfLines={3}>
            Meals are prepared by others — we'll suggest meals based on your
            dietary preferences without cooking time constraints.
          </Text>
        ) : (
          <RangeSlider
            value={formData.max_prep_time_minutes ?? 30}
            min={15}
            max={120}
            step={15}
            unit="min"
            accentColor={tokens.accent}
            onChange={(value) => updateField("max_prep_time_minutes", value)}
            showValue={false}
            accessibilityLabel={`Max prep time, ${formData.max_prep_time_minutes ?? 30} minutes`}
          />
        )}
      </View>

      <Rule spacing={24} />

      {/* Beat 3 — Food budget: compact rail + live caption. */}
      <View>
        <SectionLabel style={styles.blockLabel}>Food Budget</SectionLabel>
        <View style={styles.pillRow}>
          {BUDGET_LEVELS.map((b) => {
            const selected = formData.budget_level === b.level;
            return (
              <Pill
                key={b.level}
                label={b.title}
                icon={selected ? "checkmark" : (b.iconName as IoniconName)}
                selected={selected}
                onPress={() =>
                  updateField(
                    "budget_level",
                    b.level as DietPreferencesData["budget_level"],
                  )
                }
                testID={`budget-${b.level}`}
              />
            );
          })}
        </View>
        {selectedBudget && (
          <Animated.Text
            key={selectedBudget.level}
            entering={FadeInDown.duration(180)}
            style={styles.selectionCaption}
            numberOfLines={1}
          >
            {selectedBudget.description} ·{" "}
            {budgetRanges[selectedBudget.level as BudgetTier]}
          </Animated.Text>
        )}
      </View>

      {/* Beat 4 — Cooking methods: collapsible Pill grid (§5, default
          collapsed); collapsed subtitle names the picks. Hidden when
          not_applicable. */}
      {!isNotApplicable && (
        <>
          <Rule spacing={24} />
          <CollapsibleSection
            title="Cooking Methods"
            subtitle={countWithPreview(
              methodsCount,
              "Select all methods you enjoy (optional)",
              selectedMethodNames,
            )}
            expanded={methodsOpen}
            onToggle={() => setMethodsOpen((v) => !v)}
            testID="cooking-methods-section"
          >
            <View style={styles.pillRow}>
              {COOKING_METHODS.map((m) => {
                const selected = (formData.cooking_methods || []).includes(
                  m.id,
                );
                return (
                  <Pill
                    key={m.id}
                    label={m.label}
                    icon={selected ? "checkmark" : m.icon}
                    selected={selected}
                    onPress={() => {
                      const current = formData.cooking_methods || [];
                      const updated = selected
                        ? current.filter((x) => x !== m.id)
                        : [...current, m.id];
                      updateField("cooking_methods", updated);
                    }}
                    testID={`cooking-method-${m.id}`}
                  />
                );
              })}
            </View>
          </CollapsibleSection>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  blockLabel: {
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectionCaption: {
    ...typeScale.caption,
    color: tokens.ink2,
    marginTop: 10,
  },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sliderValueWrap: {
    // container for the key number + quiet unit
  },
  sliderValue: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 22,
    color: tokens.accent, // key number — the one allowed accent use
  },
  sliderUnit: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: tokens.ink3,
  },
  note: {
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: tokens.ink2,
  },
});

export default CookingPreferencesSection;
