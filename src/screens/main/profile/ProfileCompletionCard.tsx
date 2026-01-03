/**
 * ProfileCompletionCard - Shows profile completion progress
 * 
 * Features:
 * - Circular progress indicator
 * - Completion percentage
 * - List of incomplete sections with quick actions
 * - Encouraging message based on completion
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { GlassCard } from '../../../components/ui/aurora/GlassCard';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../../utils/constants';
import { rf, rw, rh } from '../../../utils/responsive';
import { haptics } from '../../../utils/haptics';

interface ProfileSection {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  isComplete: boolean;
}

interface ProfileCompletionCardProps {
  personalInfoComplete: boolean;
  goalsComplete: boolean;
  measurementsComplete: boolean;
  preferencesComplete: boolean;
  onSectionPress: (sectionId: string) => void;
  animationDelay?: number;
}

export const ProfileCompletionCard: React.FC<ProfileCompletionCardProps> = ({
  personalInfoComplete,
  goalsComplete,
  measurementsComplete,
  preferencesComplete,
  onSectionPress,
  animationDelay = 0,
}) => {
  const sections: ProfileSection[] = useMemo(() => [
    { id: 'personal', name: 'Personal Info', icon: 'person-outline', isComplete: personalInfoComplete },
    { id: 'goals', name: 'Fitness Goals', icon: 'flag-outline', isComplete: goalsComplete },
    { id: 'measurements', name: 'Body Stats', icon: 'body-outline', isComplete: measurementsComplete },
    { id: 'preferences', name: 'Preferences', icon: 'settings-outline', isComplete: preferencesComplete },
  ], [personalInfoComplete, goalsComplete, measurementsComplete, preferencesComplete]);

  const completedCount = sections.filter(s => s.isComplete).length;
  const totalCount = sections.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  // Progress ring dimensions
  const size = rw(70);
  const strokeWidth = rw(6);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (percentage / 100) * circumference;

  const getMessage = () => {
    if (percentage === 100) return "Profile complete! You're all set.";
    if (percentage >= 75) return "Almost there! Just a few more details.";
    if (percentage >= 50) return "Good progress! Keep going.";
    if (percentage >= 25) return "Great start! Complete your profile.";
    return "Let's get started with your profile!";
  };

  const getColor = () => {
    if (percentage === 100) return '#4CAF50';
    if (percentage >= 75) return '#8BC34A';
    if (percentage >= 50) return '#FFC107';
    if (percentage >= 25) return '#FF9800';
    return '#FF6B6B';
  };

  const incompleteSections = sections.filter(s => !s.isComplete);

  // Don't show if profile is 100% complete
  if (percentage === 100) return null;

  return (
    <Animated.View 
      entering={FadeInRight.delay(animationDelay).duration(400)}
      style={styles.container}
    >
      <GlassCard 
        elevation={2} 
        padding="md" 
        blurIntensity="light" 
        borderRadius="lg"
        style={styles.card}
      >
        <View style={styles.header}>
          {/* Progress Ring */}
          <View style={styles.progressContainer}>
            <Svg width={size} height={size}>
              {/* Background circle */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Progress circle */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={getColor()}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${progress} ${circumference - progress}`}
                strokeDashoffset={circumference / 4}
                strokeLinecap="round"
              />
            </Svg>
            <View style={styles.percentageContainer}>
              <Text style={[styles.percentageText, { color: getColor() }]}>{percentage}</Text>
              <Text style={styles.percentageSymbol}>%</Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.message}>{getMessage()}</Text>
            <View style={styles.completionBar}>
              <View style={[styles.completionProgress, { width: `${percentage}%`, backgroundColor: getColor() }]} />
            </View>
            <Text style={styles.completionText}>
              {completedCount} of {totalCount} sections complete
            </Text>
          </View>
        </View>

        {/* Incomplete sections */}
        {incompleteSections.length > 0 && (
          <View style={styles.sectionsContainer}>
            {incompleteSections.slice(0, 2).map((section) => (
              <AnimatedPressable
                key={section.id}
                onPress={() => {
                  haptics.light();
                  onSectionPress(section.id);
                }}
                scaleValue={0.97}
                hapticFeedback={false}
                style={styles.sectionButton}
              >
                <View style={styles.sectionIcon}>
                  <Ionicons name={section.icon} size={rf(14)} color={getColor()} />
                </View>
                <Text style={styles.sectionName}>{section.name}</Text>
                <Ionicons name="add-circle-outline" size={rf(16)} color={getColor()} />
              </AnimatedPressable>
            ))}
          </View>
        )}
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  percentageText: {
    fontSize: rf(20),
    fontWeight: '700',
  },
  percentageSymbol: {
    fontSize: rf(10),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
  },
  infoContainer: {
    flex: 1,
    marginLeft: ResponsiveTheme.spacing.md,
  },
  title: {
    fontSize: rf(15),
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  message: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  completionBar: {
    height: rh(4),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: rh(2),
    overflow: 'hidden',
    marginBottom: 4,
  },
  completionProgress: {
    height: '100%',
    borderRadius: rh(2),
  },
  completionText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
  },
  sectionsContainer: {
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.sm,
  },
  sectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    gap: ResponsiveTheme.spacing.xs,
  },
  sectionIcon: {
    width: rw(24),
    height: rw(24),
    borderRadius: rw(12),
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionName: {
    flex: 1,
    fontSize: rf(11),
    fontWeight: '500',
    color: '#fff',
  },
});

export default ProfileCompletionCard;









