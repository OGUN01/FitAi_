import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { ResponsiveTheme } from '../../utils/constants';
import { HealthScoreIndicator } from './HealthScoreIndicator';
import type { ScannedProduct } from '../../services/barcodeService';
import { rf, rp } from '../../utils/responsive';
import {
  clampPackagedFoodGrams,
  getDefaultPackagedFoodGrams,
  scaleScannedProductNutrition,
} from '../../utils/packagedFoodNutrition';

const NUTRI_SCORE_COLORS: Record<string, string> = {
  a: '#038141',
  b: '#85BB2F',
  c: '#FECB02',
  d: '#EE8100',
  e: '#E63E11',
};

const NOVA_LABELS: Record<number, string> = {
  1: 'Unprocessed or minimally processed',
  2: 'Processed culinary ingredients',
  3: 'Processed foods',
  4: 'Ultra-processed foods',
};

interface ProductDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  product: ScannedProduct;
  healthAssessment?: {
    overallScore: number;
    category: 'excellent' | 'good' | 'moderate' | 'poor' | 'unhealthy';
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
  // eslint-disable-next-line no-unused-vars
  onAddToMeal?(product: ScannedProduct, grams: number): Promise<void> | void;
}

type ListTone = 'default' | 'warning' | 'positive';

const formatNumber = (value: number | undefined, digits = 1): string => {
  if (value === undefined || !Number.isFinite(value)) return '--';
  return digits === 0 ? `${Math.round(value)}` : value.toFixed(digits);
};

