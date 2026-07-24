# Diet UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Diet experience as a compact dashboard, a dedicated daily plan, and a full-screen meal detail flow matching the supplied references while preserving all existing nutrition behavior.

**Architecture:** `DietScreen` remains the state and action orchestrator. Presentation is divided among a compact header, calorie summary, action grid, full-screen plan, reusable plan card, and full-screen details; pure date/status/intake calculations move to a tested view-model module. Existing stores, hooks, scanning flows, plan generation, and nutrition calculations remain the source of truth.

**Tech Stack:** Expo 53, React Native 0.79, React 19, TypeScript 5.8, Zustand, React Native SVG, Expo Image/LinearGradient, Jest 29, Testing Library React Native.

## Global Constraints

- Preserve existing user-owned uncommitted changes; never reset, discard, or broadly reformat them.
- Do not stage or commit an existing dirty implementation file without explicit user approval. New isolated files may be checkpointed independently.
- Supported viewport width is 360–480 logical pixels plus the existing centered web phone column.
- Keep all interactive targets at least 44 × 44 logical pixels.
- Use existing nutrition/store values; never fabricate targets, progress, meal images, or schedule data.
- Use existing `imageUrl` values and a deterministic local gradient fallback when an image is missing or fails.
- Keep Scan Food, Barcode, Scan Label, Log Meal, Log Water, Recipes, offline database download, plan generation, completion, swap, and delete reachable.
- Preserve Dashboard → Plan → Detail → Plan → Dashboard navigation and Android back behavior.
- Plan and detail surfaces are opaque and cover the root bottom tab bar.
- Use the existing Aurora tokens; do not introduce a new app-wide token system or navigation library.
- Run each production change through a witnessed red/green test cycle.

---

## File Structure

**Create**

- `src/components/diet/dietViewModel.ts` — pure week, status, schedule, and intake display calculations.
- `src/components/diet/CalorieArc.tsx` — compact accessible 270-degree calorie arc.
- `src/components/diet/MealPlanCard.tsx` — reusable timeline meal card with image fallback and status treatment.
- `src/components/diet/DailyMealList.tsx` — compact logged/planned meal list shown below the core plan.
- `src/__tests__/components/diet/dietViewModel.test.ts` — pure view-model coverage.
- `src/__tests__/components/diet/DietDashboardComponents.test.tsx` — header, summary, actions, and compact banner coverage.
- `src/__tests__/components/diet/MealPlanView.test.tsx` — plan timeline, statuses, intake, and empty-state coverage.
- `src/__tests__/components/diet/MealDetailModal.test.tsx` — full-screen detail interactions and layout contract.
- `src/__tests__/screens/DietScreen.navigation.test.tsx` — dashboard/plan/detail integration coverage.

**Modify**

- `src/screens/main/DietScreen.tsx` — compose dashboard, full-screen plan, and full-screen detail states.
- `src/components/diet/DietScreenHeader.tsx` — compact Diet header/date/week navigation.
- `src/components/diet/NutritionSummaryCard.tsx` — compact calorie and three-macro dashboard card.
- `src/components/diet/DietQuickActions.tsx` — fixed two-by-three action grid.
- `src/components/DatabaseDownloadBanner.tsx` — compact dashboard banner while retaining all download states.
- `src/components/diet/MealPlanView.tsx` — dedicated plan surface with timeline, CTA, and intake card.
- `src/components/diet/MealSuggestions.tsx` — compact plan-footer cards aligned to the new visual system.
- `src/components/diet/MealDetailModal.tsx` — opaque full-screen detail experience and overflow delete action.
- `src/__tests__/components/diet/DietTouchTargets.test.tsx` — update header contract and retain minimum hit-area assertions.
- `src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx` — update copy/selectors while retaining opacity and behavior assertions.

---

### Task 1: Pure Diet View Model

**Files:**

- Create: `src/components/diet/dietViewModel.ts`
- Create: `src/__tests__/components/diet/dietViewModel.test.ts`
- Read: `src/utils/mealSchedule.ts`

**Interfaces:**

- Consumes: `MealSchedule` from `src/utils/mealSchedule.ts` and numeric progress/nutrition values from existing stores.
- Produces:

```ts
export type MealPlanStatus = "completed" | "in_progress" | "upcoming";

export interface IntakeSummary {
  consumed: number;
  target: number;
  remaining: number;
  percent: number;
}

export function getWeekDates(anchor: Date): Date[];
export function getMealPlanStatus(progress?: number | null): MealPlanStatus;
export function getMealScheduleTime(type: string, schedule: MealSchedule): string;
export function getIntakeSummary(consumed: number, target: number): IntakeSummary;
export function isSameCalendarDay(a: Date, b: Date): boolean;
```

- [ ] **Step 1: Write failing view-model tests**

