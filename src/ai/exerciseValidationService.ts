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
  exercises: Array<{
    id: string;
    name: string;
    category?: string;
    tags?: string[];
    /**
     * Structured muscle-group metadata (e.g. CuratedExercise.muscleGroups),
     * already present on exercise records. Cross-checked in addition to name
     * substrings so exercises whose contraindicated nature isn't spelled out
     * in the literal name — e.g. "Step-Up" or "Leg Press" for a knee injury —
     * don't silently pass the filter unflagged.
     */
    muscleGroups?: string[];
  }>,
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
    const muscleGroups = (exercise.muscleGroups ?? []).map(m => m.toLowerCase());

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

    // Injury-based restrictions. Name/tag keyword matching is the primary
    // signal (expanded below to cover common real-world naming variants);
    // structured muscleGroups membership is a secondary cross-check so an
    // exercise whose name doesn't spell out the movement pattern still gets
    // caught.
    for (const injury of constraints.injuries ?? []) {
      const injuryLower = injury.toLowerCase();
      if (injuryLower.includes('knee')) {
        const kneeKeywords = [
          'lunge', 'squat', 'jump', 'step-up', 'step up',
          'split squat', 'bulgarian', 'pistol', 'leg press', 'wall sit',
        ];
        const nameMatch = kneeKeywords.some(kw => name.includes(kw));
        // Quad-dominant leg exercises load the knee joint directly.
        // Posterior-chain-only movements (leg curl, calf raise, hip thrust,
        // Romanian deadlift) don't include 'quadriceps' and are intentionally
        // left unflagged, matching the precision of the name-keyword list.
        const muscleMatch = muscleGroups.includes('quadriceps');
        if (nameMatch || muscleMatch) {
          violations.push({ exerciseId: exercise.id, reason: `Knee injury: ${exercise.name} may aggravate condition` });
          break;
        }
      }
      if (injuryLower.includes('back') && (name.includes('deadlift') || name.includes('good morning') || name.includes('hyperextension'))) {
        violations.push({ exerciseId: exercise.id, reason: `Back injury: ${exercise.name} may aggravate condition` });
        break;
      }
      if (injuryLower.includes('shoulder')) {
        const shoulderKeywords = [
          'overhead', 'military press', 'upright row',
          'shoulder press', 'arnold press', 'push press', 'strict press', 'pike push',
        ];
        if (shoulderKeywords.some(kw => name.includes(kw))) {
          violations.push({ exerciseId: exercise.id, reason: `Shoulder injury: ${exercise.name} may aggravate condition` });
          break;
        }
      }
      if (injuryLower.includes('neck')) {
        const neckKeywords = [
          'overhead press', 'shoulder press', 'military press', 'neck bridge',
          'shrug', 'behind the neck', 'upright row',
        ];
        if (neckKeywords.some(kw => name.includes(kw))) {
          violations.push({ exerciseId: exercise.id, reason: `Neck injury: ${exercise.name} may aggravate condition` });
          break;
        }
      }
      if (injuryLower.includes('ankle')) {
        const ankleKeywords = [
          'jump', 'box jump', 'plyometric', 'single-leg', 'single leg',
          'calf raise', 'sprint', 'jump rope', 'jump squat',
        ];
        if (ankleKeywords.some(kw => name.includes(kw))) {
          violations.push({ exerciseId: exercise.id, reason: `Ankle/foot injury: ${exercise.name} may aggravate condition` });
          break;
        }
      }
      if (injuryLower.includes('wrist')) {
        const wristKeywords = [
          'push-up', 'push up', 'plank', 'front squat', 'overhead press',
          'handstand', 'burpee', 'clean', 'snatch',
        ];
        if (wristKeywords.some(kw => name.includes(kw))) {
          violations.push({ exerciseId: exercise.id, reason: `Wrist injury: ${exercise.name} may aggravate condition` });
          break;
        }
      }
      if (injuryLower.includes('balance')) {
        const balanceKeywords = [
          'single-leg', 'single leg', 'pistol', 'bosu', 'box jump',
          'step-up', 'step up', 'balance', 'stability ball',
        ];
        if (balanceKeywords.some(kw => name.includes(kw))) {
          violations.push({ exerciseId: exercise.id, reason: `Balance issue: ${exercise.name} may aggravate condition` });
          break;
        }
      }
      if (injuryLower.includes('mobility')) {
        const mobilityKeywords = [
          'deep squat', 'walking lunge', 'burpee', 'jump lunge',
          'full range', 'overhead squat', 'turkish get-up', 'turkish get up',
        ];
        if (mobilityKeywords.some(kw => name.includes(kw))) {
          violations.push({ exerciseId: exercise.id, reason: `Limited mobility: ${exercise.name} may aggravate condition` });
          break;
        }
      }
    }
  }

  return violations;
}
