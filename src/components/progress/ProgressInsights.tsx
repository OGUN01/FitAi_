import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../../utils/constants';

/**
 * ProgressInsights Component
 *
 * Displays motivational insights, tips, and achievements
 * Provides actionable feedback based on user progress
 */

interface InsightItem {
  id: string;
  type: 'achievement' | 'tip' | 'motivation' | 'goal';
  title: string;
  message: string;
  icon: string;
  actionText?: string;
  priority: 'high' | 'medium' | 'low';
}

interface ProgressInsightsProps {
  insights?: InsightItem[];
  onInsightAction?: (insight: InsightItem) => void;
}

const InsightCard: React.FC<{
  insight: InsightItem;
  onAction?: (insight: InsightItem) => void;
}> = ({ insight, onAction }) => {
  const getCardStyle = (type: string, priority: string) => {
    let backgroundColor = THEME.colors.surface;
    let borderColor = THEME.colors.border;

    switch (type) {
      case 'achievement':
        backgroundColor = THEME.colors.surface;
        borderColor = THEME.colors.success;
        break;
      case 'tip':
        backgroundColor = THEME.colors.surface;
        borderColor = THEME.colors.primary;
        break;
      case 'motivation':
        backgroundColor = THEME.colors.surface;
        borderColor = THEME.colors.secondary;
        break;
      case 'goal':
        backgroundColor = THEME.colors.surface;
        borderColor = THEME.colors.warning;
        break;
    }

    return {
      backgroundColor,
      borderColor,
      borderWidth: priority === 'high' ? 2 : 1,
    };
  };

  return (
    <View style={[styles.insightCard, getCardStyle(insight.type, insight.priority)]}>
      <View style={styles.insightHeader}>
        <Text style={styles.insightIcon}>{insight.icon}</Text>
        <View style={styles.insightContent}>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={styles.insightMessage}>{insight.message}</Text>
        </View>
      </View>

      {insight.actionText && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onAction?.(insight)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionText}>{insight.actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const generateDefaultInsights = (): InsightItem[] => {
  // Return empty array - insights should be generated based on real user data
  // TODO: Implement real insights based on user progress data
  return [];
};

export const ProgressInsights: React.FC<ProgressInsightsProps> = ({
  insights,
  onInsightAction,
}) => {
  const displayInsights = insights || generateDefaultInsights();

  // Sort by priority (high first)
  const sortedInsights = displayInsights.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const highPriorityInsights = sortedInsights.filter((i) => i.priority === 'high');
  const otherInsights = sortedInsights.filter((i) => i.priority !== 'high');

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Insights & Tips</Text>

      {/* High Priority Insights */}
      {highPriorityInsights.length > 0 && (
        <View style={styles.prioritySection}>
          {highPriorityInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} onAction={onInsightAction} />
          ))}
        </View>
      )}

      {/* Other Insights */}
      {otherInsights.length > 0 && (
        <View style={styles.regularSection}>
          {otherInsights.slice(0, 3).map((insight) => (
            <InsightCard key={insight.id} insight={insight} onAction={onInsightAction} />
          ))}
        </View>
      )}

      {/* Motivational Footer */}
      <View style={styles.motivationalFooter}>
        <Text style={styles.footerText}>
          "Success is the sum of small efforts repeated day in and day out."
        </Text>
        <Text style={styles.footerAuthor}>- Robert Collier</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xxl, // Extra bottom padding for tab bar
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  prioritySection: {
    marginBottom: THEME.spacing.md,
  },
  regularSection: {
    marginBottom: THEME.spacing.lg,
  },
  insightCard: {
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.sm,
    marginTop: 2,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  insightMessage: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.normal,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  actionButton: {
    alignSelf: 'flex-start',
    marginTop: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
  },
  actionText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.white,
  },
  motivationalFooter: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  footerText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: THEME.spacing.xs,
  },
  footerAuthor: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.normal,
    color: THEME.colors.textMuted,
  },
});