```ts
import {
  getIntakeSummary,
  getMealPlanStatus,
  getMealScheduleTime,
  getWeekDates,
  isSameCalendarDay,
} from "@/components/diet/dietViewModel";

describe("dietViewModel", () => {
  it("builds a Monday-to-Sunday week containing the selected date", () => {
    const days = getWeekDates(new Date("2026-07-24T12:00:00"));
    expect(days.map((day) => day.getDate())).toEqual([20, 21, 22, 23, 24, 25, 26]);
  });

  it.each([
    [0, "upcoming"],
    [20, "in_progress"],
    [100, "completed"],
    [120, "completed"],
  ])("maps %s progress to %s", (progress, status) => {
    expect(getMealPlanStatus(progress)).toBe(status);
  });

  it("uses the matching meal time and the afternoon snack fallback", () => {
    const schedule = {
      breakfast: "7:45 AM",
      morningSnack: "10:30 AM",
      lunch: "12:00 PM",
      afternoonSnack: "3:00 PM",
      dinner: "8:00 PM",
    };
    expect(getMealScheduleTime("breakfast", schedule)).toBe("7:45 AM");
    expect(getMealScheduleTime("snack", schedule)).toBe("3:00 PM");
  });

  it("clamps intake percent but preserves over-target remaining", () => {
    expect(getIntakeSummary(1125, 1856)).toEqual({
      consumed: 1125,
      target: 1856,
      remaining: 731,
      percent: 61,
    });
    expect(getIntakeSummary(2100, 1856)).toMatchObject({ remaining: -244, percent: 100 });
  });

  it("compares local calendar dates", () => {
    expect(isSameCalendarDay(new Date(2026, 6, 24, 1), new Date(2026, 6, 24, 23))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `npx jest src/__tests__/components/diet/dietViewModel.test.ts --runInBand`

Expected: FAIL because `@/components/diet/dietViewModel` does not exist.

- [ ] **Step 3: Implement the pure helpers**

```ts
import type { MealSchedule } from "../../utils/mealSchedule";

export type MealPlanStatus = "completed" | "in_progress" | "upcoming";

export interface IntakeSummary {
  consumed: number;
  target: number;
  remaining: number;
  percent: number;
}

