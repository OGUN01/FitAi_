// Premium Badge Component
// Shows premium status and trial information

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

interface PremiumBadgeProps {
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  showTrial?: boolean;
  variant?: 'badge' | 'banner' | 'inline';
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  onPress,
  size = 'medium',
  showTrial = true,
  variant = 'badge'
}) => {
  const { subscriptionStatus, trialInfo } = useSubscriptionStore();
  
  const isPremium = subscriptionStatus.isPremium;
  const isTrialActive = trialInfo.daysRemaining > 0;
  
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'px-2 py-1',
          text: 'text-xs',
          icon: 'text-sm',
        };
      case 'large':
        return {
          container: 'px-4 py-2',
          text: 'text-base font-bold',
          icon: 'text-lg',
        };
      default: // medium
        return {
          container: 'px-3 py-1.5',
          text: 'text-sm font-semibold',
          icon: 'text-base',
        };
    }
  };

  const styles = getSizeClasses();

  // Badge variant
  if (variant === 'badge') {
    if (!isPremium && !isTrialActive) {
      return (
        <Pressable
          onPress={onPress}
          className={`${styles.container} bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex-row items-center`}
        >
          <Text className={`${styles.icon} mr-1`}>⭐</Text>
          <Text className={`${styles.text} text-white`}>
            Upgrade
          </Text>
        </Pressable>
      );
    }

    if (isTrialActive && showTrial) {
      return (
        <View className={`${styles.container} bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex-row items-center`}>
          <Text className={`${styles.icon} mr-1`}>🎁</Text>
          <Text className={`${styles.text} text-white`}>
            Trial: {trialInfo.daysRemaining}d
          </Text>
        </View>
      );
    }

    if (isPremium) {
      const gradientColor = subscriptionStatus.plan === 'lifetime' 
        ? 'from-purple-500 to-pink-500'
        : 'from-green-400 to-blue-500';
        
      return (
        <View className={`${styles.container} bg-gradient-to-r ${gradientColor} rounded-full flex-row items-center`}>
          <Text className={`${styles.icon} mr-1`}>👑</Text>
          <Text className={`${styles.text} text-white capitalize`}>
            {subscriptionStatus.plan === 'lifetime' ? 'Lifetime' : 'Premium'}
          </Text>
        </View>
      );
    }

    return null;
  }

  // Banner variant
  if (variant === 'banner') {
    if (!isPremium && !isTrialActive) {
      return (
        <Pressable
          onPress={onPress}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 rounded-xl mx-4 my-2"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-2xl mr-2">⭐</Text>
                <Text className="text-white font-bold text-lg">
                  Upgrade to Premium
                </Text>
              </View>
              <Text className="text-white/90 text-sm mt-1">
                Unlock unlimited AI workouts, advanced analytics, and more!
              </Text>
            </View>
            
            <View className="bg-white/20 rounded-full px-4 py-2">
              <Text className="text-white font-bold text-sm">
                Upgrade
              </Text>
            </View>
          </View>
        </Pressable>
      );
    }

    if (isTrialActive && showTrial) {
      return (
        <View className="bg-gradient-to-r from-blue-400 to-purple-500 p-4 rounded-xl mx-4 my-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-2xl mr-2">🎁</Text>
                <Text className="text-white font-bold text-lg">
                  Free Trial Active
                </Text>
              </View>
              <Text className="text-white/90 text-sm mt-1">
                {trialInfo.daysRemaining} days remaining - Enjoy all premium features!
              </Text>
            </View>
            
            <View className="bg-white/20 rounded-full px-4 py-2">
              <Text className="text-white font-bold text-sm">
                {trialInfo.daysRemaining}d left
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (isPremium) {
      const gradientColor = subscriptionStatus.plan === 'lifetime'
        ? 'from-purple-500 to-pink-500'
        : 'from-green-400 to-blue-500';
        
      return (
        <View className={`bg-gradient-to-r ${gradientColor} p-4 rounded-xl mx-4 my-2`}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-2xl mr-2">👑</Text>
                <Text className="text-white font-bold text-lg capitalize">
                  {subscriptionStatus.plan === 'lifetime' ? 'Lifetime Premium' : 'Premium Active'}
                </Text>
              </View>
              <Text className="text-white/90 text-sm mt-1">
                You have access to all premium features
                {subscriptionStatus.expiryDate && subscriptionStatus.plan !== 'lifetime' && 
                  ` until ${new Date(subscriptionStatus.expiryDate).toLocaleDateString()}`
                }
              </Text>
            </View>
            
            <View className="bg-white/20 rounded-full px-4 py-2">
              <Text className="text-white font-bold text-sm capitalize">
                {subscriptionStatus.plan}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    return null;
  }

  // Inline variant
  if (variant === 'inline') {
    if (!isPremium && !isTrialActive) {
      return (
        <Pressable onPress={onPress} className="flex-row items-center">
          <Text className="text-yellow-500 mr-1">⭐</Text>
          <Text className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">
            Upgrade to Premium
          </Text>
        </Pressable>
      );
    }

    if (isTrialActive && showTrial) {
      return (
        <View className="flex-row items-center">
          <Text className="text-blue-500 mr-1">🎁</Text>
          <Text className="text-blue-600 dark:text-blue-400 text-sm font-medium">
            Trial: {trialInfo.daysRemaining} days left
          </Text>
        </View>
      );
    }

    if (isPremium) {
      const textColor = subscriptionStatus.plan === 'lifetime' 
        ? 'text-purple-600 dark:text-purple-400'
        : 'text-green-600 dark:text-green-400';
        
      return (
        <View className="flex-row items-center">
          <Text className="text-yellow-500 mr-1">👑</Text>
          <Text className={`${textColor} text-sm font-medium capitalize`}>
            {subscriptionStatus.plan === 'lifetime' ? 'Lifetime' : 'Premium'}
          </Text>
        </View>
      );
    }

    return null;
  }

  return null;
};

export default PremiumBadge;