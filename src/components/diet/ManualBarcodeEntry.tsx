import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import barcodeService, {
  ProductLookupResult,
} from "@/services/barcodeService";
import { getCountryFromBarcode } from "@/utils/countryMapping";
import { ResponsiveTheme } from "@/utils/constants";
import { rbr, rf, rp } from "@/utils/responsive";

interface ManualBarcodeEntryProps {
  onLookupResolved: (result: ProductLookupResult) => void;
  onRequestLabelScan: () => void;
  onContributeProduct: (barcode: string) => void;
  onClose: () => void;
}

const SUPPORTED_LENGTHS = new Set([6, 8, 12, 13]);

export const ManualBarcodeEntry: React.FC<ManualBarcodeEntryProps> = ({
  onLookupResolved,
  onRequestLabelScan,
  onContributeProduct,
  onClose,
}) => {
  const [barcode, setBarcode] = useState("");
  const [isLooking, setIsLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<
    ProductLookupResult["outcome"] | null
  >(null);
  const inputRef = useRef<TextInput>(null);

  const cleanBarcode = barcode.trim();
  const countryName =
    cleanBarcode.length >= 3 ? getCountryFromBarcode(cleanBarcode) : "Unknown";
  const canLookUp =
    SUPPORTED_LENGTHS.has(cleanBarcode.length) && !isLooking && cleanBarcode.length > 0;

  const helperCopy = useMemo(() => {
    if (cleanBarcode.length === 0) {
      return "Supported lengths: 6, 8, 12, or 13 digits.";
    }
    return `${cleanBarcode.length} digits entered`;
  }, [cleanBarcode.length]);

  const handleChangeText = (value: string) => {
    const numeric = value.replace(/[^0-9]/g, "");
    setBarcode(numeric);
    setError(null);
    setLastOutcome(null);
  };

  const handleClear = () => {
    setBarcode("");
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
        (result.outcome === "authoritative_hit" ||
          result.outcome === "weak_data") &&
        result.product
      ) {
        onLookupResolved(result);
        return;
      }

      setLastOutcome(result.outcome);
      switch (result.outcome) {
        case "invalid_scan":
          setError(
            result.error ||
              "That code is not a supported packaged-food barcode.",
          );
          break;
        case "transient_failure":
          setError(
            result.error ||
              "Lookup failed before trusted sources completed. Retry or use a fallback.",
          );
          break;
        case "not_found":
          setError("Product not found in trusted packaged-food sources.");
          break;
        default:
          setError("Unable to resolve that barcode.");
          break;
      }
    } catch (err) {
      setLastOutcome("transient_failure");
      setError("Barcode lookup failed unexpectedly. Please try again.");
    } finally {
      setIsLooking(false);
    }
  };

  const showFallbackActions =
    lastOutcome === "not_found" || lastOutcome === "transient_failure";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoid}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Enter Barcode</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Type the barcode number printed on the package.
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={[styles.input, error ? styles.inputError : null]}
            value={barcode}
            onChangeText={handleChangeText}
            keyboardType="number-pad"
            maxLength={13}
            placeholder="Enter barcode number"
            placeholderTextColor={ResponsiveTheme.colors.textMuted}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={handleLookUp}
            editable={!isLooking}
            accessibilityLabel="Barcode input"
          />

          {barcode.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearButton}
              accessibilityLabel="Clear barcode"
              accessibilityRole="button"
            >
              <Text style={styles.clearButtonText}>X</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.helperText}>{helperCopy}</Text>
          {countryName !== "Unknown" ? (
            <Text style={styles.countryText}>Origin: {countryName}</Text>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => inputRef.current?.focus()}>
              <Text style={styles.retryLink}>Edit barcode</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {showFallbackActions ? (
          <View style={styles.fallbackActions}>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={onRequestLabelScan}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryActionText}>Scan Label</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => onContributeProduct(cleanBarcode)}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryActionText}>Contribute Product</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.lookUpButton,
            !canLookUp && styles.lookUpButtonDisabled,
          ]}
          onPress={handleLookUp}
          disabled={!canLookUp}
          accessibilityLabel="Look up product"
          accessibilityRole="button"
        >
          {isLooking ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator
                size="small"
                color={ResponsiveTheme.colors.white}
              />
              <Text style={styles.lookUpButtonText}>Looking up...</Text>
            </View>
          ) : (
            <Text
              style={[
                styles.lookUpButtonText,
                !canLookUp && styles.lookUpButtonTextDisabled,
              ]}
            >
              Look Up
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onClose}
          style={styles.cancelButton}
          accessibilityLabel="Cancel"
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    padding: ResponsiveTheme.spacing.lg,
    marginHorizontal: ResponsiveTheme.spacing.md,
    marginVertical: ResponsiveTheme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  title: {
    fontSize: rf(18),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: rbr(16),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 16,
  },
  subtitle: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: rf(17),
    color: ResponsiveTheme.colors.text,
    letterSpacing: 1.5,
    fontVariant: ["tabular-nums"],
  },
  inputError: {
    borderColor: ResponsiveTheme.colors.error,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: rbr(14),
    backgroundColor: ResponsiveTheme.colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  clearButtonText: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  helperText: {
    flex: 1,
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textMuted,
  },
  countryText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.secondary,
    fontWeight: "600",
  },
  errorCard: {
    backgroundColor: ResponsiveTheme.colors.errorTint,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.error,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.xs,
  },
  errorText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.error,
    lineHeight: 18,
  },
  retryLink: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  fallbackActions: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  secondaryAction: {
    flex: 1,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.surface,
    paddingVertical: ResponsiveTheme.spacing.sm,
    alignItems: "center",
  },
  secondaryActionText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  lookUpButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  lookUpButtonDisabled: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },
  lookUpButtonText: {
    fontSize: rf(16),
    fontWeight: "700",
    color: ResponsiveTheme.colors.white,
    letterSpacing: 0.5,
  },
  lookUpButtonTextDisabled: {
    color: ResponsiveTheme.colors.textMuted,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(8),
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  cancelText: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
  },
});

export default ManualBarcodeEntry;
