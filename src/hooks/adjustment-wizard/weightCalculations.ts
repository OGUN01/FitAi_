import { Alternative, CurrentData } from "./types";

export const calculateWeightRateAlternatives = (
  data: CurrentData,
  isWeightLoss: boolean,
  isWeightGain: boolean,
  hasMuscleGoal: boolean,
  safeOptimalRate: number,
  safeMaxRate: number,
): Alternative[] => {
  const {
    bmr,
    tdee,
    currentWeight,
    targetWeight,
    currentTimeline,
    currentFrequency,
  } = data;
  const weightDiff = Math.abs(targetWeight - currentWeight);
  const alternatives: Alternative[] = [];

  const optimalWeeks = Math.ceil(weightDiff / safeOptimalRate);
  const optimalDeficit = (safeOptimalRate * 7700) / 7;
  const optimalCalories = isWeightLoss
    ? Math.max(Math.round(tdee - optimalDeficit), bmr)
    : Math.round(tdee + optimalDeficit);

  alternatives.push({
    name: "Extend Timeline",
    icon: "calendar-outline",
    iconColor: "#3B82F6",
    goalType: isWeightLoss ? "weight-loss" : "weight-gain",
    newTimeline: optimalWeeks,
    dailyCalories: optimalCalories,
    newWorkoutFrequency: currentFrequency,
    weeklyRate: safeOptimalRate,
    newProteinTarget: hasMuscleGoal
      ? Math.round(currentWeight * 2.2)
      : Math.round(currentWeight * 1.6),
    approach: isWeightLoss
      ? "More time, less restriction, same exercise"
      : hasMuscleGoal
        ? "Gradual lean bulk for quality muscle"
        : "Gradual, sustainable weight gain",
    pros: [
      "Easiest to maintain",
      isWeightLoss ? "Preserves muscle mass" : "Lean muscle gains",
      hasMuscleGoal ? "Better strength progression" : "No lifestyle changes",
      "Most sustainable",
    ],
    cons: [
      "Takes longer",
      `+${Math.max(0, optimalWeeks - currentTimeline)} extra weeks`,
    ],
  });

  const aggressiveWeeks = Math.ceil(weightDiff / safeMaxRate);
  const aggressiveDeficit = (safeMaxRate * 7700) / 7;
  const caloriesPerSession = 300;
  const additionalSessionsNeeded = Math.ceil(
    (aggressiveDeficit * 0.4) / (caloriesPerSession / 7),
  );
  const newFrequency = Math.min(currentFrequency + additionalSessionsNeeded, 7);

  const exerciseCalories = isWeightLoss
    ? Math.max(Math.round(tdee - aggressiveDeficit * 0.6), bmr)
    : Math.round(tdee + aggressiveDeficit * 0.6);

  alternatives.push({
    name: hasMuscleGoal ? "Add Strength Training" : "Add Exercise",
    icon: "barbell-outline",
    iconColor: "#FF8A5C",
    goalType: hasMuscleGoal
      ? "muscle-gain"
      : isWeightLoss
        ? "weight-loss"
        : "weight-gain",
    newTimeline: aggressiveWeeks,
    dailyCalories: exerciseCalories,
    newWorkoutFrequency: newFrequency,
    newStrengthSessions: hasMuscleGoal
      ? Math.min(newFrequency, 5)
      : Math.ceil(newFrequency * 0.6),
    newCardioMinutes: isWeightLoss ? 150 : 90,
    weeklyRate: safeMaxRate,
    newProteinTarget: hasMuscleGoal
      ? Math.round(currentWeight * 2.4)
      : Math.round(currentWeight * 2.0),
    approach: isWeightLoss
      ? "More activity, moderate diet"
      : hasMuscleGoal
        ? "Strength focus with controlled surplus"
        : "Active weight gain approach",
    pros: [
      "Faster results",
      "Eat more food",
      hasMuscleGoal ? "Build muscle while achieving goal" : "Fitness gains",
      "Better metabolism",
    ],
    cons: ["More time commitment", `${newFrequency}× workouts/week`],
  });

  const balancedRate = currentWeight * 0.0085;
  const balancedWeeks = Math.ceil(weightDiff / balancedRate);
  const balancedDeficit = (balancedRate * 7700) / 7;

  const balancedCalories = isWeightLoss
    ? Math.max(Math.round(tdee - balancedDeficit), bmr)
    : Math.round(tdee + balancedDeficit);

  alternatives.push({
    name: "Balanced Approach",
    icon: "options-outline",
    iconColor: "#10B981",
    goalType: "general-fitness",
    newTimeline: balancedWeeks,
    dailyCalories: balancedCalories,
    newWorkoutFrequency: Math.min(currentFrequency + 1, 7),
    newStrengthSessions: 3,
    newCardioMinutes: 120,
    weeklyRate: balancedRate,
    newProteinTarget: Math.round(currentWeight * 2.0),
    approach: "Moderate diet + moderate exercise",
    pros: [
      "Well-rounded",
      "Not too restrictive",
      "Reasonable time",
      "Sustainable",
    ],
    cons: ["Middle ground"],
  });

  const achievableWeightChange = safeOptimalRate * currentTimeline;
  const newTargetWeight = isWeightLoss
    ? currentWeight - achievableWeightChange
    : currentWeight + achievableWeightChange;

  const targetCalories = isWeightLoss
    ? Math.max(Math.round(tdee - (safeOptimalRate * 7700) / 7), bmr)
    : Math.round(tdee + (safeOptimalRate * 7700) / 7);

  alternatives.push({
    name: "Adjust Goal",
    icon: "flag-outline",
    iconColor: "#F59E0B",
    goalType: isWeightLoss ? "weight-loss" : "weight-gain",
    newTimeline: currentTimeline,
    newTargetWeight: Math.round(newTargetWeight * 10) / 10,
    dailyCalories: targetCalories,
    newWorkoutFrequency: currentFrequency,
    weeklyRate: safeOptimalRate,
    newProteinTarget: Math.round(currentWeight * 1.8),
    approach: `Achieve ${Math.round(newTargetWeight)}kg in your timeframe`,
    pros: ["Keep your timeline", "Still good progress", "Sustainable pace"],
    cons: [
      `${Math.abs(targetWeight - newTargetWeight).toFixed(1)}kg less change`,
    ],
  });

  return alternatives;
};

