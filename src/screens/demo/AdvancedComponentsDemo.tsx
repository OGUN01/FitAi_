import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Button, Card, THEME } from "../../components/ui";
import {
  ProgressChart,
  NutritionChart,
  WorkoutIntensityChart,
} from "../../components/charts";
import {
  LoadingAnimation,
  ProgressAnimation,
} from "../../components/animations";
import {
  Camera,
  ImagePicker,
  Slider,
  DatePicker,
  MultiSelect,
  RatingSelector,
  SwipeGesture,
  PullToRefresh,
  LongPressMenu,
  HapticFeedback,
  useHapticFeedback,
} from "../../components/advanced";
import { WorkoutDetail, ExerciseDetail, MealDetail } from "../details";

export const AdvancedComponentsDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);

  // Form component states
  const [sliderValue, setSliderValue] = useState(75);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [rating, setRating] = useState(3);

  // Haptic feedback hook
  const haptic = useHapticFeedback();

  // Mock data for charts
  const progressData = [
    { date: "2025-01-01", weight: 75, bodyFat: 18, muscleMass: 35 },
    { date: "2025-01-05", weight: 74.5, bodyFat: 17.8, muscleMass: 35.2 },
    { date: "2025-01-10", weight: 74, bodyFat: 17.5, muscleMass: 35.5 },
    { date: "2025-01-15", weight: 73.8, bodyFat: 17.2, muscleMass: 35.8 },
    { date: "2025-01-19", weight: 73.5, bodyFat: 17, muscleMass: 36 },
  ];

  const nutritionData = {
    calories: 1850,
    protein: 120,
    carbs: 180,
    fat: 65,
  };

  const workoutData = [
    { date: "2025-01-01", intensity: 3, duration: 45, type: "Strength" },
    { date: "2025-01-02", intensity: 2, duration: 30, type: "Cardio" },
    { date: "2025-01-04", intensity: 4, duration: 60, type: "HIIT" },
    { date: "2025-01-06", intensity: 3, duration: 45, type: "Strength" },
    { date: "2025-01-08", intensity: 5, duration: 75, type: "CrossFit" },
  ];

  const demoSections = [
    {
      id: "charts",
      title: "📊 Advanced Charts",
      description: "Interactive charts for progress tracking and analytics",
      items: [
        { id: "progress", title: "Progress Chart", component: "ProgressChart" },
        {
          id: "nutrition",
          title: "Nutrition Chart",
          component: "NutritionChart",
        },
        {
          id: "intensity",
          title: "Workout Intensity",
          component: "WorkoutIntensityChart",
        },
      ],
    },
    {
      id: "animations",
      title: "✨ Animations",
      description: "Smooth animations and micro-interactions",
      items: [
        {
          id: "loading",
          title: "Loading Animations",
          component: "LoadingAnimation",
        },
        {
          id: "progress-anim",
          title: "Progress Animations",
          component: "ProgressAnimation",
        },
      ],
    },
    {
      id: "camera",
      title: "📷 Camera & Media",
      description: "Camera integration and image management",
      items: [
        { id: "camera", title: "Camera Component", component: "Camera" },
        { id: "image-picker", title: "Image Picker", component: "ImagePicker" },
      ],
    },
    {
      id: "forms",
      title: "🎛️ Advanced Forms",
      description: "Interactive form components for better user input",
      items: [
        { id: "slider", title: "Slider Component", component: "Slider" },
        { id: "date-picker", title: "Date Picker", component: "DatePicker" },
        { id: "multi-select", title: "Multi Select", component: "MultiSelect" },
        { id: "rating", title: "Rating Selector", component: "RatingSelector" },
      ],
    },
    {
      id: "interactions",
      title: "🎮 Enhanced Interactions",
      description: "Advanced gestures and interactive behaviors",
      items: [
        { id: "swipe", title: "Swipe Gestures", component: "SwipeGesture" },
        {
          id: "pull-refresh",
          title: "Pull to Refresh",
          component: "PullToRefresh",
        },
        {
          id: "long-press",
          title: "Long Press Menu",
          component: "LongPressMenu",
        },
      ],
    },
    {
      id: "details",
      title: "📱 Detail Screens",
      description: "Comprehensive detail views with rich interactions",
      items: [
        {
          id: "workout-detail",
          title: "Workout Detail",
          component: "WorkoutDetail",
        },
        {
          id: "exercise-detail",
          title: "Exercise Detail",
          component: "ExerciseDetail",
        },
        { id: "meal-detail", title: "Meal Detail", component: "MealDetail" },
      ],
    },
  ];

  const renderDemo = () => {
    if (!activeDemo) return null;

    switch (activeDemo) {
      case "progress":
        return (
          <ProgressChart
            data={progressData}
            metric="weight"
            title="Weight Progress"
            unit="kg"
          />
        );

      case "nutrition":
        return <NutritionChart data={nutritionData} targetCalories={2000} />;

      case "intensity":
        return <WorkoutIntensityChart data={workoutData} />;

      case "loading":
        return (
          <View style={styles.animationDemo}>
            <LoadingAnimation type="spinner" size="lg" text="Loading..." />
            <LoadingAnimation type="dots" size="md" text="Processing..." />
            <LoadingAnimation type="pulse" size="sm" />
            <LoadingAnimation type="wave" size="md" text="Syncing..." />
          </View>
        );

      case "progress-anim":
        return (
          <View style={styles.animationDemo}>
            <ProgressAnimation progress={75} type="linear" label="Daily Goal" />
            <ProgressAnimation progress={60} type="circular" size="lg" />
            <ProgressAnimation
              progress={85}
              type="ring"
              size="md"
              label="Weekly"
            />
          </View>
        );

      case "slider":
        return (
          <View style={styles.formDemo}>
            <Slider
              min={0}
              max={100}
              step={5}
              value={sliderValue}
              onValueChange={setSliderValue}
              label="Weight (kg)"
              unit="kg"
            />
            <Slider
              min={1}
              max={20}
              step={1}
              value={12}
              onValueChange={() => {}}
              label="Reps"
              trackColor={THEME.colors.secondary + "30"}
              activeTrackColor={THEME.colors.secondary}
              thumbColor={THEME.colors.secondary}
            />
          </View>
        );

      case "date-picker":
        return (
          <View style={styles.formDemo}>
            <DatePicker
              value={selectedDate}
              onDateChange={setSelectedDate}
              mode="date"
              label="Workout Date"
            />
            <DatePicker
              value={selectedDate}
              onDateChange={setSelectedDate}
              mode="time"
              label="Workout Time"
            />
          </View>
        );

      case "multi-select":
        return (
          <View style={styles.formDemo}>
            <MultiSelect
              options={[
                { id: "1", label: "Chest", value: "chest", icon: "💪" },
                { id: "2", label: "Back", value: "back", icon: "🏋️" },
                { id: "3", label: "Shoulders", value: "shoulders", icon: "🤸" },
                { id: "4", label: "Arms", value: "arms", icon: "💪" },
                { id: "5", label: "Legs", value: "legs", icon: "🦵" },
                { id: "6", label: "Core", value: "core", icon: "🔥" },
              ]}
              selectedValues={selectedOptions}
              onSelectionChange={setSelectedOptions}
              label="Target Muscle Groups"
              maxSelections={3}
            />
          </View>
        );

      case "rating":
        return (
          <View style={styles.formDemo}>
            <RatingSelector
              value={rating}
              onRatingChange={setRating}
              type="difficulty"
              label="Workout Difficulty"
            />
            <RatingSelector
              value={4}
              onRatingChange={() => {}}
              type="satisfaction"
              label="Satisfaction"
            />
            <RatingSelector
              value={5}
              onRatingChange={() => {}}
              type="intensity"
              label="Intensity Level"
            />
          </View>
        );

      case "swipe":
        return (
          <View style={styles.formDemo}>
            <SwipeGesture
              leftActions={[
                {
                  id: "edit",
                  label: "Edit",
                  icon: "✏️",
                  color: THEME.colors.primary,
                  onPress: () => alert("Edit"),
                },
                {
                  id: "share",
                  label: "Share",
                  icon: "📤",
                  color: THEME.colors.info,
                  onPress: () => alert("Share"),
                },
              ]}
              rightActions={[
                {
                  id: "delete",
                  label: "Delete",
                  icon: "🗑️",
                  color: THEME.colors.error,
                  onPress: () => alert("Delete"),
                },
              ]}
            >
              <Card style={styles.swipeCard}>
                <Text style={styles.swipeText}>Swipe me left or right!</Text>
                <Text style={styles.swipeSubtext}>
                  Try swiping to reveal actions
                </Text>
              </Card>
            </SwipeGesture>
          </View>
        );

      case "pull-refresh":
        return (
          <PullToRefresh
            onRefresh={async () => {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              alert("Refreshed!");
            }}
            style={styles.pullRefreshDemo}
          >
            <View style={styles.refreshContent}>
              <Text style={styles.refreshTitle}>Pull down to refresh</Text>
              <Text style={styles.refreshSubtext}>
                This content will be refreshed
              </Text>
              {Array.from({ length: 10 }, (_, i) => (
                <Card key={i} style={styles.refreshItem}>
                  <Text style={styles.refreshItemText}>Item {i + 1}</Text>
                </Card>
              ))}
            </View>
          </PullToRefresh>
        );

      case "long-press":
        return (
          <View style={styles.formDemo}>
            <LongPressMenu
              menuItems={[
                {
                  id: "edit",
                  label: "Edit Workout",
                  icon: "✏️",
                  onPress: () => alert("Edit"),
                },
                {
                  id: "duplicate",
                  label: "Duplicate",
                  icon: "📋",
                  onPress: () => alert("Duplicate"),
                },
                {
                  id: "share",
                  label: "Share",
                  icon: "📤",
                  onPress: () => alert("Share"),
                },
                {
                  id: "delete",
                  label: "Delete",
                  icon: "🗑️",
                  onPress: () => alert("Delete"),
                  destructive: true,
                },
              ]}
            >
              <Card style={styles.longPressCard}>
                <Text style={styles.longPressText}>Long press me!</Text>
                <Text style={styles.longPressSubtext}>
                  Hold for 500ms to see context menu
                </Text>
              </Card>
            </LongPressMenu>
          </View>
        );

      case "workout-detail":
        return (
          <WorkoutDetail
            workoutId="1"
            onBack={() => setActiveDemo(null)}
            onStartWorkout={() => alert("Starting workout!")}
          />
        );

      case "exercise-detail":
        return (
          <ExerciseDetail
            exerciseId="1"
            onBack={() => setActiveDemo(null)}
            onStartExercise={() => alert("Starting exercise!")}
          />
        );

      case "meal-detail":
        return (
          <MealDetail
            mealId="1"
            onBack={() => setActiveDemo(null)}
            onEdit={() => alert("Editing meal!")}
            onDelete={() => alert("Deleting meal!")}
          />
        );

      default:
        return null;
    }
  };

  if (
    activeDemo &&
    ["workout-detail", "exercise-detail", "meal-detail"].includes(activeDemo)
  ) {
    return renderDemo();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Advanced Components Demo</Text>
        <Text style={styles.subtitle}>
          Showcase of all advanced UI components
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {demoSections.map((section) => (
          <Card key={section.id} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionDescription}>{section.description}</Text>

            <View style={styles.itemsContainer}>
              {section.items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.demoItem}
                  onPress={() => {
                    if (item.id === "camera") {
                      setShowCamera(true);
                    } else if (item.id === "image-picker") {
                      setShowImagePicker(true);
                    } else {
                      setActiveDemo(item.id);
                    }
                  }}
                >
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        ))}

        {/* Active Demo */}
        {activeDemo &&
          !["workout-detail", "exercise-detail", "meal-detail"].includes(
            activeDemo,
          ) && (
            <Card style={styles.demoContainer}>
              <View style={styles.demoHeader}>
                <Text style={styles.demoTitle}>Live Demo</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setActiveDemo(null)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              {renderDemo()}
            </Card>
          )}
      </ScrollView>

      {/* Camera Modal */}
      {showCamera && (
        <Camera
          mode="food"
          onCapture={(uri) => {
            console.log("Captured image:", uri);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
          style={styles.cameraModal}
        />
      )}

      {/* Image Picker Modal */}
      <ImagePicker
        visible={showImagePicker}
        mode="multiple"
        maxImages={3}
        onImagesSelected={(uris) => {
          console.log("Selected images:", uris);
          setShowImagePicker(false);
        }}
        onClose={() => setShowImagePicker(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  header: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },

  title: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  subtitle: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: THEME.spacing.md,
  },

  sectionCard: {
    marginVertical: THEME.spacing.sm,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  sectionDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
  },

  itemsContainer: {
    gap: THEME.spacing.xs,
  },

  demoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
  },

  itemTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
  },

  itemArrow: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
  },

  demoContainer: {
    marginVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.backgroundSecondary,
  },

  demoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: THEME.spacing.md,
  },

  demoTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.primary,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  animationDemo: {
    alignItems: "center",
    gap: THEME.spacing.lg,
    paddingVertical: THEME.spacing.lg,
  },

  formDemo: {
    gap: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
  },

  swipeCard: {
    padding: THEME.spacing.lg,
    alignItems: "center",
  },

  swipeText: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  swipeSubtext: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  pullRefreshDemo: {
    height: 300,
  },

  refreshContent: {
    padding: THEME.spacing.md,
  },

  refreshTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    textAlign: "center",
    marginBottom: THEME.spacing.sm,
  },

  refreshSubtext: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    marginBottom: THEME.spacing.lg,
  },

  refreshItem: {
    marginBottom: THEME.spacing.sm,
    padding: THEME.spacing.md,
  },

  refreshItemText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
  },

  longPressCard: {
    padding: THEME.spacing.lg,
    alignItems: "center",
    backgroundColor: THEME.colors.primary + "10",
    borderWidth: 1,
    borderColor: THEME.colors.primary + "30",
  },

  longPressText: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },

  longPressSubtext: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  cameraModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
});
