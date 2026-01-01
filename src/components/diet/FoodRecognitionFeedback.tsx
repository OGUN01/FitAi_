import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, Card } from '../ui';
import { RecognizedFood } from '../../services/foodRecognitionService';
import { rf, rh, rw } from '../../utils/responsive';

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

export const FoodRecognitionFeedback: React.FC<FoodRecognitionFeedbackProps> = ({
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
        }))
      );
      setCurrentFoodIndex(0);
    }
  }, [recognizedFoods]);

  const updateFeedback = (index: number, updates: Partial<FoodFeedback>) => {
    setFeedback((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onSubmitFeedback(feedback);

      Alert.alert(
        '🙏 Thank You!',
        'Your feedback helps improve our food recognition accuracy for everyone!',
        [{ text: "You're Welcome!" }]
      );

      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentFood = recognizedFoods[currentFoodIndex];
  const currentFeedback = feedback[currentFoodIndex];

  if (!currentFood || !currentFeedback) {
    return null;
  }

  const renderAccuracyStars = (rating: number, onPress: (rating: 1 | 2 | 3 | 4 | 5) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress(star as 1 | 2 | 3 | 4 | 5)}
            style={styles.starButton}
          >
            <Text style={[styles.star, { color: star <= rating ? '#fbbf24' : '#d1d5db' }]}>⭐</Text>
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
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
                { width: `${((currentFoodIndex + 1) / recognizedFoods.length) * 100}%` },
              ]}
            />
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.foodCard}>
            <View style={styles.foodHeader}>
              <Text style={styles.foodName}>{currentFood.name}</Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>{currentFood.confidence}% confidence</Text>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Calories</Text>
                <Text style={styles.detailValue}>{Math.round(currentFood.nutrition.calories)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Portion</Text>
                <Text style={styles.detailValue}>{currentFood.portionSize.estimatedGrams}g</Text>
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
            <Text style={styles.sectionTitle}>How accurate is this recognition?</Text>
            {renderAccuracyStars(currentFeedback.accuracyRating, (rating) =>
              updateFeedback(currentFoodIndex, { accuracyRating: rating })
            )}
            <Text style={styles.ratingLabel}>
              {currentFeedback.accuracyRating === 1 && 'Very Poor - Completely wrong'}
              {currentFeedback.accuracyRating === 2 && 'Poor - Mostly wrong'}
              {currentFeedback.accuracyRating === 3 && 'Fair - Some mistakes'}
              {currentFeedback.accuracyRating === 4 && 'Good - Mostly correct'}
              {currentFeedback.accuracyRating === 5 && 'Excellent - Perfect recognition'}
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
                    currentFeedback.isCorrect && styles.correctnessButtonTextActive,
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
                onPress={() => updateFeedback(currentFoodIndex, { isCorrect: false })}
              >
                <Text
                  style={[
                    styles.correctnessButtonText,
                    !currentFeedback.isCorrect && styles.correctnessButtonTextActive,
                  ]}
                >
                  ❌ Incorrect
                </Text>
              </TouchableOpacity>
            </View>

            {!currentFeedback.isCorrect && (
              <View style={styles.correctionSection}>
                <Text style={styles.correctionLabel}>What should it be called?</Text>
                <TextInput
                  style={styles.correctionInput}
                  placeholder="Enter correct food name..."
                  value={currentFeedback.correctName || ''}
                  onChangeText={(text) => updateFeedback(currentFoodIndex, { correctName: text })}
                  multiline={false}
                />
              </View>
            )}
          </Card>

          {/* Additional Notes */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Additional comments (optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Any other feedback about this recognition..."
              value={currentFeedback.userNotes || ''}
              onChangeText={(text) => updateFeedback(currentFoodIndex, { userNotes: text })}
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
                title={isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={styles.navButton}
              />
            )}
          </View>

          {isSubmitting && (
            <View style={styles.submittingIndicator}>
              <ActivityIndicator size="small" color={ResponsiveTheme.colors.primary} />
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
    backgroundColor: ResponsiveTheme.colors.background,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
  },

  closeButton: {
    width: rw(32),
    height: rh(32),
    borderRadius: 16,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeText: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.text,
    fontWeight: '600',
  },

  progressIndicator: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
  },

  progressText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: 'center',
  },

  progressBar: {
    height: rh(4),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: 2,
  },

  progressFill: {
    height: '100%',
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: 2,
  },

  content: {
    flex: 1,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  foodCard: {
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  foodName: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },

  confidenceBadge: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: 12,
  },

  confidenceText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.white,
    fontWeight: '600',
  },

  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.md,
  },

  detailItem: {
    flex: 1,
    minWidth: '45%',
  },

  detailLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  detailValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: '600',
  },

  sectionCard: {
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  starButton: {
    padding: ResponsiveTheme.spacing.xs,
  },

  star: {
    fontSize: rf(24),
  },

  ratingLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontStyle: 'italic',
  },

  correctnessButtons: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  correctnessButton: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.background,
    alignItems: 'center',
  },

  correctnessButtonActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  correctnessButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: '600',
  },

  correctnessButtonTextActive: {
    color: ResponsiveTheme.colors.white,
  },

  correctionSection: {
    marginTop: ResponsiveTheme.spacing.md,
  },

  correctionLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    fontWeight: '600',
  },

  correctionInput: {
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    backgroundColor: ResponsiveTheme.colors.surface,
  },

  notesInput: {
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    backgroundColor: ResponsiveTheme.colors.surface,
    minHeight: rh(80),
    textAlignVertical: 'top',
  },

  navigationContainer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  navigationButtons: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
  },

  navButton: {
    flex: 1,
  },

  submittingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: ResponsiveTheme.spacing.md,
  },

  submittingText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginLeft: ResponsiveTheme.spacing.sm,
  },
});

export default FoodRecognitionFeedback;