export const calculateExerciseAlternatives = (
  data: CurrentData,
  isWeightLoss: boolean,
  hasMuscleGoal: boolean,
  hasEnduranceGoal: boolean,
  safeOptimalRate: number,
): Alternative[] => {
  const {
    bmr,
    tdee,
    currentWeight,
    targetWeight,
    currentTimeline,
    currentFrequency,
  } = data;
  const alternatives: Alternative[] = [];

  alternatives.push({
    name: "Add Strength Training",
    icon: "barbell-outline",
    iconColor: "#FF8A5C",
    goalType: "strength",
    newWorkoutFrequency: Math.min(currentFrequency + 3, 6),
    newStrengthSessions: 4,
    newCardioMinutes: 60,
    dailyCalories: tdee,
    weeklyRate: safeOptimalRate,
    newProteinTarget: Math.round(currentWeight * 2.2),
    newIntensity: "intermediate",
    approach: "Focus on progressive resistance training",
    pros: [
      "Build muscle",
      "Boost metabolism",
      "Increase strength",
      "Better body composition",
    ],
    cons: ["Requires gym access or equipment", "4× strength sessions/week"],
  });

  alternatives.push({
    name: hasEnduranceGoal ? "Cardio Focus" : "Add Cardio",
    icon: "heart-outline",
    iconColor: "#EF4444",
    goalType: "endurance",
    newWorkoutFrequency: Math.min(currentFrequency + 3, 6),
    newStrengthSessions: 2,
    newCardioMinutes: 200,
    dailyCalories: isWeightLoss ? Math.round(tdee * 0.85) : tdee,
    weeklyRate: safeOptimalRate,
    newProteinTarget: Math.round(currentWeight * 1.8),
    approach: hasEnduranceGoal
      ? "Build cardio endurance progressively"
      : "Add cardio for calorie burn",
    pros: [
      "Burn more calories",
      "Improve heart health",
      "Better endurance",
      "Can be done anywhere",
    ],
    cons: ["Time consuming", "200+ min cardio/week"],
  });

  alternatives.push({
    name: "Mixed Training",
    icon: "fitness-outline",
    iconColor: "#10B981",
    goalType: "general-fitness",
    newWorkoutFrequency: Math.min(currentFrequency + 2, 5),
    newStrengthSessions: 3,
    newCardioMinutes: 120,
    newWorkoutTypes: ["strength", "cardio", "hiit"],
    dailyCalories: isWeightLoss ? Math.round(tdee * 0.9) : tdee,
    weeklyRate: safeOptimalRate,
    newProteinTarget: Math.round(currentWeight * 2.0),
    approach: "Balanced strength and cardio program",
    pros: [
      "All-round fitness",
      "Variety keeps it interesting",
      "Balanced results",
      "Flexible schedule",
    ],
    cons: ["Jack of all trades", "Slower specific gains"],
  });

  const weightDiff = Math.abs(targetWeight - currentWeight);
  const optimalWeeks = Math.ceil(weightDiff / safeOptimalRate);

  alternatives.push({
    name: "Extend Timeline Instead",
    icon: "calendar-outline",
    iconColor: "#3B82F6",
    goalType: isWeightLoss ? "weight-loss" : "weight-gain",
    newTimeline: optimalWeeks,
    newWorkoutFrequency: currentFrequency,
    dailyCalories: isWeightLoss
      ? Math.round(tdee * 0.85)
      : Math.round(tdee * 1.1),
    weeklyRate: safeOptimalRate,
    newProteinTarget: Math.round(currentWeight * 1.8),
    approach: "Keep current exercise, extend time for results",
    pros: [
      "No extra workouts needed",
      "Less lifestyle change",
      "Still achievable",
      "Lower commitment",
    ],
    cons: [
      "Takes longer",
      `+${Math.max(0, optimalWeeks - currentTimeline)} extra weeks`,
    ],
  });

  return alternatives;
};

