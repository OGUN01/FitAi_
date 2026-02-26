// Conflict Resolution UI Component for Track B Infrastructure
// Provides user interface for resolving data conflicts during migration

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  DataConflict,
  ResolutionStrategy,
  ConflictResolutionResult,
} from "../../services/conflictResolution";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr } from "../../utils/responsive";

import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface ConflictResolutionProps {
  visible: boolean;
  conflicts: DataConflict[];
  onResolve: (resolutions: Record<string, ResolutionStrategy>) => void;
  onCancel: () => void;
  autoResolveEnabled?: boolean;
}

interface ConflictItemProps {
  conflict: DataConflict;
  selectedStrategy: ResolutionStrategy;
  onStrategyChange: (strategy: ResolutionStrategy) => void;
}

// ============================================================================
// CONFLICT ITEM COMPONENT
// ============================================================================

const ConflictItem: React.FC<ConflictItemProps> = ({
  conflict,
  selectedStrategy,
  onStrategyChange,
}) => {
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
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={ResponsiveTheme.colors.successAlt}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ============================================================================
// MAIN CONFLICT RESOLUTION COMPONENT
// ============================================================================

export const ConflictResolutionComponent: React.FC<ConflictResolutionProps> = ({
  visible,
  conflicts,
  onResolve,
  onCancel,
  autoResolveEnabled = true,
}) => {
  const [resolutions, setResolutions] = useState<
    Record<string, ResolutionStrategy>
  >(() => {
    const initial: Record<string, ResolutionStrategy> = {};
    conflicts.forEach((conflict) => {
      initial[conflict.id] = conflict.suggestedResolution;
    });
    return initial;
  });

  const handleStrategyChange = (
    conflictId: string,
    strategy: ResolutionStrategy,
  ) => {
    setResolutions((prev) => ({
      ...prev,
      [conflictId]: strategy,
    }));
  };

  const handleAutoResolve = () => {
    const autoResolutions: Record<string, ResolutionStrategy> = {};
    conflicts.forEach((conflict) => {
      if (conflict.autoResolvable) {
        autoResolutions[conflict.id] = conflict.suggestedResolution;
      }
    });
    setResolutions((prev) => ({ ...prev, ...autoResolutions }));
  };

  const handleResolveAll = () => {
    const unresolvedConflicts = conflicts.filter(
      (conflict) =>
        !resolutions[conflict.id] || resolutions[conflict.id] === "user_choice",
    );

    if (unresolvedConflicts.length > 0) {
      crossPlatformAlert(
        "Unresolved Conflicts",
        `You have ${unresolvedConflicts.length} unresolved conflicts. Please make a choice for each conflict.`,
        [{ text: "OK" }],
      );
      return;
    }

    onResolve(resolutions);
  };

  const getConflictStats = () => {
    const total = conflicts.length;
    const resolved = Object.keys(resolutions).filter(
      (id) => resolutions[id] && resolutions[id] !== "user_choice",
    ).length;
    const autoResolvable = conflicts.filter((c) => c.autoResolvable).length;

    return { total, resolved, autoResolvable };
  };

  const stats = getConflictStats();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <LinearGradient
          colors={[
            ResponsiveTheme.colors.backgroundSecondary,
            ResponsiveTheme.colors.background,
          ]}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Resolve Data Conflicts</Text>
            <Text style={styles.subtitle}>
              We found {conflicts.length} conflicts that need your attention
            </Text>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.resolved}</Text>
                <Text style={styles.statLabel}>Resolved</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.autoResolvable}</Text>
                <Text style={styles.statLabel}>Auto-Resolvable</Text>
              </View>
            </View>

            {autoResolveEnabled && stats.autoResolvable > 0 && (
              <TouchableOpacity
                style={styles.autoResolveButton}
                onPress={handleAutoResolve}
              >
                <Ionicons
                  name="flash"
                  size={16}
                  color={ResponsiveTheme.colors.white}
                />
                <Text style={styles.autoResolveText}>
                  Auto-Resolve {stats.autoResolvable} Conflicts
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.conflictsList}
            showsVerticalScrollIndicator={false}
          >
            {conflicts.map((conflict) => (
              <ConflictItem
                key={conflict.id}
                conflict={conflict}
                selectedStrategy={resolutions[conflict.id]}
                onStrategyChange={(strategy) =>
                  handleStrategyChange(conflict.id, strategy)
                }
              />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.resolveButton,
                stats.resolved < stats.total && styles.resolveButtonDisabled,
              ]}
              onPress={handleResolveAll}
              disabled={stats.resolved < stats.total}
            >
              <Text style={styles.resolveButtonText}>
                Resolve All ({stats.resolved}/{stats.total})
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    padding: rp(20),
    paddingTop: rp(60),
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.glassBorder,
  },
  title: {
    fontSize: rf(28),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.white,
    marginBottom: rp(8),
  },
  subtitle: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(20),
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: rp(20),
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.primaryDark,
  },
  statLabel: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(4),
  },
  autoResolveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ResponsiveTheme.colors.primaryDark,
    paddingVertical: rp(12),
    paddingHorizontal: rp(20),
    borderRadius: rbr(10),
    gap: rp(8),
  },
  autoResolveText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(14),
    fontWeight: "600",
  },
  conflictsList: {
    flex: 1,
    padding: rp(20),
  },
  conflictItem: {
    backgroundColor: "rgba(31, 41, 55, 0.8)",
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
    backgroundColor: "rgba(17, 24, 39, 0.8)",
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
    backgroundColor: "rgba(17, 24, 39, 0.6)",
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
    color: ResponsiveTheme.colors.successAlt,
  },
  footer: {
    flexDirection: "row",
    padding: rp(20),
    paddingBottom: rp(40),
    gap: rp(15),
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.glassBorder,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingVertical: rp(15),
    borderRadius: rbr(12),
    alignItems: "center",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.errorAlt,
  },
  cancelButtonText: {
    color: ResponsiveTheme.colors.errorAlt,
    fontSize: rf(16),
    fontWeight: "600",
  },
  resolveButton: {
    flex: 2,
    backgroundColor: ResponsiveTheme.colors.successAlt,
    paddingVertical: rp(15),
    borderRadius: rbr(12),
    alignItems: "center",
  },
  resolveButtonDisabled: {
    backgroundColor: "rgba(107, 114, 128, 0.3)",
  },
  resolveButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(16),
    fontWeight: "600",
  },
});

export default ConflictResolutionComponent;
