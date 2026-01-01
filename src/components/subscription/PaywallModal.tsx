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
  Dimensions,
  StyleSheet
} from 'react-native';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
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
  }, [availablePlans, selectedPlan]);

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
    if (plan.isPopular) return { text: '🔥 MOST POPULAR', color: '#f97316' };
    if (plan.discount) return { text: `${plan.discount}% OFF`, color: '#22c55e' };
    if (plan.period === 'lifetime') return { text: '⭐ BEST VALUE', color: '#a855f7' };
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
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.headerText}>
                  <Text style={styles.headerTitle}>
                    {getFeatureTitle(feature)}
                  </Text>
                  <Text style={styles.headerDescription}>
                    {description}
                  </Text>
                </View>

                <Pressable
                  onPress={onClose}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </Pressable>
              </View>

              {/* Trial Info */}
              {trialInfo.isEligible && (
                <View style={styles.trialBanner}>
                  <Text style={styles.trialTitle}>
                    🎁 Start your FREE trial today!
                  </Text>
                  <Text style={styles.trialDescription}>
                    Try all premium features free for 7-14 days
                  </Text>
                </View>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
              {/* Subscription Plans */}
              <View style={styles.plansSection}>
                <Text style={styles.sectionTitle}>
                  Choose Your Plan
                </Text>

                <View style={styles.plansList}>
                  {availablePlans.map((plan) => {
                    const badge = getPlanBadge(plan);
                    const isSelected = selectedPlan === plan.id;

                    return (
                      <Pressable
                        key={plan.id}
                        onPress={() => setSelectedPlan(plan.id)}
                        style={[
                          styles.planCard,
                          isSelected ? styles.planCardSelected : styles.planCardUnselected
                        ]}
                      >
                        {/* Badge */}
                        {badge && (
                          <View style={[styles.badge, { backgroundColor: badge.color }]}>
                            <Text style={styles.badgeText}>
                              {badge.text}
                            </Text>
                          </View>
                        )}

                        <View style={styles.planContent}>
                          <View style={styles.planInfo}>
                            <Text style={styles.planName}>
                              {plan.name}
                            </Text>

                            <Text style={styles.planDescription}>
                              {plan.description}
                            </Text>

                            {plan.freeTrialDays && trialInfo.isEligible && (
                              <Text style={styles.trialText}>
                                {plan.freeTrialDays} days free trial
                              </Text>
                            )}
                          </View>

                          <View style={styles.planPricing}>
                            <Text style={styles.planPrice}>
                              {plan.price}
                            </Text>

                            {plan.originalPrice && (
                              <Text style={styles.originalPrice}>
                                {plan.originalPrice}
                              </Text>
                            )}

                            <Text style={styles.planPeriod}>
                              {plan.period === 'lifetime' ? 'one time' : `per ${plan.period.slice(0, -2)}`}
                            </Text>
                          </View>
                        </View>

                        {/* Selection Indicator */}
                        <View style={styles.selectionIndicator}>
                          {isSelected && (
                            <View style={styles.checkmark}>
                              <Text style={styles.checkmarkText}>✓</Text>
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Features List */}
              <View style={styles.featuresSection}>
                <Pressable
                  onPress={() => setShowFeatures(!showFeatures)}
                  style={styles.featuresHeader}
                >
                  <Text style={styles.featuresTitle}>
                    Premium Features
                  </Text>
                  <Text style={styles.featuresToggle}>
                    {showFeatures ? '⌃' : '⌄'}
                  </Text>
                </Pressable>

                {showFeatures && selectedPlanData && (
                  <View style={styles.featuresList}>
                    {selectedPlanData.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <Text style={styles.featureIcon}>
                          {getFeatureIcon(feature)}
                        </Text>
                        <Text style={styles.featureText}>
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
              {/* Error Message */}
              {purchaseError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>
                    {purchaseError}
                  </Text>
                </View>
              )}

              {/* Purchase Button */}
              <Pressable
                onPress={handlePurchase}
                disabled={isPurchasing || !selectedPlan}
                style={[
                  styles.purchaseButton,
                  (isPurchasing || !selectedPlan) && styles.purchaseButtonDisabled
                ]}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.purchaseButtonText}>
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
                style={styles.restoreButton}
              >
                <Text style={styles.restoreButtonText}>
                  Restore Previous Purchases
                </Text>
              </Pressable>

              {/* Terms */}
              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6b7280',
  },
  trialBanner: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  trialDescription: {
    fontSize: 14,
    color: '#1e40af',
  },
  scrollView: {
    flex: 1,
  },
  plansSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  plansList: {
    gap: 12,
  },
  planCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  planCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  planCardUnselected: {
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  planContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planInfo: {
    flex: 1,
    marginRight: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  trialText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  planPricing: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  planPeriod: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 24,
    height: 24,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  featuresSection: {
    padding: 20,
    paddingTop: 0,
  },
  featuresHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  featuresToggle: {
    fontSize: 24,
    color: '#6b7280',
  },
  featuresList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  bottomActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  purchaseButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    padding: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  termsContainer: {
    marginTop: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default PaywallModal;
