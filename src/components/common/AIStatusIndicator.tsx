// AI Status Indicator Component
// Shows whether the app is using real AI or demo mode

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../../utils/constants';
import { aiService } from '../../ai';

interface AIStatusIndicatorProps {
  onPress?: () => void;
  style?: any;
}

export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({ onPress, style }) => {
  const status = aiService.getAIStatus();
  
  const getStatusColor = () => {
    return status.mode === 'real' ? THEME.colors.success || '#4CAF50' : THEME.colors.warning || '#FF9800';
  };

  const getStatusIcon = () => {
    return status.mode === 'real' ? '🤖' : '🎭';
  };

  const getStatusText = () => {
    return status.mode === 'real' ? 'AI Powered' : 'Demo Mode';
  };

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component style={[styles.container, { borderColor: getStatusColor() }, style]} onPress={onPress}>
      <Text style={styles.icon}>{getStatusIcon()}</Text>
      <Text style={[styles.text, { color: getStatusColor() }]}>{getStatusText()}</Text>
    </Component>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  icon: {
    fontSize: 14,
    marginRight: THEME.spacing.xs,
  },
  
  text: {
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.medium,
  },
});

export default AIStatusIndicator;
