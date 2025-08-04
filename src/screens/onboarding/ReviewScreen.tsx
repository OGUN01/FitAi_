import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, Card, THEME } from '../../components/ui';
import { PersonalInfo, FitnessGoals } from '../../types/user';
import { DietPreferences } from './DietPreferencesScreen';
import { WorkoutPreferences } from './WorkoutPreferencesScreen';
import { BodyAnalysis } from './BodyAnalysisScreen';

export interface OnboardingReviewData {
  personalInfo: PersonalInfo;
  fitnessGoals: FitnessGoals;
  dietPreferences: DietPreferences;
  workoutPreferences: WorkoutPreferences;
  bodyAnalysis: BodyAnalysis;
}

interface ReviewScreenProps {
  data: OnboardingReviewData;
  onComplete: () => void;
  onBack: () => void;
  onEditSection: (section: keyof OnboardingReviewData) => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  data,
  onComplete,
  onBack,
  onEditSection,
}) => {
  const formatArray = (arr: string[]): string => {
    if (arr.length === 0) return 'None selected';
    if (arr.length <= 3) return arr.join(', ');
    return `${arr.slice(0, 3).join(', ')} +${arr.length - 3} more`;
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getCompletionPercentage = (): number => {
    let completed = 0;
    const total = 5;

    // Personal Info (required)
    if (data.personalInfo.name && data.personalInfo.age && data.personalInfo.height && data.personalInfo.weight) {
      completed++;
    }

    // Fitness Goals (required)
    if (data.fitnessGoals.primaryGoals && data.fitnessGoals.primaryGoals.length > 0) {
      completed++;
    }

    // Diet Preferences (required)
    if (data.dietPreferences.cuisinePreferences && data.dietPreferences.cuisinePreferences.length > 0) {
      completed++;
    }

    // Workout Preferences (required)
    if (data.workoutPreferences.workoutTypes && data.workoutPreferences.workoutTypes.length > 0) {
      completed++;
    }

    // Body Analysis (optional)
    if (data.bodyAnalysis.photos && Object.keys(data.bodyAnalysis.photos).length > 0) {
      completed++;
    }

    return Math.round((completed / total) * 100);
  };

  const completionPercentage = getCompletionPercentage();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Review Your Profile</Text>
          <Text style={styles.subtitle}>
            Check your information and complete your setup
          </Text>
          
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>{completionPercentage}% Complete</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Personal Information */}
          <TouchableOpacity onPress={() => onEditSection('personalInfo')}>
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>👤 Personal Information</Text>
                  <Text style={styles.sectionStatus}>
                    {data.personalInfo.name ? 'Complete' : 'Incomplete'}
                  </Text>
                </View>
                <Text style={styles.editIcon}>✏️</Text>
              </View>
              <View style={styles.sectionContent}>
                <Text style={styles.dataItem}>Name: {data.personalInfo.name || 'Not set'}</Text>
                <Text style={styles.dataItem}>Age: {data.personalInfo.age || 'Not set'}</Text>
                <Text style={styles.dataItem}>Gender: {data.personalInfo.gender || 'Not set'}</Text>
                <Text style={styles.dataItem}>Height: {data.personalInfo.height ? `${data.personalInfo.height} cm` : 'Not set'}</Text>
                <Text style={styles.dataItem}>Weight: {data.personalInfo.weight ? `${data.personalInfo.weight} kg` : 'Not set'}</Text>
                <Text style={styles.dataItem}>Activity Level: {data.personalInfo.activityLevel || 'Not set'}</Text>
              </View>
            </Card>
          </TouchableOpacity>

          {/* Fitness Goals */}
          <TouchableOpacity onPress={() => onEditSection('fitnessGoals')}>
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>🎯 Fitness Goals</Text>
                  <Text style={styles.sectionStatus}>
                    {data.fitnessGoals.primaryGoals?.length > 0 ? 'Complete' : 'Incomplete'}
                  </Text>
                </View>
                <Text style={styles.editIcon}>✏️</Text>
              </View>
              <View style={styles.sectionContent}>
                <Text style={styles.dataItem}>
                  Goals: {formatArray(data.fitnessGoals.primaryGoals || [])}
                </Text>
                <Text style={styles.dataItem}>
                  Time Commitment: {data.fitnessGoals.timeCommitment || 'Not set'}
                </Text>
                <Text style={styles.dataItem}>
                  Experience: {data.fitnessGoals.experience || 'Not set'}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>

          {/* Diet Preferences */}
          <TouchableOpacity onPress={() => onEditSection('dietPreferences')}>
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>🍽️ Diet Preferences</Text>
                  <Text style={styles.sectionStatus}>
                    {data.dietPreferences.cuisinePreferences?.length > 0 ? 'Complete' : 'Incomplete'}
                  </Text>
                </View>
                <Text style={styles.editIcon}>✏️</Text>
              </View>
              <View style={styles.sectionContent}>
                <Text style={styles.dataItem}>
                  Diet Type: {data.dietPreferences.dietType || 'Not set'}
                </Text>
                <Text style={styles.dataItem}>
                  Cuisines: {formatArray(data.dietPreferences.cuisinePreferences || [])}
                </Text>
                <Text style={styles.dataItem}>
                  Allergies: {formatArray(data.dietPreferences.allergies || [])}
                </Text>
                <Text style={styles.dataItem}>
                  Restrictions: {formatArray(data.dietPreferences.restrictions || [])}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>

          {/* Workout Preferences */}
          <TouchableOpacity onPress={() => onEditSection('workoutPreferences')}>
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>💪 Workout Preferences</Text>
                  <Text style={styles.sectionStatus}>
                    {data.workoutPreferences.workoutTypes?.length > 0 ? 'Complete' : 'Incomplete'}
                  </Text>
                </View>
                <Text style={styles.editIcon}>✏️</Text>
              </View>
              <View style={styles.sectionContent}>
                <Text style={styles.dataItem}>
                  Location: {data.workoutPreferences.location || 'Not set'}
                </Text>
                <Text style={styles.dataItem}>
                  Duration: {data.workoutPreferences.timePreference ? formatTime(data.workoutPreferences.timePreference) : 'Not set'}
                </Text>
                <Text style={styles.dataItem}>
                  Intensity: {data.workoutPreferences.intensity || 'Not set'}
                </Text>
                <Text style={styles.dataItem}>
                  Types: {formatArray(data.workoutPreferences.workoutTypes || [])}
                </Text>
                <Text style={styles.dataItem}>
                  Equipment: {formatArray(data.workoutPreferences.equipment || [])}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>

          {/* Body Analysis */}
          <TouchableOpacity onPress={() => onEditSection('bodyAnalysis')}>
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>📸 Body Analysis</Text>
                  <Text style={styles.sectionStatus}>
                    {Object.keys(data.bodyAnalysis.photos || {}).length > 0 ? 'Complete' : 'Optional'}
                  </Text>
                </View>
                <Text style={styles.editIcon}>✏️</Text>
              </View>
              <View style={styles.sectionContent}>
                <Text style={styles.dataItem}>
                  Photos: {Object.keys(data.bodyAnalysis.photos || {}).length}/3 uploaded
                </Text>
                {data.bodyAnalysis.analysis && (
                  <>
                    <Text style={styles.dataItem}>
                      Body Type: {data.bodyAnalysis.analysis.bodyType}
                    </Text>
                    <Text style={styles.dataItem}>
                      Fitness Level: {data.bodyAnalysis.analysis.fitnessLevel}
                    </Text>
                  </>
                )}
              </View>
            </Card>
          </TouchableOpacity>

          {/* Completion Message */}
          {completionPercentage === 100 ? (
            <Card style={styles.completionCard}>
              <Text style={styles.completionIcon}>🎉</Text>
              <Text style={styles.completionTitle}>Profile Complete!</Text>
              <Text style={styles.completionText}>
                Your personalized fitness journey is ready to begin.
              </Text>
            </Card>
          ) : (
            <Card style={styles.incompleteCard}>
              <Text style={styles.incompleteIcon}>⚠️</Text>
              <Text style={styles.incompleteTitle}>Almost There!</Text>
              <Text style={styles.incompleteText}>
                Complete the remaining sections for the best experience.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <Button
            title="Back"
            onPress={onBack}
            variant="outline"
            style={styles.backButton}
          />
          <Button
            title="Complete Setup"
            onPress={onComplete}
            variant="primary"
            style={styles.completeButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  scrollView: {
    flex: 1,
  },

  header: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingBottom: ResponsiveTheme.spacing.lg,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(22),
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  progressContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  progressBar: {
    height: rh(8),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  progressFill: {
    height: '100%',
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },

  progressText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  content: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  sectionCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.md,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  sectionStatus: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  editIcon: {
    fontSize: rf(18),
    color: ResponsiveTheme.colors.primary,
  },

  sectionContent: {
    gap: ResponsiveTheme.spacing.xs,
  },

  dataItem: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },

  completionCard: {
    padding: ResponsiveTheme.spacing.lg,
    alignItems: 'center',
    backgroundColor: `${ResponsiveTheme.colors.success}10`,
    borderColor: ResponsiveTheme.colors.success,
    borderWidth: 1,
  },

  completionIcon: {
    fontSize: rf(48),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  completionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.success,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  completionText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  incompleteCard: {
    padding: ResponsiveTheme.spacing.lg,
    alignItems: 'center',
    backgroundColor: `${ResponsiveTheme.colors.warning}10`,
    borderColor: ResponsiveTheme.colors.warning,
    borderWidth: 1,
  },

  incompleteIcon: {
    fontSize: rf(48),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  incompleteTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.warning,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  incompleteText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  footer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
  },

  backButton: {
    flex: 1,
  },

  completeButton: {
    flex: 2,
  },
});
