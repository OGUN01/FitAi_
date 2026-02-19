import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DataConflict,
  ResolutionStrategy,
} from "../../../services/conflictResolution";

interface ConflictItemProps {
  conflict: DataConflict;
  selectedStrategy: ResolutionStrategy;
  onStrategyChange: (strategy: ResolutionStrategy) => void;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "#EF4444";
    case "high":
      return "#F59E0B";
    case "medium":
      return "#3B82F6";
    case "low":
      return "#10B981";
    default:
      return "#6B7280";
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
            name={getConflictTypeIcon(conflict.type) as any}
            size={20}
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
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  conflictItem: {
    backgroundColor: "rgba(31, 41, 55, 0.8)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.3)",
  },
  conflictHeader: {
    marginBottom: 15,
  },
  conflictInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  conflictField: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  conflictValues: {
    marginBottom: 20,
  },
  valueContainer: {
    marginBottom: 12,
  },
  valueLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 6,
  },
  valueBox: {
    backgroundColor: "rgba(17, 24, 39, 0.8)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.3)",
  },
  valueText: {
    fontSize: 14,
    color: "#E5E7EB",
    fontFamily: "monospace",
  },
  resolutionOptions: {
    gap: 8,
  },
  resolutionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  resolutionOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.6)",
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.3)",
  },
  resolutionOptionSelected: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "#10B981",
  },
  resolutionOptionContent: {
    flex: 1,
  },
  resolutionOptionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 2,
  },
  resolutionOptionLabelSelected: {
    color: "#10B981",
  },
  resolutionOptionDescription: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  resolutionOptionDescriptionSelected: {
    color: "#A7F3D0",
  },
});
