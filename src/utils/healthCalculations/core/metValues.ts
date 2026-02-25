// MET Values - Single Source of Truth
// Formula: Calories = MET × weight(kg) × duration(hours)

export const MET_VALUES: Record<string, Record<string, number>> = {
  beginner: {
    strength: 3.5,
    cardio: 5.0,
    sports: 4.5,
    yoga: 2.5,
    hiit: 6.0,
    pilates: 3.0,
    flexibility: 2.5,
    functional: 4.0,
    mixed: 4.0,
  },
  intermediate: {
    strength: 5.0,
    cardio: 7.0,
    sports: 6.5,
    yoga: 3.5,
    hiit: 8.0,
    pilates: 4.5,
    flexibility: 3.0,
    functional: 6.0,
    mixed: 6.0,
  },
  advanced: {
    strength: 6.5,
    cardio: 9.0,
    sports: 8.5,
    yoga: 4.5,
    hiit: 10.0,
    pilates: 6.0,
    flexibility: 4.0,
    functional: 7.5,
    mixed: 7.5,
  },
};

export function getMETValue(intensity: string, workoutType: string): number {
  return (
    MET_VALUES[intensity]?.[workoutType] || MET_VALUES[intensity]?.mixed || 5.0
  );
}
