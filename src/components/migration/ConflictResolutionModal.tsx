/**
 * Conflict Resolution Modal
 * Handles data conflicts during migration with user-friendly interface
 * Allows users to choose between local and remote data or merge them
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Button } from "../ui";
import { ResponsiveTheme } from '../../utils/constants';
import { SyncConflict, ConflictResolution } from "../../types/profileData";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

interface ConflictResolutionModalProps {
  visible: boolean;
  conflicts: SyncConflict[];
  onResolve: (resolutions: ConflictResolution[]) => void;
  onCancel: () => void;
}

export const ConflictResolutionModal: React.FC<
  ConflictResolutionModalProps
> = ({ visible, conflicts, onResolve, onCancel }) => {
  const [resolutions, setResolutions] = useState<
    Map<string, ConflictResolution>
  >(new Map());

  const handleConflictResolution = (
    conflictId: string,
    resolution: ConflictResolution["resolution"],
    mergedValue?: any,
  ) => {
    const newResolution: ConflictResolution = {
      conflictId,
      resolution,
      mergedValue,
      userChoice: true,
    };

    setResolutions((prev) => new Map(prev.set(conflictId, newResolution)));
  };

  const handleResolveAll = () => {
    if (resolutions.size !== conflicts.length) {
      crossPlatformAlert(
        "Incomplete Resolution",
        "Please resolve all conflicts before proceeding.",
        [{ text: "OK" }],
      );
      return;
    }

    const resolutionArray = Array.from(resolutions.values());
    onResolve(resolutionArray);
  };

  const handleUseAllLocal = () => {
    crossPlatformAlert(
      "Use All Local Data",
      "This will keep all your local data and overwrite any cloud data. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use Local",
          style: "destructive",
          onPress: () => {
            const allLocalResolutions = conflicts.map((conflict) => ({
              conflictId: conflict.id,
              resolution: "use_local" as const,
              userChoice: true,
            }));
            onResolve(allLocalResolutions);
          },
        },
      ],
    );
  };

  const handleUseAllRemote = () => {
    crossPlatformAlert(
      "Use All Cloud Data",
      "This will keep all your cloud data and overwrite any local data. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use Cloud",
          style: "destructive",
          onPress: () => {
            const allRemoteResolutions = conflicts.map((conflict) => ({
              conflictId: conflict.id,
              resolution: "use_remote" as const,
              userChoice: true,
            }));
            onResolve(allRemoteResolutions);
          },
        },
      ],
    );
  };

  const formatValue = (value: any): string => {
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getFieldDisplayName = (field: string): string => {
    const fieldNames: Record<string, string> = {
      name: "Name",
      age: "Age",
      height: "Height",
      weight: "Weight",
      gender: "Gender",
      activityLevel: "Activity Level",
      primaryGoals: "Fitness Goals",
      timeCommitment: "Time Commitment",
      experience: "Experience Level",
      dietType: "Diet Type",
      allergies: "Allergies",
      cuisinePreferences: "Cuisine Preferences",
      restrictions: "Dietary Restrictions",
      location: "Workout Location",
      equipment: "Equipment",
      workoutTypes: "Workout Types",
      intensity: "Intensity Level",
      updatedAt: "Last Updated",
    };

    return fieldNames[field] || field;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Resolve Data Conflicts</Text>
          <Text style={styles.subtitle}>
            We found some differences between your local and cloud data. Please
            choose which version to keep for each item.
          </Text>
        </View>

        {/* Conflicts List */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {conflicts.map((conflict, index) => {
            const resolution = resolutions.get(conflict.id);

            return (
              <Card key={conflict.id} style={styles.conflictCard}>
                <View style={styles.conflictHeader}>
                  <Text style={styles.conflictTitle}>
                    {getFieldDisplayName(conflict.field)}
                  </Text>
                  <Text style={styles.conflictType}>
                    {conflict.conflictType === "value_mismatch"
                      ? "Different Values"
                      : "Version Conflict"}
                  </Text>
                </View>

                {/* Local Value */}
                <View style={styles.valueSection}>
                  <Text style={styles.valueLabel}>📱 Your Device</Text>
                  <View style={styles.valueContainer}>
                    <Text style={styles.valueText}>
                      {formatValue(conflict.localValue)}
                    </Text>
                    <Text style={styles.timestampText}>
                      Updated:{" "}
                      {new Date(conflict.localTimestamp).toLocaleString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.choiceButton,
                      resolution?.resolution === "use_local" &&
                        styles.choiceButtonSelected,
                    ]}
                    onPress={() =>
                      handleConflictResolution(conflict.id, "use_local")
                    }
                  >
                    <Text
                      style={[
                        styles.choiceButtonText,
                        resolution?.resolution === "use_local" &&
                          styles.choiceButtonTextSelected,
                      ]}
                    >
                      Use This
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Remote Value */}
                <View style={styles.valueSection}>
                  <Text style={styles.valueLabel}>☁️ Cloud</Text>
                  <View style={styles.valueContainer}>
                    <Text style={styles.valueText}>
                      {formatValue(conflict.remoteValue)}
                    </Text>
                    <Text style={styles.timestampText}>
                      Updated:{" "}
                      {new Date(conflict.remoteTimestamp).toLocaleString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.choiceButton,
                      resolution?.resolution === "use_remote" &&
                        styles.choiceButtonSelected,
                    ]}
                    onPress={() =>
                      handleConflictResolution(conflict.id, "use_remote")
                    }
                  >
                    <Text
                      style={[
                        styles.choiceButtonText,
                        resolution?.resolution === "use_remote" &&
                          styles.choiceButtonTextSelected,
                      ]}
                    >
                      Use This
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleUseAllLocal}
            >
              <Text style={styles.quickActionText}>Use All Local</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleUseAllRemote}
            >
              <Text style={styles.quickActionText}>Use All Cloud</Text>
            </TouchableOpacity>
          </View>

          {/* Main Actions */}
          <View style={styles.mainActions}>
            <Button
              title="Cancel"
              onPress={onCancel}
              variant="outline"
              style={styles.cancelButton}
            />

            <Button
              title={`Resolve ${resolutions.size}/${conflicts.length}`}
              onPress={handleResolveAll}
              variant="primary"
              style={styles.resolveButton}
              disabled={resolutions.size !== conflicts.length}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  header: {
    padding: ResponsiveTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 20,
  },

  scrollView: {
    flex: 1,
    padding: ResponsiveTheme.spacing.lg,
  },

  conflictCard: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  conflictHeader: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  conflictTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  conflictType: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.warning,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  valueSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  valueLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  valueContainer: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  valueText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  timestampText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },

  choiceButton: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center",
  },

  choiceButtonSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: ResponsiveTheme.colors.primary + "20",
  },

  choiceButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
  },

  choiceButtonTextSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  actions: {
    padding: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  quickActions: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  quickActionButton: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    alignItems: "center",
  },

  quickActionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
  },

  mainActions: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
  },

  cancelButton: {
    flex: 1,
  },

  resolveButton: {
    flex: 2,
  },
});