export const isSameCalendarDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const getWeekDates = (anchor: Date): Date[] => {
  const start = new Date(anchor);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

export const getMealPlanStatus = (progress: number | null = 0): MealPlanStatus => {
  if ((progress ?? 0) >= 100) return "completed";
  if ((progress ?? 0) > 0) return "in_progress";
  return "upcoming";
};

export const getMealScheduleTime = (type: string, schedule: MealSchedule): string => {
  if (type === "breakfast") return schedule.breakfast;
  if (type === "lunch") return schedule.lunch;
  if (type === "dinner") return schedule.dinner;
  if (type === "morning_snack") return schedule.morningSnack;
  return schedule.afternoonSnack;
};

export const getIntakeSummary = (consumed: number, target: number): IntakeSummary => ({
  consumed: Math.max(0, Math.round(consumed || 0)),
  target: Math.max(0, Math.round(target || 0)),
  remaining: Math.round((target || 0) - (consumed || 0)),
  percent: target > 0 ? Math.min(100, Math.max(0, Math.round((consumed / target) * 100))) : 0,
});
```

- [ ] **Step 4: Run the view-model tests**

Run: `npx jest src/__tests__/components/diet/dietViewModel.test.ts --runInBand`

Expected: PASS with 5 tests.

- [ ] **Step 5: Checkpoint only the two new files**

```powershell
git add -- src/components/diet/dietViewModel.ts src/__tests__/components/diet/dietViewModel.test.ts
git commit -m "test(diet): add UI view model"
```

Expected: commit includes only the two newly created files.

---

### Task 2: Compact Dashboard Header

**Files:**

- Modify: `src/components/diet/DietScreenHeader.tsx`
- Modify: `src/__tests__/components/diet/DietTouchTargets.test.tsx`
- Create: `src/__tests__/components/diet/DietDashboardComponents.test.tsx`

**Interfaces:**

- Consumes: `getWeekDates()` and `isSameCalendarDay()` from Task 1.
- Produces:

```ts
export interface DietScreenHeaderProps {
  selectedDate: Date;
  streakDays: number;
  onMenuPress: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onSelectDate: (date: Date) => void;
  onOpenPlan: (date: Date) => void;
}
```

- [ ] **Step 1: Replace the stale touch-target test with the new contract and add hierarchy tests**

```tsx
const props = {
  selectedDate: new Date("2026-07-24T12:00:00"),
  streakDays: 12,
  onMenuPress: jest.fn(),
  onPrevDay: jest.fn(),
  onNextDay: jest.fn(),
  onSelectDate: jest.fn(),
  onOpenPlan: jest.fn(),
};

const screen = render(<DietScreenHeader {...props} />);
expect(screen.getByText("Diet")).toBeTruthy();
expect(screen.getByText("12 day streak")).toBeTruthy();
expect(StyleSheet.flatten(screen.getByLabelText("Previous day").props.style)).toMatchObject({ width: 44, height: 44 });
expect(StyleSheet.flatten(screen.getByLabelText("Next day").props.style)).toMatchObject({ width: 44, height: 44 });
fireEvent.press(screen.getByLabelText("Open Friday, July 24 meal plan"));
expect(props.onOpenPlan).toHaveBeenCalledWith(expect.any(Date));
```

- [ ] **Step 2: Run the two header test files and verify failure against the old header**

Run: `npx jest src/__tests__/components/diet/DietTouchTargets.test.tsx src/__tests__/components/diet/DietDashboardComponents.test.tsx --runInBand`

Expected: FAIL because the old component lacks the menu, streak, date arrows, and `onOpenPlan` contract.

- [ ] **Step 3: Implement the compact header**

```tsx
export const DietScreenHeader = React.memo((props: DietScreenHeaderProps) => {
  const days = React.useMemo(() => getWeekDates(props.selectedDate), [props.selectedDate]);
  const openDate = (date: Date) => {
    props.onSelectDate(date);
    props.onOpenPlan(date);
  };

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <AnimatedPressable accessibilityLabel="Open diet settings" style={styles.iconButton} onPress={props.onMenuPress}>
          <Ionicons name="menu" size={20} color={colors.text} />
        </AnimatedPressable>
        <Text style={styles.title}>Diet</Text>
        <View style={styles.streak} accessibilityLabel={`${props.streakDays} day streak`}>
          <Ionicons name="flame" size={16} color={colors.primary} />
          <Text style={styles.streakText}>{props.streakDays} day streak</Text>
        </View>
      </View>
      <View style={styles.dateNavigator}>
        <AnimatedPressable accessibilityLabel="Previous day" style={styles.iconButton} onPress={props.onPrevDay}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </AnimatedPressable>
        <AnimatedPressable
          accessibilityLabel={`Open ${props.selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} meal plan`}
          style={styles.datePill}
          onPress={() => props.onOpenPlan(props.selectedDate)}
        >
          <Ionicons name="calendar-outline" size={15} color={colors.text} />
          <Text style={styles.dateText}>{props.selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </AnimatedPressable>
        <AnimatedPressable accessibilityLabel="Next day" style={styles.iconButton} onPress={props.onNextDay}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </AnimatedPressable>
      </View>
      <View style={styles.weekRow}>
        {days.map((day) => (
          <AnimatedPressable key={day.toISOString()} accessibilityLabel={`Open ${day.toDateString()} meal plan`} style={styles.dayCell} onPress={() => openDate(day)}>
            <Text style={styles.weekday}>{day.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}</Text>
            <View style={[styles.dayNumber, isSameCalendarDay(day, props.selectedDate) && styles.dayNumberSelected]}>
              <Text style={styles.dayNumberText}>{day.getDate()}</Text>
            </View>
            <View style={[styles.dayDot, isSameCalendarDay(day, props.selectedDate) && styles.dayDotSelected]} />
          </AnimatedPressable>
        ))}
      </View>
    </View>
  );
});
```

Use `paddingHorizontal: 16`, a 44 × 44 icon button, a maximum-width date pill, and seven equal `flex: 1` day cells. Do not use horizontal scrolling.

- [ ] **Step 4: Run the header tests**

Run: `npx jest src/__tests__/components/diet/DietTouchTargets.test.tsx src/__tests__/components/diet/DietDashboardComponents.test.tsx --runInBand`

Expected: PASS for header hierarchy, navigation callbacks, and target sizes.

- [ ] **Step 5: Preserve the dirty-file boundary**

Run: `git diff -- src/components/diet/DietScreenHeader.tsx src/__tests__/components/diet/DietTouchTargets.test.tsx src/__tests__/components/diet/DietDashboardComponents.test.tsx`

Expected: only intended header/test hunks; do not stage the pre-existing dirty header file.

---

### Task 3: Compact Calorie and Macro Summary

**Files:**

- Create: `src/components/diet/CalorieArc.tsx`
- Modify: `src/components/diet/NutritionSummaryCard.tsx`
- Modify: `src/__tests__/components/diet/DietDashboardComponents.test.tsx`

**Interfaces:**

```ts
export interface CalorieArcProps {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export interface NutritionSummaryCardProps {
  nutritionTargets: {
    calories: { current: number; target: number };
    protein: { current: number; target: number };
    carbs: { current: number; target: number };
    fat: { current: number; target: number };
    fiber: { current: number; target: number };
    sugar?: { current: number; target: number };
  };
  onEditGoal: () => void;
}
```

- [ ] **Step 1: Add failing summary tests**

```tsx
const view = render(
  <NutritionSummaryCard
    nutritionTargets={{
      calories: { current: 450, target: 1856 },
      protein: { current: 8, target: 185 },
      carbs: { current: 42, target: 195 },
      fat: { current: 28, target: 37 },
      fiber: { current: 5, target: 25 },
    }}
    onEditGoal={jest.fn()}
  />,
);
expect(view.getByText("Calories")).toBeTruthy();
expect(view.getByText("1,406")).toBeTruthy();
expect(view.getByText("450 / 1,856 kcal")).toBeTruthy();
expect(view.getAllByTestId("dashboard-macro")).toHaveLength(3);
expect(view.queryByText("Fiber")).toBeNull();
expect(view.getByLabelText("Edit calorie goal")).toBeTruthy();
```

- [ ] **Step 2: Run the dashboard component test and verify the old 220 px ring/vertical macro list fails the contract**

Run: `npx jest src/__tests__/components/diet/DietDashboardComponents.test.tsx --runInBand`

Expected: FAIL because `onEditGoal`, the compact calorie text, and three-column macro layout do not exist.

- [ ] **Step 3: Implement `CalorieArc` with a 270-degree track**

```tsx
const ratio = target > 0 ? Math.min(1, Math.max(0, consumed / target)) : 0;
const radius = (size - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;
const visibleLength = circumference * 0.75;

return (
  <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: target, now: consumed }} style={{ width: size, height: size }}>
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.backgroundTertiary} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={`${visibleLength} ${circumference}`} rotation="135" origin={`${size / 2}, ${size / 2}`} />
      <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={consumed > target ? colors.error : colors.primary} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={`${visibleLength * ratio} ${circumference}`} rotation="135" origin={`${size / 2}, ${size / 2}`} />
    </Svg>
    <View style={styles.center}>{children}</View>
  </View>
);
```

- [ ] **Step 4: Rebuild `NutritionSummaryCard` around the arc and three equal macro columns**

Use a `GlassCard` with `padding="md"`, an arc size near 158 px, a compact consumed/target line, a short orange consumption bar, and this macro configuration:

```ts
const macros = [
  { key: "protein", label: "Protein", icon: "barbell", color: colors.blue },
  { key: "carbs", label: "Carbs", icon: "leaf", color: colors.amberBright },
  { key: "fat", label: "Fats", icon: "water", color: colors.successBright },
] as const;
```

Each macro column must carry `testID="dashboard-macro"`, show `current / target`, percent, and a clamped progress bar. Keep the existing missing-target notice and red overflow treatment.

- [ ] **Step 5: Run the dashboard component tests**

Run: `npx jest src/__tests__/components/diet/DietDashboardComponents.test.tsx --runInBand`

Expected: PASS for calorie copy, edit action, three macros, and zero-target state.

- [ ] **Step 6: Checkpoint only the new arc file when the dirty-file policy permits**

```powershell
git add -- src/components/diet/CalorieArc.tsx
git commit -m "feat(diet): add compact calorie arc"
```

Do not stage `NutritionSummaryCard.tsx` because it was dirty before this task.

---

### Task 4: Quick-Action Grid and Compact Offline Banner

**Files:**

- Modify: `src/components/diet/DietQuickActions.tsx`
- Modify: `src/components/DatabaseDownloadBanner.tsx`
- Modify: `src/__tests__/components/diet/DietDashboardComponents.test.tsx`

**Interfaces:** Existing callbacks and download state machine remain unchanged.

- [ ] **Step 1: Add failing grid and banner tests**

```tsx
const actionCallbacks = {
  onScanFood: jest.fn(),
  onScanBarcode: jest.fn(),
  onScanLabel: jest.fn(),
  onLogMeal: jest.fn(),
  onLogWater: jest.fn(),
  onViewRecipes: jest.fn(),
};
const actions = render(<DietQuickActions {...actionCallbacks} />);
expect(actions.getAllByTestId("diet-quick-action")).toHaveLength(6);
expect(StyleSheet.flatten(actions.getByTestId("diet-quick-actions-grid").props.style)).toMatchObject({ flexDirection: "row", flexWrap: "wrap" });

