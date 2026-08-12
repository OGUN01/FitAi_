import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DetentBottomSheet } from '../ui/aurora/DetentBottomSheet';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { AuroraSpinner } from '../ui/aurora/AuroraSpinner';
import { flatColors as colors, spacing, borderRadius, typography } from '../../theme/aurora-tokens';
import { hexToRgba } from '../../utils/colors';
import { HealthScoreIndicator } from './HealthScoreIndicator';
import type { ScannedProduct } from '../../services/barcodeService';
import { rf, rp } from '../../utils/responsive';
import {
  clampPackagedFoodGrams,
  getDefaultPackagedFoodGrams,
  scaleScannedProductNutrition,
} from '../../utils/packagedFoodNutrition';

// Nutri-Score grades use the standardized official colors, centralized in
// aurora-tokens as nutriScoreA–E so the literals live in one place.
const NUTRI_SCORE_COLORS: Record<string, string> = {
  a: colors.nutriScoreA,
  b: colors.nutriScoreB,
  c: colors.nutriScoreC,
  d: colors.nutriScoreD,
  e: colors.nutriScoreE,
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

// A packaged-food serving beyond this is almost always a fat-finger typo
// (e.g. "1000" instead of "100") rather than a real single amount eaten.
// It doesn't block logging outright, but requires an explicit confirmation
// so an obvious typo can't silently 10x the day's calorie/macro totals.
const LARGE_AMOUNT_WARNING_THRESHOLD_G = 1000;

const isVisionLabelProduct = (product: ScannedProduct): boolean =>
  product.source === 'vision-label';

const getProductSourceLabel = (product: ScannedProduct): string =>
  isVisionLabelProduct(product) ? 'Label scan' : product.source;

const getBreakdownColor = (score: number) => {
  if (score >= 80) return colors.successAlt;
  if (score >= 60) return colors.lime;
  if (score >= 40) return colors.yellow;
  if (score >= 20) return colors.orange;
  return colors.errorAlt;
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
  const [largeAmountConfirmed, setLargeAmountConfirmed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAmountText(formatInputGrams(defaultGrams));
    setIsSubmitting(false);
    setLargeAmountConfirmed(false);
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
  const amountIsSuspiciouslyLarge =
    !amountIsInvalid && parsedAmount > LARGE_AMOUNT_WARNING_THRESHOLD_G;
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleAddToMeal = async () => {
    if (!onAddToMeal || isSubmitting || amountIsInvalid) return;
    if (amountIsSuspiciouslyLarge && !largeAmountConfirmed) return;
    try {
      setIsSubmitting(true);
      await onAddToMeal(product, parsedAmount);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DetentBottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={[0.95]}
      dismissOnLowestDrag={!isSubmitting}
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
            <AnimatedPressable
              onPress={handleClose}
              style={styles.closeButton}
              scaleValue={0.95}
              springConfig="smooth"
              hapticType="light"
              accessibilityRole="button"
              accessibilityLabel="Close product details"
              disabled={isSubmitting}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </AnimatedPressable>
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
                        NUTRI_SCORE_COLORS[product.nutriScore.toLowerCase()] ?? colors.neutral,
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
                  onChangeText={(value) => {
                    setAmountText(sanitizeGramInput(value));
                    setLargeAmountConfirmed(false);
                  }}
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                  placeholder="100"
                  placeholderTextColor={colors.textMuted}
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

            {amountIsSuspiciouslyLarge ? (
              <AnimatedPressable
                style={styles.largeAmountWarning}
                onPress={() => setLargeAmountConfirmed((prev) => !prev)}
                scaleValue={0.98}
                springConfig="smooth"
                hapticType="light"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: largeAmountConfirmed }}
                accessibilityLabel="Confirm this large amount is correct"
              >
                <Text style={styles.largeAmountWarningTitle}>
                  {formatInputGrams(parsedAmount)}g is a large amount for one serving
                </Text>
                <Text style={styles.largeAmountWarningText}>
                  {largeAmountConfirmed
                    ? 'Confirmed — tap to undo.'
                    : 'Double-check for a typo, or tap to confirm this is correct.'}
                </Text>
              </AnimatedPressable>
            ) : null}

            <View style={styles.footerButtons}>
              <AnimatedPressable
                containerStyle={styles.secondaryButtonContainer}
                style={styles.secondaryButton}
                onPress={handleClose}
                scaleValue={0.97}
                springConfig="smooth"
                hapticType="light"
                accessibilityRole="button"
                disabled={isSubmitting}
              >
                <Text style={styles.secondaryButtonText}>Close</Text>
              </AnimatedPressable>

              {onAddToMeal ? (
                <AnimatedPressable
                  containerStyle={styles.primaryButtonContainer}
                  style={[
                    styles.primaryButton,
                    (isSubmitting ||
                      amountIsInvalid ||
                      (amountIsSuspiciouslyLarge && !largeAmountConfirmed)) &&
                      styles.primaryButtonDisabled,
                  ]}
                  disabled={
                    isSubmitting ||
                    amountIsInvalid ||
                    (amountIsSuspiciouslyLarge && !largeAmountConfirmed)
                  }
                  scaleValue={0.97}
                  springConfig="smooth"
                  hapticType="medium"
                  onPress={() => {
                    void handleAddToMeal();
                  }}
                  accessibilityRole="button"
                >
                  {isSubmitting ? (
                    <AuroraSpinner customSize={rf(16)} theme="white" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Add to meal</Text>
                  )}
                </AnimatedPressable>
              ) : null}
            </View>
          </View>
        </ScrollView>
    </DetentBottomSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  productImage: {
    width: rp(72),
    height: rp(72),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  productName: {
    fontSize: rf(20),
    fontWeight: typography.fontWeight.bold as '700',
    color: colors.text,
  },
  productBrand: {
    fontSize: rf(15),
    fontWeight: '600',
    color: colors.primary,
  },
  productMeta: {
    fontSize: rf(13),
    color: colors.textSecondary,
  },
  closeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    minHeight: Math.max(rp(44), 44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: colors.text,
  },
  scrollView: {
    maxHeight: '100%',
  },
  scrollContent: {
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  disclaimerCard: {
    backgroundColor: hexToRgba(colors.warningAlt, 0.14),
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: hexToRgba(colors.warningAlt, 0.24),
  },
  disclaimerTitle: {
    fontSize: rf(14),
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  disclaimerText: {
    fontSize: rf(13),
    lineHeight: rf(18),
    color: colors.textSecondary,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scoreBadge: {
    minWidth: rp(104),
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  scoreBadgeLabel: {
    fontSize: rf(12),
    fontWeight: '600',
    color: colors.text,
    opacity: 0.9,
  },
  scoreBadgeValue: {
    fontSize: rf(24),
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  infoBadge: {
    flex: 1,
    minWidth: rp(110),
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  infoBadgeTitle: {
    fontSize: rf(12),
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoBadgeText: {
    fontSize: rf(12),
    lineHeight: rf(16),
    color: colors.textSecondary,
  },
  healthCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  healthMeta: {
    marginTop: spacing.sm,
    fontSize: rf(13),
    color: colors.textSecondary,
  },
  sectionBlock: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionCaption: {
    fontSize: rf(13),
    lineHeight: rf(18),
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  nutritionItem: {
    width: '48%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  nutritionLabel: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  nutritionValue: {
    fontSize: rf(20),
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  breakdownItem: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  breakdownLabel: {
    fontSize: rf(14),
    fontWeight: '600',
    color: colors.text,
  },
  breakdownScore: {
    minWidth: rp(36),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  breakdownScoreText: {
    fontSize: rf(12),
    fontWeight: '700',
    color: colors.text,
  },
  breakdownMessage: {
    fontSize: rf(13),
    lineHeight: rf(18),
    color: colors.textSecondary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  warningListItem: {
    backgroundColor: hexToRgba(colors.errorAlt, 0.04),
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  positiveListItem: {
    backgroundColor: hexToRgba(colors.successAlt, 0.05),
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  listBullet: {
    width: rf(10),
    fontSize: rf(14),
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
  listText: {
    flex: 1,
    fontSize: rf(13),
    lineHeight: rf(18),
    color: colors.textSecondary,
  },
  infoSection: {
    marginTop: spacing.md,
  },
  infoSectionTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoSectionText: {
    fontSize: rf(13),
    lineHeight: rf(18),
    color: colors.textSecondary,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  amountTextBlock: {
    flex: 1,
  },
  amountLabel: {
    fontSize: rf(14),
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  amountHint: {
    fontSize: rf(12),
    lineHeight: rf(17),
    color: colors.textSecondary,
  },
  amountInputWrap: {
    minWidth: rp(108),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  amountInput: {
    flex: 1,
    minWidth: rp(40),
    paddingVertical: 0,
    fontSize: rf(18),
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  amountInputInvalid: {
    color: colors.errorAlt,
  },
  amountUnit: {
    fontSize: rf(14),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  amountError: {
    fontSize: rf(12),
    color: colors.errorAlt,
  },
  largeAmountWarning: {
    backgroundColor: hexToRgba(colors.warningAlt, 0.14),
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: hexToRgba(colors.warningAlt, 0.32),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
  largeAmountWarningTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.text,
  },
  largeAmountWarningText: {
    fontSize: rf(12),
    color: colors.textSecondary,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // Sizing lives on the AnimatedPressable's containerStyle (the outer
  // Animated.View — the actual flex participant in footerButtons); `style`
  // below is applied to the inner Pressable and stays paint-only.
  secondaryButtonContainer: {
    flex: 1,
  },
  secondaryButton: {
    minHeight: rp(48),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: rf(14),
    fontWeight: '700',
    color: colors.text,
  },
  primaryButtonContainer: {
    flex: 1.4,
  },
  primaryButton: {
    minHeight: rp(48),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    fontSize: rf(14),
    fontWeight: '700',
    color: colors.white,
  },
});
