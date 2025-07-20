# FitAI Advanced Components Documentation

## 📊 Chart Components

### ProgressChart
Interactive line chart for tracking progress over time.

```typescript
<ProgressChart
  data={progressData}
  metric="weight" // 'weight' | 'bodyFat' | 'muscleMass'
  title="Weight Progress"
  unit="kg"
  style={customStyle}
/>
```

**Features:**
- Time period selection (7D, 1M, 1Y)
- Trend calculation with visual indicators
- Smooth animations and interactions
- Responsive design

### NutritionChart
Pie chart with macro breakdown and calorie tracking.

```typescript
<NutritionChart
  data={{ calories: 1850, protein: 120, carbs: 180, fat: 65 }}
  targetCalories={2000}
  style={customStyle}
/>
```

**Features:**
- Macro percentage calculation
- Progress bar for daily calorie goal
- Color-coded macro breakdown
- Interactive legend

### WorkoutIntensityChart
GitHub-style heatmap for workout intensity tracking.

```typescript
<WorkoutIntensityChart
  data={workoutData}
  style={customStyle}
/>
```

**Features:**
- 12-week intensity heatmap
- Interactive day selection
- Workout statistics summary
- Color-coded intensity levels

---

## 📱 Detail Screens

### WorkoutDetail
Comprehensive workout overview with exercise breakdown.

```typescript
<WorkoutDetail
  workoutId="workout-123"
  onBack={() => navigation.goBack()}
  onStartWorkout={() => startWorkout()}
/>
```

**Features:**
- Exercise list with detailed information
- Target muscle groups visualization
- Equipment requirements
- Difficulty and duration indicators

### ExerciseDetail
Step-by-step exercise instructions with animations.

```typescript
<ExerciseDetail
  exerciseId="exercise-456"
  onBack={() => navigation.goBack()}
  onStartExercise={() => startExercise()}
/>
```

**Features:**
- Animated step-by-step instructions
- Safety tips and common mistakes
- Auto-play instruction sequence
- Interactive step navigation

### MealDetail
Detailed nutrition breakdown with insights.

```typescript
<MealDetail
  mealId="meal-789"
  onBack={() => navigation.goBack()}
  onEdit={() => editMeal()}
  onDelete={() => deleteMeal()}
/>
```

**Features:**
- Complete nutrition analysis
- Food item breakdown
- AI-powered insights
- Meal notes and recommendations

---

## 📷 Camera & Media

### Camera
Professional camera interface for food scanning and progress photos.

```typescript
<Camera
  mode="food" // 'food' | 'progress'
  onCapture={(uri) => handleCapture(uri)}
  onClose={() => setShowCamera(false)}
/>
```

**Features:**
- Mode-specific overlays and guidance
- Flash control and camera switching
- Permission handling
- Capture feedback and tips

### ImagePicker
Multi-image selection with library and camera options.

```typescript
<ImagePicker
  visible={showPicker}
  mode="multiple" // 'single' | 'multiple'
  maxImages={5}
  onImagesSelected={(uris) => handleImages(uris)}
  onClose={() => setShowPicker(false)}
/>
```

**Features:**
- Multiple selection modes
- Image preview and removal
- Permission management
- Quality and aspect ratio control

---

## ✨ Animations

### LoadingAnimation
Versatile loading indicators with multiple styles.

```typescript
<LoadingAnimation
  type="spinner" // 'spinner' | 'dots' | 'pulse' | 'wave'
  size="lg" // 'sm' | 'md' | 'lg'
  color={THEME.colors.primary}
  text="Loading..."
/>
```

### ProgressAnimation
Animated progress indicators with multiple types.

```typescript
<ProgressAnimation
  progress={75}
  type="circular" // 'linear' | 'circular' | 'ring'
  size="lg"
  label="Daily Goal"
  showPercentage={true}
/>
```

---

## 🎛️ Advanced Forms

### Slider
Interactive slider with haptic feedback and step indicators.

```typescript
<Slider
  min={0}
  max={100}
  step={5}
  value={weight}
  onValueChange={setWeight}
  label="Weight"
  unit="kg"
  showValue={true}
/>
```