const formatInputGrams = (grams: number): string => {
  const rounded = clampPackagedFoodGrams(grams);
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`;
};

const sanitizeGramInput = (value: string): string => {
  const cleanedValue = value.replace(/[^0-9.]/g, '');
  const [wholePart, ...decimalParts] = cleanedValue.split('.');
  if (!decimalParts.length) return wholePart;
  return `${wholePart}.${decimalParts.join('')}`;
};

const isVisionLabelProduct = (product: ScannedProduct): boolean =>
  product.source === 'vision-label';

const getProductSourceLabel = (product: ScannedProduct): string =>
  isVisionLabelProduct(product) ? 'Label scan' : product.source;

const getBreakdownColor = (score: number) => {
  if (score >= 80) return ResponsiveTheme.colors.successAlt;
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#f97316';
  return ResponsiveTheme.colors.errorAlt;
};

const NutritionCard: React.FC<{
  label: string;
  value: string;
  unit?: string;
}> = ({ label, value, unit }) => (
  <View style={styles.nutritionItem}>
    <Text style={styles.nutritionLabel}>{label}</Text>
    <Text style={styles.nutritionValue}>
      {value}
      {unit ?? ''}
    </Text>
  </View>
);

const ListSection: React.FC<{
  title: string;
  items: string[];
  tone?: ListTone;
}> = ({ title, items, tone = 'default' }) => {
  if (!items.length) return null;

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <View
          key={`${title}-${item}`}
          style={[
            styles.listItem,
            tone === 'warning' && styles.warningListItem,
            tone === 'positive' && styles.positiveListItem,
          ]}
        >
          <Text style={styles.listBullet}>-</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
};

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  visible,
  onClose,
  product,
  healthAssessment,
  onAddToMeal,
}) => {
  const defaultGrams = useMemo(() => getDefaultPackagedFoodGrams(product), [product]);
  const [amountText, setAmountText] = useState(formatInputGrams(defaultGrams));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAmountText(formatInputGrams(defaultGrams));
    setIsSubmitting(false);
  }, [defaultGrams, product.barcode, visible]);

  const parsedAmount = useMemo(() => {
    const numericAmount = Number(amountText.trim());
    return Number.isFinite(numericAmount) && numericAmount > 0
      ? clampPackagedFoodGrams(numericAmount)
      : defaultGrams;
  }, [amountText, defaultGrams]);

  const scaledNutrition = useMemo(
    () => scaleScannedProductNutrition(product, parsedAmount),
    [parsedAmount, product]
  );

  const amountValue = Number(amountText.trim());
  const amountIsInvalid =
    amountText.trim().length > 0 && (!Number.isFinite(amountValue) || amountValue <= 0);
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleAddToMeal = async () => {
    if (!onAddToMeal || isSubmitting || amountIsInvalid) return;
    try {
      setIsSubmitting(true);
      await onAddToMeal(product, parsedAmount);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onClose={handleClose}
      closeOnOverlayPress={!isSubmitting}
      contentStyle={styles.sharedModalContent}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={true}
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              {product.additionalInfo?.imageUrl ? (
                <Image
                  source={{ uri: product.additionalInfo.imageUrl }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              ) : null}
                <View style={styles.headerText}>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.brand ? <Text style={styles.productBrand}>{product.brand}</Text> : null}
                  {product.category ? (
                    <Text style={styles.productMeta}>{product.category}</Text>
                  ) : null}
                  <Text style={styles.productMeta}>
                    {isVisionLabelProduct(product)
                      ? 'Source: Label scan'
                      : `Barcode: ${product.barcode}`}
                  </Text>
                </View>
              </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close product details"
              disabled={isSubmitting}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          {product.isAIEstimated ? (
            <View style={styles.disclaimerCard}>
              <Text style={styles.disclaimerTitle}>Review before logging</Text>
              <Text style={styles.disclaimerText}>
                This packaged-food result includes estimated data. Compare it with the product label
                if anything looks off.
              </Text>
            </View>
          ) : null}

          {product.nutriScore || product.novaGroup || product.gs1Country ? (
            <View style={styles.badgesRow}>
              {product.nutriScore ? (
                <View
                  style={[
                    styles.scoreBadge,
                    {
                      backgroundColor:
                        NUTRI_SCORE_COLORS[product.nutriScore.toLowerCase()] ??
                        ResponsiveTheme.colors.neutral,
                    },
                  ]}
                >
                  <Text style={styles.scoreBadgeLabel}>Nutri-Score</Text>
                  <Text style={styles.scoreBadgeValue}>{product.nutriScore.toUpperCase()}</Text>
                </View>
              ) : null}

              {product.novaGroup ? (
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeTitle}>NOVA {product.novaGroup}</Text>
                  <Text style={styles.infoBadgeText}>{NOVA_LABELS[product.novaGroup]}</Text>
                </View>
              ) : null}

              {product.gs1Country ? (
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeTitle}>Origin</Text>
                  <Text style={styles.infoBadgeText}>{product.gs1Country}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {healthAssessment ? (
            <View style={styles.healthCard}>
              <HealthScoreIndicator
                score={healthAssessment.overallScore}
                category={healthAssessment.category}
                size="large"
              />
              <Text style={styles.healthMeta}>
                Confidence {product.confidence}% | Source {getProductSourceLabel(product)}
              </Text>
            </View>
          ) : null}

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Nutrition for {formatInputGrams(parsedAmount)}g</Text>
            <Text style={styles.sectionCaption}>
              Stored values are per 100g. We scale them live based on the amount you enter below.
            </Text>
            <View style={styles.nutritionGrid}>
              <NutritionCard label="Calories" value={formatNumber(scaledNutrition.calories, 0)} />
              <NutritionCard
                label="Protein"
                value={formatNumber(scaledNutrition.protein)}
                unit="g"
              />
              <NutritionCard label="Carbs" value={formatNumber(scaledNutrition.carbs)} unit="g" />
              <NutritionCard label="Fat" value={formatNumber(scaledNutrition.fat)} unit="g" />
              <NutritionCard label="Fiber" value={formatNumber(scaledNutrition.fiber)} unit="g" />
              {scaledNutrition.sugar !== undefined ? (
                <NutritionCard label="Sugar" value={formatNumber(scaledNutrition.sugar)} unit="g" />
              ) : null}
              {scaledNutrition.sodium !== undefined ? (
                <NutritionCard
                  label="Sodium"
                  value={formatNumber(scaledNutrition.sodium, 2)}
                  unit="g"
                />
              ) : null}
            </View>
          </View>

          {healthAssessment ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Health breakdown</Text>
              {Object.entries(healthAssessment.breakdown).map(([key, assessment]) => (
                <View key={key} style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownLabel}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Text>
                    <View
                      style={[
                        styles.breakdownScore,
                        {
                          backgroundColor: getBreakdownColor(assessment.score),
                        },
                      ]}
                    >
                      <Text style={styles.breakdownScoreText}>{assessment.score}</Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownMessage}>{assessment.message}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <ListSection
            title="Health alerts"
            items={healthAssessment?.alerts ?? []}
            tone="warning"
          />
          <ListSection
            title="Health benefits"
            items={healthAssessment?.healthBenefits ?? []}
            tone="positive"
          />
          <ListSection title="Concerns" items={healthAssessment?.concerns ?? []} tone="warning" />
          <ListSection title="Recommendations" items={healthAssessment?.recommendations ?? []} />
          <ListSection title="Alternatives" items={healthAssessment?.alternatives ?? []} />

          {product.additionalInfo?.ingredients?.length ||
          product.additionalInfo?.allergens?.length ||
          product.additionalInfo?.labels?.length ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Additional information</Text>

              {product.additionalInfo?.ingredients?.length ? (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Ingredients</Text>
                  <Text style={styles.infoSectionText}>
                    {product.additionalInfo.ingredients.join(', ')}
                  </Text>
                </View>
              ) : null}

              {product.additionalInfo?.allergens?.length ? (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Allergens</Text>
                  <Text style={styles.infoSectionText}>
                    {product.additionalInfo.allergens.join(', ')}
                  </Text>
                </View>
              ) : null}

              {product.additionalInfo?.labels?.length ? (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Labels</Text>
                  <Text style={styles.infoSectionText}>
                    {product.additionalInfo.labels.join(', ')}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.footer}>
            <View style={styles.amountRow}>
              <View style={styles.amountTextBlock}>
                <Text style={styles.amountLabel}>Amount you are eating</Text>
                <Text style={styles.amountHint}>
                  Example: 50g will halve the calories, protein, and the rest of the nutrients.
                </Text>
              </View>
              <View style={styles.amountInputWrap}>
                <TextInput
                  style={[styles.amountInput, amountIsInvalid && styles.amountInputInvalid]}
                  value={amountText}
                  onChangeText={(value) => setAmountText(sanitizeGramInput(value))}
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                  placeholder="100"
                  placeholderTextColor={ResponsiveTheme.colors.textMuted}
                  returnKeyType="done"
                />
                <Text style={styles.amountUnit}>g</Text>
              </View>
            </View>

            {amountIsInvalid ? (
              <Text style={styles.amountError}>
                Enter a positive amount to calculate nutrients.
              </Text>
            ) : null}

            <View style={styles.footerButtons}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleClose}
                accessibilityRole="button"
                disabled={isSubmitting}
              >
                <Text style={styles.secondaryButtonText}>Close</Text>
              </TouchableOpacity>

              {onAddToMeal ? (
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (isSubmitting || amountIsInvalid) && styles.primaryButtonDisabled,
                  ]}
                  disabled={isSubmitting || amountIsInvalid}
                  onPress={() => {
                    void handleAddToMeal();
                  }}
                  accessibilityRole="button"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={ResponsiveTheme.colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Add to meal</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sharedModalContent: {
    width: '94%',
    maxHeight: '88%',
    padding: 0,
    overflow: 'hidden' as const,
  },
  keyboardAvoid: {
    width: '100%',
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
    gap: ResponsiveTheme.spacing.md,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
  },
  productImage: {
    width: rp(72),
    height: rp(72),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.surface,
  },
  headerText: {
    flex: 1,
    gap: ResponsiveTheme.spacing.xs,
  },
  productName: {
    fontSize: rf(20),
    fontWeight: ResponsiveTheme.fontWeight.bold as '700',
    color: ResponsiveTheme.colors.text,
  },
  productBrand: {
    fontSize: rf(15),
    fontWeight: '600',
    color: ResponsiveTheme.colors.primary,
  },
  productMeta: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
  },
  closeButton: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: ResponsiveTheme.colors.surface,
  },
  closeButtonText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: ResponsiveTheme.colors.text,
  },
  scrollView: {
    maxHeight: '100%',
  },
  scrollContent: {
    paddingBottom: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.md,
  },
  disclaimerCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.24)',
  },
  disclaimerTitle: {
    fontSize: rf(14),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  disclaimerText: {
    fontSize: rf(13),
    lineHeight: rf(18),
    color: ResponsiveTheme.colors.textSecondary,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.sm,
  },
  scoreBadge: {
    minWidth: rp(104),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.md,
  },
  scoreBadgeLabel: {
    fontSize: rf(12),
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
  },
  scoreBadgeValue: {
    fontSize: rf(24),
    fontWeight: '800',
    color: '#fff',
    marginTop: ResponsiveTheme.spacing.xs,
  },
  infoBadge: {
    flex: 1,
    minWidth: rp(110),
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.md,
  },
  infoBadgeTitle: {
    fontSize: rf(12),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  infoBadgeText: {
    fontSize: rf(12),
    lineHeight: rf(16),
    color: ResponsiveTheme.colors.textSecondary,
  },
  healthCard: {
    alignItems: 'center',
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    padding: ResponsiveTheme.spacing.lg,
  },
  healthMeta: {
    marginTop: ResponsiveTheme.spacing.sm,
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
  },
  sectionBlock: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    padding: ResponsiveTheme.spacing.md,
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  sectionCaption: {
    fontSize: rf(13),
    lineHeight: rf(18),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: ResponsiveTheme.spacing.sm,
  },
  nutritionItem: {
    width: '48%',
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.md,
  },
  nutritionLabel: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  nutritionValue: {
    fontSize: rf(20),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
  },
  breakdownItem: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.md,
    marginTop: ResponsiveTheme.spacing.sm,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  breakdownLabel: {
    fontSize: rf(14),
    fontWeight: '600',
    color: ResponsiveTheme.colors.text,
  },
  breakdownScore: {
    minWidth: rp(36),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ResponsiveTheme.borderRadius.full,
    paddingVertical: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
  },
  breakdownScoreText: {
    fontSize: rf(12),
    fontWeight: '700',
    color: '#fff',
  },
  breakdownMessage: {
    fontSize: rf(13),
    lineHeight: rf(18),
    color: ResponsiveTheme.colors.textSecondary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ResponsiveTheme.colors.border,
  },
  warningListItem: {
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
  },
  positiveListItem: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
  },
  listBullet: {
    width: rf(10),
    fontSize: rf(14),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    marginTop: 1,
  },
  listText: {
    flex: 1,
    fontSize: rf(13),
    lineHeight: rf(18),
    color: ResponsiveTheme.colors.textSecondary,
  },
  infoSection: {
    marginTop: ResponsiveTheme.spacing.md,
  },
  infoSectionTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  infoSectionText: {
    fontSize: rf(13),
    lineHeight: rf(18),
    color: ResponsiveTheme.colors.textSecondary,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? ResponsiveTheme.spacing.lg : ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    gap: ResponsiveTheme.spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
    alignItems: 'center',
  },
  amountTextBlock: {
    flex: 1,
  },
  amountLabel: {
    fontSize: rf(14),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  amountHint: {
    fontSize: rf(12),
    lineHeight: rf(17),
    color: ResponsiveTheme.colors.textSecondary,
  },
  amountInputWrap: {
    minWidth: rp(108),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ResponsiveTheme.spacing.sm,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.surface,
  },
  amountInput: {
    flex: 1,
    minWidth: rp(40),
    paddingVertical: 0,
    fontSize: rf(18),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    textAlign: 'right',
  },
  amountInputInvalid: {
    color: ResponsiveTheme.colors.errorAlt,
  },
  amountUnit: {
    fontSize: rf(14),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
  },
  amountError: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.errorAlt,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: rp(48),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.surface,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },
  secondaryButtonText: {
    fontSize: rf(14),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
  },
  primaryButton: {
    flex: 1.4,
    minHeight: rp(48),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.primary,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    fontSize: rf(14),
    fontWeight: '700',
    color: ResponsiveTheme.colors.white,
  },
});
