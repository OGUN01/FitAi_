/**
 * RecoveryTipsModal Component
 * Displays recovery tips and recommendations for rest days
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../../utils/constants';
import { rf, rw, rh } from '../../../utils/responsive';

interface RecoveryTipsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface RecoveryTip {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  gradient: [string, string];
  duration?: string;
}

const RECOVERY_TIPS: RecoveryTip[] = [
  {
    id: 'sleep',
    icon: 'moon',
    title: 'Prioritize Sleep',
    description: 'Aim for 7-9 hours of quality sleep. Your muscles repair and grow during deep sleep cycles.',
    gradient: ['#667eea', '#764ba2'],
    duration: '7-9 hours',
  },
  {
    id: 'hydration',
    icon: 'water',
    title: 'Stay Hydrated',
    description: 'Drink plenty of water throughout the day. Proper hydration aids muscle recovery and reduces soreness.',
    gradient: ['#2196F3', '#03A9F4'],
    duration: '8+ glasses',
  },
  {
    id: 'stretching',
    icon: 'body',
    title: 'Light Stretching',
    description: 'Gentle stretching improves blood flow and flexibility. Focus on areas that feel tight or sore.',
    gradient: ['#11998e', '#38ef7d'],
    duration: '10-15 min',
  },
  {
    id: 'nutrition',
    icon: 'nutrition',
    title: 'Protein & Nutrients',
    description: 'Eat protein-rich foods to support muscle repair. Include anti-inflammatory foods like berries and leafy greens.',
    gradient: ['#FF6B6B', '#FF8E53'],
  },
  {
    id: 'walking',
    icon: 'walk',
    title: 'Active Recovery',
    description: 'A light 20-30 minute walk promotes blood circulation without stressing your muscles.',
    gradient: ['#f093fb', '#f5576c'],
    duration: '20-30 min',
  },
  {
    id: 'foam-rolling',
    icon: 'fitness',
    title: 'Foam Rolling',
    description: 'Self-myofascial release helps reduce muscle tension and can speed up recovery time.',
    gradient: ['#4facfe', '#00f2fe'],
    duration: '5-10 min',
  },
];

const RecoveryTipCard: React.FC<{ tip: RecoveryTip; index: number }> = ({ tip, index }) => {
  return (
    <Animated.View 
      entering={FadeInDown.delay(100 + index * 80).duration(400).springify()}
      style={styles.tipCard}
    >
      <View style={styles.tipContent}>
        <LinearGradient
          colors={tip.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tipIconContainer}
        >
          <Ionicons name={tip.icon} size={rf(20)} color="#fff" />
        </LinearGradient>
        <View style={styles.tipTextContainer}>
          <View style={styles.tipHeader}>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            {tip.duration && (
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={rf(10)} color={ResponsiveTheme.colors.textSecondary} />
                <Text style={styles.durationText}>{tip.duration}</Text>
              </View>
            )}
          </View>
          <Text style={styles.tipDescription}>{tip.description}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

export const RecoveryTipsModal: React.FC<RecoveryTipsModalProps> = ({
  visible,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <Animated.View 
            entering={FadeInUp.duration(400).springify()}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.headerIconContainer}
                >
                  <Ionicons name="leaf" size={rf(24)} color="#fff" />
                </LinearGradient>
                <View style={styles.headerText}>
                  <Text style={styles.headerTitle}>Recovery Tips</Text>
                  <Text style={styles.headerSubtitle}>Rest Day Recommendations</Text>
                </View>
                <AnimatedPressable
                  onPress={onClose}
                  scaleValue={0.9}
                  hapticFeedback={true}
                  hapticType="light"
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={rf(24)} color={ResponsiveTheme.colors.textSecondary} />
                </AnimatedPressable>
              </View>

              {/* Content */}
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Intro Card */}
                <Animated.View entering={FadeIn.delay(50).duration(300)}>
                  <View style={styles.introCard}>
                    <Ionicons name="sparkles" size={rf(18)} color="#FFD700" />
                    <Text style={styles.introText}>
                      Rest days are crucial for muscle recovery, preventing overtraining, and achieving your fitness goals. Here's how to make the most of your recovery:
                    </Text>
                  </View>
                </Animated.View>

                {/* Tips List */}
                {RECOVERY_TIPS.map((tip, index) => (
                  <RecoveryTipCard key={tip.id} tip={tip} index={index} />
                ))}

                {/* Bottom Quote */}
                <Animated.View entering={FadeInDown.delay(600).duration(400)}>
                  <View style={styles.quoteContainer}>
                    <Text style={styles.quoteText}>
                      "Recovery is not a sign of weakness, it's a sign of wisdom."
                    </Text>
                    <Text style={styles.quoteAuthor}>— Smart Training Philosophy</Text>
                  </View>
                </Animated.View>
              </ScrollView>

              {/* Footer Button */}
              <View style={styles.footer}>
                <AnimatedPressable
                  onPress={onClose}
                  scaleValue={0.96}
                  hapticFeedback={true}
                  hapticType="medium"
                  style={styles.gotItButton}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gotItButtonGradient}
                  >
                    <Text style={styles.gotItButtonText}>Got It!</Text>
                    <Ionicons name="checkmark-circle" size={rf(18)} color="#fff" />
                  </LinearGradient>
                </AnimatedPressable>
              </View>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '85%',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: ResponsiveTheme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerIconContainer: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: ResponsiveTheme.spacing.md,
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
  },
  headerSubtitle: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    maxHeight: rh(400),
  },
  scrollContent: {
    padding: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.md,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.sm,
  },
  introText: {
    flex: 1,
    fontSize: rf(13),
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(20),
  },
  tipCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: 'hidden',
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.md,
  },
  tipIconContainer: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipTextContainer: {
    flex: 1,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tipTitle: {
    fontSize: rf(14),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    paddingVertical: 2,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  durationText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
  },
  tipDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },
  quoteContainer: {
    marginTop: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  quoteText: {
    fontSize: rf(13),
    fontStyle: 'italic',
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(20),
  },
  quoteAuthor: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  footer: {
    padding: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  gotItButton: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: 'hidden',
  },
  gotItButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  gotItButtonText: {
    fontSize: rf(15),
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});

export default RecoveryTipsModal;

