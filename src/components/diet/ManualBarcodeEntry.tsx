import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import barcodeService, { ProductLookupResult } from '@/services/barcodeService';
import { getCountryFromBarcode } from '@/utils/countryMapping';
import { flatColors as colors, spacing, borderRadius } from '@/theme/aurora-tokens';
import { rbr, rf, rp } from '@/utils/responsive';
import { AnimatedPressable } from '@/components/ui/aurora/AnimatedPressable';
import { AuroraSpinner } from '@/components/ui/aurora/AuroraSpinner';
import { DietTextField } from './DietTextField';

interface ManualBarcodeEntryProps {
  onLookupResolved: (result: ProductLookupResult) => void;
  onRequestLabelScan: () => void;
  onContributeProduct: (barcode: string) => void;
  onClose: () => void;
}

const SUPPORTED_LENGTHS = new Set([6, 8, 12, 13]);

// EAN/UPC check-digit (mod-10) validation. Every supported length (EAN-8,
// UPC-E treated as 6/8, UPC-A/EAN-13) uses the same weighted mod-10 scheme:
// starting from the rightmost digit (the check digit itself), digits
// alternate weight 1 and 3, and the check digit must make the total a
// multiple of 10. Catches transposed-digit typos before a network round trip.
const isValidBarcodeChecksum = (digits: string): boolean => {
  if (!/^\d+$/.test(digits) || digits.length === 0) return false;
  const checkDigit = Number(digits[digits.length - 1]);
  let sum = 0;
  // Iterate right-to-left starting at the digit before the check digit.
  for (let i = digits.length - 2, weightIndex = 0; i >= 0; i -= 1, weightIndex += 1) {
    const digit = Number(digits[i]);
    sum += weightIndex % 2 === 0 ? digit * 3 : digit;
  }
  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  return expectedCheckDigit === checkDigit;
};

