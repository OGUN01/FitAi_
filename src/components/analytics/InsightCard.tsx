// Insight Card Component
// Displays AI-powered insights and recommendations

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { THEME } from '../../utils/constants';

interface InsightCardProps {
  type: 'positive' | 'warning' | 'neutral' | 'achievement';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  confidence?: number; // 0-100
  category?: string;
}

const InsightCard: React.FC<InsightCardProps> = ({
  type,
  title,
  description,
  actionText,
  onAction,
  confidence,
  category
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'positive':
        return {
          backgroundColor: '#F0FDF4',
          borderColor: '#BBF7D0',
          icon: '🎉',
          iconBgColor: '#DCFCE7',
          titleColor: '#166534',
          descColor: '#15803D',
          actionBgColor: '#10B981',
        };
      case 'warning':
        return {
          backgroundColor: '#FFFBEB',
          borderColor: '#FED7AA',
          icon: '⚠️',
          iconBgColor: '#FEF3C7',
          titleColor: '#92400E',
          descColor: '#B45309',
          actionBgColor: '#F59E0B',
        };
      case 'achievement':
        return {
          backgroundColor: '#FAF5FF',
          borderColor: '#E9D5FF',
          icon: '🏆',
          iconBgColor: '#F3E8FF',
          titleColor: '#6B21A8',
          descColor: '#7C3AED',
          actionBgColor: '#8B5CF6',
        };
      default: // neutral
        return {
          backgroundColor: '#EFF6FF',
          borderColor: '#BFDBFE',
          icon: '💡',
          iconBgColor: '#DBEAFE',
          titleColor: '#1E40AF',
          descColor: '#2563EB',
          actionBgColor: '#3B82F6',
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <View style={[styles.card, { backgroundColor: typeStyles.backgroundColor, borderColor: typeStyles.borderColor }]}>
      {/* Header */}
      <View style={styles.header}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: typeStyles.iconBgColor }]}>
          <Text style={styles.iconText}>{typeStyles.icon}</Text>
        </View>
        
        {/* Content */}
        <View style={styles.content}>
          {/* Category and Confidence */}
          <View style={styles.metaInfo}>
            {category && (
              <Text style={[styles.category, { color: typeStyles.descColor }]}>
                {category.toUpperCase()}
              </Text>
            )}
            
            {confidence && (
              <View style={styles.confidenceContainer}>
                <Text style={[styles.confidenceText, { color: typeStyles.descColor }]}>
                  {confidence}% confident
                </Text>
                <View style={[styles.confidenceBar, { backgroundColor: typeStyles.iconBgColor }]}>
                  <View 
                    style={[
                      styles.confidenceProgress,
                      { 
                        width: `${confidence}%`,
                        backgroundColor: typeStyles.actionBgColor 
                      }
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
          
          {/* Title */}
          <Text style={[styles.title, { color: typeStyles.titleColor }]}>
            {title}
          </Text>
          
          {/* Description */}
          <Text style={[styles.description, { color: typeStyles.descColor }]}>
            {description}
          </Text>
        </View>
      </View>

      {/* Action Button */}
      {actionText && onAction && (
        <View style={styles.actionContainer}>
          <Pressable
            onPress={onAction}
            style={[styles.actionButton, { backgroundColor: typeStyles.actionBgColor }]}
          >
            <Text style={styles.actionButtonText}>
              {actionText}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 11,
    opacity: 0.7,
    marginRight: 8,
  },
  confidenceBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceProgress: {
    height: '100%',
    borderRadius: 2,
    opacity: 0.6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  actionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default InsightCard;