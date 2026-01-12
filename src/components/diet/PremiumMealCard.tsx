/**
 * PremiumMealCard - World-Class Meal Card Component
 * 
 * Features:
 * - Glassmorphic design with Aurora tokens
 * - Meal-type-specific gradient accents
 * - Mini progress rings for macros (% of daily target)
 * - Dynamic meal times from user schedule
 * - Smooth press animations with haptic feedback
 * - Completion state with checkmark overlay
 * - FULL food items list with quantities and calories
 * - Expandable/collapsible items section
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { GlassCard } from '../ui/aurora/GlassCard';
import { MiniProgressRing } from '../ui/aurora/ProgressRing';
import { colors, typography, spacing, borderRadius } from '../../theme/aurora-tokens';
import { rf, rw, rh } from '../../utils/responsive';
import { haptics } from '../../utils/haptics';
import { DayMeal, MealItem } from '../../types/ai';
import { getMealTypeIcon, getMealTypeIonicon } from '../../utils/mealSchedule';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// TYPES
// ============================================================================

interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

interface PremiumMealCardProps {
  meal: DayMeal;
  mealTime: string;
  onPress?: () => void;
  onStartMeal?: () => void;
  onCompleteMeal?: () => void;
  progress?: number;
  macroTargets?: MacroTargets;
  style?: any;
}

// ============================================================================
// MEAL TYPE GRADIENTS
// ============================================================================

const mealTypeGradients: Record<string, { colors: readonly [string, string, ...string[]]; icon: string }> = {
  breakfast: {
    colors: ['#FF6B35', '#FFB74D'] as const,
    icon: 'sunny',
  },
  lunch: {
    colors: ['#4CAF50', '#81C784'] as const,
    icon: 'restaurant',
  },
  dinner: {
    colors: ['#6366F1', '#818CF8'] as const,
    icon: 'moon',
  },
  snack: {
    colors: ['#00D4FF', '#00FFFF'] as const,
    icon: 'nutrition',
  },
  morning_snack: {
    colors: ['#FF9800', '#FFCC80'] as const,
    icon: 'cafe',
  },
  afternoon_snack: {
    colors: ['#00D4FF', '#00FFFF'] as const,
    icon: 'nutrition',
  },
};

// ============================================================================
// MACRO COLORS
// ============================================================================

const macroColors = {
  protein: '#FF6B6B',
  carbs: '#4ECDC4',
  fat: '#FFC107',
};

// ============================================================================
// COMPONENT
// ============================================================================

export const PremiumMealCard: React.FC<PremiumMealCardProps> = ({
  meal,
  mealTime,
  onPress,
  onStartMeal,
  onCompleteMeal,
  progress = 0,
  macroTargets,
  style,
}) => {
  // Expand/collapse state for food items
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Animation values
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  // Get meal type config
  const mealConfig = mealTypeGradients[meal.type] || mealTypeGradients.lunch;
  
  // Get food items (items or foods alias)
  const foodItems: MealItem[] = meal.items || meal.foods || [];
  
  // Calculate macro percentages of daily target
  // CRITICAL: Round to integers to prevent Android "Loss of precision" error in ProgressRing
  const macroPercentages = useMemo(() => {
    if (!macroTargets) {
      return { protein: 0, carbs: 0, fat: 0 };
    }
    
    const protein = meal.totalMacros?.protein || 0;
    const carbs = meal.totalMacros?.carbohydrates || 0;
    const fat = meal.totalMacros?.fat || 0;
    
    return {
      protein: Math.round(macroTargets.protein > 0 ? Math.min((protein / macroTargets.protein) * 100, 100) : 0),
      carbs: Math.round(macroTargets.carbs > 0 ? Math.min((carbs / macroTargets.carbs) * 100, 100) : 0),
      fat: Math.round(macroTargets.fat > 0 ? Math.min((fat / macroTargets.fat) * 100, 100) : 0),
    };
  }, [meal.totalMacros, macroTargets]);

  // Completion state
  const isCompleted = progress >= 100;
  const isInProgress = progress > 0 && progress < 100;

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(pressed.value, [0, 1], [1, 0.95]),
  }));

  // Press handlers
  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    pressed.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    haptics.selection();
    onPress?.();
  };

  const handleStartPress = () => {
    haptics.medium();
    onStartMeal?.();
  };
  
  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    haptics.light();
    setIsExpanded(!isExpanded);
  };

  // Prep & cooking time
  const prepTime = meal.preparationTime || meal.prepTime || 0;
  const cookTime = meal.cookingTime || meal.cookTime || 0;
  const totalTime = prepTime + cookTime;
  
  // Fiber
  const fiber = meal.totalMacros?.fiber || 0;

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <GlassCard
          elevation={3}
          blurIntensity="light"
          padding="none"
          borderRadius="xl"
        >
          {/* Gradient Accent Strip */}
          <LinearGradient
            colors={mealConfig.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentStrip}
          />

          <View style={styles.cardContent}>
            {/* Header Row: Icon + Name + Time */}
            <View style={styles.headerRow}>
              {/* Meal Type Icon Container */}
              <View style={[styles.iconContainer, { backgroundColor: `${mealConfig.colors[0]}20` }]}>
                <Ionicons
                  name={mealConfig.icon as any}
                  size={rf(24)}
                  color={mealConfig.colors[0]}
                />
              </View>

              {/* Meal Name & Type */}
              <View style={styles.titleContainer}>
                <Text style={styles.mealName} numberOfLines={2}>
                  {meal.name}
                </Text>
                <View style={styles.typeRow}>
                  <Text style={[styles.mealType, { color: mealConfig.colors[0] }]}>
                    {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}
                  </Text>
                  {meal.isPersonalized && (
                    <View style={[styles.aiBadge, styles.personalizedBadge]}>
                      <Text style={styles.personalizedBadgeText}>🎯 For You</Text>
                    </View>
                  )}
                  {meal.aiGenerated && (
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>✨ AI</Text>
                    </View>
                  )}
                </View>
                {/* Description if exists */}
                {meal.description && meal.description.trim() !== '' && (
                  <Text style={styles.mealDescription} numberOfLines={2}>
                    {meal.description}
                  </Text>
                )}
              </View>

              {/* Time Badge */}
              <View style={styles.timeBadge}>
                <Text style={styles.timeText}>{mealTime}</Text>
              </View>
            </View>

            {/* Macro Progress Rings + Calories */}
            <View style={styles.nutritionRow}>
              {/* Macro Rings */}
              <View style={styles.macroRingsContainer}>
                {/* Protein Ring */}
                <View style={styles.macroRingItem}>
                  <MiniProgressRing
                    progress={macroPercentages.protein}
                    color={macroColors.protein}
                    backgroundColor={`${macroColors.protein}20`}
                    showText={false}
                    animated={true}
                  />
                  <Text style={styles.macroValue}>
                    {Math.round(meal.totalMacros?.protein || 0)}g
                  </Text>
                  <Text style={[styles.macroLabel, { color: macroColors.protein }]}>Protein</Text>
                </View>

                {/* Carbs Ring */}
                <View style={styles.macroRingItem}>
                  <MiniProgressRing
                    progress={macroPercentages.carbs}
                    color={macroColors.carbs}
                    backgroundColor={`${macroColors.carbs}20`}
                    showText={false}
                    animated={true}
                  />
                  <Text style={styles.macroValue}>
                    {Math.round(meal.totalMacros?.carbohydrates || 0)}g
                  </Text>
                  <Text style={[styles.macroLabel, { color: macroColors.carbs }]}>Carbs</Text>
                </View>

                {/* Fat Ring */}
                <View style={styles.macroRingItem}>
                  <MiniProgressRing
                    progress={macroPercentages.fat}
                    color={macroColors.fat}
                    backgroundColor={`${macroColors.fat}20`}
                    showText={false}
                    animated={true}
                  />
                  <Text style={styles.macroValue}>
                    {Math.round(meal.totalMacros?.fat || 0)}g
                  </Text>
                  <Text style={[styles.macroLabel, { color: macroColors.fat }]}>Fat</Text>
                </View>
                
                {/* Fiber (no ring, just value) */}
                {fiber > 0 && (
                  <View style={styles.macroRingItem}>
                    <View style={styles.fiberCircle}>
                      <Ionicons name="leaf" size={rf(16)} color={colors.success.DEFAULT} />
                    </View>
                    <Text style={styles.macroValue}>{Math.round(fiber)}g</Text>
                    <Text style={[styles.macroLabel, { color: colors.success.DEFAULT }]}>Fiber</Text>
                  </View>
                )}
              </View>

              {/* Calories Display */}
              <View style={styles.caloriesContainer}>
                <Text style={styles.caloriesValue}>{meal.totalCalories || 0}</Text>
                <Text style={styles.caloriesLabel}>calories</Text>
              </View>
            </View>

            {/* Metadata Row */}
            <View style={styles.metadataRow}>
              {/* Prep Time */}
              {prepTime > 0 && (
                <View style={styles.metadataItem}>
                  <Ionicons name="hourglass-outline" size={rf(14)} color={colors.text.secondary} />
                  <Text style={styles.metadataText}>Prep: {prepTime}m</Text>
                </View>
              )}
              {/* Cook Time */}
              {cookTime > 0 && (
                <>
                  {prepTime > 0 && <View style={styles.metadataDot} />}
                  <View style={styles.metadataItem}>
                    <Ionicons name="flame-outline" size={rf(14)} color={colors.warning.DEFAULT} />
                    <Text style={styles.metadataText}>Cook: {cookTime}m</Text>
                  </View>
                </>
              )}
              {/* Total Time */}
              {totalTime > 0 && (
                <>
                  <View style={styles.metadataDot} />
                  <View style={styles.metadataItem}>
                    <Ionicons name="time-outline" size={rf(14)} color={colors.primary[500]} />
                    <Text style={[styles.metadataText, { color: colors.primary[500] }]}>
                      Total: {totalTime}m
                    </Text>
                  </View>
                </>
              )}
              {/* Difficulty */}
              {meal.difficulty && (
                <>
                  <View style={styles.metadataDot} />
                  <View style={[
                    styles.difficultyBadgeContainer,
                    { 
                      backgroundColor: meal.difficulty === 'easy' ? `${colors.success.DEFAULT}20` :
                                       meal.difficulty === 'medium' ? `${colors.warning.DEFAULT}20` :
                                       `${colors.error.DEFAULT}20`
                    }
                  ]}>
                    <Text style={[
                      styles.difficultyBadge,
                      { 
                        color: meal.difficulty === 'easy' ? colors.success.DEFAULT :
                               meal.difficulty === 'medium' ? colors.warning.DEFAULT :
                               colors.error.DEFAULT
                      }
                    ]}>
                      {meal.difficulty.charAt(0).toUpperCase() + meal.difficulty.slice(1)}
                    </Text>
                  </View>
                </>
              )}
            </View>
            
            {/* Tags Row (if tags exist and aren't just type tags) */}
            {meal.tags && meal.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {meal.tags
                  .filter(tag => !['breakfast', 'lunch', 'dinner', 'snack', 'ai-generated'].includes(tag.toLowerCase()))
                  .slice(0, 4)
                  .map((tag, index) => (
                    <View key={`tag-${index}`} style={styles.tagChip}>
                      <Text style={styles.tagText}>
                        {tag.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </Text>
                    </View>
                  ))
                }
              </View>
            )}
            
            {/* ===== FOOD ITEMS SECTION ===== */}
            {foodItems.length > 0 && (
              <View style={styles.foodItemsSection}>
                {/* Toggle Header */}
                <Pressable style={styles.foodItemsHeader} onPress={toggleExpanded}>
                  <View style={styles.foodItemsHeaderLeft}>
                    <Ionicons 
                      name={isExpanded ? "restaurant" : "list-outline"} 
                      size={rf(16)} 
                      color={isExpanded ? mealConfig.colors[0] : colors.text.secondary} 
                    />
                    <View>
                      <Text style={[
                        styles.foodItemsTitle,
                        isExpanded && { color: mealConfig.colors[0] }
                      ]}>
                        {foodItems.length} Items Included
                      </Text>
                      {/* Preview of items when collapsed */}
                      {!isExpanded && (
                        <Text style={styles.foodItemsPreview} numberOfLines={1}>
                          {foodItems.slice(0, 3).map(item => (item as any).name).join(', ')}
                          {foodItems.length > 3 && '...'}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={[
                    styles.expandButton,
                    isExpanded && { backgroundColor: `${mealConfig.colors[0]}20` }
                  ]}>
                    <Ionicons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={rf(16)} 
                      color={isExpanded ? mealConfig.colors[0] : colors.text.secondary} 
                    />
                  </View>
                </Pressable>
                
                {/* Expanded Food List */}
                {isExpanded && (
                  <View style={styles.foodItemsList}>
                    {foodItems.map((item, index) => (
                      <View 
                        key={item.id || `item-${index}`} 
                        style={[
                          styles.foodItem,
                          index === foodItems.length - 1 && styles.foodItemLast
                        ]}
                      >
                        {/* Left: Item details */}
                        <View style={styles.foodItemLeft}>
                          <Text style={styles.foodItemName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.foodItemQuantity}>
                            {item.quantity || `${item.amount || 1} ${item.unit || 'serving'}`}
                          </Text>
                        </View>
                        
                        {/* Right: Nutrition info */}
                        <View style={styles.foodItemRight}>
                          <Text style={styles.foodItemCalories}>
                            {Math.round(item.calories || 0)} cal
                          </Text>
                          <View style={styles.foodItemMacros}>
                            <Text style={[styles.foodItemMacro, { color: macroColors.protein }]}>
                              P:{Math.round(item.macros?.protein || 0)}
                            </Text>
                            <Text style={[styles.foodItemMacro, { color: macroColors.carbs }]}>
                              C:{Math.round(item.macros?.carbohydrates || 0)}
                            </Text>
                            <Text style={[styles.foodItemMacro, { color: macroColors.fat }]}>
                              F:{Math.round(item.macros?.fat || 0)}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Logged indicator */}
                        {item.isLogged && (
                          <View style={styles.loggedIndicator}>
                            <Ionicons 
                              name="checkmark-circle" 
                              size={rf(16)} 
                              color={colors.success.DEFAULT} 
                            />
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtonsRow}>
              {/* Start/Continue Button */}
              {onStartMeal && !isCompleted && (
                <Pressable
                  style={[styles.actionButton, styles.actionButtonFlex]}
                  onPress={handleStartPress}
                >
                  <LinearGradient
                    colors={mealConfig.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons name="play" size={rf(18)} color={colors.text.primary} />
                    <Text style={styles.actionButtonText}>
                      {isInProgress ? `Continue (${Math.round(progress)}%)` : 'Start Meal'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              )}
              
              {/* Complete/Completed Button */}
              {onCompleteMeal && (
                <Pressable
                  style={[
                    styles.actionButton,
                    !onStartMeal || isCompleted ? styles.actionButtonFlex : styles.completeButton,
                    isCompleted && styles.actionButtonCompleted,
                  ]}
                  onPress={() => {
                    if (!isCompleted) {
                      haptics.success();
                      onCompleteMeal();
                    }
                  }}
                  disabled={isCompleted}
                >
                  <LinearGradient
                    colors={isCompleted 
                      ? [colors.success.DEFAULT, colors.success.light] as const
                      : ['#10B981', '#059669'] as const
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons 
                      name={isCompleted ? "checkmark-circle" : "checkbox-outline"} 
                      size={rf(18)} 
                      color={colors.text.primary} 
                    />
                    <Text style={styles.actionButtonText}>
                      {isCompleted ? 'Completed' : 'Mark Complete'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>

            {/* Progress Indicator */}
            {isInProgress && (
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>
            )}
          </View>

          {/* Completed Overlay */}
          {isCompleted && (
            <View style={styles.completedOverlay}>
              <Ionicons name="checkmark-circle" size={rf(32)} color={colors.success.DEFAULT} />
            </View>
          )}
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  accentStrip: {
    height: 4,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },

  cardContent: {
    padding: spacing.lg,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },

  iconContainer: {
    width: rw(48),
    height: rw(48),
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },

  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },

  mealName: {
    fontSize: typography.fontSize.h3,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    lineHeight: typography.fontSize.h3 * 1.3,
    marginBottom: spacing.xs,
  },

  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  mealType: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  mealDescription: {
    fontSize: typography.fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: typography.fontSize.caption * 1.4,
  },

  aiBadge: {
    backgroundColor: `${colors.primary[500]}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },

  aiBadgeText: {
    fontSize: typography.fontSize.micro,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[500],
  },
  
  personalizedBadge: {
    backgroundColor: `${colors.success.DEFAULT}20`,
  },
  
  personalizedBadgeText: {
    fontSize: typography.fontSize.micro,
    fontWeight: typography.fontWeight.semibold,
    color: colors.success.DEFAULT,
  },

  timeBadge: {
    backgroundColor: colors.glass.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },

  timeText: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },

  // Nutrition Row
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.lg,
  },

  macroRingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },

  macroRingItem: {
    alignItems: 'center',
  },

  macroValue: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },

  macroLabel: {
    fontSize: typography.fontSize.micro,
    fontWeight: typography.fontWeight.medium,
    marginTop: 2,
  },
  
  fiberCircle: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: `${colors.success.DEFAULT}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  caloriesContainer: {
    alignItems: 'flex-end',
  },

  caloriesValue: {
    fontSize: typography.fontSize.h2,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },

  caloriesLabel: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },

  // Metadata Row
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  metadataText: {
    fontSize: typography.fontSize.micro,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },

  metadataDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text.muted,
    marginHorizontal: spacing.sm,
  },

  difficultyBadgeContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },

  difficultyBadge: {
    fontSize: typography.fontSize.micro,
    fontWeight: typography.fontWeight.semibold,
  },
  
  // ===== TAGS ROW =====
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  
  tagChip: {
    backgroundColor: colors.glass.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  
  tagText: {
    fontSize: typography.fontSize.micro,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  
  // ===== FOOD ITEMS SECTION =====
  foodItemsSection: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glass.backgroundDark,
    overflow: 'hidden',
  },
  
  foodItemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  
  foodItemsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  
  foodItemsTitle: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  
  foodItemsPreview: {
    fontSize: typography.fontSize.micro,
    color: colors.text.muted,
    marginTop: 2,
    maxWidth: rw(200),
  },
  
  expandButton: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
  },
  
  foodItemsList: {
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  
  foodItemLast: {
    borderBottomWidth: 0,
  },
  
  foodItemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  
  foodItemName: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  
  foodItemQuantity: {
    fontSize: typography.fontSize.micro,
    color: colors.text.secondary,
  },
  
  foodItemRight: {
    alignItems: 'flex-end',
  },
  
  foodItemCalories: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  
  foodItemMacros: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  
  foodItemMacro: {
    fontSize: typography.fontSize.micro,
    fontWeight: typography.fontWeight.medium,
  },
  
  loggedIndicator: {
    marginLeft: spacing.sm,
  },

  // Action Buttons
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  
  actionButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  
  actionButtonFlex: {
    flex: 1,
  },
  
  completeButton: {
    minWidth: rw(140),
  },

  actionButtonCompleted: {
    opacity: 0.9,
  },

  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  actionButtonText: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },

  // Progress Bar
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.glass.background,
    borderRadius: 2,
    marginTop: spacing.md,
    overflow: 'hidden',
  },

  progressBar: {
    height: '100%',
    backgroundColor: colors.success.DEFAULT,
    borderRadius: 2,
  },

  // Completed Overlay
  completedOverlay: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
});

export default PremiumMealCard;