export const calculateTrainingReductionAlternatives = (
  data: CurrentData,
  isWeightLoss: boolean,
): Alternative[] => {
  const {
    bmr,
    tdee,
    currentWeight,
    targetWeight,
    currentTimeline,
    currentFrequency,
  } = data;
  const alternatives: Alternative[] = [];
  const safeOptimalRate = currentWeight * 0.0075;

  alternatives.push({
    name: "Reduce Frequency",
    icon: "remove-circle-outline",
    iconColor: "#F59E0B",
    goalType: "general-fitness",
    newWorkoutFrequency: Math.max(currentFrequency - 2, 3),
    newStrengthSessions: 3,
    newCardioMinutes: 90,
    dailyCalories: tdee,
    weeklyRate: safeOptimalRate,
    newProteinTarget: Math.round(currentWeight * 2.0),
    approach: "Fewer sessions, better recovery",
    pros: [
      "Better recovery",
      "Reduce burnout risk",
      "More sustainable",
      "Quality over quantity",
    ],
    cons: ["Slightly slower progress", "Fewer workout days"],
  });

  alternatives.push({
    name: "Lower Intensity",
    icon: "speedometer-outline",
    iconColor: "#3B82F6",
    goalType: "general-fitness",
    newWorkoutFrequency: currentFrequency,
    newIntensity: "intermediate",
    newStrengthSessions: Math.ceil(currentFrequency * 0.5),
    dailyCalories: tdee,
    weeklyRate: safeOptimalRate,
    newProteinTarget: Math.round(currentWeight * 1.8),
    approach: "Same frequency, easier sessions",
    pros: [
      "Keep your routine",
      "Less fatigue",
      "Sustainable long-term",
      "Lower injury risk",
    ],
    cons: ["May feel too easy initially", "Slower strength gains"],
  });

  alternatives.push({
    name: "Add Recovery Days",
    icon: "bed-outline",
    iconColor: "#10B981",
    goalType: "general-fitness",
    newWorkoutFrequency: Math.max(currentFrequency - 1, 4),
    newStrengthSessions: 3,
    newCardioMinutes: 60,
    newMobilitySessions: 2,
    dailyCalories: tdee,
    weeklyRate: safeOptimalRate,
    newProteinTarget: Math.round(currentWeight * 2.0),
    approach: "Include active recovery and mobility",
    pros: [
      "Better muscle repair",
      "Improved flexibility",
      "Reduce overtraining",
      "Mental break",
    ],
    cons: ["Feels like less work", "2 recovery sessions/week"],
  });

  alternatives.push({
    name: "Add Deload Weeks",
    icon: "analytics-outline",
    iconColor: "#FF8A5C",
    goalType: "strength",
    newWorkoutFrequency: currentFrequency,
    newStrengthSessions: Math.ceil(currentFrequency * 0.6),
    dailyCalories: tdee,
    weeklyRate: safeOptimalRate,
    newProteinTarget: Math.round(currentWeight * 2.0),
    approach: "Periodized training with planned easy weeks",
    pros: [
      "Professional approach",
      "Prevents plateaus",
      "Sustainable progress",
      "Better long-term gains",
    ],
    cons: ["Requires planning", "Deload every 4-6 weeks"],
  });

  return alternatives;
};
