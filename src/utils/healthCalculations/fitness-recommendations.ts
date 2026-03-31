export class FitnessRecommendations {
  static calculateWorkoutFrequency(
    primaryGoals: string[],
    experienceYears: number,
    currentFrequency: number,
  ): number {
    let recommendedFrequency = 3;

    if (primaryGoals.includes("weight-loss") || primaryGoals.includes("weight_loss"))
      recommendedFrequency = Math.max(recommendedFrequency, 4);
    if (primaryGoals.includes("muscle-gain") || primaryGoals.includes("muscle_gain"))
      recommendedFrequency = Math.max(recommendedFrequency, 4);
    if (primaryGoals.includes("endurance"))
      recommendedFrequency = Math.max(recommendedFrequency, 5);

    if (experienceYears === 0)
      recommendedFrequency = Math.min(recommendedFrequency, 3);
    if (experienceYears > 2)
      recommendedFrequency = Math.min(recommendedFrequency + 1, 6);

    if (currentFrequency > 0) {
      const maxIncrease = Math.ceil(currentFrequency * 1.5);
      recommendedFrequency = Math.min(recommendedFrequency, maxIncrease);
    }

    return recommendedFrequency;
  }

  static calculateCardioMinutes(
    primaryGoals: string[],
    intensity: string,
  ): number {
    let baseMinutes = 150;

    if (primaryGoals.includes("weight-loss") || primaryGoals.includes("weight_loss")) baseMinutes = 250;
    if (primaryGoals.includes("endurance")) baseMinutes = 300;
    if (intensity === "advanced") baseMinutes = Math.min(baseMinutes + 50, 400);

    return baseMinutes;
  }

  static calculateStrengthSessions(
    primaryGoals: string[],
    experienceYears: number,
  ): number {
    let sessions = 2;

    if (primaryGoals.includes("muscle-gain") || primaryGoals.includes("muscle_gain")) sessions = 4;
    if (primaryGoals.includes("strength")) sessions = 3;
    if (experienceYears > 2) sessions = Math.min(sessions + 1, 5);

    return sessions;
  }
}
