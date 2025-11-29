// Paywall Modal Component
// Beautiful premium subscription upgrade modal

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  Pressable, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Dimensions 
} from 'react-native';
import { useSubscriptionStore, subscriptionHelpers } from '../../stores/subscriptionStore';
import { SubscriptionPlan } from '../../services/SubscriptionService';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
  title?: string;
  description?: string;
}

const { width: screenWidth } = Dimensions.get('window');

const PaywallModal: React.FC<PaywallModalProps> = ({
  visible,
  onClose,
  feature,
  title = 'Upgrade to Premium',
  description = 'Unlock all premium features and take your fitness journey to the next level!'
}) => {
  const { 
    availablePlans, 
    isPurchasing, 
    purchaseError, 
    trialInfo,
    purchasePlan, 
    restorePurchases 
  } = useSubscriptionStore();
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showFeatures, setShowFeatures] = useState(false);

  useEffect(() => {
    if (availablePlans.length > 0 && !selectedPlan) {
      // Default to yearly plan (most popular)
      const yearlyPlan = availablePlans.find(p => p.period === 'yearly');
      setSelectedPlan(yearlyPlan?.id || availablePlans[0]?.id);
    }
  }, [availablePlans]);

  const handlePurchase = async () => {
    if (!selectedPlan) return;

    try {
      const result = await purchasePlan(selectedPlan);
      
      if (result.success) {
        Alert.alert(
          '🎉 Welcome to Premium!',
          'Your subscription is now active. Enjoy all premium features!',
          [{ text: 'Get Started', onPress: onClose }]
        );
      }
    } catch (error) {
      console.error('Purchase error:', error);
    }
  };

  const handleRestore = async () => {
    await restorePurchases();
    Alert.alert(
      'Restore Complete',
      'Your previous purchases have been restored.',
      [{ text: 'OK' }]
    );
  };

  const getPlanBadge = (plan: SubscriptionPlan) => {
    if (plan.isPopular) return { text: '🔥 MOST POPULAR', color: 'bg-orange-500' };
    if (plan.discount) return { text: `${plan.discount}% OFF`, color: 'bg-green-500' };
    if (plan.period === 'lifetime') return { text: '⭐ BEST VALUE', color: 'bg-purple-500' };
    return null;
  };

  const getFeatureIcon = (feature: string) => {
    const icons: Record<string, string> = {
      'Unlimited AI workout generation': '🚀',
      'Advanced meal planning': '🍽️',
      'Detailed analytics': '📊',
      'Exclusive achievements': '🏆',
      'Personalized coaching': '💪',
      'Advanced goal setting': '🎯',
      'Multiple device sync': '📱',
      'Dark mode and themes': '🌙',
      'Export data': '📈',
      'Smart notifications': '🔔',
      'Premium music': '🎵',
      'AI photo analysis': '📸',
      'Advanced wearables': '🏃‍♂️',
      'Premium community': '👥',
      'Remove all ads': '❌',
    };
    
    return icons[feature] || '✨';
  };

  const getFeatureTitle = (feature?: string) => {
    const titles: Record<string, string> = {
      'unlimited_ai': 'Unlimited AI Workouts',
      'advanced_analytics': 'Advanced Analytics',
      'custom_themes': 'Custom Themes',
      'export_data': 'Export Your Data',
      'premium_achievements': 'Premium Achievements',
      'advanced_workouts': 'Advanced Workouts',
      'multi_device_sync': 'Multi-Device Sync',
      'premium_community': 'Premium Community',
    };
    
    return titles[feature || ''] || title;
  };

  if (!visible) return null;

  const selectedPlanData = availablePlans.find(p => p.id === selectedPlan);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70">
        <View className="flex-1 justify-end">
          <View className="bg-white dark:bg-gray-900 rounded-t-3xl max-h-[85%]">
            {/* Header */}
            <View className="p-6 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                    {getFeatureTitle(feature)}
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400 mt-1">
                    {description}
                  </Text>
                </View>
                
                <Pressable
                  onPress={onClose}
                  className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center"
                >
                  <Text className="text-gray-600 dark:text-gray-400 text-lg">×</Text>
                </Pressable>
              </View>
              
              {/* Trial Info */}
              {trialInfo.isEligible && (
                <View className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 mt-4">
                  <Text className="text-blue-800 dark:text-blue-200 font-semibold">
                    🎁 Start your FREE trial today!
                  </Text>
                  <Text className="text-blue-600 dark:text-blue-300 text-sm mt-1">
                    Try all premium features free for 7-14 days
                  </Text>
                </View>
              )}
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {/* Subscription Plans */}
              <View className="p-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Choose Your Plan
                </Text>
                
                <View className="space-y-4">
                  {availablePlans.map((plan) => {
                    const badge = getPlanBadge(plan);
                    const isSelected = selectedPlan === plan.id;
                    
                    return (
                      <Pressable
                        key={plan.id}
                        onPress={() => setSelectedPlan(plan.id)}
                        className={`relative border-2 rounded-xl p-4 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}
                      >
                        {/* Badge */}
                        {badge && (
                          <View className={`absolute -top-2 left-4 ${badge.color} rounded-full px-3 py-1`}>
                            <Text className="text-white text-xs font-bold">
                              {badge.text}
                            </Text>
                          </View>
                        )}
                        
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <Text className={`text-lg font-semibold ${
                              isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                            }`}>
                              {plan.name}
                            </Text>
                            
                            <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                              {plan.description}
                            </Text>
                            
                            {plan.freeTrialDays && trialInfo.isEligible && (
                              <Text className="text-green-600 dark:text-green-400 text-sm font-medium mt-1">
                                {plan.freeTrialDays} days free trial
                              </Text>
                            )}
                          </View>
                          
                          <View className="items-end">
                            <Text className={`text-xl font-bold ${
                              isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                            }`}>
                              {plan.price}
                            </Text>
                            
                            {plan.originalPrice && (
                              <Text className="text-gray-500 text-sm line-through">
                                {plan.originalPrice}
                              </Text>
                            )}
                            
                            <Text className="text-gray-500 text-xs">
                              {plan.period === 'lifetime' ? 'one time' : `per ${plan.period.slice(0, -2)}`}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Selection Indicator */}
                        <View className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && (
                            <View className="w-full h-full items-center justify-center">
                              <Text className="text-white text-xs">✓</Text>
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Features List */}
              <View className="px-6 pb-6">
                <Pressable
                  onPress={() => setShowFeatures(!showFeatures)}
                  className="flex-row items-center justify-between py-3"
                >
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                    Premium Features
                  </Text>
                  <Text className={`text-blue-500 transition-transform ${
                    showFeatures ? 'rotate-180' : ''
                  }`}>
                    ⌄
                  </Text>
                </Pressable>
                
                {showFeatures && selectedPlanData && (
                  <View className="space-y-3 mt-2">
                    {selectedPlanData.features.map((feature, index) => (
                      <View key={index} className="flex-row items-center">
                        <Text className="text-2xl mr-3">
                          {getFeatureIcon(feature)}
                        </Text>
                        <Text className="text-gray-700 dark:text-gray-300 flex-1">
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View className="p-6 border-t border-gray-200 dark:border-gray-700">
              {/* Error Message */}
              {purchaseError && (
                <View className="bg-red-50 dark:bg-red-900/30 rounded-xl p-3 mb-4">
                  <Text className="text-red-600 dark:text-red-400 text-center">
                    {purchaseError}
                  </Text>
                </View>
              )}
              
              {/* Purchase Button */}
              <Pressable
                onPress={handlePurchase}
                disabled={isPurchasing || !selectedPlan}
                className={`rounded-xl py-4 px-6 items-center ${
                  isPurchasing || !selectedPlan
                    ? 'bg-gray-300 dark:bg-gray-700'
                    : 'bg-blue-500 dark:bg-blue-600'
                }`}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    {trialInfo.isEligible && selectedPlanData?.freeTrialDays
                      ? `Start ${selectedPlanData.freeTrialDays}-Day Free Trial`
                      : `Subscribe for ${selectedPlanData?.price || ''}`
                    }
                  </Text>
                )}
              </Pressable>
              
              {/* Restore Purchases */}
              <Pressable
                onPress={handleRestore}
                className="py-3 items-center"
              >
                <Text className="text-blue-500 dark:text-blue-400">
                  Restore Previous Purchases
                </Text>
              </Pressable>
              
              {/* Terms */}
              <View className="items-center mt-2">
                <Text className="text-gray-500 dark:text-gray-400 text-xs text-center">
                  Subscription automatically renews. Cancel anytime in your {'\n'}
                  App Store or Google Play account settings.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PaywallModal;