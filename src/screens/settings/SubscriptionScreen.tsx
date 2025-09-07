// Subscription Management Screen
// View and manage premium subscription

import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  Alert, 
  ActivityIndicator,
  Linking,
  Platform 
} from 'react-native';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import PremiumBadge from '../../components/subscription/PremiumBadge';
import PaywallModal from '../../components/subscription/PaywallModal';

const SubscriptionScreen: React.FC = () => {
  const {
    isLoading,
    subscriptionStatus,
    availablePlans,
    trialInfo,
    showPaywall,
    showPaywallModal,
    hidePaywallModal,
    restorePurchases,
    getSubscriptionAnalytics,
  } = useSubscriptionStore();
  
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    // Load subscription analytics
    const data = getSubscriptionAnalytics();
    setAnalytics(data);
  }, [getSubscriptionAnalytics]);

  const handleManageSubscription = () => {
    const url = Platform.select({
      ios: 'https://apps.apple.com/account/subscriptions',
      android: 'https://play.google.com/store/account/subscriptions',
      default: 'https://support.google.com/googleplay/answer/7018481',
    });
    
    Alert.alert(
      'Manage Subscription',
      'You will be redirected to your app store to manage your subscription.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: () => Linking.openURL(url) 
        }
      ]
    );
  };

  const handleRestorePurchases = async () => {
    Alert.alert(
      'Restore Purchases',
      'This will restore any previous purchases made with this Apple/Google account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            await restorePurchases();
            Alert.alert('Restore Complete', 'Your purchases have been restored.');
          }
        }
      ]
    );
  };

  const getPremiumFeatures = () => [
    { icon: '🚀', text: 'Unlimited AI workout generation' },
    { icon: '🍽️', text: 'Advanced meal planning with macros' },
    { icon: '📊', text: 'Detailed analytics and insights' },
    { icon: '🏆', text: 'Exclusive achievements and badges' },
    { icon: '💪', text: 'Personalized coaching recommendations' },
    { icon: '🎯', text: 'Advanced goal setting and tracking' },
    { icon: '📱', text: 'Multiple device sync' },
    { icon: '🌙', text: 'Dark mode and premium themes' },
    { icon: '📈', text: 'Export workout and nutrition data' },
    { icon: '🔔', text: 'Smart notifications and reminders' },
    { icon: '🎵', text: 'Premium workout music integration' },
    { icon: '📸', text: 'Progress photo analysis with AI' },
    { icon: '🏃‍♂️', text: 'Advanced wearable integration' },
    { icon: '👥', text: 'Premium community features' },
    { icon: '❌', text: 'Remove all ads' },
  ];

  if (isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 dark:text-gray-400 mt-4">
          Loading subscription details...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="p-6 bg-gradient-to-r from-blue-500 to-purple-600">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-bold">
              FitAI Premium
            </Text>
            <Text className="text-white/90 text-base mt-1">
              Your subscription status
            </Text>
          </View>
          
          <View className="items-end">
            <PremiumBadge size="large" variant="badge" />
          </View>
        </View>
      </View>

      {/* Current Status */}
      <View className="p-6">
        <View className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Status
          </Text>
          
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-400">Plan</Text>
              <Text className="text-gray-900 dark:text-white font-medium capitalize">
                {subscriptionStatus.plan === 'free' ? 'Free Tier' : subscriptionStatus.plan}
              </Text>
            </View>
            
            {subscriptionStatus.isPremium && (
              <>
                {subscriptionStatus.purchaseDate && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600 dark:text-gray-400">Started</Text>
                    <Text className="text-gray-900 dark:text-white font-medium">
                      {new Date(subscriptionStatus.purchaseDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                
                {subscriptionStatus.expiryDate && subscriptionStatus.plan !== 'lifetime' && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600 dark:text-gray-400">Expires</Text>
                    <Text className="text-gray-900 dark:text-white font-medium">
                      {new Date(subscriptionStatus.expiryDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">Auto-Renew</Text>
                  <Text className="text-gray-900 dark:text-white font-medium">
                    {subscriptionStatus.autoRenewing ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </>
            )}
            
            {trialInfo.daysRemaining > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Trial Days Left</Text>
                <Text className="text-blue-600 dark:text-blue-400 font-bold">
                  {trialInfo.daysRemaining} days
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Analytics */}
      {analytics && subscriptionStatus.isPremium && (
        <View className="px-6 pb-6">
          <View className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Your Stats
            </Text>
            
            <View className="grid grid-cols-2 gap-4">
              <View className="bg-white dark:bg-gray-700 rounded-lg p-4">
                <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analytics.daysSinceSubscribed}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  Days as Premium
                </Text>
              </View>
              
              <View className="bg-white dark:bg-gray-700 rounded-lg p-4">
                <Text className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${analytics.totalSpent.toFixed(2)}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  Total Invested
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Actions */}
      <View className="px-6 pb-6">
        <View className="space-y-4">
          {!subscriptionStatus.isPremium && (
            <Pressable
              onPress={showPaywallModal}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl py-4 px-6 items-center"
            >
              <Text className="text-white font-bold text-lg">
                ⭐ Upgrade to Premium
              </Text>
            </Pressable>
          )}
          
          {subscriptionStatus.isPremium && subscriptionStatus.plan !== 'lifetime' && (
            <Pressable
              onPress={handleManageSubscription}
              className="bg-blue-500 rounded-xl py-4 px-6 items-center"
            >
              <Text className="text-white font-bold">
                Manage Subscription
              </Text>
            </Pressable>
          )}
          
          <Pressable
            onPress={handleRestorePurchases}
            className="bg-gray-200 dark:bg-gray-700 rounded-xl py-4 px-6 items-center"
          >
            <Text className="text-gray-800 dark:text-white font-medium">
              Restore Purchases
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Premium Features List */}
      <View className="px-6 pb-8">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Premium Features
        </Text>
        
        <View className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <View className="space-y-4">
            {getPremiumFeatures().map((feature, index) => (
              <View key={index} className="flex-row items-center">
                <Text className="text-2xl mr-3">{feature.icon}</Text>
                <Text className={`flex-1 ${
                  subscriptionStatus.isPremium 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {feature.text}
                </Text>
                {subscriptionStatus.isPremium && (
                  <Text className="text-green-500 text-lg">✓</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Trial Banner */}
      {trialInfo.isEligible && !subscriptionStatus.isPremium && (
        <View className="px-6 pb-6">
          <View className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6">
            <Text className="text-white font-bold text-lg mb-2">
              🎁 Start Your Free Trial
            </Text>
            <Text className="text-white/90 mb-4">
              Try all premium features free for 7-14 days. Cancel anytime.
            </Text>
            <Pressable
              onPress={showPaywallModal}
              className="bg-white rounded-lg py-3 px-6 self-start"
            >
              <Text className="text-blue-600 font-bold">
                Start Free Trial
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Legal Links */}
      <View className="px-6 pb-8">
        <View className="flex-row justify-center space-x-6">
          <Pressable onPress={() => {}}>
            <Text className="text-blue-500 text-sm">Terms of Service</Text>
          </Pressable>
          <Pressable onPress={() => {}}>
            <Text className="text-blue-500 text-sm">Privacy Policy</Text>
          </Pressable>
        </View>
      </View>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={hidePaywallModal}
        title="Upgrade to FitAI Premium"
        description="Unlock unlimited AI workouts, advanced analytics, and premium features!"
      />
    </ScrollView>
  );
};

export default SubscriptionScreen;