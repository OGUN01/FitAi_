import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { rf } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Card } from '../ui';
import { ValidationResult } from '../../services/validationEngine';

// ============================================================================
// TYPES
// ============================================================================

interface WarningCardProps {
  warnings: ValidationResult[];
  onAcknowledgmentChange?: (acknowledged: boolean) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WarningCard: React.FC<WarningCardProps> = ({ warnings, onAcknowledgmentChange }) => {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAcknowledgmentToggle = () => {
    const newValue = !acknowledged;
    setAcknowledged(newValue);
    onAcknowledgmentChange?.(newValue);
  };

  return (
    <Card style={styles.container}>
      <Text style={styles.header}>
        ⚠️ Important Considerations
      </Text>
      
      {warnings.map((warning, index) => (
        <View key={index} style={styles.warningItem}>
          <Text style={styles.warningMessage}>
            {warning.message}
          </Text>
          
          {warning.impact && (
            <Text style={styles.impactText}>
              Impact: {warning.impact}
            </Text>
          )}
          
          {warning.risks && warning.risks.length > 0 && (
            <View style={styles.risksContainer}>
              <Text style={styles.risksTitle}>Risks:</Text>
              {warning.risks.map((risk, i) => (
                <Text key={i} style={styles.riskText}>
                  • {risk}
                </Text>
              ))}
            </View>
          )}
          
          {warning.recommendations && warning.recommendations.length > 0 && (
            <View style={styles.recommendationsContainer}>
              {warning.recommendations.map((rec, i) => (
                <Text key={i} style={styles.recommendationText}>
                  • {rec}
                </Text>
              ))}
            </View>
          )}
        </View>
      ))}
      
      {/* Acknowledgment Checkbox */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={handleAcknowledgmentToggle}
      >
        <View style={[styles.checkboxBox, acknowledged && styles.checkboxBoxChecked]}>
          {acknowledged && <Text style={styles.checkboxCheck}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>
          I understand these considerations and want to proceed
        </Text>
      </TouchableOpacity>
    </Card>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 2,
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  header: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: '#B45309',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  warningItem: {
    marginTop: ResponsiveTheme.spacing.md,
  },

  warningMessage: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: '#92400E',
    lineHeight: rf(22),
  },

  impactText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#78350F',
    fontStyle: 'italic',
    marginTop: ResponsiveTheme.spacing.xs,
  },

  risksContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  risksTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: '#92400E',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  riskText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#6B7280',
    marginTop: ResponsiveTheme.spacing.xs,
    lineHeight: rf(18),
  },

  recommendationsContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  recommendationText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#6B7280',
    marginTop: ResponsiveTheme.spacing.xs,
    lineHeight: rf(18),
  },

  // Checkbox
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#FCD34D',
  },

  checkboxBox: {
    width: rf(24),
    height: rf(24),
    borderRadius: ResponsiveTheme.borderRadius.sm,
    borderWidth: 2,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ResponsiveTheme.spacing.sm,
  },

  checkboxBoxChecked: {
    borderColor: '#92400E',
    backgroundColor: '#F59E0B',
  },

  checkboxCheck: {
    fontSize: rf(16),
    color: '#FFFFFF',
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  checkboxLabel: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#92400E',
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});

