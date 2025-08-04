// 🤖 AI Meals Generation Panel
// Comprehensive interface for AI-powered meal generation with personalization

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card } from '../ui';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rh, rw, rs, rp } from '../../utils/responsive';

interface AIMealsPanelProps {
  visible: boolean;
  onClose: () => void;
  onGenerateMeal: (mealType: string, options?: any) => Promise<void>;
  isGenerating: boolean;
  profile?: any;
}

interface MealGenerationOption {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'custom';
  title: string;
  emoji: string;
  description: string;
  color: string;
  suggestions: string[];
  estimatedTime: string;
}

const mealOptions: MealGenerationOption[] = [
  {
    id: 'breakfast',
    type: 'breakfast',
    title: 'Breakfast',
    emoji: '🌅',
    description: 'Energizing morning meals to start your day right',
    color: '#f59e0b', // amber
    suggestions: ['High protein', 'Quick prep', 'Fiber rich', 'Brain boosting'],
    estimatedTime: '15-30 min',
  },
  {
    id: 'lunch',
    type: 'lunch',
    title: 'Lunch',
    emoji: '☀️',
    description: 'Balanced midday meals for sustained energy',
    color: '#10b981', // emerald
    suggestions: ['Balanced macros', 'Office friendly', 'Meal prep', 'Light & fresh'],
    estimatedTime: '20-45 min',
  },
  {
    id: 'dinner',
    type: 'dinner',
    title: 'Dinner',
    emoji: '🌙',
    description: 'Satisfying evening meals for recovery',
    color: '#8b5cf6', // violet
    suggestions: ['Family friendly', 'Comfort food', 'Recovery focused', 'Lean protein'],
    estimatedTime: '30-60 min',
  },
  {
    id: 'snack',
    type: 'snack',
    title: 'Healthy Snack',
    emoji: '🍎',
    description: 'Smart snacking options for any time',
    color: '#f97316', // orange
    suggestions: ['Pre-workout', 'Post-workout', 'Office snack', 'Sweet treat'],
    estimatedTime: '5-15 min',
  },
  {
    id: 'custom',
    type: 'custom',
    title: 'Custom Meal',
    emoji: '✨',
    description: 'Personalized meal based on your specific needs',
    color: '#ec4899', // pink
    suggestions: ['Goal-specific', 'Dietary needs', 'Cuisine preference', 'Macros focused'],
    estimatedTime: 'Variable',
  },
];

interface QuickActionOption {
  id: string;
  title: string;
  emoji: string;
  description: string;
  action: string;
}

const quickActions: QuickActionOption[] = [
  {
    id: 'daily_plan',
    title: 'Full Day Plan',
    emoji: '📅',
    description: 'Generate complete daily meal plan',
    action: 'daily_plan',
  },
  {
    id: 'meal_prep',
    title: 'Meal Prep',
    emoji: '📦',
    description: 'Batch cooking for the week',
    action: 'meal_prep',
  },
  {
    id: 'goal_focused',
    title: 'Goal-Focused',
    emoji: '🎯',
    description: 'Meals optimized for your goals',
    action: 'goal_focused',
  },
  {
    id: 'quick_easy',
    title: 'Quick & Easy',
    emoji: '⚡',
    description: 'Fast meals under 20 minutes',
    action: 'quick_easy',
  },
];