### DatePicker
Comprehensive date and time selection.

```typescript
<DatePicker
  value={selectedDate}
  onDateChange={setSelectedDate}
  mode="datetime" // 'date' | 'time' | 'datetime'
  label="Workout Time"
  minimumDate={new Date()}
/>
```

### MultiSelect
Advanced multi-selection with search and limits.

```typescript
<MultiSelect
  options={muscleGroups}
  selectedValues={selected}
  onSelectionChange={setSelected}
  label="Target Muscles"
  maxSelections={3}
  searchable={true}
/>
```

### RatingSelector
Interactive rating component with multiple types.

```typescript
<RatingSelector
  value={rating}
  onRatingChange={setRating}
  type="difficulty" // 'stars' | 'difficulty' | 'satisfaction' | 'intensity'
  label="Workout Difficulty"
  maxRating={5}
/>
```

---

## 🎮 Enhanced Interactions

### SwipeGesture
Swipe-to-action with customizable left and right actions.

```typescript
<SwipeGesture
  leftActions={[
    { id: 'edit', label: 'Edit', icon: '✏️', color: THEME.colors.primary, onPress: handleEdit }
  ]}
  rightActions={[
    { id: 'delete', label: 'Delete', icon: '🗑️', color: THEME.colors.error, onPress: handleDelete }
  ]}
  hapticFeedback={true}
>
  <WorkoutCard />
</SwipeGesture>
```

### PullToRefresh
Pull-to-refresh with smooth animations and haptic feedback.

```typescript
<PullToRefresh
  onRefresh={async () => await refreshData()}
  pullThreshold={80}
  hapticFeedback={true}
>
  <WorkoutList />
</PullToRefresh>
```

### LongPressMenu
Context menu with long press activation.

```typescript
<LongPressMenu
  menuItems={[
    { id: 'edit', label: 'Edit', icon: '✏️', onPress: handleEdit },
    { id: 'delete', label: 'Delete', icon: '🗑️', onPress: handleDelete, destructive: true }
  ]}
  longPressDuration={500}
  hapticFeedback={true}
>
  <ExerciseCard />
</LongPressMenu>
```

---

## 🔧 Utilities

### HapticFeedback
Centralized haptic feedback management.

```typescript
import { HapticFeedback, useHapticFeedback } from '../components/advanced';

// Class methods
HapticFeedback.light();
HapticFeedback.success();
HapticFeedback.error();

// React hook
const haptic = useHapticFeedback();
haptic.medium();
haptic.setEnabled(false);
```

---

## 🎨 Theming

All components follow the FitAI dark cosmic theme:

```typescript
import { THEME } from '../utils/constants';

// Primary colors
THEME.colors.primary      // #ff6b35 (Orange accent)
THEME.colors.secondary    // #00d4ff (Electric blue)
THEME.colors.background   // #0a0f1c (Deep dark blue)

// Usage in components
<Component style={{ backgroundColor: THEME.colors.surface }} />
```

---

## 📦 Installation & Setup

1. **Import components:**
```typescript
import { ProgressChart, Camera, Slider } from '../components/advanced';
import { WorkoutDetail } from '../screens/details';
import { LoadingAnimation } from '../components/animations';
```

2. **Install dependencies:**
```bash
npm install react-native-chart-kit react-native-svg expo-camera expo-image-picker
```

3. **Configure permissions in app.json:**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow FitAI to access your camera for food scanning and progress photos."
        }
      ]
    ]
  }
}
```

---

## 🚀 Performance Tips

1. **Use React.memo for expensive components**
2. **Implement lazy loading for large datasets**
3. **Optimize images with proper compression**
4. **Use native driver for animations**
5. **Implement proper cleanup in useEffect**

---

## 🐛 Troubleshooting

### Common Issues:

1. **Camera not working:** Check permissions in device settings
2. **Charts not rendering:** Ensure data format matches expected structure
3. **Animations stuttering:** Verify `useNativeDriver: true` is set
4. **Haptic feedback not working:** Check device vibration settings

### Debug Mode:

Enable debug logging by setting:
```typescript
__DEV__ && console.log('Component state:', componentState);
```
