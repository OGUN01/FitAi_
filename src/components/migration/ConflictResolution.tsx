// Conflict Resolution UI Component for Track B Infrastructure
// Provides user interface for resolving data conflicts during migration

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  DataConflict,
  ResolutionStrategy,
  ConflictResolutionResult,
} from '../../services/conflictResolution';

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
      case 'critical':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#3B82F6';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case 'value_mismatch':
        return 'swap-horizontal-outline';
      case 'missing_local':
        return 'cloud-download-outline';
      case 'missing_remote':
        return 'cloud-upload-outline';
      case 'type_mismatch':
        return 'warning-outline';
      case 'duplicate_record':
        return 'copy-outline';
      default:
        return 'alert-circle-outline';
    }
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const resolutionOptions: { strategy: ResolutionStrategy; label: string; description: string }[] =
    [
      {
        strategy: 'local_wins',
        label: 'Keep Local',
        description: 'Use the value from your device',
      },
      {
        strategy: 'remote_wins',
        label: 'Use Cloud',
        description: 'Use the value from the cloud',
      },
      {
        strategy: 'merge_values',
        label: 'Merge Both',
        description: 'Combine both values when possible',
      },
      {
        strategy: 'skip_field',
        label: 'Skip Field',
        description: 'Ignore this field for now',
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
            style={[styles.severityBadge, { backgroundColor: getSeverityColor(conflict.severity) }]}
          >
            <Text style={styles.severityText}>{conflict.severity.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.conflictValues}>
        <View style={styles.valueContainer}>
          <Text style={styles.valueLabel}>Local Value:</Text>
          <View style={styles.valueBox}>
            <Text style={styles.valueText}>{formatValue(conflict.localValue)}</Text>
          </View>
        </View>

        <View style={styles.valueContainer}>
          <Text style={styles.valueLabel}>Cloud Value:</Text>
          <View style={styles.valueBox}>
            <Text style={styles.valueText}>{formatValue(conflict.remoteValue)}</Text>
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
              selectedStrategy === option.strategy && styles.resolutionOptionSelected,
            ]}
            onPress={() => onStrategyChange(option.strategy)}
          >
            <View style={styles.resolutionOptionContent}>
              <Text
                style={[
                  styles.resolutionOptionLabel,
                  selectedStrategy === option.strategy && styles.resolutionOptionLabelSelected,
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
  const [resolutions, setResolutions] = useState<Record<string, ResolutionStrategy>>(() => {
    const initial: Record<string, ResolutionStrategy> = {};
    conflicts.forEach((conflict) => {
      initial[conflict.id] = conflict.suggestedResolution;
    });
    return initial;
  });

  const handleStrategyChange = (conflictId: string, strategy: ResolutionStrategy) => {
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
      (conflict) => !resolutions[conflict.id] || resolutions[conflict.id] === 'user_choice'
    );

    if (unresolvedConflicts.length > 0) {
      Alert.alert(
        'Unresolved Conflicts',
        `You have ${unresolvedConflicts.length} unresolved conflicts. Please make a choice for each conflict.`,
        [{ text: 'OK' }]
      );
      return;
    }

    onResolve(resolutions);
  };

  const getConflictStats = () => {
    const total = conflicts.length;
    const resolved = Object.keys(resolutions).filter(
      (id) => resolutions[id] && resolutions[id] !== 'user_choice'
    ).length;
    const autoResolvable = conflicts.filter((c) => c.autoResolvable).length;

    return { total, resolved, autoResolvable };
  };

  const stats = getConflictStats();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <LinearGradient colors={['#1F2937', '#111827']} style={styles.gradient}>
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
              <TouchableOpacity style={styles.autoResolveButton} onPress={handleAutoResolve}>
                <Ionicons name="flash" size={16} color="#FFFFFF" />
                <Text style={styles.autoResolveText}>
                  Auto-Resolve {stats.autoResolvable} Conflicts
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.conflictsList} showsVerticalScrollIndicator={false}>
            {conflicts.map((conflict) => (
              <ConflictItem
                key={conflict.id}
                conflict={conflict}
                selectedStrategy={resolutions[conflict.id]}
                onStrategyChange={(strategy) => handleStrategyChange(conflict.id, strategy)}
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
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 85, 99, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  autoResolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  autoResolveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  conflictsList: {
    flex: 1,
    padding: 20,
  },
  conflictItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  conflictHeader: {
    marginBottom: 15,
  },
  conflictInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  conflictField: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  conflictValues: {
    marginBottom: 20,
  },
  valueContainer: {
    marginBottom: 12,
  },
  valueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 6,
  },
  valueBox: {
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  valueText: {
    fontSize: 14,
    color: '#E5E7EB',
    fontFamily: 'monospace',
  },
  resolutionOptions: {
    gap: 8,
  },
  resolutionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  resolutionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  resolutionOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  resolutionOptionContent: {
    flex: 1,
  },
  resolutionOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 2,
  },
  resolutionOptionLabelSelected: {
    color: '#10B981',
  },
  resolutionOptionDescription: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  resolutionOptionDescriptionSelected: {
    color: '#A7F3D0',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    gap: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(75, 85, 99, 0.3)',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  resolveButton: {
    flex: 2,
    backgroundColor: '#10B981',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  resolveButtonDisabled: {
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
  },
  resolveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ConflictResolutionComponent;