export const AIMealsPanel: React.FC<AIMealsPanelProps> = ({
  visible,
  onClose,
  onGenerateMeal,
  isGenerating,
  profile,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  if (!visible) return null;

  const handleMealGeneration = async (option: MealGenerationOption, customOptions?: any) => {
    try {
      const generationOptions = {
        mealType: option.type,
        userPreferences: profile,
        customOptions: customOptions || {},
        suggestions: selectedOptions,
      };

      await onGenerateMeal(option.type, generationOptions);
      
      // Reset selections after successful generation
      setSelectedOptions([]);
    } catch (error) {
      Alert.alert('Generation Failed', 'Failed to generate meal. Please try again.');
    }
  };

  const handleQuickAction = async (action: QuickActionOption) => {
    try {
      await onGenerateMeal(action.action, {
        userPreferences: profile,
        actionType: action.action,
      });
    } catch (error) {
      Alert.alert('Action Failed', `Failed to execute ${action.title}. Please try again.`);
    }
  };

  const toggleSuggestion = (suggestion: string) => {
    setSelectedOptions(prev => 
      prev.includes(suggestion)
        ? prev.filter(s => s !== suggestion)
        : [...prev, suggestion]
    );
  };

  const getProfileStatus = () => {
    if (!profile) return { status: 'incomplete', message: 'Profile not available' };
    
    const missingItems = [];
    if (!profile.personalInfo) missingItems.push('Personal Info');
    if (!profile.fitnessGoals) missingItems.push('Fitness Goals');
    if (!profile.dietPreferences) missingItems.push('Diet Preferences');
    
    if (missingItems.length === 0) {
      return { status: 'complete', message: 'Profile complete - ready for personalized meals!' };
    } else {
      return { 
        status: 'partial', 
        message: `Missing: ${missingItems.join(', ')}. Meals will be less personalized.` 
      };
    }
  };

  const profileStatus = getProfileStatus();

  return (
    <View style={styles.overlay}>
      <Card style={styles.panel} variant="elevated">
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerEmoji}>🤖</Text>
              <Text style={styles.headerTitle}>AI Meal Generation</Text>
              <Text style={styles.headerSubtitle}>
                Generate personalized meals based on your profile and preferences
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Status */}
          <View style={[
            styles.statusBanner,
            { backgroundColor: profileStatus.status === 'complete' ? '#dcfce7' : '#fef3c7' }
          ]}>
            <Text style={styles.statusIcon}>
              {profileStatus.status === 'complete' ? '✅' : '⚠️'}
            </Text>
            <Text style={[
              styles.statusText,
              { color: profileStatus.status === 'complete' ? '#15803d' : '#92400e' }
            ]}>
              {profileStatus.message}
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.quickActionCard}
                  onPress={() => handleQuickAction(action)}
                  disabled={isGenerating}
                >
                  <Text style={styles.quickActionEmoji}>{action.emoji}</Text>
                  <Text style={styles.quickActionTitle}>{action.title}</Text>
                  <Text style={styles.quickActionDescription}>{action.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Meal Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Generate Specific Meal</Text>
            
            {mealOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.mealCard,
                  isGenerating && styles.mealCardDisabled
                ]}
                onPress={() => handleMealGeneration(option)}
                disabled={isGenerating}
              >
                <View style={styles.mealCardContent}>
                  <View style={[styles.mealEmoji, { backgroundColor: option.color + '20' }]}>
                    <Text style={styles.mealEmojiText}>{option.emoji}</Text>
                  </View>

                  <View style={styles.mealInfo}>
                    <Text style={styles.mealTitle}>{option.title}</Text>
                    <Text style={styles.mealDescription}>{option.description}</Text>
                    
                    <View style={styles.mealMeta}>
                      <Text style={styles.mealTime}>⏱️ {option.estimatedTime}</Text>
                      <Text style={styles.mealSuggestions}>
                        {option.suggestions.slice(0, 2).join(' • ')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.generateButton}>
                    {isGenerating ? (
                      <ActivityIndicator size="small" color={option.color} />
                    ) : (
                      <Text style={[styles.generateButtonText, { color: option.color }]}>
                        Generate
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* AI Intelligence Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Intelligence</Text>
            <View style={styles.featuresGrid}>
              <View style={styles.featureItem}>
                <Text style={styles.featureEmoji}>🎯</Text>
                <Text style={styles.featureText}>Goal-optimized nutrition</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureEmoji}>🥗</Text>
                <Text style={styles.featureText}>Dietary preferences</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureEmoji}>📊</Text>
                <Text style={styles.featureText}>Macro calculations</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureEmoji}>🔄</Text>
                <Text style={styles.featureText}>Variety & rotation</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              🤖 Powered by Gemini 2.5 Flash • 90%+ accuracy • Zero-cost operation
            </Text>
          </View>
        </ScrollView>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  panel: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: ResponsiveTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  headerContent: {
    flex: 1,
    alignItems: 'center',
  },

  headerEmoji: {
    fontSize: rf(32),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  headerTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  headerSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(18),
  },

  closeButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: rs(16),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: ResponsiveTheme.spacing.lg,
    top: ResponsiveTheme.spacing.lg,
  },

  closeButtonText: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: ResponsiveTheme.spacing.lg,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  statusIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  statusText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    flex: 1,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  section: {
    padding: ResponsiveTheme.spacing.lg,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.sm,
  },

  quickActionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  quickActionEmoji: {
    fontSize: rf(24),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  quickActionTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  quickActionDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(14),
  },

  mealCard: {
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    marginBottom: ResponsiveTheme.spacing.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  mealCardDisabled: {
    opacity: 0.6,
  },

  mealCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.lg,
  },

  mealEmoji: {
    width: rw(48),
    height: rh(48),
    borderRadius: rs(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.md,
  },

  mealEmojiText: {
    fontSize: rf(20),
  },

  mealInfo: {
    flex: 1,
  },

  mealTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  mealDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    lineHeight: rf(16),
  },

  mealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.md,
  },

  mealTime: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },

  mealSuggestions: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    flex: 1,
  },

  generateButton: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: rw(70),
  },

  generateButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.md,
  },

  featureItem: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  featureEmoji: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  featureText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    flex: 1,
  },

  footer: {
    padding: ResponsiveTheme.spacing.lg,
    alignItems: 'center',
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
  },

  footerText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(16),
  },
});

export default AIMealsPanel;