const banner = render(<DatabaseDownloadBanner />);
expect(banner.getByText("Offline food database")).toBeTruthy();
expect(banner.getByLabelText("Download offline database")).toBeTruthy();
expect(banner.getByLabelText("Dismiss offline database banner")).toBeTruthy();
```

- [ ] **Step 2: Run the dashboard component test and verify failure**

Run: `npx jest src/__tests__/components/diet/DietDashboardComponents.test.tsx --runInBand`

Expected: FAIL because actions are horizontally scrolling and the banner uses the tall legacy layout/copy.

- [ ] **Step 3: Replace the action scroller with a two-by-three grid**

```tsx
<View testID="diet-quick-actions-grid" style={styles.grid}>
  {actions.map((action) => (
    <AnimatedPressable key={action.id} testID="diet-quick-action" accessibilityLabel={action.label} style={styles.action} onPress={action.onPress}>
      <Ionicons name={action.icon} size={20} color={action.color} />
      <Text numberOfLines={1} style={styles.label}>{action.label}</Text>
    </AnimatedPressable>
  ))}
</View>
```

Use `width: "31.5%"`, `minHeight: 44`, 8 px row/column gaps, dark opaque tiles, and reference-aligned icon colors. Rename the visible Recipes action to “More” while retaining `onViewRecipes`.

- [ ] **Step 4: Compact every banner state**

For the not-downloaded state, render one row containing the database icon, title/subtitle, orange Download button, and close action. Keep the existing progress bar plus Pause/Cancel for downloading, success auto-dismiss, and Retry for errors. Add these accessibility labels exactly:

```tsx
accessibilityLabel="Download offline database"
accessibilityLabel="Dismiss offline database banner"
accessibilityLabel="Pause offline database download"
accessibilityLabel="Cancel offline database download"
accessibilityLabel="Retry offline database download"
```

- [ ] **Step 5: Run component tests**

Run: `npx jest src/__tests__/components/diet/DietDashboardComponents.test.tsx --runInBand`

Expected: PASS with six fixed actions and compact banner interactions.

- [ ] **Step 6: Inspect only intended dirty-file hunks**

Run: `git diff -- src/components/diet/DietQuickActions.tsx src/components/DatabaseDownloadBanner.tsx`

Expected: layout/copy/accessibility changes only; neither existing dirty file is staged.

---

### Task 5: Dedicated Plan Timeline

**Files:**

- Create: `src/components/diet/MealPlanCard.tsx`
- Create: `src/components/diet/DailyMealList.tsx`
- Modify: `src/components/diet/MealPlanView.tsx`
- Create: `src/__tests__/components/diet/MealPlanView.test.tsx`

**Interfaces:**

```ts
export interface MealPlanCardProps {
  meal: DayMeal;
  time: string;
  status: MealPlanStatus;
  progress: number;
  onPress: () => void;
}

