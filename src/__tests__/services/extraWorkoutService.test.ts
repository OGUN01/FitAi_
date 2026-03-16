import { getSuggestions } from '../../services/extraWorkoutService';
import type { FitnessGoals } from '../../types/user';

describe('extraWorkoutService', () => {
  describe('getSuggestions', () => {
    const goals: FitnessGoals = {
      primaryGoal: 'weight_loss',
      experience: 'intermediate',
    } as any;

    it('returns exactly 3 templates', () => {
      const suggestions = getSuggestions(goals);
      expect(suggestions).toHaveLength(3);
    });

    it('each template has required fields', () => {
      const suggestions = getSuggestions(goals);
      for (const s of suggestions) {
        expect(s.id).toBeTruthy();
        expect(s.title).toBeTruthy();
        expect(s.category).toBeTruthy();
        expect(typeof s.duration).toBe('number');
        expect(['beginner', 'intermediate', 'advanced']).toContain(s.difficulty);
        expect(typeof s.estimatedCalories).toBe('number');
      }
    });

    it('returns beginner difficulty for beginner experience', () => {
      const beginnerGoals = { ...goals, experience: 'beginner' } as any;
      const suggestions = getSuggestions(beginnerGoals);
      // HIIT template should be beginner for beginners
      const hiit = suggestions.find(s => s.category === 'hiit');
      expect(hiit?.difficulty).toBe('beginner');
    });
  });
});
