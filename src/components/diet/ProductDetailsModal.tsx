import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Modal, Button, THEME } from "../ui";
import { colors } from "../../theme/aurora-tokens";
import { HealthScoreIndicator } from "./HealthScoreIndicator";
import type { ScannedProduct } from "../../services/barcodeService";

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
      Alert.alert(
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
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#84cc16";
    if (score >= 40) return "#eab308";
    if (score >= 20) return "#f97316";
    return "#ef4444";
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
                      "#aaa",
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
    padding: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },

  productImage: {
    width: 80,
    height: 80,
    borderRadius: THEME.borderRadius.md,
    marginRight: THEME.spacing.md,
  },

  productInfo: {
    flex: 1,
    justifyContent: "center",
  },

  productName: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold as "700",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  productBrand: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },

  productCategory: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
  },

  barcodeText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontFamily: "monospace",
  },

  healthScoreContainer: {
    alignItems: "center",
    padding: THEME.spacing.lg,
    backgroundColor: THEME.colors.surface,
  },

  confidenceText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.sm,
  },

  nutritionContainer: {
    padding: THEME.spacing.md,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold as "700",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  nutritionItem: {
    width: "48%",
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.sm,
    alignItems: "center",
  },

  nutritionLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
  },

  nutritionValue: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold as "700",
    color: THEME.colors.text,
  },

  breakdownContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  breakdownItem: {
    marginBottom: THEME.spacing.md,
  },

  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: THEME.spacing.xs,
  },

  breakdownLabel: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold as "600",
    color: THEME.colors.text,
  },

  breakdownScore: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
  },

  breakdownScoreText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold as "700",
    color: THEME.colors.white,
  },

  breakdownMessage: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  alertsContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  alertItem: {
    backgroundColor: "rgba(244, 67, 54, 0.12)",
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error.DEFAULT,
    marginBottom: THEME.spacing.sm,
  },

  alertText: {
    fontSize: THEME.fontSize.sm,
    color: colors.error.light,
  },

  recommendationsContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  recommendationItem: {
    marginBottom: THEME.spacing.sm,
  },

  recommendationText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    lineHeight: 20,
  },

  benefitsContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  benefitItem: {
    marginBottom: THEME.spacing.sm,
  },

  benefitText: {
    fontSize: THEME.fontSize.sm,
    color: colors.success.light,
    lineHeight: 20,
  },

  concernsContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  concernItem: {
    marginBottom: THEME.spacing.sm,
  },

  concernText: {
    fontSize: THEME.fontSize.sm,
    color: colors.warning.light,
    lineHeight: 20,
  },

  alternativesContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  alternativeItem: {
    marginBottom: THEME.spacing.sm,
  },

  alternativeText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    lineHeight: 20,
  },

  additionalInfoContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  infoSection: {
    marginBottom: THEME.spacing.md,
  },

  infoTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold as "600",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  infoText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },

  actionButtons: {
    padding: THEME.spacing.md,
    gap: THEME.spacing.sm,
  },

  addButton: {
    marginBottom: THEME.spacing.sm,
  },

  closeButton: {
    // Outline button styling handled by Button component
  },

  aiDisclaimer: {
    backgroundColor: "rgba(255, 152, 0, 0.12)",
    borderRadius: 8,
    padding: 12,
    marginHorizontal: THEME.spacing.md,
    marginBottom: 12,
    marginTop: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.25)",
  },

  aiDisclaimerText: {
    color: colors.warning.light,
    fontSize: 13,
    lineHeight: 18,
  },

  qualityBadgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    gap: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  nutriScoreBadge: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 56,
  },

  nutriScoreLabel: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  nutriScoreText: {
    fontSize: 22,
    fontWeight: "900" as const,
    color: "#fff",
    lineHeight: 26,
  },

  novaContainer: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 4,
  },

  novaTitle: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold as "700",
    color: THEME.colors.text,
    marginBottom: 2,
  },

  novaLabel: {
    fontSize: THEME.fontSize.sm,
    lineHeight: 16,
  },

  originContainer: {
    justifyContent: "center",
    paddingVertical: 4,
  },

  originText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
});

export default ProductDetailsModal;
