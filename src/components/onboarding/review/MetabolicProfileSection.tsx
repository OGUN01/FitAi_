import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard } from "../../ui/aurora/GlassCard";
import { ProgressRing } from "../../ui/aurora";
import { InfoTooltip } from "../../ui/InfoTooltip";
import { AdvancedReviewData } from "../../../types/onboarding";
import { METRIC_DESCRIPTIONS } from "../../../constants/metricDescriptions";
import { isValidMetric } from "../../../utils/validationUtils";

interface MetabolicProfileSectionProps {
  calculatedData: AdvancedReviewData | null;
}

export const MetabolicProfileSection: React.FC<
  MetabolicProfileSectionProps
> = ({ calculatedData }) => {
  if (!calculatedData) return null;

  const getBMIColor = () => {
    const bmi = calculatedData.calculated_bmi || 0;
    if (bmi < 18.5) return ["#FFC107", "#FF9800"];
    if (bmi < 25) return ["#4CAF50", "#45A049"];
    if (bmi < 30) return ["#FF9800", "#FF5722"];
    return ["#F44336", "#D32F2F"];
  };

  const getBMICategory = () => {
    const bmi = calculatedData.calculated_bmi || 0;
    if (bmi < 18.5) return "Under";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Over";
    return "Obese";
  };

  const getMetabolicAgeColor = () => {
    const age = calculatedData.metabolic_age || 25;
    if (age < 30) return ["#4CAF50", "#45A049"];
    if (age < 50) return ["#FFC107", "#FF9800"];
    return ["#FF5722", "#D32F2F"];
  };

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
            name="flame-outline"
            size={rf(18)}
            color={ResponsiveTheme.colors.primary}
            style={styles.sectionTitleIcon}
          />
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Metabolic Profile
          </Text>
        </View>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        <View style={styles.metabolicGrid}>
          <View style={styles.metabolicGridCard}>
            <View style={styles.metabolicCardHeader}>
              <Text style={styles.metabolicCardLabel}>BMI</Text>
              <InfoTooltip
                title={METRIC_DESCRIPTIONS.BMI.title}
                description={METRIC_DESCRIPTIONS.BMI.description}
              />
            </View>
            <ProgressRing
              progress={
                isValidMetric(calculatedData.calculated_bmi)
                  ? Math.round((calculatedData.calculated_bmi! / 40) * 100)
                  : 0
              }
              size={72}
              strokeWidth={6}
              gradient={true}
              gradientColors={getBMIColor()}
              duration={800}
              showText={true}
              text={
                isValidMetric(calculatedData.calculated_bmi)
                  ? calculatedData.calculated_bmi!.toFixed(1)
                  : "--"
              }
            />
            <Text style={styles.metabolicCardCategory}>
              {isValidMetric(calculatedData.calculated_bmi)
                ? getBMICategory()
                : "Pending"}
            </Text>
          </View>

          <View style={styles.metabolicGridCard}>
            <View style={styles.metabolicCardHeader}>
              <Text style={styles.metabolicCardLabel}>BMR</Text>
              <InfoTooltip
                title={METRIC_DESCRIPTIONS.BMR.title}
                description={METRIC_DESCRIPTIONS.BMR.description}
              />
            </View>
            <ProgressRing
              progress={
                isValidMetric(calculatedData.calculated_bmr)
                  ? Math.round(
                      Math.min(
                        100,
                        Math.max(
                          0,
                          ((calculatedData.calculated_bmr! - 1200) / 1300) *
                            100,
                        ),
                      ),
                    )
                  : 0
              }
              size={72}
              strokeWidth={6}
              gradient={true}
              gradientColors={["#2196F3", "#1976D2"]}
              duration={800}
              showText={true}
              text={
                isValidMetric(calculatedData.calculated_bmr)
                  ? `${Math.round(calculatedData.calculated_bmr!)}`
                  : "--"
              }
            />
            <Text style={styles.metabolicCardCategory}>
              {isValidMetric(calculatedData.calculated_bmr)
                ? "cal/day"
                : "Pending"}
            </Text>
          </View>

          <View style={styles.metabolicGridCard}>
            <View style={styles.metabolicCardHeader}>
              <Text style={styles.metabolicCardLabel}>TDEE</Text>
              <InfoTooltip
                title={METRIC_DESCRIPTIONS.TDEE.title}
                description={METRIC_DESCRIPTIONS.TDEE.description}
              />
            </View>
            <ProgressRing
              progress={
                isValidMetric(calculatedData.calculated_tdee)
                  ? Math.round(
                      Math.min(
                        100,
                        Math.max(
                          0,
                          ((calculatedData.calculated_tdee! - 1500) / 2000) *
                            100,
                        ),
                      ),
                    )
                  : 0
              }
              size={72}
              strokeWidth={6}
              gradient={true}
              gradientColors={["#FF6B35", "#E55A2B"]}
              duration={800}
              showText={true}
              text={
                isValidMetric(calculatedData.calculated_tdee)
                  ? `${Math.round(calculatedData.calculated_tdee!)}`
                  : "--"
              }
            />
            <Text style={styles.metabolicCardCategory}>
              {isValidMetric(calculatedData.calculated_tdee)
                ? "cal/day"
                : "Pending"}
            </Text>
          </View>

          <View style={styles.metabolicGridCard}>
            <View style={styles.metabolicCardHeader}>
              <Text style={styles.metabolicCardLabel}>Age</Text>
              <InfoTooltip
                title={METRIC_DESCRIPTIONS.METABOLIC_AGE.title}
                description={METRIC_DESCRIPTIONS.METABOLIC_AGE.description}
              />
            </View>
            <ProgressRing
              progress={
                isValidMetric(calculatedData.metabolic_age)
                  ? Math.round((calculatedData.metabolic_age! / 80) * 100)
                  : 0
              }
              size={72}
              strokeWidth={6}
              gradient={true}
              gradientColors={getMetabolicAgeColor()}
              duration={800}
              showText={true}
              text={
                isValidMetric(calculatedData.metabolic_age)
                  ? `${Math.round(calculatedData.metabolic_age!)}`
                  : "--"
              }
            />
            <Text style={styles.metabolicCardCategory}>
              {isValidMetric(calculatedData.metabolic_age)
                ? "years"
                : "Pending"}
            </Text>
          </View>
        </View>
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
    borderRadius: 0,
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
  edgeToEdgeContentPadded: {
    paddingHorizontal: rp(20),
  },
  metabolicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: rp(12),
  },
  metabolicGridCard: {
    width: "48%",
    backgroundColor: `${ResponsiveTheme.colors.surface}40`,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: rp(12),
    alignItems: "center",
  },
  metabolicCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(8),
    width: "100%",
    justifyContent: "center",
    gap: rp(4),
  },
  metabolicCardLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
  },
  metabolicCardCategory: {
    marginTop: rp(8),
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },
  sectionBottomPadSmall: {
    height: rp(12),
  },
});
