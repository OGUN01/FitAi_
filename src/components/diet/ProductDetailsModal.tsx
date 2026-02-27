import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,

} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Modal, Button } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import { colors } from "../../theme/aurora-tokens";
import { HealthScoreIndicator } from "./HealthScoreIndicator";
import type { ScannedProduct } from "../../services/barcodeService";
import { rf, rp, rbr } from "../../utils/responsive";

import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
const NUTRI_SCORE_COLORS: Record<string, string> = {
  a: "#038141",
  b: "#85BB2F",
  c: "#FECB02",
  d: "#EE8100",
  e: "#E63E11",
};

const NOVA_LABELS: Record<number, string> = {
  1: "Unprocessed or minimally processed",
  2: "Processed culinary ingredients",
  3: "Processed foods",
  4: "Ultra-processed foods",
};

interface ProductDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  product: ScannedProduct;
  healthAssessment?: {
    overallScore: number;
    category: "excellent" | "good" | "moderate" | "poor" | "unhealthy";
    breakdown: {
      calories: { score: number; status: string; message: string };
      macros: { score: number; status: string; message: string };
      additives: { score: number; status: string; message: string };
      processing: { score: number; status: string; message: string };
    };
    recommendations: string[];
    alerts: string[];
    healthBenefits: string[];
    concerns: string[];
    alternatives?: string[];
  };
  onAddToMeal?: (product: ScannedProduct) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  visible,
  onClose,
  product,
  healthAssessment,
  onAddToMeal,
}) => {
  const handleAddToMeal = () => {
    if (onAddToMeal) {
      onAddToMeal(product);
      crossPlatformAlert(
        "Added to Meal",
        `${product.name} has been added to your current meal.`,
        [{ text: "OK", onPress: onClose }],
      );
    }
  };

  const renderNutritionFacts = () => (
    <View style={styles.nutritionContainer}>
      <Text style={styles.sectionTitle}>Nutrition Facts (per 100g)</Text>
      <View style={styles.nutritionGrid}>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Calories</Text>
          <Text style={styles.nutritionValue}>
            {product.nutrition.calories}
          </Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Protein</Text>
          <Text style={styles.nutritionValue}>
            {product.nutrition.protein}g
          </Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Carbs</Text>
          <Text style={styles.nutritionValue}>{product.nutrition.carbs}g</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Fat</Text>
          <Text style={styles.nutritionValue}>{product.nutrition.fat}g</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionLabel}>Fiber</Text>
          <Text style={styles.nutritionValue}>{product.nutrition.fiber}g</Text>
        </View>
        {product.nutrition.sugar !== undefined && (
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Sugar</Text>
            <Text style={styles.nutritionValue}>
              {product.nutrition.sugar}g
            </Text>
          </View>
        )}
        {product.nutrition.sodium !== undefined && (
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Sodium</Text>
            <Text style={styles.nutritionValue}>
              {product.nutrition.sodium}g
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderHealthBreakdown = () => {
    if (!healthAssessment) return null;

    const { breakdown } = healthAssessment;

    return (
      <View style={styles.breakdownContainer}>
        <Text style={styles.sectionTitle}>Health Breakdown</Text>
        {Object.entries(breakdown).map(([key, assessment]) => (
          <View key={key} style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownLabel}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
              <View
                style={[
                  styles.breakdownScore,
                  { backgroundColor: getScoreColor(assessment.score) },
                ]}
              >
                <Text style={styles.breakdownScoreText}>
                  {assessment.score}
                </Text>
              </View>
            </View>
            <Text style={styles.breakdownMessage}>{assessment.message}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderAlerts = () => {
    if (!healthAssessment?.alerts.length) return null;

    return (
      <View style={styles.alertsContainer}>
        <Text style={styles.sectionTitle}>⚠️ Health Alerts</Text>
        {healthAssessment.alerts.map((alert) => (
          <View key={alert} style={styles.alertItem}>
            <Text style={styles.alertText}>{alert}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderRecommendations = () => {
    if (!healthAssessment?.recommendations.length) return null;

    return (
      <View style={styles.recommendationsContainer}>
        <Text style={styles.sectionTitle}>💡 Recommendations</Text>
        {healthAssessment.recommendations.map((recommendation) => (
          <View key={recommendation} style={styles.recommendationItem}>
            <Text style={styles.recommendationText}>• {recommendation}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderAlternatives = () => {
    if (!healthAssessment?.alternatives?.length) return null;

    return (
      <View style={styles.alternativesContainer}>
        <Text style={styles.sectionTitle}>🔄 Healthier Alternatives</Text>
        {healthAssessment.alternatives.map((alternative) => (
          <View key={alternative} style={styles.alternativeItem}>
            <Text style={styles.alternativeText}>• {alternative}</Text>
          </View>
        ))}
      </View>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return ResponsiveTheme.colors.successAlt;
    if (score >= 60) return "#84cc16";
    if (score >= 40) return "#eab308";
    if (score >= 20) return "#f97316";
    return ResponsiveTheme.colors.errorAlt;
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Product Details">
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Header */}
        <View style={styles.headerContainer}>
          {product.additionalInfo?.imageUrl && (
            <Image
              source={{ uri: product.additionalInfo.imageUrl }}
              style={styles.productImage}
              resizeMode="contain"
            />
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            {product.brand && (
              <Text style={styles.productBrand}>{product.brand}</Text>
            )}
            {product.category && (
              <Text style={styles.productCategory}>{product.category}</Text>
            )}
            <Text style={styles.barcodeText}>Barcode: {product.barcode}</Text>
          </View>
        </View>

        {/* AI Disclaimer Banner */}
        {product.isAIEstimated && (
          <View style={styles.aiDisclaimer}>
            <Text style={styles.aiDisclaimerText}>
              ⚠️ Nutrition data estimated by AI. Values may not be accurate.
              Verify with product packaging.
            </Text>
          </View>
        )}

        {/* Nutri-Score & NOVA & Origin Row */}
        {(product.nutriScore || product.novaGroup || product.gs1Country) && (
          <View style={styles.qualityBadgesContainer}>
            {product.nutriScore && (
              <View
                style={[
                  styles.nutriScoreBadge,
                  {
                    backgroundColor:
                      NUTRI_SCORE_COLORS[product.nutriScore.toLowerCase()] ??
                      ResponsiveTheme.colors.neutral,
                  },
                ]}
              >
                <Text style={styles.nutriScoreLabel}>Nutri-Score</Text>
                <Text style={styles.nutriScoreText}>
                  {product.nutriScore.toUpperCase()}
                </Text>
              </View>
            )}

            {product.novaGroup && (
              <View style={styles.novaContainer}>
                <Text style={styles.novaTitle}>NOVA {product.novaGroup}</Text>
                <Text
                  style={[
                    styles.novaLabel,
                    {
                      color:
                        product.novaGroup <= 2
                          ? "#038141"
                          : product.novaGroup === 4
                            ? "#E63E11"
                            : "#EE8100",
                    },
                  ]}
                >
                  {NOVA_LABELS[product.novaGroup]}
                </Text>
              </View>
            )}

            {product.gs1Country && (
              <View style={styles.originContainer}>
                <Text style={styles.originText}>
                  🌍 Origin: {product.gs1Country}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Health Score */}
        {healthAssessment && (
          <View style={styles.healthScoreContainer}>
            <HealthScoreIndicator
              score={healthAssessment.overallScore}
              category={healthAssessment.category}
              size="large"
            />
            <Text style={styles.confidenceText}>
              Confidence: {product.confidence}% • Source: {product.source}
            </Text>
          </View>
        )}

        {/* Nutrition Facts */}
        {renderNutritionFacts()}

        {/* Health Breakdown */}
        {renderHealthBreakdown()}

        {/* Alerts */}
        {renderAlerts()}

        {/* Health Benefits */}
        {healthAssessment?.healthBenefits &&
          healthAssessment.healthBenefits.length > 0 && (
            <View style={styles.benefitsContainer}>
              <Text style={styles.sectionTitle}>✅ Health Benefits</Text>
              {healthAssessment.healthBenefits.map((benefit) => (
                <View key={benefit} style={styles.benefitItem}>
                  <Text style={styles.benefitText}>• {benefit}</Text>
                </View>
              ))}
            </View>
          )}

        {/* Concerns */}
        {healthAssessment?.concerns && healthAssessment.concerns.length > 0 && (
          <View style={styles.concernsContainer}>
            <Text style={styles.sectionTitle}>⚠️ Concerns</Text>
            {healthAssessment.concerns.map((concern) => (
              <View key={concern} style={styles.concernItem}>
                <Text style={styles.concernText}>• {concern}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations */}
        {renderRecommendations()}

        {/* Alternatives */}
        {renderAlternatives()}

        {/* Additional Information */}
        {((product.additionalInfo?.ingredients &&
          product.additionalInfo.ingredients.length > 0) ||
          (product.additionalInfo?.allergens &&
            product.additionalInfo.allergens.length > 0) ||
          (product.additionalInfo?.labels &&
            product.additionalInfo.labels.length > 0)) && (
          <View style={styles.additionalInfoContainer}>
            <Text style={styles.sectionTitle}>Additional Information</Text>

            {product.additionalInfo?.ingredients &&
              product.additionalInfo.ingredients.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>Ingredients:</Text>
                  <Text style={styles.infoText}>
                    {product.additionalInfo.ingredients.join(", ")}
                  </Text>
                </View>
              )}

            {product.additionalInfo?.allergens &&
              product.additionalInfo.allergens.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>Allergens:</Text>
                  <Text style={styles.alertText}>
                    {product.additionalInfo.allergens.join(", ")}
                  </Text>
                </View>
              )}

            {product.additionalInfo?.labels &&
              product.additionalInfo.labels.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>Labels:</Text>
                  <Text style={styles.infoText}>
                    {product.additionalInfo.labels.join(", ")}
                  </Text>
                </View>
              )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {onAddToMeal && (
            <Button
              title="Add to Current Meal"
              onPress={handleAddToMeal}
              style={styles.addButton}
            />
          )}
          <Button
            title="Close"
            onPress={onClose}
            variant="outline"
            style={styles.closeButton}
          />
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },

  headerContainer: {
    flexDirection: "row",
    padding: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  productImage: {
    width: 80,
    height: 80,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginRight: ResponsiveTheme.spacing.md,
  },

  productInfo: {
    flex: 1,
    justifyContent: "center",
  },

  productName: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  productBrand: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  productCategory: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  barcodeText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontFamily: "monospace",
  },

  healthScoreContainer: {
    alignItems: "center",
    padding: ResponsiveTheme.spacing.lg,
    backgroundColor: ResponsiveTheme.colors.surface,
  },

  confidenceText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.sm,
  },

  nutritionContainer: {
    padding: ResponsiveTheme.spacing.md,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  nutritionItem: {
    width: "48%",
    backgroundColor: ResponsiveTheme.colors.surface,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginBottom: ResponsiveTheme.spacing.sm,
    alignItems: "center",
  },

  nutritionLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  nutritionValue: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
    color: ResponsiveTheme.colors.text,
  },

  breakdownContainer: {
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  breakdownItem: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  breakdownLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.text,
  },

  breakdownScore: {
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  breakdownScoreText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
    color: ResponsiveTheme.colors.white,
  },

  breakdownMessage: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  alertsContainer: {
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  alertItem: {
    backgroundColor: `${ResponsiveTheme.colors.error}1F`,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error.DEFAULT,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  alertText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: colors.error.light,
  },

  recommendationsContainer: {
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  recommendationItem: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  recommendationText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(20),
  },

  benefitsContainer: {
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  benefitItem: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  benefitText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: colors.success.light,
    lineHeight: rf(20),
  },

  concernsContainer: {
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  concernItem: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  concernText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: colors.warning.light,
    lineHeight: rf(20),
  },

  alternativesContainer: {
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  alternativeItem: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  alternativeText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(20),
  },

  additionalInfoContainer: {
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  infoSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  infoTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  infoText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },

  actionButtons: {
    padding: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.sm,
  },

  addButton: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  closeButton: {
    // Outline button styling handled by Button component
  },

  aiDisclaimer: {
    backgroundColor: `${ResponsiveTheme.colors.warning}1F`,
    borderRadius: rbr(8),
    padding: rp(12),
    marginHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: rp(12),
    marginTop: ResponsiveTheme.spacing.sm,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.warning}40`,
  },

  aiDisclaimerText: {
    color: ResponsiveTheme.colors.warning,
    fontSize: rf(13),
    lineHeight: rf(18),
  },

  qualityBadgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    gap: ResponsiveTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  nutriScoreBadge: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: rbr(8),
    paddingHorizontal: rp(12),
    paddingVertical: rp(8),
    minWidth: rp(56),
  },

  nutriScoreLabel: {
    fontSize: rf(9),
    fontWeight: "700" as const,
    color: ResponsiveTheme.colors.white,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: rp(2),
  },

  nutriScoreText: {
    fontSize: rf(22),
    fontWeight: "900" as const,
    color: ResponsiveTheme.colors.white,
    lineHeight: rf(26),
  },

  novaContainer: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: rp(4),
  },

  novaTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(2),
  },

  novaLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    lineHeight: rf(16),
  },

  originContainer: {
    justifyContent: "center",
    paddingVertical: rp(4),
  },

  originText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
});

export default ProductDetailsModal;
