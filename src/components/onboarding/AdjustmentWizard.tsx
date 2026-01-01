import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  interpolate,
  Extrapolation 
} from 'react-native-reanimated';
import { rf, rw, rh } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button } from '../ui';
import { ValidationResult } from '../../services/validationEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// TYPES
// ============================================================================

export interface Alternative {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  newTimeline?: number;
  newTargetWeight?: number;
  newWorkoutFrequency?: number;
  dailyCalories: number;
  weeklyRate: number;
  approach: string;
  pros: string[];
  cons: string[];
  
  // NEW fields for comprehensive goal support
  goalType?: 'weight-loss' | 'weight-gain' | 'muscle-gain' | 'strength' | 'endurance' | 'body-recomp' | 'flexibility' | 'general-fitness';
  newProteinTarget?: number;  // grams per day for muscle/strength goals
  newIntensity?: 'beginner' | 'intermediate' | 'advanced';
  newWorkoutTypes?: string[];  // e.g., ['strength', 'cardio', 'hiit']
  newCardioMinutes?: number;  // weekly cardio minutes for endurance goals
  newStrengthSessions?: number;  // weekly strength sessions for muscle/strength goals
  newMobilitySessions?: number;  // weekly mobility sessions for flexibility goals
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
    // NEW: Additional data for comprehensive goal support
    currentIntensity?: string;
    currentProtein?: number;
    currentCardioMinutes?: number;
    currentStrengthSessions?: number;
  };
  primaryGoals?: string[];  // NEW: User's selected goals from workout preferences
  onSelectAlternative: (alternative: Alternative) => void;
  onSaveToDatabase?: () => Promise<boolean>;  // NEW: For immediate database save
  onClose: () => void;
}

// ============================================================================
// ALTERNATIVE CARD COMPONENT
// ============================================================================

interface AlternativeCardProps {
  alternative: Alternative;
  index: number;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
}

