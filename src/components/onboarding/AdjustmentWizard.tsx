import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { rf } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Card, Button } from '../ui';
import { ValidationResult } from '../../services/validationEngine';

// ============================================================================
// TYPES
// ============================================================================

export interface Alternative {
  name: string;
  icon: string;
  newTimeline?: number;
  newTargetWeight?: number;
  newWorkoutFrequency?: number;
  dailyCalories: number;
  weeklyRate: number;
  approach: string;
  pros: string[];
  cons: string[];
}

interface AdjustmentWizardProps {
  visible: boolean;
  error: ValidationResult;
  currentData: {
    bmr: number;
    tdee: number;
    currentWeight: number;
    targetWeight: number;
    currentTimeline: number;
    currentFrequency: number;
  };
  onSelectAlternative: (alternative: Alternative) => void;
  onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const AdjustmentWizard: React.FC<AdjustmentWizardProps> = ({
  visible,
  error,
  currentData,
  onSelectAlternative,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  
  // Calculate alternatives when modal opens or data changes
  useEffect(() => {
    if (visible && error.code) {
      const calculatedAlternatives = calculateAlternatives(
        currentData.bmr,
        currentData.tdee,
        currentData.currentWeight,
        currentData.targetWeight,
        currentData.currentTimeline,
        currentData.currentFrequency
      );
      setAlternatives(calculatedAlternatives);
      setSelectedIndex(null); // Reset selection
    }
  }, [visible, currentData, error]);
  
  const handleSelectAlternative = () => {
    if (selectedIndex !== null && alternatives[selectedIndex]) {
      onSelectAlternative(alternatives[selectedIndex]);
      onClose();
    }
  };
  
  // ============================================================================
  // ALTERNATIVE CALCULATION
  // ============================================================================
  
  const calculateAlternatives = (
    bmr: number,
    tdee: number,
    currentWeight: number,
    targetWeight: number,
    currentTimeline: number,
    currentFrequency: number
  ): Alternative[] => {
    
    const weightDiff = Math.abs(targetWeight - currentWeight);
    const isWeightLoss = currentWeight > targetWeight;
    
    // Safe rates
    const safeOptimalRate = currentWeight * 0.0075;  // 0.75% BW/week (optimal)
    const safeMaxRate = currentWeight * 0.01;  // 1% BW/week (aggressive but safe)
    
    const alternatives: Alternative[] = [];
    
    // ========================================================================
    // ALTERNATIVE 1: EXTEND TIMELINE (Optimal Rate, No Exercise Change)
    // ========================================================================
    
    const optimalWeeks = Math.ceil(weightDiff / safeOptimalRate);
    const optimalDeficit = (safeOptimalRate * 7700) / 7;
    const optimalCalories = isWeightLoss 
      ? Math.max(Math.round(tdee - optimalDeficit), bmr)
      : Math.round(tdee + optimalDeficit);
    
    alternatives.push({
      name: 'Extend Timeline (Recommended)',
      icon: '📅',
      newTimeline: optimalWeeks,
      dailyCalories: optimalCalories,
      newWorkoutFrequency: currentFrequency,
      weeklyRate: safeOptimalRate,
      approach: isWeightLoss 
        ? 'Eat more, exercise same, take more time' 
        : 'Slow steady gain',
      pros: [
        'Easiest to stick to',
        isWeightLoss ? 'Best muscle preservation' : 'Lean muscle gain',
        'No lifestyle change needed',
        'Most sustainable long-term'
      ],
      cons: [
        'Takes longer to reach goal',
        `${optimalWeeks - currentTimeline} extra weeks needed`
      ]
    });
    
    // ========================================================================
    // ALTERNATIVE 2: INCREASE EXERCISE (Faster, Eat More)
    // ========================================================================
    
    const aggressiveWeeks = Math.ceil(weightDiff / safeMaxRate);
    const aggressiveDeficit = (safeMaxRate * 7700) / 7;
    
    // Assume 300 calories per workout session (moderate estimate)
    const caloriesPerSession = 300;
    const additionalSessionsNeeded = Math.ceil((aggressiveDeficit * 0.4) / (caloriesPerSession / 7));
    const newFrequency = Math.min(currentFrequency + additionalSessionsNeeded, 7);
    
    const exerciseCalories = isWeightLoss
      ? Math.max(Math.round(tdee - (aggressiveDeficit * 0.6)), bmr)
      : Math.round(tdee + (aggressiveDeficit * 0.6));
    
    alternatives.push({
      name: 'Add More Exercise',
      icon: '💪',
      newTimeline: aggressiveWeeks,
      dailyCalories: exerciseCalories,
      newWorkoutFrequency: newFrequency,
      weeklyRate: safeMaxRate,
      approach: isWeightLoss 
        ? 'Moderate diet restriction + more exercise' 
        : 'Higher surplus + strength focus',
      pros: [
        'Faster results',
        'Eat more food (less restriction)',
        'Better fitness improvements',
        'More cardiovascular benefits'
      ],
      cons: [
        'Requires more time commitment',
        `Need ${newFrequency}× workouts/week`,
        'Higher injury risk if overdone'
      ]
    });
    
    // ========================================================================
    // ALTERNATIVE 3: BALANCED APPROACH
    // ========================================================================
    
    const balancedRate = currentWeight * 0.0085;  // 0.85% BW/week
    const balancedWeeks = Math.ceil(weightDiff / balancedRate);
    const balancedDeficit = (balancedRate * 7700) / 7;
    
    const balancedCalories = isWeightLoss
      ? Math.max(Math.round(tdee - balancedDeficit), bmr)
      : Math.round(tdee + balancedDeficit);
    
    alternatives.push({
      name: 'Balanced Approach',
      icon: '⚖️',
      newTimeline: balancedWeeks,
      dailyCalories: balancedCalories,
      newWorkoutFrequency: Math.min(currentFrequency + 1, 7),
      weeklyRate: balancedRate,
      approach: 'Moderate diet change + moderate exercise increase',
      pros: [
        'Good balance of results and sustainability',
        'Not too restrictive on food',
        'Not too demanding on time',
        'Well-rounded approach'
      ],
      cons: [
        'Middle ground - not fastest, not easiest'
      ]
    });
    
    // ========================================================================
    // ALTERNATIVE 4: ADJUST TARGET WEIGHT (Keep Timeline)
    // ========================================================================
    
    const achievableWeightChange = safeOptimalRate * currentTimeline;
    const newTargetWeight = isWeightLoss 
      ? currentWeight - achievableWeightChange
      : currentWeight + achievableWeightChange;
    
    const targetCalories = isWeightLoss
      ? Math.max(Math.round(tdee - optimalDeficit), bmr)
      : Math.round(tdee + optimalDeficit);
    
    alternatives.push({
      name: 'Adjust Target Weight',
      icon: '🎯',
      newTimeline: currentTimeline,
      newTargetWeight: Math.round(newTargetWeight * 10) / 10,
      dailyCalories: targetCalories,
      newWorkoutFrequency: currentFrequency,
      weeklyRate: safeOptimalRate,
      approach: `Keep your timeline, adjust goal to ${Math.round(newTargetWeight)}kg`,
      pros: [
        'Still make significant progress',
        'Achievable in your desired timeframe',
        'Sustainable calorie level'
      ],
      cons: [
        'Won\'t reach original target weight',
        `${Math.abs(targetWeight - newTargetWeight).toFixed(1)}kg less change than planned`
      ]
    });
    
    return alternatives;
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.scrollView}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>🎯 Goal Adjustment Wizard</Text>
              <Text style={styles.subtitle}>
                Your current goal needs adjustment for safety. Choose an option:
              </Text>
              
              {/* Error Message */}
              <Card style={styles.errorCard}>
                <Text style={styles.errorIcon}>⛔</Text>
                <Text style={styles.errorMessage}>{error.message}</Text>
              </Card>
            </View>
            
            {/* Alternatives */}
            <View style={styles.alternativesContainer}>
              {alternatives.map((alt, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedIndex(index)}
                  style={styles.alternativeTouchable}
                >
                  <Card style={[
                    styles.alternativeCard,
                    selectedIndex === index && styles.alternativeCardSelected
                  ]}>
                    {/* Header */}
                    <View style={styles.alternativeHeader}>
                      <Text style={styles.alternativeIcon}>{alt.icon}</Text>
                      <Text style={[
                        styles.alternativeName,
                        selectedIndex === index && styles.alternativeNameSelected
                      ]}>
                        {alt.name}
                      </Text>
                      {index === 0 && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedText}>✨ Recommended</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Approach */}
                    <Text style={styles.approach}>{alt.approach}</Text>
                    
                    {/* Key Metrics */}
                    <View style={styles.metricsRow}>
                      {alt.newTimeline && (
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Timeline</Text>
                          <Text style={styles.metricValue}>{alt.newTimeline} weeks</Text>
                        </View>
                      )}
                      {alt.newTargetWeight && (
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>New Target</Text>
                          <Text style={styles.metricValue}>{alt.newTargetWeight} kg</Text>
                        </View>
                      )}
                      <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Daily Calories</Text>
                        <Text style={styles.metricValue}>{alt.dailyCalories} cal</Text>
                      </View>
                      {alt.newWorkoutFrequency && (
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Workouts/Week</Text>
                          <Text style={styles.metricValue}>{alt.newWorkoutFrequency}×</Text>
                        </View>
                      )}
                      <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Weekly Rate</Text>
                        <Text style={styles.metricValue}>{alt.weeklyRate.toFixed(2)} kg</Text>
                      </View>
                    </View>
                    
                    {/* Pros */}
                    <View style={styles.prosContainer}>
                      <Text style={styles.prosTitle}>✅ Pros:</Text>
                      {alt.pros.map((pro, i) => (
                        <Text key={i} style={styles.proText}>• {pro}</Text>
                      ))}
                    </View>
                    
                    {/* Cons */}
                    <View style={styles.consContainer}>
                      <Text style={styles.consTitle}>⚠️ Cons:</Text>
                      {alt.cons.map((con, i) => (
                        <Text key={i} style={styles.conText}>• {con}</Text>
                      ))}
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Cancel"
              onPress={onClose}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title="Apply Selected Option"
              onPress={handleSelectAlternative}
              variant="primary"
              style={styles.applyButton}
              disabled={selectedIndex === null}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    overflow: 'hidden',
  },

  scrollView: {
    maxHeight: '80%',
  },

  header: {
    padding: ResponsiveTheme.spacing.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(20),
  },

  errorCard: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    padding: ResponsiveTheme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  errorMessage: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#7F1D1D',
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  alternativesContainer: {
    padding: ResponsiveTheme.spacing.lg,
  },

  alternativeTouchable: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  alternativeCard: {
    padding: ResponsiveTheme.spacing.md,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.border,
  },

  alternativeCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}08`,
  },

  alternativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  alternativeIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  alternativeName: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  alternativeNameSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  recommendedBadge: {
    backgroundColor: `${ResponsiveTheme.colors.success}20`,
    paddingVertical: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  recommendedText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.success,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  approach: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    fontStyle: 'italic',
  },

  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  metric: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    paddingVertical: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    minWidth: rf(90),
  },

  metricLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: 2,
  },

  metricValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  prosContainer: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  prosTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: '#059669',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  proText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: rf(16),
  },

  consContainer: {
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  consTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: '#D97706',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  conText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: rf(16),
  },

  footer: {
    flexDirection: 'row',
    padding: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    gap: ResponsiveTheme.spacing.md,
  },

  cancelButton: {
    flex: 1,
  },

  applyButton: {
    flex: 2,
  },
});

