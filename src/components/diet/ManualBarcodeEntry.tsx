import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ScannedProduct } from "@/services/barcodeService";
import barcodeService from "@/services/barcodeService";
import { getCountryFromBarcode } from "@/utils/countryMapping";
import { ResponsiveTheme } from "@/utils/constants";

// ─── Country flag mapping ────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  India: "🇮🇳",
  USA: "🇺🇸",
  Canada: "🇨🇦",
  UK: "🇬🇧",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Japan: "🇯🇵",
  China: "🇨🇳",
  "South Korea": "🇰🇷",
  Korea: "🇰🇷",
  Brazil: "🇧🇷",
  Australia: "🇦🇺",
  "New Zealand": "🇳🇿",
  "Saudi Arabia": "🇸🇦",
  UAE: "🇦🇪",
  Israel: "🇮🇱",
  Taiwan: "🇹🇼",
  Philippines: "🇵🇭",
  Thailand: "🇹🇭",
  Indonesia: "🇮🇩",
  "South Africa": "🇿🇦",
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface ManualBarcodeEntryProps {
  onProductFound: (product: ScannedProduct) => void;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ManualBarcodeEntry: React.FC<ManualBarcodeEntryProps> = ({
  onProductFound,
  onClose,
}) => {
  const [barcode, setBarcode] = useState<string>("");
  const [isLooking, setIsLooking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // ── Derived state ──────────────────────────────────────────────────────────

  const countryName =
    barcode.length >= 3 ? getCountryFromBarcode(barcode) : "Unknown";
  const countryHint =
    countryName !== "Unknown" && COUNTRY_FLAGS[countryName]
      ? `${COUNTRY_FLAGS[countryName]} ${countryName}`
      : null;
  const canLookUp = barcode.length >= 8 && !isLooking;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleChangeText = (value: string) => {
    // Only allow numeric characters
    const numeric = value.replace(/[^0-9]/g, "");
    setBarcode(numeric);
    if (error) setError(null);
  };

  const handleClear = () => {
    setBarcode("");
    setError(null);
    inputRef.current?.focus();
  };

  const handleLookUp = async () => {
    if (!canLookUp) return;

    setIsLooking(true);
    setError(null);

    try {
      const result = await barcodeService.lookupProduct(barcode);

      if (result.success && result.product) {
        onProductFound(result.product);
      } else {
        setError("Product not found. Try a different barcode.");
      }
    } catch (err) {
      console.warn("[ManualBarcodeEntry] Lookup failed:", err);
      setError("Product not found. Try a different barcode.");
    } finally {
      setIsLooking(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    inputRef.current?.focus();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoid}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Enter Barcode</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Type the barcode number printed on the product packaging
        </Text>

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={[styles.input, error ? styles.inputError : null]}
            value={barcode}
            onChangeText={handleChangeText}
            keyboardType="numeric"
            maxLength={13}
            placeholder="Enter barcode number..."
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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Clear barcode"
              accessibilityRole="button"
            >
              <Text style={styles.clearButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Country hint */}
        {countryHint !== null && (
          <View style={styles.countryHintRow}>
            <Text style={styles.countryHintLabel}>Origin: </Text>
            <Text style={styles.countryHintValue}>{countryHint}</Text>
          </View>
        )}

        {/* Digit count hint */}
        <Text style={styles.digitHint}>
          {barcode.length === 0
            ? "8–13 digits (EAN-8, UPC-A, EAN-13)"
            : `${barcode.length} / 13 digits`}
        </Text>

        {/* Error state */}
        {error !== null && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={handleRetry}
              accessibilityLabel="Try again"
              accessibilityRole="button"
            >
              <Text style={styles.retryLink}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Look Up button */}
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
              <Text style={styles.lookUpButtonText}>Looking up…</Text>
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

        {/* Cancel link */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    letterSpacing: 0.3,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    fontSize: 14,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 16,
  },

  // Subtitle
  subtitle: {
    fontSize: 13,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: 18,
  },

  // Input row
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
    fontSize: 17,
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
    borderRadius: 14,
    backgroundColor: ResponsiveTheme.colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: ResponsiveTheme.spacing.xs,
  },

  clearButtonText: {
    fontSize: 18,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 20,
    includeFontPadding: false,
  },

  // Country hint
  countryHintRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.xs,
    paddingHorizontal: 2,
  },

  countryHintLabel: {
    fontSize: 12,
    color: ResponsiveTheme.colors.textMuted,
  },

  countryHintValue: {
    fontSize: 13,
    color: ResponsiveTheme.colors.secondary,
    fontWeight: "600",
  },

  // Digit hint
  digitHint: {
    fontSize: 11,
    color: ResponsiveTheme.colors.textMuted,
    marginBottom: ResponsiveTheme.spacing.md,
    paddingHorizontal: 2,
  },

  // Error state
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(244, 67, 54, 0.12)",
    borderRadius: ResponsiveTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.3)",
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  errorText: {
    flex: 1,
    fontSize: 13,
    color: ResponsiveTheme.colors.error,
    lineHeight: 18,
  },

  retryLink: {
    fontSize: 13,
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
    marginLeft: ResponsiveTheme.spacing.sm,
  },

  // Look Up button
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
    fontSize: 16,
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
    gap: 8,
  },

  // Cancel
  cancelButton: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
  },

  cancelText: {
    fontSize: 14,
    color: ResponsiveTheme.colors.textSecondary,
  },
});

export default ManualBarcodeEntry;
