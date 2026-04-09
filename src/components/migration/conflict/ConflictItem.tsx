import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DataConflict,
  ResolutionStrategy,
} from "../../../services/conflictResolution";
import { rf, rp, rbr } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";

interface ConflictItemProps {
  conflict: DataConflict;
  selectedStrategy: ResolutionStrategy;
  onStrategyChange: (strategy: ResolutionStrategy) => void;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return ResponsiveTheme.colors.errorAlt;
    case "high":
      return ResponsiveTheme.colors.warningAlt;
    case "medium":
      return ResponsiveTheme.colors.info;
    case "low":
      return ResponsiveTheme.colors.successAlt;
    default:
      return ResponsiveTheme.colors.textTertiary;
  }
};

const getConflictTypeIcon = (type: string) => {
  switch (type) {
    case "value_mismatch":
      return "swap-horizontal-outline";
    case "missing_local":
      return "cloud-download-outline";
    case "missing_remote":
      return "cloud-upload-outline";
    case "type_mismatch":
      return "warning-outline";
    case "duplicate_record":
      return "copy-outline";
    default:
      return "alert-circle-outline";
  }
};

const formatValue = (value: any) => {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

const resolutionOptions: {
  strategy: ResolutionStrategy;
  label: string;
  description: string;
}[] = [
  {
    strategy: "local_wins",
    label: "Keep Local",
    description: "Use the value from your device",
  },
  {
    strategy: "remote_wins",
    label: "Use Cloud",
    description: "Use the value from the cloud",
  },
  {
    strategy: "merge_values",
    label: "Merge Both",
    description: "Combine both values when possible",
  },
  {
    strategy: "skip_field",
    label: "Skip Field",
    description: "Ignore this field for now",
  },
];

export const ConflictItem: React.FC<ConflictItemProps> = ({
  conflict,
  selectedStrategy,
  onStrategyChange,
}) => {
  return (
    <View style={styles.conflictItem}>
      <View style={styles.conflictHeader}>
        <View style={styles.conflictInfo}>
          <Ionicons
            name={getConflictTypeIcon(conflict.type) as ComponentProps<typeof Ionicons>['name']}
            size={rf(20)}
            color={getSeverityColor(conflict.severity)}
          />
          <Text style={styles.conflictField}>{conflict.field}</Text>
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: getSeverityColor(conflict.severity) },
            ]}
          >
            <Text style={styles.severityText}>
              {conflict.severity.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.conflictValues}>
        <View style={styles.valueContainer}>
          <Text style={styles.valueLabel}>Local Value:</Text>
          <View style={styles.valueBox}>
            <Text style={styles.valueText}>
              {formatValue(conflict.localValue)}
            </Text>
          </View>
        </View>

        <View style={styles.valueContainer}>
          <Text style={styles.valueLabel}>Cloud Value:</Text>
          <View style={styles.valueBox}>
            <Text style={styles.valueText}>
              {formatValue(conflict.remoteValue)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.resolutionOptions}>
        <Text style={styles.resolutionLabel}>Choose Resolution:</Text>
        {resolutionOptions.map((option) => (
          <TouchableOpacity
            key={option.strategy}
            style={[
              styles.resolutionOption,
              selectedStrategy === option.strategy &&
                styles.resolutionOptionSelected,
            ]}
            onPress={() => onStrategyChange(option.strategy)}
          >
            <View style={styles.resolutionOptionContent}>
              <Text
                style={[
                  styles.resolutionOptionLabel,
                  selectedStrategy === option.strategy &&
                    styles.resolutionOptionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[
                  styles.resolutionOptionDescription,
                  selectedStrategy === option.strategy &&
                    styles.resolutionOptionDescriptionSelected,
                ]}
              >
                {option.description}
              </Text>
            </View>
            {selectedStrategy === option.strategy && (
              <Ionicons
                name="checkmark-circle"
                size={rf(20)}
                color={ResponsiveTheme.colors.successAlt}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  conflictItem: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(15),
    padding: rp(20),
    marginBottom: rp(20),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassBorder,
  },
  conflictHeader: {
    marginBottom: rp(15),
  },
  conflictInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(10),
  },
  conflictField: {
    fontSize: rf(18),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
    borderRadius: rbr(6),
  },
  severityText: {
    fontSize: rf(10),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.white,
  },
  conflictValues: {
    marginBottom: rp(20),
  },
  valueContainer: {
    marginBottom: rp(12),
  },
  valueLabel: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(6),
  },
  valueBox: {
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: rbr(8),
    padding: rp(12),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassBorder,
  },
  valueText: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.text,
    fontFamily: "monospace",
  },
  resolutionOptions: {
    gap: rp(8),
  },
  resolutionLabel: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
    marginBottom: rp(12),
  },
  resolutionOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: rbr(10),
    padding: rp(15),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassBorder,
  },
  resolutionOptionSelected: {
    backgroundColor: ResponsiveTheme.colors.successTint,
    borderColor: ResponsiveTheme.colors.successAlt,
  },
  resolutionOptionContent: {
    flex: 1,
  },
  resolutionOptionLabel: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(2),
  },
  resolutionOptionLabelSelected: {
    color: ResponsiveTheme.colors.successAlt,
  },
  resolutionOptionDescription: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
  },
  resolutionOptionDescriptionSelected: {
    color: ResponsiveTheme.colors.successLight,
  },
});
