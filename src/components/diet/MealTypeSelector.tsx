// 🍽️ Meal Type Selection Overlay for Food Scanning
// Enhanced UI component for selecting meal type before food recognition

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { MealType } from "../../services/foodRecognitionService";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rh, rw, rs, rp } from "../../utils/responsive";

interface MealTypeSelectorProps {
  visible: boolean;
  onSelect: (mealType: MealType) => void;
  onClose: () => void;
}

interface MealTypeOption {
  type: MealType;
  label: string;
  emoji: string;
  description: string;
  suggestedTime: string;
  color: string;
}

const mealTypeOptions: MealTypeOption[] = [
  {
    type: "breakfast",
    label: "Breakfast",
    emoji: "🌅",
    description: "Start your day with nutritious fuel",
    suggestedTime: "6:00 - 10:00 AM",
    color: "#f59e0b", // amber
  },
  {
    type: "lunch",
    label: "Lunch",
    emoji: "☀️",
    description: "Midday energy boost and nutrients",
    suggestedTime: "12:00 - 2:00 PM",
    color: "#10b981", // emerald
  },
  {
    type: "dinner",
    label: "Dinner",
    emoji: "🌙",
    description: "Evening meal for recovery and rest",
    suggestedTime: "6:00 - 9:00 PM",
    color: "#8b5cf6", // violet
  },
  {
    type: "snack",
    label: "Snack",
    emoji: "🍎",
    description: "Quick bite between meals",
    suggestedTime: "Anytime",
    color: "#f97316", // orange
  },
];

export const MealTypeSelector: React.FC<MealTypeSelectorProps> = ({
  visible,
  onSelect,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<MealType | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(
    new Animated.Value(Dimensions.get("window").height),
  );

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: Dimensions.get("window").height,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = (mealType: MealType) => {
    setSelectedType(mealType);
    setTimeout(() => {
      onSelect(mealType);
      setSelectedType(null);
    }, 150); // Short delay for visual feedback
  };

  const getCurrentTimeBasedSuggestion = (): MealType => {
    const hour = new Date().getHours();
    if (hour < 10) return "breakfast";
    if (hour < 16) return "lunch";
    if (hour < 22) return "dinner";
    return "snack";
  };

  const suggestedMeal = getCurrentTimeBasedSuggestion();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={onClose}
          />

          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Text style={styles.headerEmoji}>🍽️</Text>
                <Text style={styles.headerTitle}>Select Meal Type</Text>
                <Text style={styles.headerSubtitle}>
                  Choose what type of meal you're scanning for better accuracy
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Time-based suggestion */}
            <View style={styles.suggestionBanner}>
              <Text style={styles.suggestionIcon}>💡</Text>
              <Text style={styles.suggestionText}>
                Based on current time, we suggest:{" "}
                <Text style={styles.suggestionMeal}>
                  {mealTypeOptions.find((m) => m.type === suggestedMeal)?.label}
                </Text>
              </Text>
            </View>

            {/* Meal type options */}
            <View style={styles.optionsContainer}>
              {mealTypeOptions.map((option) => {
                const isSelected = selectedType === option.type;
                const isSuggested = option.type === suggestedMeal;

                return (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                      isSuggested && styles.optionCardSuggested,
                    ]}
                    onPress={() => handleSelect(option.type)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionContent}>
                      <View
                        style={[
                          styles.optionEmoji,
                          { backgroundColor: option.color + "20" },
                        ]}
                      >
                        <Text style={styles.optionEmojiText}>
                          {option.emoji}
                        </Text>
                      </View>

                      <View style={styles.optionInfo}>
                        <View style={styles.optionHeader}>
                          <Text style={styles.optionLabel}>{option.label}</Text>
                          {isSuggested && (
                            <View style={styles.suggestedBadge}>
                              <Text style={styles.suggestedBadgeText}>
                                Suggested
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.optionDescription}>
                          {option.description}
                        </Text>
                        <Text style={styles.optionTime}>
                          {option.suggestedTime}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.selectIndicator,
                          { borderColor: option.color },
                        ]}
                      >
                        {isSelected && (
                          <View
                            style={[
                              styles.selectIndicatorInner,
                              { backgroundColor: option.color },
                            ]}
                          />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer tip */}
            <View style={styles.footer}>
              <Text style={styles.footerIcon}>🎯</Text>
              <Text style={styles.footerText}>
                Selecting the correct meal type helps our AI provide more
                accurate nutrition analysis
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  backdropTouchable: {
    flex: 1,
  },

  modalContent: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderTopLeftRadius: rs(24),
    borderTopRightRadius: rs(24),
    maxHeight: "80%",
    paddingBottom: rh(34), // Account for home indicator
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: ResponsiveTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  headerContent: {
    flex: 1,
    alignItems: "center",
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
    textAlign: "center",
    lineHeight: rf(18),
  },

  closeButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: rs(16),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: ResponsiveTheme.spacing.lg,
    top: ResponsiveTheme.spacing.lg,
  },

  closeButtonText: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  suggestionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7", // amber-100
    margin: ResponsiveTheme.spacing.lg,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  suggestionIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  suggestionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: "#92400e", // amber-800
    flex: 1,
  },

  suggestionMeal: {
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  optionsContainer: {
    padding: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.md,
  },

  optionCard: {
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.border,
    overflow: "hidden",
  },

  optionCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    transform: [{ scale: 0.98 }],
  },

  optionCardSuggested: {
    borderColor: "#f59e0b",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: ResponsiveTheme.spacing.lg,
  },

  optionEmoji: {
    width: rw(56),
    height: rh(56),
    borderRadius: rs(16),
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
  },

  optionEmojiText: {
    fontSize: rf(24),
  },

  optionInfo: {
    flex: 1,
  },

  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  optionLabel: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },

  suggestedBadge: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: rp(8),
    paddingVertical: rp(2),
    borderRadius: rs(8),
  },

  suggestedBadgeText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  optionDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
    lineHeight: rf(16),
  },

  optionTime: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  selectIndicator: {
    width: rw(24),
    height: rh(24),
    borderRadius: rs(12),
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: ResponsiveTheme.spacing.md,
  },

  selectIndicatorInner: {
    width: rw(12),
    height: rh(12),
    borderRadius: rs(6),
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    margin: ResponsiveTheme.spacing.lg,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  footerIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  footerText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    flex: 1,
    lineHeight: rf(16),
  },
});

export default MealTypeSelector;