export interface MealPlanViewProps {
  selectedDate: Date;
  meals: DayMeal[];
  getMealProgress: (id: string) => { progress?: number } | null;
  mealSchedule: MealSchedule;
  consumedCalories: number;
  calorieTarget: number;
  loggedMealCount: number;
  onBack: () => void;
  onFilterPress: () => void;
  onMealPress: (meal: DayMeal) => void;
  onLogMeal: () => void;
  onGeneratePlan: () => void;
  isGeneratingPlan: boolean;
  footer?: React.ReactNode;
}
```

- [ ] **Step 1: Write failing plan tests**

```tsx
const makeMeal = (
  id: string,
  type: DayMeal["type"],
  name: string,
): DayMeal => ({
  id,
  type,
  name,
  description: `${name} description`,
  items: [],
  totalCalories: 450,
  totalMacros: { protein: 30, carbohydrates: 50, fat: 14, fiber: 8 },
  preparationTime: 10,
  cookingTime: 20,
  difficulty: "easy",
  tags: [],
  dayOfWeek: "Friday",
  isPersonalized: true,
  aiGenerated: true,
  createdAt: "2026-07-24T00:00:00.000Z",
});
const breakfast = makeMeal("breakfast", "breakfast", "Paneer Stuffed Moong Dal Chilla");
const lunch = makeMeal("lunch", "lunch", "Chana Masala & Stir Fry");
const snack = makeMeal("snack", "snack", "Greek Yogurt & Chia Seeds");
const dinner = makeMeal("dinner", "dinner", "Paneer Tikka Salad & Egg");
const onMealPress = jest.fn();
const baseProps: MealPlanViewProps = {
  selectedDate: new Date("2026-07-24T12:00:00"),
  meals: [],
  getMealProgress: (id) => ({
    progress: id === "breakfast" ? 100 : id === "lunch" ? 35 : 0,
  }),
  mealSchedule: {
    breakfast: "7:45 AM",
    morningSnack: "10:30 AM",
    lunch: "12:00 PM",
    afternoonSnack: "3:00 PM",
    dinner: "8:00 PM",
  },
  consumedCalories: 1125,
  calorieTarget: 1856,
  loggedMealCount: 2,
  onBack: jest.fn(),
  onFilterPress: jest.fn(),
  onMealPress,
  onLogMeal: jest.fn(),
  onGeneratePlan: jest.fn(),
  isGeneratingPlan: false,
};
const view = render(<MealPlanView {...baseProps} meals={[breakfast, lunch, snack, dinner]} />);
expect(view.getByText("Today's Plan")).toBeTruthy();
expect(view.getAllByTestId("meal-plan-card")).toHaveLength(4);
expect(view.getByText("7:45 AM")).toBeTruthy();
expect(view.getByText("Completed")).toBeTruthy();
expect(view.getByText("In Progress")).toBeTruthy();
expect(view.getByText("Upcoming")).toBeTruthy();
expect(view.getByText("Today's Intake")).toBeTruthy();
expect(view.getByText("61%")).toBeTruthy();
fireEvent.press(view.getByLabelText(`Open ${breakfast.name}`));
expect(onMealPress).toHaveBeenCalledWith(breakfast);
```

Add an empty-state case asserting “No meals planned” and a working “Generate Plan” action.

- [ ] **Step 2: Run the plan test and verify failure against the current card-only section**

Run: `npx jest src/__tests__/components/diet/MealPlanView.test.tsx --runInBand`

Expected: FAIL because the current component lacks the dedicated header, image cards, intake summary, and new interface.

- [ ] **Step 3: Implement `MealPlanCard`**

```tsx
const statusConfig = {
  completed: { label: "Completed", color: colors.success, background: `${colors.success}20` },
  in_progress: { label: "In Progress", color: colors.info, background: `${colors.info}20` },
  upcoming: { label: "Upcoming", color: colors.purple, background: `${colors.purple}20` },
} as const;

const MealImage = ({ uri, name, type }: { uri?: string; name: string; type: DayMeal["type"] }) => {
  const [failed, setFailed] = React.useState(false);
  if (!uri || failed) {
    return (
      <LinearGradient colors={["#172237", "#0E1728"]} style={styles.image}>
        <Text style={styles.imageInitial}>{name.charAt(0).toUpperCase()}</Text>
        <Ionicons name={type === "breakfast" ? "sunny" : type === "dinner" ? "moon" : "restaurant"} size={20} color={colors.primary} />
      </LinearGradient>
    );
  }
  return <Image source={{ uri }} style={styles.image} resizeMode="cover" onError={() => setFailed(true)} accessibilityLabel={`${name} meal`} />;
};

return (
  <Pressable testID="meal-plan-card" accessibilityLabel={`Open ${meal.name}`} style={styles.card} onPress={onPress}>
    <MealImage uri={meal.imageUrl} name={meal.name} type={meal.type} />
    <View style={styles.content}>
      <View style={styles.topLine}>
        <Text style={styles.type}>{meal.type}</Text>
        <View style={[styles.badge, { backgroundColor: config.background }]}><Text style={{ color: config.color }}>{config.label}</Text></View>
      </View>
      <Text numberOfLines={2} style={styles.name}>{meal.name}</Text>
      <Text style={styles.macros}>{Math.round(meal.totalCalories)} kcal · <Text style={{ color: colors.blue }}>{Math.round(protein)}P</Text> · <Text style={{ color: colors.amberBright }}>{Math.round(carbs)}C</Text> · <Text style={{ color: colors.successBright }}>{Math.round(fat)}F</Text></Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
  </Pressable>
);
```

Keep `MealImage` private to `MealPlanCard.tsx`; the exact `onError` branch above guarantees the same dimensions for real and fallback imagery.

- [ ] **Step 4: Rebuild `MealPlanView` as an opaque safe-area screen**

Render a compact header, chronological timeline with fixed time rail, `MealPlanCard` rows, full-width orange log CTA, and intake card using `getIntakeSummary`. Render `footer` after the intake card. Use a `ScrollView` with `contentContainerStyle={{ paddingBottom: 32 }}` and no nested vertical scroll views.

- [ ] **Step 5: Implement `DailyMealList`**

```tsx
export const DailyMealList = ({ title, meals, status }: Props) => (
  <View style={styles.section}>
    <Text style={styles.title}>{title}</Text>
    {meals.map((meal) => (
      <View key={meal.id} style={styles.row}>
        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.name}>{meal.name || meal.type}</Text>
          <Text style={styles.macros}>{Math.round(meal.totalCalories || 0)} kcal · {Math.round(meal.totalMacros?.protein || 0)}P · {Math.round(meal.totalMacros?.carbohydrates || 0)}C · {Math.round(meal.totalMacros?.fat || 0)}F</Text>
        </View>
        <Text style={status === "logged" ? styles.logged : styles.planned}>{status === "logged" ? "Logged" : "Planned"}</Text>
      </View>
    ))}
  </View>
);
```

- [ ] **Step 6: Run plan tests**

Run: `npx jest src/__tests__/components/diet/MealPlanView.test.tsx --runInBand`

Expected: PASS for ordering, schedule labels, status variants, CTA, intake, navigation, and empty state.

- [ ] **Step 7: Checkpoint only newly created files**

```powershell
git add -- src/components/diet/MealPlanCard.tsx src/components/diet/DailyMealList.tsx src/__tests__/components/diet/MealPlanView.test.tsx
git commit -m "feat(diet): add plan timeline cards"
```

Do not stage the pre-existing dirty `MealPlanView.tsx`.

---

### Task 6: Full-Screen Meal Details

**Files:**

- Modify: `src/components/diet/MealDetailModal.tsx`
- Create: `src/__tests__/components/diet/MealDetailModal.test.tsx`
- Modify: `src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx`

**Interfaces:** Preserve the existing `MealDetailModalProps` callback signatures.

- [ ] **Step 1: Write failing detail-screen tests**

```tsx
const meal: DayMeal = {
  id: "meal-1",
  type: "breakfast",
  name: "Paneer Stuffed Moong Dal Chilla",
  description: "Protein-rich breakfast",
  items: [],
  totalCalories: 640,
  totalMacros: { protein: 77, carbohydrates: 40, fat: 18, fiber: 5 },
  preparationTime: 20,
  cookingTime: 20,
  difficulty: "easy",
  tags: [],
  dayOfWeek: "Friday",
  isPersonalized: true,
  aiGenerated: true,
  createdAt: "2026-07-24T00:00:00.000Z",
};
const onClose = jest.fn();
const onComplete = jest.fn();
const onDelete = jest.fn();
const onSwap = jest.fn();
const view = render(
  <MealDetailModal
    visible
    meal={meal}
    onClose={onClose}
    onMarkComplete={onComplete}
    onDelete={onDelete}
    onSwap={onSwap}
  />,
);

