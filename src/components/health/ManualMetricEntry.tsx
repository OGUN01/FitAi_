/**
 * ManualMetricEntry
 *
 * Reusable single-row numeric input for the manual health-data entry screen.
 * Matches the aurora glass-card design language used across the settings
 * screens (see WearableConnectionScreen, CompatibleDevicesCard).
 *
 * A labeled TextInput with a unit suffix and inline validation error text.
 * Stateless: parent owns the value and validation state.
 */

import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing } from "../../theme/aurora-tokens";
import { rf, rp, rbr, rw } from "../../utils/responsive";

export interface ManualMetricEntryProps {
  /** Human-readable label, e.g. "Steps" or "Heart Rate". */
  label: string;
  /** Unit suffix shown to the right of the input, e.g. "bpm", "kg", "kcal". */
  unit: string;
  /** Current string value (kept as string so the user can type "72." freely). */
  value: string;
  /** Fired with the raw text on every change. */
  onChange: (text: string) => void;
  /** Optional Ionicons icon name shown in a circular badge to the left. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Inline validation error message — shown in red below the input when set. */
  error?: string;
  /** Accessible hint describing the field, e.g. "Daily step count". */
  hint?: string;
  /** Optional placeholder, defaults to "0". */
  placeholder?: string;
}

export const ManualMetricEntry: React.FC<ManualMetricEntryProps> = ({
  label,
  unit,
  value,
  onChange,
  icon,
  error,
  hint,
  placeholder = "0",
}) => {
  const hasError = Boolean(error);
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {icon ? (
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: hasError
                  ? colors.errorTint
                  : colors.glassHighlight,
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={rf(18)}
              color={
                hasError
                  ? colors.error
                  : colors.primary
              }
            />
          </View>
        ) : null}
        <View style={styles.labelCol}>
          <Text style={styles.label}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
        <View
          style={[
            styles.inputWrap,
            hasError && styles.inputWrapError,
          ]}
        >
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            returnKeyType="done"
            accessibilityLabel={`${label} in ${unit}`}
            accessibilityValue={{ text: value }}
          />
          <Text style={styles.unit}>{unit}</Text>
        </View>
      </View>
      {hasError ? (
        <View style={styles.errorRow}>
          <Ionicons
            name="alert-circle"
            size={rf(13)}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBadge: {
    width: rw(36),
    height: rw(36),
    borderRadius: rbr(18),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  labelCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  label: {
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.text,
  },
  hint: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glassSurface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: rbr(10),
    paddingHorizontal: spacing.sm,
    minWidth: rw(130),
  },
  inputWrapError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: rf(15),
    paddingVertical: rp(8),
    minWidth: rw(60),
  },
  unit: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: rp(4),
    marginLeft: rw(36) + spacing.sm,
  },
  errorText: {
    fontSize: rf(12),
    color: colors.error,
    marginLeft: spacing.xs,
    flex: 1,
  },
});

export default ManualMetricEntry;
