import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,

  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize } from "../../theme/aurora-tokens";
import { Button, Card } from "../ui";
import { RecognizedFood } from "../../services/foodRecognitionService";
import { rf, rh, rw, rbr } from "../../utils/responsive";

import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
interface FoodRecognitionFeedbackProps {
  visible: boolean;
  recognizedFoods: RecognizedFood[];
  onClose: () => void;
  onSubmitFeedback: (feedback: FoodFeedback[]) => Promise<void>;
  originalImageUri: string;
}

export interface FoodFeedback {
  foodId: string;
  originalName: string;
  isCorrect: boolean;
  correctName?: string;
  correctPortion?: number;
  correctNutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  userNotes?: string;
  accuracyRating: 1 | 2 | 3 | 4 | 5; // 1 = Very Poor, 5 = Excellent
}

export const FoodRecognitionFeedback: React.FC<
  FoodRecognitionFeedbackProps
> = ({
  visible,
  recognizedFoods,
  onClose,
  onSubmitFeedback,
  originalImageUri,
}) => {
  const [feedback, setFeedback] = useState<FoodFeedback[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFoodIndex, setCurrentFoodIndex] = useState(0);

  // Initialize feedback state when foods change
  React.useEffect(() => {
    if (recognizedFoods.length > 0) {
      setFeedback(
        recognizedFoods.map((food) => ({
          foodId: food.id,
          originalName: food.name,
          isCorrect: true, // Default to correct
          accuracyRating: 4, // Default to good rating
        })),
      );
      setCurrentFoodIndex(0);
    }
  }, [recognizedFoods]);

  const updateFeedback = (index: number, updates: Partial<FoodFeedback>) => {
    setFeedback((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    );
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onSubmitFeedback(feedback);

      crossPlatformAlert(
        "🙏 Thank You!",
        "Your feedback helps improve our food recognition accuracy for everyone!",
        [{ text: "You're Welcome!" }],
      );

      onClose();
    } catch (error) {
      crossPlatformAlert("Error", "Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentFood = recognizedFoods[currentFoodIndex];
  const currentFeedback = feedback[currentFoodIndex];

  if (!currentFood || !currentFeedback) {
    return null;
  }

  const renderAccuracyStars = (
    rating: number,
    onPress: (rating: 1 | 2 | 3 | 4 | 5) => void,
  ) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress(star as 1 | 2 | 3 | 4 | 5)}
            style={styles.starButton}
          >
            <Text
              style={[
                styles.star,
                { color: star <= rating ? "#fbbf24" : "#d1d5db" },
              ]}
            >
              ⭐
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Help Improve Recognition</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close food recognition feedback"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressIndicator}>
          <Text style={styles.progressText}>
            Food {currentFoodIndex + 1} of {recognizedFoods.length}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((currentFoodIndex + 1) / recognizedFoods.length) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.foodCard}>
            <View style={styles.foodHeader}>
              <Text style={styles.foodName}>{currentFood.name}</Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {currentFood.confidence}% confidence
                </Text>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Calories</Text>
                <Text style={styles.detailValue}>
                  {Math.round(currentFood.nutrition.calories)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Portion</Text>
                <Text style={styles.detailValue}>
                  {currentFood.estimatedGrams}g
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Cuisine</Text>
                <Text style={styles.detailValue}>{currentFood.cuisine}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{currentFood.category}</Text>
              </View>
            </View>
          </Card>

          {/* Accuracy Rating */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              How accurate is this recognition?
            </Text>
            {renderAccuracyStars(currentFeedback.accuracyRating, (rating) =>
              updateFeedback(currentFoodIndex, { accuracyRating: rating }),
            )}
            <Text style={styles.ratingLabel}>
              {currentFeedback.accuracyRating === 1 &&
                "Very Poor - Completely wrong"}
              {currentFeedback.accuracyRating === 2 && "Poor - Mostly wrong"}
              {currentFeedback.accuracyRating === 3 && "Fair - Some mistakes"}
              {currentFeedback.accuracyRating === 4 && "Good - Mostly correct"}
              {currentFeedback.accuracyRating === 5 &&
                "Excellent - Perfect recognition"}
            </Text>
          </Card>

          {/* Correctness Check */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Is the food name correct?</Text>
            <View style={styles.correctnessButtons}>
              <TouchableOpacity
                style={[
                  styles.correctnessButton,
                  currentFeedback.isCorrect && styles.correctnessButtonActive,
                ]}
                onPress={() =>
                  updateFeedback(currentFoodIndex, {
                    isCorrect: true,
                    correctName: undefined,
                  })
                }
              >
                <Text
                  style={[
                    styles.correctnessButtonText,
                    currentFeedback.isCorrect &&
                      styles.correctnessButtonTextActive,
                  ]}
                >
                  ✅ Correct
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.correctnessButton,
                  !currentFeedback.isCorrect && styles.correctnessButtonActive,
                ]}
                onPress={() =>
                  updateFeedback(currentFoodIndex, { isCorrect: false })
                }
              >
                <Text
                  style={[
                    styles.correctnessButtonText,
                    !currentFeedback.isCorrect &&
                      styles.correctnessButtonTextActive,
                  ]}
                >
                  ❌ Incorrect
                </Text>
              </TouchableOpacity>
            </View>

            {!currentFeedback.isCorrect && (
              <View style={styles.correctionSection}>
                <Text style={styles.correctionLabel}>
                  What should it be called?
                </Text>
                <TextInput
                  style={styles.correctionInput}
                  placeholder="Enter correct food name..."
                  value={currentFeedback.correctName || ""}
                  onChangeText={(text) =>
                    updateFeedback(currentFoodIndex, { correctName: text })
                  }
                  multiline={false}
                />
              </View>
            )}
          </Card>

          {/* Additional Notes */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Additional comments (optional)
            </Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Any other feedback about this recognition..."
              value={currentFeedback.userNotes || ""}
              onChangeText={(text) =>
                updateFeedback(currentFoodIndex, { userNotes: text })
              }
              multiline={true}
              numberOfLines={3}
            />
          </Card>
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          <View style={styles.navigationButtons}>
            {currentFoodIndex > 0 && (
              <Button
                title="Previous"
                onPress={() => setCurrentFoodIndex((prev) => prev - 1)}
                variant="outline"
                style={styles.navButton}
              />
            )}

            {currentFoodIndex < recognizedFoods.length - 1 ? (
              <Button
                title="Next"
                onPress={() => setCurrentFoodIndex((prev) => prev + 1)}
                style={styles.navButton}
              />
            ) : (
              <Button
                title={isSubmitting ? "Submitting..." : "Submit Feedback"}
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={styles.navButton}
              />
            )}
          </View>

          {isSubmitting && (
            <View style={styles.submittingIndicator}>
              <ActivityIndicator
                size="small"
                color={colors.primary}
              />
              <Text style={styles.submittingText}>Sending feedback...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
  },

  closeButton: {
    width: Math.max(rw(32), 44),
    height: Math.max(rh(32), 44),
    borderRadius: Math.max(rbr(16), 22),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },

  closeText: {
    fontSize: rf(16),
    color: colors.text,
    fontWeight: "600",
  },

  progressIndicator: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },

  progressBar: {
    height: rh(4),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: rbr(2),
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: rbr(2),
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  foodCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  foodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  foodName: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },

  confidenceBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: rbr(12),
  },

  confidenceText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: "600",
  },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },

  detailItem: {
    flex: 1,
    minWidth: "45%",
  },

  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },

  detailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "600",
  },

  sectionCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },

  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  starButton: {
    padding: spacing.xs,
  },

  star: {
    fontSize: rf(24),
  },

  ratingLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: "italic",
  },

  correctnessButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  correctnessButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
  },

  correctnessButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  correctnessButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "600",
  },

  correctnessButtonTextActive: {
    color: colors.white,
  },

  correctionSection: {
    marginTop: spacing.md,
  },

  correctionLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },

  correctionInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },

  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: rh(80),
    textAlignVertical: "top",
  },

  navigationContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  navigationButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },

  navButton: {
    flex: 1,
  },

  submittingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },

  submittingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});

export default FoodRecognitionFeedback;