expect(view.getByText("Meal Details")).toBeTruthy();
expect(view.getAllByTestId("nutrition-stat")).toHaveLength(5);
expect(view.getAllByTestId("meal-meta-tile")).toHaveLength(3);
expect(view.getByText("Ingredients")).toBeTruthy();
expect(view.getByText("Mark as Completed")).toBeTruthy();
fireEvent.press(view.getByText("Mark as Completed"));
expect(onComplete).toHaveBeenCalledWith(meal);
fireEvent.press(view.getByText("Swap This Meal"));
expect(onSwap).toHaveBeenCalledWith(meal);
```

Add tests for default-open ingredients, accordion toggling, image error fallback, overflow menu visibility, delete confirmation, and back action.

- [ ] **Step 2: Run detail tests and verify failure**

Run: `npx jest src/__tests__/components/diet/MealDetailModal.test.tsx src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx --runInBand`

Expected: FAIL because the current sheet lacks the full-screen header/overflow contract and old tests use obsolete “Mark Complete”/“Delete” selectors.

- [ ] **Step 3: Replace the bottom sheet with an opaque full-screen modal**

```tsx
<Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
  <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
    <View style={styles.header}>
      <Pressable accessibilityLabel="Back to meal plan" style={styles.headerButton} onPress={onClose}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
      <Text style={styles.headerTitle}>Meal Details</Text>
      <Pressable accessibilityLabel="Open meal actions" style={styles.headerButton} onPress={() => setActionsOpen(true)}><Ionicons name="ellipsis-vertical" size={20} color={colors.text} /></Pressable>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>{renderMealImage()}</View>
      <View style={styles.identityRow}>{renderMealTypeAndStatus()}</View>
      <View style={styles.titleRow}>{renderMealTitleAndBookmark()}</View>
      <View style={styles.nutritionRow}>{nutritionStats.map(renderNutritionStat)}</View>
      <View style={styles.metaRow}>{metaTiles.map(renderMetaTile)}</View>
      <View style={styles.accordions}>{renderAccordions()}</View>
    </ScrollView>
    <View style={styles.actions}>
      {renderCompletionAction()}
      {onSwap ? renderSwapAction() : null}
    </View>
  </SafeAreaView>
</Modal>
```

Define `renderMealImage`, `renderMealTypeAndStatus`, `renderMealTitleAndBookmark`, `renderNutritionStat`, `renderMetaTile`, `renderAccordions`, `renderCompletionAction`, and `renderSwapAction` as local render functions in `MealDetailModal.tsx`; each function returns the existing data-backed content for the named region and reuses the style keys shown above.

Use `backgroundColor: colors.background` for the screen and `colors.backgroundSecondary` for cards. The hero image uses 16 px gutters, a 16 px radius, and an image-error fallback. Add exactly five `testID="nutrition-stat"` cells and three `testID="meal-meta-tile"` cells.

- [ ] **Step 4: Preserve delete through the overflow menu**

```tsx
{actionsOpen ? (
  <Pressable accessibilityLabel="Delete meal" style={styles.deleteAction} onPress={confirmDelete}>
    <Ionicons name="trash-outline" size={18} color={colors.error} />
    <Text style={styles.deleteText}>Delete Meal</Text>
  </Pressable>
) : null}
```

`confirmDelete` must use `crossPlatformAlert("Delete Meal", ...)` and call `onDelete(meal)` only from the destructive confirmation action.

- [ ] **Step 5: Implement reference-aligned accordions and sticky actions**

Keep Ingredients open by default. Add right-side summaries (“4 items”, “Step by step”, “How to make”) and the Nutrition Insights “New” badge. Use green for “Mark as Completed” and a dark secondary full-width button for swap. When completed, render a green completed state without removing the swap action.

- [ ] **Step 6: Run detail and opacity tests**

Run: `npx jest src/__tests__/components/diet/MealDetailModal.test.tsx src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx --runInBand`

Expected: PASS for opacity, back, completion, swap, delete, accordions, and nutrition/meta counts.

- [ ] **Step 7: Inspect the dirty detail diff without staging it**

Run: `git diff -- src/components/diet/MealDetailModal.tsx src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx`

Expected: only the approved detail redesign and selector updates.

---

### Task 7: Diet Screen Composition and Navigation

**Files:**

- Modify: `src/screens/main/DietScreen.tsx`
- Modify: `src/components/diet/MealSuggestions.tsx`
- Create: `src/__tests__/screens/DietScreen.navigation.test.tsx`

**Interfaces:** Consumes the component contracts from Tasks 2–6 and existing `useAchievementStore.currentStreak`.

- [ ] **Step 1: Write the failing navigation integration test**

Mock data hooks and heavy child modals, but use real `DietScreenHeader`, `MealPlanView`, and `MealDetailModal` contracts. Assert this sequence:

```tsx
const view = render(<DietScreen navigation={navigation} route={{}} />);
expect(view.getByText("Diet")).toBeTruthy();
expect(view.queryByText("Today's Plan")).toBeNull();

