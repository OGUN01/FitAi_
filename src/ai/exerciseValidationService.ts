/**
 * Exercise Validation Service
 *
 * Safety-layer validation for exercise selection. Only the safety validator
 * (validateExerciseSafety) is wired into the live generation pipeline — it is
 * consumed by services/builderValidationService.ts to filter exercises against
 * user constraints (pregnancy, injuries, medical conditions).
 *
 * The legacy fuzzy-name-matching ExerciseValidationService class (Jaro-Winkler
 * similarity, intelligent suggestions, validation reports) was removed along
 * with its only caller, the deprecated constrainedWorkoutGeneration.ts module.
 */

/**
 * Validates exercises against user safety constraints.
 * Returns a list of exercises that should be removed with reasons.
 *
 * Used by builderValidationService.ts to filter AI-generated exercise picks
 * before they reach the workout builder store.
 */
export function validateExerciseSafety(
  exercises: Array<{ id: string; name: string; category?: string; tags?: string[] }>,
  constraints: {
    pregnancyStatus?: boolean;
    pregnancyTrimester?: 1 | 2 | 3;
    injuries?: string[];
    medicalConditions?: string[];
  }
): Array<{ exerciseId: string; reason: string }> {
  const violations: Array<{ exerciseId: string; reason: string }> = [];

  for (const exercise of exercises) {
    const name = exercise.name.toLowerCase();
    const tags = (exercise.tags ?? []).map(t => t.toLowerCase());

    // Pregnancy restrictions
    if (constraints.pregnancyStatus) {
      const highImpact = ['jump', 'box jump', 'burpee', 'sprint', 'plyometric', 'contact'];
      const prone = ['prone', 'face down', 'stomach'];
      if (highImpact.some(kw => name.includes(kw) || tags.includes(kw))) {
        violations.push({ exerciseId: exercise.id, reason: 'High-impact exercise not recommended during pregnancy' });
        continue;
      }
      if (constraints.pregnancyTrimester && constraints.pregnancyTrimester >= 2) {
        if (prone.some(kw => name.includes(kw) || tags.includes(kw))) {
          violations.push({ exerciseId: exercise.id, reason: 'Prone position not recommended after first trimester' });
          continue;
        }
      }
    }

    // Injury-based restrictions (keyword matching)
    for (const injury of constraints.injuries ?? []) {
      const injuryLower = injury.toLowerCase();
      if (injuryLower.includes('knee') && (name.includes('lunge') || name.includes('squat') || name.includes('jump'))) {
        violations.push({ exerciseId: exercise.id, reason: `Knee injury: ${exercise.name} may aggravate condition` });
        break;
      }
      if (injuryLower.includes('back') && (name.includes('deadlift') || name.includes('good morning') || name.includes('hyperextension'))) {
        violations.push({ exerciseId: exercise.id, reason: `Back injury: ${exercise.name} may aggravate condition` });
        break;
      }
      if (injuryLower.includes('shoulder') && (name.includes('overhead') || name.includes('military press') || name.includes('upright row'))) {
        violations.push({ exerciseId: exercise.id, reason: `Shoulder injury: ${exercise.name} may aggravate condition` });
        break;
      }
    }
  }

  return violations;
}
