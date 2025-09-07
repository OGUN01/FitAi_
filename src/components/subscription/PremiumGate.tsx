// Premium Feature Gate Component
// Conditionally render content based on subscription status

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSubscriptionStore, subscriptionHelpers } from '../../stores/subscriptionStore';
import PremiumBadge from './PremiumBadge';

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
  upgradeText?: string;
  upgradeDescription?: string;
}

const PremiumGate: React.FC<PremiumGateProps> = ({
  feature,
  children,
  fallback,
  showUpgrade = true,
  upgradeText = 'Upgrade to Premium',
  upgradeDescription = 'This feature requires a premium subscription'
}) => {
  const { checkPremiumAccess, showPaywallModal } = useSubscriptionStore();
  
  const hasAccess = checkPremiumAccess(feature);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (showUpgrade) {
    return (
      <View className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 m-4 items-center">
        <View className="bg-yellow-100 dark:bg-yellow-900/30 rounded-full p-3 mb-4">
          <Text className="text-4xl">👑</Text>
        </View>
        
        <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">
          {upgradeText}
        </Text>
        
        <Text className="text-gray-600 dark:text-gray-400 text-center mb-6">
          {upgradeDescription}
        </Text>
        
        <Pressable
          onPress={() => showPaywallModal(feature)}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl py-3 px-6 min-w-[120px] items-center"
        >
          <Text className="text-white font-bold">
            Upgrade Now
          </Text>
        </Pressable>
        
        <View className="mt-4">
          <PremiumBadge size="small" variant="inline" onPress={() => showPaywallModal(feature)} />
        </View>
      </View>
    );
  }
  
  return null;
};

// Higher-order component for premium feature wrapping
export const withPremiumGate = (feature: string, upgradeProps?: Partial<PremiumGateProps>) => {
  return function PremiumWrapped<T extends {}>(
    Component: React.ComponentType<T>
  ): React.ComponentType<T> {
    return function PremiumGatedComponent(props: T) {
      return (
        <PremiumGate feature={feature} {...upgradeProps}>
          <Component {...props} />
        </PremiumGate>
      );
    };
  };
};

// Hook for premium feature checks with usage tracking
export const usePremiumFeature = (feature: string) => {
  const { checkPremiumAccess, showPaywallModal } = useSubscriptionStore();
  
  const hasAccess = checkPremiumAccess(feature);
  
  const requireAccess = (showPaywall = true, trackUsage = true) => {
    if (trackUsage) {
      subscriptionHelpers.trackPremiumFeatureUsage(feature, { attempted: true });
    }
    
    const access = subscriptionHelpers.requiresPremium(feature, showPaywall);
    return access;
  };
  
  const checkLimit = (currentUsage: number) => {
    return subscriptionHelpers.hasReachedLimit(feature, currentUsage);
  };
  
  const getLimit = () => {
    return subscriptionHelpers.getFeatureLimit(feature);
  };
  
  return {
    hasAccess,
    requireAccess,
    checkLimit,
    getLimit,
    showPaywall: () => showPaywallModal(feature),
  };
};

export default PremiumGate;