const AlternativeCard: React.FC<AlternativeCardProps> = ({
  alternative,
  index,
  isSelected,
  isRecommended,
  onSelect,
}) => {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    borderOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
  }, [isSelected]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBorderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.alternativeCard, animatedCardStyle]}>
        {/* Selection Border Glow */}
        <Animated.View style={[styles.selectionBorder, animatedBorderStyle]}>
          <LinearGradient
            colors={[ResponsiveTheme.colors.primary, ResponsiveTheme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.selectionGradient}
          />
        </Animated.View>

        {/* Card Content */}
        <BlurView intensity={20} tint="dark" style={styles.cardBlur}>
          <View style={styles.cardInner}>
            {/* Header Row */}
            <View style={styles.cardHeader}>
              {/* Icon Circle */}
              <View style={[styles.iconCircle, { backgroundColor: `${alternative.iconColor}20` }]}>
                <Ionicons 
                  name={alternative.icon} 
                  size={rf(22)} 
                  color={alternative.iconColor} 
                />
              </View>

              {/* Title & Badge */}
              <View style={styles.titleContainer}>
                <Text style={[
                  styles.cardTitle,
                  isSelected && styles.cardTitleSelected
                ]} numberOfLines={1}>
                  {alternative.name}
                </Text>
                {isRecommended && (
                  <View style={styles.recommendedBadge}>
                    <Ionicons name="star" size={rf(10)} color="#F59E0B" />
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                )}
              </View>

              {/* Selection Indicator */}
              <View style={[
                styles.selectionIndicator,
                isSelected && styles.selectionIndicatorActive
              ]}>
                {isSelected && (
                  <Ionicons name="checkmark" size={rf(14)} color="#fff" />
                )}
              </View>
            </View>

            {/* Approach Description */}
            <Text style={styles.approachText}>{alternative.approach}</Text>

            {/* Metrics Grid */}
            <View style={styles.metricsGrid}>
              {alternative.newTimeline && (
                <MetricPill 
                  icon="calendar-outline" 
                  label="Timeline" 
                  value={`${alternative.newTimeline} wks`}
                  color="#3B82F6"
                />
              )}
              {alternative.newTargetWeight && (
                <MetricPill 
                  icon="fitness-outline" 
                  label="Target" 
                  value={`${alternative.newTargetWeight} kg`}
                  color="#10B981"
                />
              )}
              <MetricPill 
                icon="flame-outline" 
                label="Calories" 
                value={`${alternative.dailyCalories}`}
                color="#F97316"
              />
              {alternative.newWorkoutFrequency && (
                <MetricPill 
                  icon="barbell-outline" 
                  label="Workouts" 
                  value={`${alternative.newWorkoutFrequency}×/wk`}
                  color="#8B5CF6"
                />
              )}
              <MetricPill 
                icon="trending-down-outline" 
                label="Rate" 
                value={`${alternative.weeklyRate.toFixed(2)} kg/wk`}
                color="#EC4899"
              />
            </View>

            {/* Pros & Cons Row */}
            <View style={styles.prosConsRow}>
              {/* Pros */}
              <View style={styles.prosSection}>
                <View style={styles.prosHeader}>
                  <Ionicons name="checkmark-circle" size={rf(14)} color="#10B981" />
                  <Text style={styles.prosTitle}>Benefits</Text>
                </View>
                {alternative.pros.slice(0, 2).map((pro, i) => (
                  <Text key={i} style={styles.prosText} numberOfLines={1}>
                    {pro}
                  </Text>
                ))}
              </View>

              {/* Divider */}
              <View style={styles.prosConsDivider} />

              {/* Cons */}
              <View style={styles.consSection}>
                <View style={styles.consHeader}>
                  <Ionicons name="alert-circle" size={rf(14)} color="#F59E0B" />
                  <Text style={styles.consTitle}>Trade-offs</Text>
                </View>
                {alternative.cons.slice(0, 2).map((con, i) => (
                  <Text key={i} style={styles.consText} numberOfLines={1}>
                    {con}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </BlurView>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ============================================================================
// METRIC PILL COMPONENT
// ============================================================================

interface MetricPillProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}

const MetricPill: React.FC<MetricPillProps> = ({ icon, label, value, color }) => (
  <View style={[styles.metricPill, { borderColor: `${color}40` }]}>
    <Ionicons name={icon} size={rf(12)} color={color} style={styles.metricIcon} />
    <View style={styles.metricTextContainer}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  </View>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AdjustmentWizard: React.FC<AdjustmentWizardProps> = ({
  visible,
  error,
  currentData,
  primaryGoals = [],
  onSelectAlternative,
  onSaveToDatabase,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Calculate alternatives when modal opens or data changes
  // Uses ERROR-DRIVEN approach: alternatives are based on the specific validation error
  useEffect(() => {
    if (visible && error.code) {
      const calculatedAlternatives = calculateAlternativesForError(
        error.code,
        currentData,
        primaryGoals
      );
      setAlternatives(calculatedAlternatives);
      setSelectedIndex(null);
    }
  }, [visible, currentData, error, primaryGoals]);
  
  const handleSelectAlternative = async () => {
    if (selectedIndex !== null && alternatives[selectedIndex]) {
      setIsSaving(true);
      
      // First notify parent to update state
      onSelectAlternative(alternatives[selectedIndex]);
      
      // Then save to database immediately if function provided
      if (onSaveToDatabase) {
        try {
          await onSaveToDatabase();
          console.log('[AdjustmentWizard] Successfully saved to database');
        } catch (err) {
          console.error('[AdjustmentWizard] Failed to save to database:', err);
        }
      }
      
      setIsSaving(false);
      onClose();
    }
  };
  
  // ============================================================================
  // ERROR-DRIVEN ALTERNATIVE CALCULATION
  // Generates alternatives based on the specific validation error
  // ============================================================================
  
  const calculateAlternativesForError = (
    errorCode: string,
    data: typeof currentData,
    goals: string[]
  ): Alternative[] => {
    const { bmr, tdee, currentWeight, targetWeight, currentTimeline, currentFrequency } = data;
    const weightDiff = Math.abs(targetWeight - currentWeight);
    const isWeightLoss = currentWeight > targetWeight;
    const isWeightGain = currentWeight < targetWeight;
    
    // Determine goal context for better messaging
    const hasMuscleGoal = goals.includes('muscle-gain') || goals.includes('strength');
    const hasEnduranceGoal = goals.includes('endurance') || goals.includes('cardio');
    const hasRecompGoal = goals.includes('body-recomp') || (goals.includes('weight-loss') && goals.includes('muscle-gain'));
    
    // Safe rates
    const safeOptimalRate = currentWeight * 0.0075;  // 0.75% BW/week (optimal)
    const safeMaxRate = currentWeight * 0.01;  // 1% BW/week (aggressive but safe)
    
    // Route to appropriate calculator based on error type
    switch (errorCode) {
      case 'EXTREMELY_UNREALISTIC':
      case 'BELOW_BMR':
      case 'BELOW_ABSOLUTE_MINIMUM':
        return calculateWeightRateAlternatives(data, isWeightLoss, isWeightGain, hasMuscleGoal, safeOptimalRate, safeMaxRate);
      
      case 'INSUFFICIENT_EXERCISE':
        return calculateExerciseAlternatives(data, isWeightLoss, hasMuscleGoal, hasEnduranceGoal, safeOptimalRate);
      
      case 'EXCESSIVE_TRAINING_VOLUME':
        return calculateTrainingReductionAlternatives(data, isWeightLoss);
      
      case 'EXCESSIVE_GAIN_RATE':
        return calculateGainRateAlternatives(data, hasMuscleGoal, safeOptimalRate);
      
      default:
        // Default to weight-rate alternatives for unknown errors
        return calculateWeightRateAlternatives(data, isWeightLoss, isWeightGain, hasMuscleGoal, safeOptimalRate, safeMaxRate);
    }
  };
  
  // ============================================================================
  // WEIGHT RATE ALTERNATIVES (for aggressive timeline errors)
  // ============================================================================
  
  const calculateWeightRateAlternatives = (
    data: typeof currentData,
    isWeightLoss: boolean,
    isWeightGain: boolean,
    hasMuscleGoal: boolean,
    safeOptimalRate: number,
    safeMaxRate: number
  ): Alternative[] => {
    const { bmr, tdee, currentWeight, targetWeight, currentTimeline, currentFrequency } = data;
    const weightDiff = Math.abs(targetWeight - currentWeight);
    const alternatives: Alternative[] = [];
    
    // ALTERNATIVE 1: EXTEND TIMELINE (Recommended)
    const optimalWeeks = Math.ceil(weightDiff / safeOptimalRate);
    const optimalDeficit = (safeOptimalRate * 7700) / 7;
    const optimalCalories = isWeightLoss 
      ? Math.max(Math.round(tdee - optimalDeficit), bmr)
      : Math.round(tdee + optimalDeficit);
    
    alternatives.push({
      name: 'Extend Timeline',
      icon: 'calendar-outline',
      iconColor: '#3B82F6',
      goalType: isWeightLoss ? 'weight-loss' : 'weight-gain',
      newTimeline: optimalWeeks,
      dailyCalories: optimalCalories,
      newWorkoutFrequency: currentFrequency,
      weeklyRate: safeOptimalRate,
      newProteinTarget: hasMuscleGoal ? Math.round(currentWeight * 2.2) : Math.round(currentWeight * 1.6),
      approach: isWeightLoss 
        ? 'More time, less restriction, same exercise' 
        : hasMuscleGoal ? 'Gradual lean bulk for quality muscle' : 'Gradual, sustainable weight gain',
      pros: [
        'Easiest to maintain',
        isWeightLoss ? 'Preserves muscle mass' : 'Lean muscle gains',
        hasMuscleGoal ? 'Better strength progression' : 'No lifestyle changes',
        'Most sustainable'
      ],
      cons: [
        'Takes longer',
        `+${Math.max(0, optimalWeeks - currentTimeline)} extra weeks`
      ]
    });
    
    // ALTERNATIVE 2: ADD EXERCISE
    const aggressiveWeeks = Math.ceil(weightDiff / safeMaxRate);
    const aggressiveDeficit = (safeMaxRate * 7700) / 7;
    const caloriesPerSession = 300;
    const additionalSessionsNeeded = Math.ceil((aggressiveDeficit * 0.4) / (caloriesPerSession / 7));
    const newFrequency = Math.min(currentFrequency + additionalSessionsNeeded, 7);
    
    const exerciseCalories = isWeightLoss
      ? Math.max(Math.round(tdee - (aggressiveDeficit * 0.6)), bmr)
      : Math.round(tdee + (aggressiveDeficit * 0.6));
    
    alternatives.push({
      name: hasMuscleGoal ? 'Add Strength Training' : 'Add Exercise',
      icon: 'barbell-outline',
      iconColor: '#8B5CF6',
      goalType: hasMuscleGoal ? 'muscle-gain' : (isWeightLoss ? 'weight-loss' : 'weight-gain'),
      newTimeline: aggressiveWeeks,
      dailyCalories: exerciseCalories,
      newWorkoutFrequency: newFrequency,
      newStrengthSessions: hasMuscleGoal ? Math.min(newFrequency, 5) : Math.ceil(newFrequency * 0.6),
      newCardioMinutes: isWeightLoss ? 150 : 90,
      weeklyRate: safeMaxRate,
      newProteinTarget: hasMuscleGoal ? Math.round(currentWeight * 2.4) : Math.round(currentWeight * 2.0),
      approach: isWeightLoss 
        ? 'More activity, moderate diet' 
        : hasMuscleGoal ? 'Strength focus with controlled surplus' : 'Active weight gain approach',
      pros: [
        'Faster results',
        'Eat more food',
        hasMuscleGoal ? 'Build muscle while achieving goal' : 'Fitness gains',
        'Better metabolism'
      ],
      cons: [
        'More time commitment',
        `${newFrequency}× workouts/week`
      ]
    });
    
    // ALTERNATIVE 3: BALANCED APPROACH
    const balancedRate = currentWeight * 0.0085;
    const balancedWeeks = Math.ceil(weightDiff / balancedRate);
    const balancedDeficit = (balancedRate * 7700) / 7;
    
    const balancedCalories = isWeightLoss
      ? Math.max(Math.round(tdee - balancedDeficit), bmr)
      : Math.round(tdee + balancedDeficit);
    
    alternatives.push({
      name: 'Balanced Approach',
      icon: 'options-outline',
      iconColor: '#10B981',
      goalType: 'general-fitness',
      newTimeline: balancedWeeks,
      dailyCalories: balancedCalories,
      newWorkoutFrequency: Math.min(currentFrequency + 1, 7),
      newStrengthSessions: 3,
      newCardioMinutes: 120,
      weeklyRate: balancedRate,
      newProteinTarget: Math.round(currentWeight * 2.0),
      approach: 'Moderate diet + moderate exercise',
      pros: [
        'Well-rounded',
        'Not too restrictive',
        'Reasonable time',
        'Sustainable'
      ],
      cons: [
        'Middle ground'
      ]
    });
    
    // ALTERNATIVE 4: ADJUST TARGET
    const achievableWeightChange = safeOptimalRate * currentTimeline;
    const newTargetWeight = isWeightLoss 
      ? currentWeight - achievableWeightChange
      : currentWeight + achievableWeightChange;
    
    const targetCalories = isWeightLoss
      ? Math.max(Math.round(tdee - (safeOptimalRate * 7700 / 7)), bmr)
      : Math.round(tdee + (safeOptimalRate * 7700 / 7));
    
    alternatives.push({
      name: 'Adjust Goal',
      icon: 'flag-outline',
      iconColor: '#F59E0B',
      goalType: isWeightLoss ? 'weight-loss' : 'weight-gain',
      newTimeline: currentTimeline,
      newTargetWeight: Math.round(newTargetWeight * 10) / 10,
      dailyCalories: targetCalories,
      newWorkoutFrequency: currentFrequency,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 1.8),
      approach: `Achieve ${Math.round(newTargetWeight)}kg in your timeframe`,
      pros: [
        'Keep your timeline',
        'Still good progress',
        'Sustainable pace'
      ],
      cons: [
        `${Math.abs(targetWeight - newTargetWeight).toFixed(1)}kg less change`
      ]
    });
    
    return alternatives;
  };
  
  // ============================================================================
  // EXERCISE ALTERNATIVES (for insufficient exercise errors)
  // ============================================================================
  
  const calculateExerciseAlternatives = (
    data: typeof currentData,
    isWeightLoss: boolean,
    hasMuscleGoal: boolean,
    hasEnduranceGoal: boolean,
    safeOptimalRate: number
  ): Alternative[] => {
    const { bmr, tdee, currentWeight, targetWeight, currentTimeline, currentFrequency } = data;
    const alternatives: Alternative[] = [];
    
    // ALTERNATIVE 1: ADD STRENGTH TRAINING
    alternatives.push({
      name: 'Add Strength Training',
      icon: 'barbell-outline',
      iconColor: '#8B5CF6',
      goalType: 'strength',
      newWorkoutFrequency: Math.min(currentFrequency + 3, 6),
      newStrengthSessions: 4,
      newCardioMinutes: 60,
      dailyCalories: tdee,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 2.2),
      newIntensity: 'intermediate',
      approach: 'Focus on progressive resistance training',
      pros: [
        'Build muscle',
        'Boost metabolism',
        'Increase strength',
        'Better body composition'
      ],
      cons: [
        'Requires gym access or equipment',
        '4× strength sessions/week'
      ]
    });
    
    // ALTERNATIVE 2: ADD CARDIO
    alternatives.push({
      name: hasEnduranceGoal ? 'Cardio Focus' : 'Add Cardio',
      icon: 'heart-outline',
      iconColor: '#EF4444',
      goalType: 'endurance',
      newWorkoutFrequency: Math.min(currentFrequency + 3, 6),
      newStrengthSessions: 2,
      newCardioMinutes: 200,
      dailyCalories: isWeightLoss ? Math.round(tdee * 0.85) : tdee,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 1.8),
      approach: hasEnduranceGoal ? 'Build cardio endurance progressively' : 'Add cardio for calorie burn',
      pros: [
        'Burn more calories',
        'Improve heart health',
        'Better endurance',
        'Can be done anywhere'
      ],
      cons: [
        'Time consuming',
        '200+ min cardio/week'
      ]
    });
    
    // ALTERNATIVE 3: MIXED TRAINING
    alternatives.push({
      name: 'Mixed Training',
      icon: 'fitness-outline',
      iconColor: '#10B981',
      goalType: 'general-fitness',
      newWorkoutFrequency: Math.min(currentFrequency + 2, 5),
      newStrengthSessions: 3,
      newCardioMinutes: 120,
      newWorkoutTypes: ['strength', 'cardio', 'hiit'],
      dailyCalories: isWeightLoss ? Math.round(tdee * 0.9) : tdee,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 2.0),
      approach: 'Balanced strength and cardio program',
      pros: [
        'All-round fitness',
        'Variety keeps it interesting',
        'Balanced results',
        'Flexible schedule'
      ],
      cons: [
        'Jack of all trades',
        'Slower specific gains'
      ]
    });
    
    // ALTERNATIVE 4: EXTEND TIMELINE INSTEAD
    const weightDiff = Math.abs(targetWeight - currentWeight);
    const optimalWeeks = Math.ceil(weightDiff / safeOptimalRate);
    
    alternatives.push({
      name: 'Extend Timeline Instead',
      icon: 'calendar-outline',
      iconColor: '#3B82F6',
      goalType: isWeightLoss ? 'weight-loss' : 'weight-gain',
      newTimeline: optimalWeeks,
      newWorkoutFrequency: currentFrequency,
      dailyCalories: isWeightLoss ? Math.round(tdee * 0.85) : Math.round(tdee * 1.1),
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 1.8),
      approach: 'Keep current exercise, extend time for results',
      pros: [
        'No extra workouts needed',
        'Less lifestyle change',
        'Still achievable',
        'Lower commitment'
      ],
      cons: [
        'Takes longer',
        `+${Math.max(0, optimalWeeks - currentTimeline)} extra weeks`
      ]
    });
    
    return alternatives;
  };
  
  // ============================================================================
  // TRAINING REDUCTION ALTERNATIVES (for excessive volume errors)
  // ============================================================================
  
  const calculateTrainingReductionAlternatives = (
    data: typeof currentData,
    isWeightLoss: boolean
  ): Alternative[] => {
    const { bmr, tdee, currentWeight, targetWeight, currentTimeline, currentFrequency } = data;
    const alternatives: Alternative[] = [];
    const safeOptimalRate = currentWeight * 0.0075;
    
    // ALTERNATIVE 1: REDUCE FREQUENCY
    alternatives.push({
      name: 'Reduce Frequency',
      icon: 'remove-circle-outline',
      iconColor: '#F59E0B',
      goalType: 'general-fitness',
      newWorkoutFrequency: Math.max(currentFrequency - 2, 3),
      newStrengthSessions: 3,
      newCardioMinutes: 90,
      dailyCalories: tdee,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 2.0),
      approach: 'Fewer sessions, better recovery',
      pros: [
        'Better recovery',
        'Reduce burnout risk',
        'More sustainable',
        'Quality over quantity'
      ],
      cons: [
        'Slightly slower progress',
        'Fewer workout days'
      ]
    });
    
    // ALTERNATIVE 2: REDUCE INTENSITY
    alternatives.push({
      name: 'Lower Intensity',
      icon: 'speedometer-outline',
      iconColor: '#3B82F6',
      goalType: 'general-fitness',
      newWorkoutFrequency: currentFrequency,
      newIntensity: 'intermediate',
      newStrengthSessions: Math.ceil(currentFrequency * 0.5),
      dailyCalories: tdee,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 1.8),
      approach: 'Same frequency, easier sessions',
      pros: [
        'Keep your routine',
        'Less fatigue',
        'Sustainable long-term',
        'Lower injury risk'
      ],
      cons: [
        'May feel too easy initially',
        'Slower strength gains'
      ]
    });
    
    // ALTERNATIVE 3: ADD REST DAYS
    alternatives.push({
      name: 'Add Recovery Days',
      icon: 'bed-outline',
      iconColor: '#10B981',
      goalType: 'general-fitness',
      newWorkoutFrequency: Math.max(currentFrequency - 1, 4),
      newStrengthSessions: 3,
      newCardioMinutes: 60,
      newMobilitySessions: 2,
      dailyCalories: tdee,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 2.0),
      approach: 'Include active recovery and mobility',
      pros: [
        'Better muscle repair',
        'Improved flexibility',
        'Reduce overtraining',
        'Mental break'
      ],
      cons: [
        'Feels like less work',
        '2 recovery sessions/week'
      ]
    });
    
    // ALTERNATIVE 4: PERIODIZATION
    alternatives.push({
      name: 'Add Deload Weeks',
      icon: 'analytics-outline',
      iconColor: '#8B5CF6',
      goalType: 'strength',
      newWorkoutFrequency: currentFrequency,
      newStrengthSessions: Math.ceil(currentFrequency * 0.6),
      dailyCalories: tdee,
      weeklyRate: safeOptimalRate,
      newProteinTarget: Math.round(currentWeight * 2.0),
      approach: 'Periodized training with planned easy weeks',
      pros: [
        'Professional approach',
        'Prevents plateaus',
        'Sustainable progress',
        'Better long-term gains'
      ],
      cons: [
        'Requires planning',
        'Deload every 4-6 weeks'
      ]
    });
    
    return alternatives;
  };
  
  // ============================================================================
  // GAIN RATE ALTERNATIVES (for excessive weight gain rate)
  // ============================================================================
  
  const calculateGainRateAlternatives = (
    data: typeof currentData,
    hasMuscleGoal: boolean,
    safeOptimalRate: number
  ): Alternative[] => {
    const { bmr, tdee, currentWeight, targetWeight, currentTimeline, currentFrequency } = data;
    const weightDiff = Math.abs(targetWeight - currentWeight);
    const alternatives: Alternative[] = [];
    
    // Optimal rate for lean gains
    const leanGainRate = currentWeight * 0.005;  // 0.5% for lean muscle gain
    const moderateGainRate = currentWeight * 0.0075;  // 0.75% moderate gain
    
    // ALTERNATIVE 1: LEAN BULK
    const leanWeeks = Math.ceil(weightDiff / leanGainRate);
    alternatives.push({
      name: 'Lean Bulk',
      icon: 'trending-up',
      iconColor: '#10B981',
      goalType: 'muscle-gain',
      newTimeline: leanWeeks,
      newWorkoutFrequency: Math.min(currentFrequency + 1, 6),
      newStrengthSessions: 5,
      dailyCalories: Math.round(tdee + (leanGainRate * 7700 / 7)),
      weeklyRate: leanGainRate,
      newProteinTarget: Math.round(currentWeight * 2.4),
      approach: 'Slow surplus for maximum muscle, minimal fat',
      pros: [
        'Mostly muscle gain',
        'Stay lean',
        'Better aesthetics',
        'No harsh cut needed after'
      ],
      cons: [
        'Slower weight gain',
        `${leanWeeks} weeks timeline`
      ]
    });
    
    // ALTERNATIVE 2: STRENGTH FOCUS
    alternatives.push({
      name: 'Strength Focus',
      icon: 'barbell-outline',
      iconColor: '#8B5CF6',
      goalType: 'strength',
      newTimeline: Math.ceil(weightDiff / moderateGainRate),
      newWorkoutFrequency: Math.min(currentFrequency, 5),
      newStrengthSessions: 4,
      dailyCalories: Math.round(tdee + (moderateGainRate * 7700 / 7)),
      weeklyRate: moderateGainRate,
      newProteinTarget: Math.round(currentWeight * 2.2),
      newIntensity: 'advanced',
      approach: 'Focus on getting stronger, weight follows',
      pros: [
        'Strength gains priority',
        'Moderate bulk rate',
        'Balanced approach',
        'Performance based'
      ],
      cons: [
        'Some fat gain expected',
        'High intensity required'
      ]
    });
    
    // ALTERNATIVE 3: RECOMP APPROACH
    alternatives.push({
      name: 'Body Recomposition',
      icon: 'swap-horizontal-outline',
      iconColor: '#3B82F6',
      goalType: 'body-recomp',
      newTimeline: currentTimeline,
      newWorkoutFrequency: Math.min(currentFrequency + 1, 5),
      newStrengthSessions: 4,
      newCardioMinutes: 90,
      dailyCalories: tdee,  // Maintenance
      weeklyRate: 0,
      newProteinTarget: Math.round(currentWeight * 2.4),
      approach: 'Build muscle at maintenance, slow but lean',
      pros: [
        'Stay same weight',
        'Lose fat, gain muscle',
        'No bulk/cut cycles',
        'Sustainable'
      ],
      cons: [
        'Very slow progress',
        'Requires patience'
      ]
    });
    
    // ALTERNATIVE 4: ADJUST TARGET
    const achievableGain = leanGainRate * currentTimeline;
    const newTarget = currentWeight + achievableGain;
    
    alternatives.push({
      name: 'Adjust Target',
      icon: 'flag-outline',
      iconColor: '#F59E0B',
      goalType: 'weight-gain',
      newTimeline: currentTimeline,
      newTargetWeight: Math.round(newTarget * 10) / 10,
      newWorkoutFrequency: currentFrequency,
      dailyCalories: Math.round(tdee + (leanGainRate * 7700 / 7)),
      weeklyRate: leanGainRate,
      newProteinTarget: Math.round(currentWeight * 2.2),
      approach: `Gain ${achievableGain.toFixed(1)}kg quality mass in your timeframe`,
      pros: [
        'Keep your timeline',
        'Realistic target',
        'Quality gains',
        'No rushing'
      ],
      cons: [
        `${(targetWeight - newTarget).toFixed(1)}kg less than planned`
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
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={40} tint="dark" style={styles.blurOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <LinearGradient
              colors={['#1a1a2e', '#16213e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.header}
            >
              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={rf(20)} color={ResponsiveTheme.colors.textSecondary} />
              </TouchableOpacity>

              {/* Header Icon */}
              <View style={styles.headerIconContainer}>
                <LinearGradient
                  colors={[ResponsiveTheme.colors.primary, ResponsiveTheme.colors.secondary]}
                  style={styles.headerIconGradient}
                >
                  <Ionicons name="analytics" size={rf(24)} color="#fff" />
                </LinearGradient>
              </View>

              <Text style={styles.title}>Goal Adjustment</Text>
              <Text style={styles.subtitle}>
                Your current plan needs optimization for safe, sustainable results
              </Text>
              
              {/* Error Alert */}
              <View style={styles.errorAlert}>
                <View style={styles.errorIconContainer}>
                  <Ionicons name="warning" size={rf(16)} color="#EF4444" />
                </View>
                <Text style={styles.errorMessage} numberOfLines={2}>{error.message}</Text>
              </View>
            </LinearGradient>
            
            {/* Alternatives List */}
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sectionLabel}>Choose a safe alternative</Text>
              
              {alternatives.map((alt, index) => (
                <AlternativeCard
                  key={index}
                  alternative={alt}
                  index={index}
                  isSelected={selectedIndex === index}
                  isRecommended={index === 0}
                  onSelect={() => setSelectedIndex(index)}
                />
              ))}
              
              <View style={styles.scrollPadding} />
            </ScrollView>
            
            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.applyButton,
                  selectedIndex === null && styles.applyButtonDisabled
                ]}
                onPress={handleSelectAlternative}
                disabled={selectedIndex === null}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={selectedIndex !== null 
                    ? [ResponsiveTheme.colors.primary, ResponsiveTheme.colors.secondary]
                    : ['#374151', '#4B5563']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.applyButtonGradient}
                >
                  <Text style={styles.applyButtonText}>Apply Changes</Text>
                  <Ionicons name="checkmark-circle" size={rf(18)} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },

  blurOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalContainer: {
    flex: 1,
    maxHeight: '92%',
    backgroundColor: ResponsiveTheme.colors.background,
    borderTopLeftRadius: rw(24),
    borderTopRightRadius: rw(24),
    overflow: 'hidden',
  },

  // Header
  header: {
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.lg,
    alignItems: 'center',
  },

  closeButton: {
    position: 'absolute',
    top: ResponsiveTheme.spacing.md,
    right: ResponsiveTheme.spacing.md,
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIconContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  headerIconGradient: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(28),
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: rf(22),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(18),
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    width: '100%',
  },

  errorIconContainer: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ResponsiveTheme.spacing.sm,
  },

  errorMessage: {
    flex: 1,
    fontSize: rf(12),
    color: '#FCA5A5',
    fontWeight: '500',
    lineHeight: rf(16),
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
  },

  scrollPadding: {
    height: ResponsiveTheme.spacing.lg,
  },

  sectionLabel: {
    fontSize: rf(12),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
  },

  // Alternative Card
  alternativeCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },

  selectionBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: 2,
  },

  selectionGradient: {
    flex: 1,
    borderRadius: ResponsiveTheme.borderRadius.lg - 2,
  },

  cardBlur: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  cardInner: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: 'rgba(30, 30, 45, 0.85)',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  iconCircle: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ResponsiveTheme.spacing.sm,
  },

  titleContainer: {
    flex: 1,
  },

  cardTitle: {
    fontSize: rf(15),
    fontWeight: '600',
    color: ResponsiveTheme.colors.text,
    marginBottom: 2,
  },

  cardTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    alignSelf: 'flex-start',
  },

  recommendedText: {
    fontSize: rf(9),
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  selectionIndicator: {
    width: rw(24),
    height: rw(24),
    borderRadius: rw(12),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectionIndicatorActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  approachText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    lineHeight: rf(16),
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 4,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    borderWidth: 1,
  },

  metricIcon: {
    marginRight: 4,
  },

  metricTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  metricLabel: {
    fontSize: rf(9),
    color: ResponsiveTheme.colors.textMuted,
    textTransform: 'uppercase',
  },

  metricValue: {
    fontSize: rf(11),
    fontWeight: '600',
  },

  // Pros & Cons
  prosConsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: ResponsiveTheme.borderRadius.sm,
    padding: ResponsiveTheme.spacing.sm,
  },

  prosSection: {
    flex: 1,
  },

  consSection: {
    flex: 1,
  },

  prosConsDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: ResponsiveTheme.spacing.sm,
  },

  prosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  consHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  prosTitle: {
    fontSize: rf(10),
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  consTitle: {
    fontSize: rf(10),
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  prosText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(14),
  },

  consText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(14),
  },

  // Footer
  footer: {
    flexDirection: 'row',
    padding: ResponsiveTheme.spacing.md,
    paddingBottom: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: ResponsiveTheme.colors.background,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  cancelButtonText: {
    fontSize: rf(14),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
  },

  applyButton: {
    flex: 2,
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: 'hidden',
  },

  applyButtonDisabled: {
    opacity: 0.6,
  },

  applyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.xs,
  },

  applyButtonText: {
    fontSize: rf(14),
    fontWeight: '600',
    color: '#fff',
  },
});
