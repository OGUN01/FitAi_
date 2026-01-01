/**
 * InsightCard Component
 * Displays AI-powered insights with visual hierarchy
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../ui/aurora/GlassCard';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh } from '../../utils/responsive';

export type InsightType = 'positive' | 'negative' | 'neutral' | 'achievement' | 'recommendation';

interface InsightCardProps {
  type: InsightType;
  title: string;
  description: string;
  category?: string;
  confidence?: number;
  actionText?: string;
  onAction?: () => void;
  delay?: number;
}

const getInsightConfig = (type: InsightType) => {
  switch (type) {
    case 'positive':
      return {
        icon: 'checkmark-circle' as const,
        color: '#4CAF50',
        gradientColors: ['rgba(76,175,80,0.15)', 'rgba(76,175,80,0.05)'] as [string, string],
        borderColor: 'rgba(76,175,80,0.3)',
      };
    case 'negative':
      return {
        icon: 'alert-circle' as const,
        color: '#F44336',
        gradientColors: ['rgba(244,67,54,0.15)', 'rgba(244,67,54,0.05)'] as [string, string],
        borderColor: 'rgba(244,67,54,0.3)',
      };
    case 'neutral':
      return {
        icon: 'information-circle' as const,
        color: '#FF9800',
        gradientColors: ['rgba(255,152,0,0.15)', 'rgba(255,152,0,0.05)'] as [string, string],
        borderColor: 'rgba(255,152,0,0.3)',
      };
    case 'achievement':
      return {
        icon: 'trophy' as const,
        color: '#FFD700',
        gradientColors: ['rgba(255,215,0,0.15)', 'rgba(255,215,0,0.05)'] as [string, string],
        borderColor: 'rgba(255,215,0,0.3)',
      };
    case 'recommendation':
      return {
        icon: 'bulb' as const,
        color: '#667eea',
        gradientColors: ['rgba(102,126,234,0.15)', 'rgba(102,126,234,0.05)'] as [string, string],
        borderColor: 'rgba(102,126,234,0.3)',
      };
    default:
      return {
        icon: 'information-circle' as const,
        color: '#9E9E9E',
        gradientColors: ['rgba(158,158,158,0.15)', 'rgba(158,158,158,0.05)'] as [string, string],
        borderColor: 'rgba(158,158,158,0.3)',
      };
  }
};

export const InsightCard: React.FC<InsightCardProps> = ({
  type,
  title,
  description,
  category,
  confidence,
  actionText,
  onAction,
  delay = 0,
}) => {
  const config = getInsightConfig(type);

  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()}>
      <AnimatedPressable
        onPress={onAction}
        scaleValue={onAction ? 0.98 : 1}
        hapticFeedback={!!onAction}
        hapticType="light"
        disabled={!onAction}
      >
        <View style={[styles.container, { borderColor: config.borderColor }]}>
          <LinearGradient
            colors={config.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.content}>
              {/* Icon & Header Row */}
              <View style={styles.headerRow}>
                <View style={[styles.iconContainer, { backgroundColor: `${config.color}25` }]}>
                  <Ionicons name={config.icon} size={rf(18)} color={config.color} />
                </View>
                
                <View style={styles.headerContent}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: config.color }]}>{title}</Text>
                    {category && (
                      <View style={[styles.categoryBadge, { backgroundColor: `${config.color}20` }]}>
                        <Text style={[styles.categoryText, { color: config.color }]}>{category}</Text>
                      </View>
                    )}
                  </View>
                  
                  {confidence !== undefined && (
                    <View style={styles.confidenceRow}>
                      <View style={styles.confidenceBar}>
                        <View
                          style={[
                            styles.confidenceFill,
                            { width: `${confidence}%`, backgroundColor: config.color },
                          ]}
                        />
                      </View>
                      <Text style={styles.confidenceText}>{confidence}%</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Description */}
              <Text style={styles.description}>{description}</Text>

              {/* Action Button */}
              {actionText && onAction && (
                <View style={styles.actionContainer}>
                  <View style={[styles.actionButton, { backgroundColor: `${config.color}20` }]}>
                    <Text style={[styles.actionText, { color: config.color }]}>{actionText}</Text>
                    <Ionicons name="chevron-forward" size={rf(14)} color={config.color} />
                  </View>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

// AI Recommendation Banner Component (special variant)
export const AIRecommendationBanner: React.FC<{
  recommendation: string;
  onLearnMore?: () => void;
}> = ({ recommendation, onLearnMore }) => {
  return (
    <AnimatedPressable
      onPress={onLearnMore}
      scaleValue={0.98}
      hapticFeedback={true}
      hapticType="light"
    >
      <View style={styles.aiContainer}>
        <LinearGradient
          colors={['rgba(102,126,234,0.15)', 'rgba(118,75,162,0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiGradient}
        >
          <View style={styles.aiContent}>
            <View style={styles.aiHeader}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiIconContainer}
              >
                <Ionicons name="sparkles" size={rf(14)} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.aiTitle}>AI Recommendation</Text>
            </View>
            <Text style={styles.aiText}>{recommendation}</Text>
            {onLearnMore && (
              <View style={styles.aiAction}>
                <Text style={styles.aiActionText}>Learn More</Text>
                <Ionicons name="arrow-forward" size={rf(14)} color="#667eea" />
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  gradient: {
    flex: 1,
  },
  content: {
    padding: ResponsiveTheme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  iconContainer: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ResponsiveTheme.spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.sm,
  },
  title: {
    fontSize: rf(14),
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  categoryBadge: {
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs / 2,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  categoryText: {
    fontSize: rf(10),
    fontWeight: '600',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ResponsiveTheme.spacing.xs,
    gap: ResponsiveTheme.spacing.sm,
  },
  confidenceBar: {
    flex: 1,
    height: rh(4),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: rh(2),
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: rh(2),
  },
  confidenceText: {
    fontSize: rf(10),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
    minWidth: rw(30),
    textAlign: 'right',
  },
  description: {
    fontSize: rf(13),
    fontWeight: '500',
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(19),
    marginLeft: rw(36) + ResponsiveTheme.spacing.sm,
  },
  actionContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
    marginLeft: rw(36) + ResponsiveTheme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
    gap: ResponsiveTheme.spacing.xs,
  },
  actionText: {
    fontSize: rf(12),
    fontWeight: '600',
  },

  // AI Recommendation Banner Styles
  aiContainer: {
    borderRadius: ResponsiveTheme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(102,126,234,0.3)',
  },
  aiGradient: {
    flex: 1,
  },
  aiContent: {
    padding: ResponsiveTheme.spacing.lg,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
    gap: ResponsiveTheme.spacing.sm,
  },
  aiIconContainer: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(8),
    backgroundColor: 'rgba(102,126,234,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTitle: {
    fontSize: rf(15),
    fontWeight: '700',
    color: '#667eea',
    letterSpacing: 0.3,
  },
  aiText: {
    fontSize: rf(13),
    fontWeight: '500',
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(20),
  },
  aiAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.xs,
  },
  aiActionText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: '#667eea',
  },
});

export default InsightCard;

