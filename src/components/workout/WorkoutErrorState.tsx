/**
 * FitAI — Workout Error State (Aurora, 2026 session redesign)
 *
 * Flat dark empty-state for missing workout data / empty workouts. Renders
 * the shared `EmptyState` component (src/components/ui/aurora/EmptyState.tsx)
 * so this surface matches the entrance animation, icon-disc sizing, and CTA
 * styling used by every other migrated empty state. Behavior (icon choice,
 * copy, onGoBack) is unchanged.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../ui/aurora';
import { flatColors as colors } from '../../theme/aurora-tokens';

interface WorkoutErrorStateProps {
  errorType: 'no-data' | 'no-exercises';
  onGoBack: () => void;
}

export const WorkoutErrorState: React.FC<WorkoutErrorStateProps> = ({ errorType, onGoBack }) => {
  const config =
    errorType === 'no-data'
      ? {
          icon: 'alert-circle-outline' as const,
          iconColor: colors.error,
          title: 'No Workout Data',
          subtitle: 'Unable to load workout information',
        }
      : {
          icon: 'barbell-outline' as const,
          iconColor: colors.primary,
          title: 'No Exercises Found',
          // BUG FIX (found via live testing): this screen previously gave a
          // real user no idea what to do next when the AI plan hadn't been
          // generated yet — a genuine dead end. A full fix would thread a
          // "Generate Plan" action from here back to the Workout tab's
          // plan-generation flow (real navigation/cross-screen wiring, out
          // of scope for a quick fix) — this at least tells the user the
          // concrete next step instead of leaving them guessing.
          subtitle:
            'This workout appears to be empty. Go back to the Workout tab and generate an AI plan first.',
        };

  return (
    <SafeAreaView style={styles.container}>
      <EmptyState
        icon={config.icon}
        iconColor={config.iconColor}
        title={config.title}
        subtitle={config.subtitle}
        ctaText="Go Back"
        onCta={onGoBack}
        style={styles.content}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
});
