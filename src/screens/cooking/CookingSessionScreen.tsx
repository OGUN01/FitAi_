import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Linking,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  youtubeVideoService,
  CookingVideo,
} from "../../services/youtubeVideoService";
import { DayMeal } from "../../types/ai";
import { completionTrackingService } from "../../services/completionTracking";
import {
  cookingFlowGenerator,
  CookingFlow,
} from "../../utils/cookingFlowGenerator";
import { mealMotivationService } from "../../features/nutrition/MealMotivation";
import MacroDashboard from "../../components/nutrition/MacroDashboard";
import { haptics } from "../../utils/haptics";
import IngredientDetailModal from "../../components/nutrition/IngredientDetailModal";

interface CookingSessionScreenProps {
  route: {
    params: {
      meal: DayMeal;
    };
  };
  navigation: any;
}

interface CookingStep {
  step: number;
  instruction: string;
  timeRequired?: number;
  completed: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function CookingSessionScreen({
  route,
  navigation,
}: CookingSessionScreenProps) {
  const { meal } = route.params;

  // Enhanced state for premium cooking experience
  const [cookingFlow, setCookingFlow] = useState<CookingFlow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [cookingVideo, setCookingVideo] = useState<CookingVideo | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [cookingTimer, setCookingTimer] = useState<number | null>(null);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null,
  );
  // Ref to track timer interval for cleanup
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(
    null,
  );
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initializeCookingSession();
    searchForCookingVideo();
  }, []);

  useEffect(() => {
    // Auto-scroll to current step
    if (scrollViewRef.current && currentStepIndex >= 0) {
      scrollViewRef.current.scrollTo({
        y: currentStepIndex * 120, // Approximate height per step
        animated: true,
      });
    }
  }, [currentStepIndex]);

  const initializeCookingSession = () => {
    // Generate smart cooking flow instead of using generic steps
    const flow = cookingFlowGenerator.generateCookingFlow(meal);
    setCookingFlow(flow);

    console.log("🍽️ Generated cooking flow:", {
      totalSteps: flow.steps.length,
      totalTime: flow.totalTime,
      difficulty: flow.difficulty,
      equipment: flow.equipmentNeeded,
    });
  };

  const searchForCookingVideo = async () => {
    try {
      setIsLoadingVideo(true);
      setVideoError(null);

      const result = await youtubeVideoService.searchCookingVideo(meal.name);

      if (result.success && result.video) {
        setCookingVideo(result.video);
      } else {
        setVideoError(result.error || "No cooking video found");
      }
    } catch (error) {
      console.error("Error searching cooking video:", error);
      setVideoError("Failed to load cooking video");
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const toggleStepCompletion = (stepIndex: number) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepIndex)) {
        newSet.delete(stepIndex);
      } else {
        newSet.add(stepIndex);
      }
      return newSet;
    });
  };

  const goToNextStep = () => {
    if (!cookingFlow) return;

    if (currentStepIndex < cookingFlow.steps.length - 1) {
      // Mark current step as completed
      toggleStepCompletion(currentStepIndex);
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleIngredientPress = (ingredient: string) => {
    setSelectedIngredient(ingredient);
    setShowIngredientModal(true);
  };

  const startTimer = (minutes: number) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    const totalSeconds = minutes * 60;
    setCookingTimer(totalSeconds);

    const interval = setInterval(() => {
      setCookingTimer((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          timerIntervalRef.current = null;
          setTimerInterval(null);
          Alert.alert("Timer Complete!", "Your cooking step is ready.");
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    timerIntervalRef.current = interval;
    setTimerInterval(interval);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setCookingTimer(null);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const completeCooking = async () => {
    if (!cookingFlow) return;

    try {
      // Mark meal as completed in the tracking service
      console.log("🍽️ Marking meal as completed:", meal.name, "ID:", meal.id);
      const success = await completionTrackingService.completeMeal(meal.id, {
        completedAt: new Date().toISOString(),
        source: "cooking_session",
        allStepsCompleted: completedSteps.size === cookingFlow.steps.length,
        totalSteps: cookingFlow.steps.length,
        completedSteps: completedSteps.size,
      });

      if (success) {
        console.log("✅ Meal completion tracked successfully");
      } else {
        console.warn("⚠️ Failed to track meal completion, but continuing...");
      }
    } catch (error) {
      console.error("❌ Error tracking meal completion:", error);
    }

    // Use dynamic completion message
    const completionMessage = mealMotivationService.getCompletionMessage(meal, {
      // Could include user profile data here
    });

    Alert.alert("🎉 Cooking Complete!", completionMessage, [
      {
        text: "Enjoy Your Meal! 🍽️",
        onPress: () => {
          console.log("🔙 Navigating back to diet screen with completion flag");
          // Navigate back with parameters to trigger refresh
          navigation.navigate("Diet", {
            mealCompleted: true,
            completedMealId: meal.id,
            timestamp: Date.now(),
          });
        },
      },
    ]);
  };

  const renderVideoSection = () => (
    <View style={styles.videoSection}>
      {isLoadingVideo ? (
        <View style={styles.videoPlaceholder}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading cooking video...</Text>
        </View>
      ) : cookingVideo ? (
        <View style={styles.videoContainer}>
          <TouchableOpacity
            style={styles.videoPreview}
            onPress={() =>
              Linking.openURL(
                `https://www.youtube.com/watch?v=${cookingVideo.id}`,
              )
            }
            activeOpacity={0.8}
          >
            {cookingVideo.thumbnails && cookingVideo.thumbnails.length > 0 ? (
              <Image
                source={{ uri: cookingVideo.thumbnails[0].url }}
                style={styles.videoThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.videoPlaceholderThumb}>
                <Ionicons name="videocam" size={48} color="#6B7280" />
              </View>
            )}
            <View style={styles.playButton}>
              <Ionicons name="play" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.videoDuration}>
              <Text style={styles.videoDurationText}>
                {Math.floor(cookingVideo.lengthSeconds / 60)}:
                {(cookingVideo.lengthSeconds % 60).toString().padStart(2, "0")}
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.videoTitle}>{cookingVideo.title}</Text>
          <Text style={styles.videoAuthor}>by {cookingVideo.author}</Text>
          <TouchableOpacity
            style={styles.watchVideoButton}
            onPress={() =>
              Linking.openURL(
                `https://www.youtube.com/watch?v=${cookingVideo.id}`,
              )
            }
          >
            <Ionicons name="play-circle" size={20} color="#4F46E5" />
            <Text style={styles.watchVideoText}>Watch Cooking Tutorial</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.videoError}>
          <Ionicons name="videocam-off" size={48} color="#6B7280" />
          <Text style={styles.errorText}>{videoError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={searchForCookingVideo}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Enhanced ingredients section with clickable details
  const renderIngredientsSection = () => (
    <View style={styles.ingredientsSection}>
      <Text style={styles.sectionTitle}>Ingredients & Nutrition</Text>

      {/* Macro Dashboard */}
      <MacroDashboard
        meal={meal}
        compact={true}
        showTitle={false}
        style={styles.macroDashboard}
      />

      {/* Interactive Ingredients List */}
      <View style={styles.ingredientsList}>
        <Text style={styles.ingredientsTitle}>
          Tap ingredients for details:
        </Text>
        <View style={styles.ingredientsGrid}>
          {meal.items?.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.ingredientChip}
              onPress={() => handleIngredientPress(item.name || "")}
              activeOpacity={0.7}
            >
              <Text style={styles.ingredientText}>🥘 {item.name}</Text>
              <Text style={styles.ingredientCalories}>
                {Math.round(item.calories)} cal
              </Text>
              <Ionicons name="information-circle" size={16} color="#6B7280" />
            </TouchableOpacity>
          )) || []}
        </View>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    if (!cookingFlow || cookingFlow.steps.length === 0) return null;

    const currentStep = cookingFlow.steps[currentStepIndex];
    if (!currentStep) return null;

    const progress = ((currentStepIndex + 1) / cookingFlow.steps.length) * 100;
    const encouragement = mealMotivationService.getCookingProgressMessage(
      progress,
      meal,
    );

    return (
      <View style={styles.currentStepSection}>
        {/* Progress and Encouragement */}
        <View style={styles.progressHeader}>
          <Text style={styles.encouragementText}>{encouragement}</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Current Step */}
        <View style={styles.stepHeader}>
          <View style={styles.stepInfo}>
            <Text style={styles.stepCounter}>
              {currentStep.icon} Step {currentStep.step} of{" "}
              {cookingFlow.steps.length}
            </Text>
            <Text style={styles.stepTitle}>{currentStep.instruction}</Text>
          </View>
          {currentStep.timeRequired && (
            <TouchableOpacity
              style={styles.timerButton}
              onPress={() => startTimer(currentStep.timeRequired!)}
            >
              <Ionicons name="timer-outline" size={20} color="#4F46E5" />
              <Text style={styles.timerButtonText}>
                {currentStep.timeRequired}m
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step Tips */}
        {currentStep.tips && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipText}>💡 {currentStep.tips}</Text>
          </View>
        )}

        {/* Active Timer */}
        {cookingTimer !== null && (
          <View style={styles.activeTimer}>
            <Text style={styles.timerDisplay}>{formatTimer(cookingTimer)}</Text>
            <TouchableOpacity onPress={stopTimer}>
              <Ionicons name="stop-circle" size={32} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderStepsList = () => {
    if (!cookingFlow) return null;

    return (
      <View style={styles.stepsListSection}>
        <Text style={styles.sectionTitle}>Cooking Steps</Text>
        <ScrollView
          ref={scrollViewRef}
          style={styles.stepsList}
          showsVerticalScrollIndicator={false}
        >
          {cookingFlow.steps.map((step, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.stepItem,
                index === currentStepIndex && styles.currentStepItem,
                completedSteps.has(index) && styles.completedStepItem,
              ]}
              onPress={() => setCurrentStepIndex(index)}
            >
              <View style={styles.stepItemContent}>
                <View style={styles.stepNumber}>
                  <Text
                    style={[
                      styles.stepNumberText,
                      index === currentStepIndex && styles.currentStepText,
                      completedSteps.has(index) && styles.completedStepText,
                    ]}
                  >
                    {step.icon || step.step}
                  </Text>
                </View>
                <View style={styles.stepTextContainer}>
                  <Text
                    style={[
                      styles.stepItemText,
                      index === currentStepIndex && styles.currentStepText,
                      completedSteps.has(index) && styles.completedStepText,
                    ]}
                  >
                    {step.instruction}
                  </Text>
                  {step.timeRequired && (
                    <Text style={styles.stepTimeText}>
                      ⏱️ {step.timeRequired} min
                    </Text>
                  )}
                </View>
                {completedSteps.has(index) && (
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Pro Tips Section */}
        {cookingFlow.proTips.length > 0 && (
          <View style={styles.proTipsSection}>
            <Text style={styles.proTipsTitle}>💡 Pro Tips</Text>
            {cookingFlow.proTips.map((tip, index) => (
              <Text key={index} style={styles.proTipText}>
                • {tip}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderNavigationButtons = () => {
    if (!cookingFlow) return null;

    const isLastStep = currentStepIndex === cookingFlow.steps.length - 1;
    const isCurrentStepCompleted = completedSteps.has(currentStepIndex);

    return (
      <View style={styles.navigationSection}>
        <TouchableOpacity
          style={[
            styles.navButton,
            currentStepIndex === 0 && styles.disabledButton,
          ]}
          onPress={goToPreviousStep}
          disabled={currentStepIndex === 0}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={currentStepIndex === 0 ? "#9CA3AF" : "#FFFFFF"}
          />
          <Text
            style={[
              styles.navButtonText,
              currentStepIndex === 0 && styles.disabledButtonText,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.completeStepButton,
            isCurrentStepCompleted && styles.completedStepButton,
          ]}
          onPress={() => toggleStepCompletion(currentStepIndex)}
        >
          <Ionicons
            name={
              isCurrentStepCompleted
                ? "checkmark-circle"
                : "checkmark-circle-outline"
            }
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.completeButtonText}>
            {isCurrentStepCompleted ? "Step Done ✓" : "Mark Complete"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, isLastStep && styles.finishButton]}
          onPress={isLastStep ? completeCooking : goToNextStep}
        >
          <Text style={styles.navButtonText}>
            {isLastStep ? "🎉 Finish Cooking" : "Next Step"}
          </Text>
          <Ionicons
            name={isLastStep ? "checkmark" : "chevron-forward"}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            haptics.light();
            navigation.goBack();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={28} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealMeta}>
            Prep: {meal.preparationTime}m • Cook: {meal.cookingTime || 10}m •{" "}
            {meal.difficulty}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderVideoSection()}
        {renderIngredientsSection()}
        {renderCurrentStep()}
        {renderStepsList()}
      </ScrollView>

      {/* Navigation */}
      {renderNavigationButtons()}

      {/* Ingredient Detail Modal */}
      <IngredientDetailModal
        visible={showIngredientModal}
        onClose={() => setShowIngredientModal(false)}
        ingredientName={selectedIngredient || ""}
        meal={meal}
        onMealComplete={(mealId) => {
          console.log(
            "🍽️ CookingSessionScreen: Meal completed from ingredient modal:",
            mealId,
          );

          // Navigate back to diet screen with completion flag
          navigation.navigate("Diet", {
            mealCompleted: true,
            completedMealId: mealId,
            timestamp: Date.now(),
          });
        }}
        mealProgress={(() => {
          // Calculate current meal progress based on completed steps
          if (!cookingFlow) return 0;
          const totalSteps = cookingFlow.steps.length;
          const completedStepsCount = completedSteps.size;
          return Math.round((completedStepsCount / totalSteps) * 100);
        })()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  mealName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  mealMeta: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  videoSection: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  videoContainer: {
    padding: 16,
  },
  videoPreview: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 12,
  },
  videoThumbnail: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholderThumb: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  playButton: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoDuration: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDurationText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  watchVideoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  watchVideoText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
    marginLeft: 8,
  },
  videoPlaceholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  videoError: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 12,
  },
  videoAuthor: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  currentStepSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4F46E5",
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  stepCounter: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },
  timerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerButtonText: {
    fontSize: 14,
    color: "#4F46E5",
    marginLeft: 4,
  },
  stepInstruction: {
    fontSize: 18,
    lineHeight: 26,
    color: "#111827",
  },
  activeTimer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
  },
  timerDisplay: {
    fontSize: 24,
    fontWeight: "700",
    color: "#D97706",
  },
  stepsListSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    padding: 16,
    paddingBottom: 8,
  },
  stepsList: {
    maxHeight: 300,
  },
  stepItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  currentStepItem: {
    backgroundColor: "#EEF2FF",
  },
  completedStepItem: {
    backgroundColor: "#F0FDF4",
  },
  stepItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  currentStepText: {
    color: "#4F46E5",
  },
  completedStepText: {
    color: "#10B981",
  },
  stepItemText: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
  },
  navigationSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6B7280",
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  disabledButton: {
    backgroundColor: "#F3F4F6",
  },
  finishButton: {
    backgroundColor: "#10B981",
  },
  completeStepButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginHorizontal: 4,
  },
  disabledButtonText: {
    color: "#9CA3AF",
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },

  // Enhanced UI Styles
  ingredientsSection: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  macroDashboard: {
    marginBottom: 16,
  },

  ingredientsList: {
    marginTop: 8,
  },

  ingredientsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },

  ingredientsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  ingredientChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  ingredientText: {
    fontSize: 14,
    color: "#374151",
    marginRight: 6,
  },

  ingredientCalories: {
    fontSize: 12,
    color: "#6B7280",
    marginRight: 8,
  },

  progressHeader: {
    marginBottom: 16,
  },

  encouragementText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
    textAlign: "center",
    marginBottom: 12,
  },

  progressBarContainer: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 4,
  },

  stepInfo: {
    flex: 1,
  },

  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 24,
    marginTop: 4,
  },

  tipsContainer: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },

  tipText: {
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },

  stepTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  stepTimeText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  proTipsSection: {
    backgroundColor: "#F0FDF4",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },

  proTipsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 8,
  },

  proTipText: {
    fontSize: 14,
    color: "#166534",
    lineHeight: 20,
    marginBottom: 4,
  },

  completedStepButton: {
    backgroundColor: "#10B981",
  },
});