fireEvent.press(view.getByLabelText(/Open .* meal plan/));
expect(view.getByText("Today's Plan")).toBeTruthy();
expect(view.queryByTestId("main-diet-dashboard")).toBeNull();

fireEvent.press(view.getByLabelText(`Open ${meal.name}`));
expect(view.getByText("Meal Details")).toBeTruthy();

fireEvent.press(view.getByLabelText("Back to meal plan"));
expect(view.getByText("Today's Plan")).toBeTruthy();

fireEvent.press(view.getByLabelText("Back to diet dashboard"));
expect(view.getByTestId("main-diet-dashboard")).toBeTruthy();
```

- [ ] **Step 2: Run the navigation test and verify failure**

Run: `npx jest src/__tests__/screens/DietScreen.navigation.test.tsx --runInBand`

Expected: FAIL because the current screen renders dashboard, plan, logged meals, suggestions, and CTA in one scroll.

- [ ] **Step 3: Add explicit plan state and navigation callbacks**

```ts
const [showPlanView, setShowPlanView] = useState(false);
const streakDays = useAchievementStore((state) => state.currentStreak);

const handleOpenPlan = useCallback((date: Date) => {
  setSelectedDate(date);
  setShowPlanView(true);
}, [setSelectedDate]);

const handleClosePlan = useCallback(() => setShowPlanView(false), []);
const handleOpenSettings = useCallback(() => navigation?.navigate("Settings"), [navigation]);
const handleEditGoal = useCallback(
  () => navigation?.navigate("Settings", { screen: "goals" }),
  [navigation],
);
const handlePlanOptions = useCallback(() => {
  crossPlatformAlert("Plan options", "Choose how to update your meal plan.", [
    { text: "Refresh plan", onPress: onGenerateWeeklyPlan },
    { text: "Diet preferences", onPress: handleEditGoal },
    { text: "Cancel", style: "cancel" },
  ]);
}, [handleEditGoal, onGenerateWeeklyPlan]);
```

Pass `handleOpenPlan` to `DietScreenHeader`. Keep arrows wired only to `shiftSelectedDate`. Wire menu to `navigation?.navigate("Settings")` and Edit Goal to `navigation?.navigate("Settings", { screen: "goals" })`.

- [ ] **Step 4: Reduce the root dashboard composition**

The root `ScrollView` must render only:

```tsx
<View testID="main-diet-dashboard">
  <DietScreenHeader
    selectedDate={selectedDate}
    streakDays={streakDays}
    onMenuPress={handleOpenSettings}
    onPrevDay={onPrevDay}
    onNextDay={onNextDay}
    onSelectDate={onSelectDate}
    onOpenPlan={handleOpenPlan}
  />
  {foodsLoading ? (
    <View style={styles.loadingContainer}>
      <AuroraSpinner size="sm" theme="primary" />
      <Text style={styles.loadingText}>Loading nutrition data...</Text>
    </View>
  ) : foodsError ? (
    <GlassCard style={styles.errorCard} elevation={1} padding="md">
      <Text style={styles.errorText}>{typeof foodsError === "string" ? foodsError : "Failed to load nutrition data"}</Text>
      <Button title="Retry" onPress={() => refreshAll()} size="sm" />
    </GlassCard>
  ) : null}
  <NutritionSummaryCard nutritionTargets={nutritionTargets} onEditGoal={handleEditGoal} />
  <DietQuickActions
    onScanFood={handleScanFood}
    onScanBarcode={handleShowBarcodeOptions}
    onScanLabel={handleStartLabelScan}
    onLogMeal={handleSearchFood}
    onLogWater={handleShowWaterIntake}
    onViewRecipes={handleShowCreateRecipe}
  />
  <DatabaseDownloadBanner />
</View>
```

Remove the root-level `MealPlanView`, daily meal sections, `MealSuggestions`, duplicate CTA, and 80 px compensating spacer.

- [ ] **Step 5: Render the plan in a full-screen modal**

```tsx
<Modal visible={showPlanView} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClosePlan}>
  <MealPlanView
    selectedDate={selectedDate}
    meals={todaysMeals}
    getMealProgress={storeGetMealProgress}
    mealSchedule={mealSchedule}
    consumedCalories={nutritionTargets.calories.current}
    calorieTarget={nutritionTargets.calories.target}
    loggedMealCount={todaysConsumedMeals.length}
    onBack={handleClosePlan}
    onFilterPress={handlePlanOptions}
    onMealPress={handleMealCardPress}
    onLogMeal={handleSearchFood}
    onGeneratePlan={onGenerateWeeklyPlan}
    isGeneratingPlan={isGeneratingPlan}
    footer={
      <>
        {todaysConsumedMeals.length > 0 ? <DailyMealList title="Today's Logged Meals" meals={todaysConsumedMeals} status="logged" /> : null}
        {todaysPlannedSuggestionMeals.length > 0 ? <DailyMealList title="Today's Planned Suggestions" meals={todaysPlannedSuggestionMeals} status="planned" /> : null}
        <MealSuggestions />
      </>
    }
  />