export const ManualBarcodeEntry: React.FC<ManualBarcodeEntryProps> = ({
  onLookupResolved,
  onRequestLabelScan,
  onContributeProduct,
  onClose,
}) => {
  const [barcode, setBarcode] = useState('');
  const [isLooking, setIsLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<ProductLookupResult['outcome'] | null>(null);
  const inputRef = useRef<TextInput>(null);

  const cleanBarcode = barcode.trim();
  const countryName = cleanBarcode.length >= 3 ? getCountryFromBarcode(cleanBarcode) : 'Unknown';
  const hasSupportedLength = SUPPORTED_LENGTHS.has(cleanBarcode.length);
  // The standard mod-10 weighted checksum only applies to full GTIN forms
  // (EAN-8, UPC-A, EAN-13). The bare 6-digit UPC-E compressed form has no
  // check digit of its own to verify against, so it's left ungated here.
  const hasValidChecksum =
    hasSupportedLength &&
    (cleanBarcode.length === 6 || isValidBarcodeChecksum(cleanBarcode));
  const canLookUp = hasValidChecksum && !isLooking && cleanBarcode.length > 0;

  const helperCopy = useMemo(() => {
    if (cleanBarcode.length === 0) {
      return 'Supported lengths: 6, 8, 12, or 13 digits.';
    }
    if (!hasSupportedLength) {
      return 'Barcode length not recognized — must be 6, 8, 12, or 13 digits.';
    }
    if (!hasValidChecksum) {
      return 'That number does not look right — check for a typo.';
    }
    return `${cleanBarcode.length} digits entered`;
  }, [cleanBarcode.length, hasSupportedLength, hasValidChecksum]);

  const handleChangeText = (value: string) => {
    const numeric = value.replace(/[^0-9]/g, '');
    setBarcode(numeric);
    setError(null);
    setLastOutcome(null);
  };

  const handleClear = () => {
    setBarcode('');
    setError(null);
    setLastOutcome(null);
    inputRef.current?.focus();
  };

  const handleLookUp = async () => {
    if (!canLookUp) return;

    setIsLooking(true);
    setError(null);
    setLastOutcome(null);

    try {
      const result = await barcodeService.lookupProduct(cleanBarcode);

      if (
        (result.outcome === 'authoritative_hit' || result.outcome === 'weak_data') &&
        result.product
      ) {
        onLookupResolved(result);
        return;
      }

      setLastOutcome(result.outcome);
      switch (result.outcome) {
        case 'invalid_scan':
          setError(result.error || 'That code is not a supported packaged-food barcode.');
          break;
        case 'transient_failure':
          setError(
            result.error ||
              'Lookup failed before trusted sources completed. Retry or use a fallback.'
          );
          break;
        case 'not_found':
          setError('Product not found in trusted packaged-food sources.');
          break;
        default:
          setError('Unable to resolve that barcode.');
          break;
      }
    } catch (err) {
      console.error('ManualBarcodeEntry: barcode lookup failed', err);
      setLastOutcome('transient_failure');
      setError('Barcode lookup failed unexpectedly. Please try again.');
    } finally {
      setIsLooking(false);
    }
  };

  const showFallbackActions = lastOutcome === 'not_found' || lastOutcome === 'transient_failure';

  return (
    <>
        <View style={styles.header}>
          <Text style={styles.title}>Enter Barcode</Text>
          <AnimatedPressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={rf(16)} color={colors.textSecondary} />
          </AnimatedPressable>
        </View>

        <Text style={styles.subtitle}>Type the barcode number printed on the package.</Text>

        <DietTextField
          ref={inputRef}
          icon="barcode-outline"
          containerStyle={styles.inputRow}
          inputStyle={styles.input}
          value={barcode}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          maxLength={13}
          placeholder="Enter barcode number"
          autoFocus
          returnKeyType="search"
          onSubmitEditing={handleLookUp}
          editable={!isLooking}
          error={!!error}
          accessibilityLabel="Barcode input"
          rightElement={
            barcode.length > 0 ? (
              <AnimatedPressable
                onPress={handleClear}
                style={styles.clearButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                scaleValue={0.9}
                springConfig="snappy"
                hapticType="light"
                accessibilityLabel="Clear barcode"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={rf(14)} color={colors.textSecondary} />
              </AnimatedPressable>
            ) : undefined
          }
        />

        <View style={styles.metaRow}>
          <Text
            style={[
              styles.helperText,
              cleanBarcode.length > 0 && !hasValidChecksum && styles.helperTextWarning,
            ]}
          >
            {helperCopy}
          </Text>
          {countryName !== 'Unknown' ? (
            <Text style={styles.countryText}>Origin: {countryName}</Text>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <AnimatedPressable
              onPress={() => inputRef.current?.focus()}
              scaleValue={0.96}
              springConfig="smooth"
              hapticType="light"
              accessibilityRole="button"
              accessibilityLabel="Edit barcode"
            >
              <Text style={styles.retryLink}>Edit barcode</Text>
            </AnimatedPressable>
          </View>
        ) : null}

        {showFallbackActions ? (
          <View style={styles.fallbackActions}>
            <AnimatedPressable
              containerStyle={styles.secondaryActionContainer}
              style={styles.secondaryAction}
              onPress={onRequestLabelScan}
              scaleValue={0.96}
              springConfig="smooth"
              hapticType="light"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryActionText}>Scan Label</Text>
            </AnimatedPressable>
            <AnimatedPressable
              containerStyle={styles.secondaryActionContainer}
              style={styles.secondaryAction}
              onPress={() => onContributeProduct(cleanBarcode)}
              scaleValue={0.96}
              springConfig="smooth"
              hapticType="light"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryActionText}>Contribute Product</Text>
            </AnimatedPressable>
          </View>
        ) : null}

        <AnimatedPressable
          style={[styles.lookUpButton, !canLookUp && styles.lookUpButtonDisabled]}
          onPress={handleLookUp}
          disabled={!canLookUp}
          scaleValue={0.97}
          springConfig="smooth"
          hapticType="medium"
          accessibilityLabel="Look up product"
          accessibilityRole="button"
        >
          {isLooking ? (
            <View style={styles.loadingRow}>
              <AuroraSpinner customSize={rf(14)} theme="dark" />
              <Text style={styles.lookUpButtonText}>Looking up...</Text>
            </View>
          ) : (
            <Text style={[styles.lookUpButtonText, !canLookUp && styles.lookUpButtonTextDisabled]}>
              Look Up
            </Text>
          )}
        </AnimatedPressable>

        <AnimatedPressable
          onPress={onClose}
          style={styles.cancelButton}
          scaleValue={0.96}
          springConfig="smooth"
          hapticType="light"
          accessibilityLabel="Cancel"
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </AnimatedPressable>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: rf(18),
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: rbr(16),
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: rf(14),
    color: colors.textSecondary,
    lineHeight: 16,
  },
  subtitle: {
    fontSize: rf(13),
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  inputRow: {
    marginBottom: spacing.xs,
  },
  input: {
    fontSize: rf(17),
    color: colors.text,
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: rbr(14),
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  clearButtonText: {
    fontSize: rf(14),
    color: colors.textSecondary,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  helperText: {
    flex: 1,
    fontSize: rf(11),
    color: colors.textMuted,
  },
  helperTextWarning: {
    color: colors.error,
  },
  countryText: {
    fontSize: rf(12),
    color: colors.secondary,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: colors.errorTint,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    fontSize: rf(13),
    color: colors.error,
    lineHeight: 18,
  },
  retryLink: {
    fontSize: rf(13),
    fontWeight: '600',
    color: colors.primary,
  },
  fallbackActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  // Sizing lives on the AnimatedPressable's containerStyle (the outer
  // Animated.View — the actual flex participant in fallbackActions); `style`
  // below is applied to the inner Pressable and stays paint-only.
  secondaryActionContainer: {
    flex: 1,
  },
  secondaryAction: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: colors.text,
  },
  lookUpButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  lookUpButtonDisabled: {
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lookUpButtonText: {
    fontSize: rf(16),
    fontWeight: '700',
    // White-on-primary computes to ~2.84:1, failing WCAG AA; near-black
    // computes to ~7.4:1 against #FF6B35.
    color: colors.background,
    letterSpacing: 0.5,
  },
  lookUpButtonTextDisabled: {
    color: colors.textMuted,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(8),
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelText: {
    fontSize: rf(14),
    color: colors.textSecondary,
  },
});

export default ManualBarcodeEntry;
