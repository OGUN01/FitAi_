import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rbr } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard } from "../../ui/aurora/GlassCard";
import { GradientBarChart } from "../../ui";
import { AdvancedReviewData } from "../../../types/onboarding";

interface NutritionalNeedsSectionProps {
  calculatedData: AdvancedReviewData | null;
}

export const NutritionalNeedsSection: React.FC<
  NutritionalNeedsSectionProps
> = ({ calculatedData }) => {
  if (!calculatedData) return null;

  return (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <View style={styles.sectionTitleContainer}>
          <Ionicons
            name="nutrition-outline"
            size={rf(18)}
            color={ResponsiveTheme.colors.primary}
            style={styles.sectionTitleIcon}
          />
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Daily Nutritional Needs
          </Text>
          <View style={styles.nutrientBadges}>
            <View style={styles.nutrientBadge}>
              <Ionicons
                name="water"
                size={rf(10)}
                color={ResponsiveTheme.colors.primary}
              />
              <Text style={styles.nutrientBadgeText}>
                {calculatedData.daily_water_ml
                  ? (calculatedData.daily_water_ml / 1000).toFixed(1)
                  : "--"}
                L
              </Text>
            </View>
            <View style={styles.nutrientBadge}>
              <Ionicons
                name="leaf"
                size={rf(10)}
                color={ResponsiveTheme.colors.success}
              />
              <Text style={styles.nutrientBadgeText}>
                {calculatedData.daily_fiber_g}g
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        <GlassCard
          elevation={1}
          blurIntensity="light"
          padding="md"
          borderRadius="md"
          style={styles.nutritionCardCompact}
        >
          <View style={styles.nutritionCompactHeader}>
            <Text style={styles.nutritionCompactTitle}>Daily Target</Text>
            <Text style={styles.calorieTargetCompact}>
              {calculatedData.daily_calories} cal
            </Text>
          </View>

          <GradientBarChart
            data={[
              {
                label: "Protein",
                value: calculatedData.daily_protein_g || 0,
                maxValue: 300,
                gradient: [ResponsiveTheme.colors.primary, ResponsiveTheme.colors.accent],
                unit: "g",
              },
              {
                label: "Carbs",
                value: calculatedData.daily_carbs_g || 0,
                maxValue: 400,
                gradient: [ResponsiveTheme.colors.success, ResponsiveTheme.colors.successAltDark],
                unit: "g",
              },
              {
                label: "Fats",
                value: calculatedData.daily_fat_g || 0,
                maxValue: 150,
                gradient: [ResponsiveTheme.colors.info, ResponsiveTheme.colors.info],
                unit: "g",
              },
            ]}
            height={120}
            animated={true}
            showValues={true}
            style={styles.macroChartCompact}
          />
        </GlassCard>
      </View>
      <View style={styles.sectionBottomPadSmall} />
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  sectionEdgeToEdge: {
    marginBottom: rp(16),
    marginHorizontal: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderRadius: rbr(0),
  },
  sectionTitlePadded: {
    paddingHorizontal: rp(20),
    paddingTop: rp(16),
    paddingBottom: rp(12),
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleIcon: {
    marginRight: rp(8),
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },
  nutrientBadges: {
    flexDirection: "row",
    gap: rp(8),
  },
  nutrientBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
    backgroundColor: `${ResponsiveTheme.colors.surface}80`,
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  nutrientBadgeText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },
  edgeToEdgeContentPadded: {
    paddingHorizontal: rp(20),
  },
  nutritionCardCompact: {
    marginBottom: rp(4),
  },
  nutritionCompactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rp(12),
  },
  nutritionCompactTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },
  calorieTargetCompact: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },
  macroChartCompact: {
    marginTop: rp(4),
  },
  sectionBottomPadSmall: {
    height: rp(12),
  },
});