</Modal>
```

Keep `MealDetailModal` mounted after the plan modal so it appears above the plan and closes back to it.

- [ ] **Step 6: Compact `MealSuggestions` for the plan footer**

Keep its dietary filtering, add/log logic, and swipe dismissal unchanged. Reduce card width/height, use opaque surfaces, keep two-line names, use semantic macro colors, and guarantee 44 px Add/Log targets. Do not reintroduce suggestions on the dashboard.

- [ ] **Step 7: Run navigation and existing Diet flow tests**

Run: `npx jest src/__tests__/screens/DietScreen.navigation.test.tsx src/__tests__/screens/DietScreen.labelCameraFlow.test.tsx src/__tests__/screens/DietScreen.barcodeWeakData.test.tsx --runInBand`

Expected: PASS for the new view hierarchy and the existing label/barcode flows.

- [ ] **Step 8: Verify Android back order in component logic**

Add or extend a test so `onRequestClose` closes Detail before Plan and Plan before returning to Dashboard. Run the navigation test again and expect PASS.

- [ ] **Step 9: Inspect both overlapping dirty files without staging**

Run: `git diff -- src/screens/main/DietScreen.tsx src/components/diet/MealSuggestions.tsx`

Expected: approved UI composition and styling changes only; business-flow handlers remain intact.

---

### Task 8: Regression, Static Analysis, and Visual Verification

**Files:**

- Verify all files listed above.
- Update: `docs/superpowers/plans/2026-07-24-diet-ui-overhaul.md` checkboxes only after commands succeed.

**Interfaces:** No new production interfaces.

- [ ] **Step 1: Run the focused Diet component suite**

Run:

```powershell
npx jest src/__tests__/components/diet/dietViewModel.test.ts src/__tests__/components/diet/DietDashboardComponents.test.tsx src/__tests__/components/diet/DietTouchTargets.test.tsx src/__tests__/components/diet/MealPlanView.test.tsx src/__tests__/components/diet/MealDetailModal.test.tsx src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx src/__tests__/screens/DietScreen.navigation.test.tsx --runInBand
```

Expected: all focused suites pass with zero failing tests.

- [ ] **Step 2: Run existing Diet regressions**

Run:

```powershell
npx jest src/__tests__/screens/DietScreen.labelCameraFlow.test.tsx src/__tests__/screens/DietScreen.barcodeWeakData.test.tsx src/__tests__/stores/nutritionStore.test.ts src/__tests__/utils/mealLogNutrition.test.ts --runInBand
```

Expected: all existing Diet, store, and nutrition tests pass.

- [ ] **Step 3: Run TypeScript**

Run: `npm run type-check`

Expected: exit code 0. If unrelated baseline errors exist, record their exact file/line output and separately run a touched-file TypeScript check before claiming success.

- [ ] **Step 4: Run targeted lint**

Run:

```powershell
npx eslint src/screens/main/DietScreen.tsx src/components/diet/DietScreenHeader.tsx src/components/diet/CalorieArc.tsx src/components/diet/NutritionSummaryCard.tsx src/components/diet/DietQuickActions.tsx src/components/diet/MealPlanCard.tsx src/components/diet/DailyMealList.tsx src/components/diet/MealPlanView.tsx src/components/diet/MealSuggestions.tsx src/components/diet/MealDetailModal.tsx src/components/DatabaseDownloadBanner.tsx
```

Expected: zero errors in touched production files.

- [ ] **Step 5: Start the app for visual inspection**

Run: `npm run web -- --port 8081`

Expected: Expo serves the app at `http://localhost:8081` without a compile error.

- [ ] **Step 6: Capture reference-sized states**

Using the in-app browser, inspect at 393 × 852 and 360 × 800:

1. Dashboard with nutrition data and offline banner.
2. Today’s Plan with four meals and mixed statuses.
3. Meal Details with a real image.
4. Meal Details with image failure fallback.
5. Empty plan state.
6. Zero-target state.

Save screenshots under `qa-screenshots/diet-ui-overhaul/` with descriptive filenames. The captures must show no horizontal clipping, transparent surfaces, status collisions, hidden actions, or content beneath safe areas.

- [ ] **Step 7: Compare against all 76 acceptance checks**

Read `docs/superpowers/specs/2026-07-24-diet-ui-overhaul-design.md` and mark each check as verified, failed, or not applicable with an evidence screenshot/test name. Fix every failed applicable check before continuing.

- [ ] **Step 8: Inspect the final repository diff**

Run: `git status --short` and `git diff --check`.

Expected: no whitespace errors; all unrelated pre-existing changes remain present and untouched.

- [ ] **Step 9: Report the dirty-worktree boundary**

List newly created files, modified pre-existing dirty files, verification results, and any baseline failures. Do not stage or commit overlapping dirty implementation files without explicit user approval.

---

## Plan Self-Review Results

- **Spec coverage:** Dashboard, plan, detail, loading/empty/error states, images, accessibility, responsiveness, preserved actions, and all 76 acceptance checks map to Tasks 1–8.
- **Type consistency:** `MealPlanStatus`, `IntakeSummary`, `DietScreenHeaderProps`, `MealPlanCardProps`, and `MealPlanViewProps` use the same names and shapes in producers and consumers.
- **Dirty-worktree safety:** New files may be checkpointed independently; the plan explicitly prevents staging or committing pre-existing dirty Diet implementation files.
- **Scope:** The plan changes Diet presentation and local orchestration only. Nutrition formulas, APIs, stores, workers, non-Diet tabs, and the navigation library remain out of scope.
