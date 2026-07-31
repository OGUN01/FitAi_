/**
 * WaterIntakeModal - Modal for logging water intake
 *
 * SINGLE SOURCE OF TRUTH: Uses hydrationStore
 *
 * Features:
 * - Quick add buttons (250ml, 500ml, 1L)
 * - Custom amount input
 * - Visual water progress indicator
 * - Consistent with app design system
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  interpolateColor,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { haptics } from '../../utils/haptics';
import { flatColors as colors, borderRadius, typography } from '../../theme/aurora-tokens';
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_MEDIUM } from '../../utils/colors';
import { rf, rp, rh, rw } from '../../utils/responsive';
import { ProgressRing } from '../ui/aurora/ProgressRing';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { GlassButton } from '../ui/aurora/GlassButton';

interface WaterIntakeModalProps {
  visible: boolean;
  onClose: () => void;
  onAddWater: (amountML: number) => void;
  currentIntakeML: number;
  goalML: number;
}

export const WaterIntakeModal: React.FC<WaterIntakeModalProps> = ({
  visible,
  onClose,
  onAddWater,
  currentIntakeML,
  goalML,
}) => {
  const insets = useSafeAreaInsets();
  const [customAmount, setCustomAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Calculate progress
  const currentLiters = currentIntakeML / 1000;
  const goalLiters = goalML / 1000;
  const progress = goalML > 0 ? Math.min((currentIntakeML / goalML) * 100, 100) : 0;
  // Guard goalML=0 (no water goal set): 0 >= 0 would falsely show "goal reached".
  const isGoalReached = goalML > 0 && currentIntakeML >= goalML;

  // Celebration: fire haptics.celebration ONCE when goal transitions to reached.
  // Ref-guard prevents re-firing on re-renders while goal stays reached.
  const celebratedRef = useRef(false);
  const ringGlow = useSharedValue(0);

  useEffect(() => {
    if (isGoalReached && !celebratedRef.current) {
      celebratedRef.current = true;
      haptics.celebration();
      ringGlow.value = withTiming(1, { duration: 600 });
    } else if (!isGoalReached && celebratedRef.current) {
      celebratedRef.current = false;
      ringGlow.value = withTiming(0, { duration: 400 });
    }
  }, [isGoalReached, ringGlow]);

  // Success accent — a soft green ring border that fades in around the progress
  // ring when the goal is reached. Editorial Dark depth comes from hairline
  // accents, not cast shadows (which read as dated glow on pure black).
  // Colors precomputed on the JS thread: hexToRgba is not a worklet, so calling
  // it inside useAnimatedStyle crashes the UI thread (reanimated 3.17).
  const glowBorderHidden = hexToRgba(colors.successAlt, 0.3);
  const glowBorderShown = hexToRgba(colors.successAlt, 0.8);
  const glowStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(ringGlow.value, [0, 1], [glowBorderHidden, glowBorderShown]),
    borderWidth: 2 * ringGlow.value,
  }));

  // Reset state when closing
  const handleClose = useCallback(() => {
    setCustomAmount('');
    setError(null);
    onClose();
  }, [onClose]);

  // Handle quick add — haptics handled by AnimatedPressable on press-in
  const handleQuickAdd = useCallback(
    (amountML: number) => {
      onAddWater(amountML);
      handleClose();
    },
    [onAddWater, handleClose]
  );

  // Handle custom amount submit — input is in milliliters
  const handleCustomSubmit = useCallback(() => {
    const amountML = parseFloat(customAmount);

    if (!customAmount || isNaN(amountML)) {
      setError('Please enter a valid amount');
      haptics.error();
      return;
    }

    if (amountML < 50 || amountML > 5000) {
      setError('Amount must be between 50ml and 5L');
      haptics.error();
      return;
    }

    haptics.success();
    onAddWater(amountML);
    handleClose();
  }, [customAmount, onAddWater, handleClose]);

  const quickOptions = [
    { label: '250ml', amount: 250, icon: 'water-outline' as const },
    { label: '500ml', amount: 500, icon: 'water' as const },
    { label: '1L', amount: 1000, icon: 'beaker-outline' as const },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss water intake modal"
          accessibilityHint="Closes the dialog without saving"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
              {/* Header */}
              <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIconDisc}>
                    <Ionicons name="water" size={rf(18)} color={colors.secondary} />
                  </View>
                  <Text style={styles.title}>Log Water Intake</Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  accessibilityHint="Closes the water intake dialog"
                >
                  <Ionicons name="chevron-down" size={rf(20)} color={colors.white} />
                </TouchableOpacity>
              </Animated.View>

              {/* Current Progress — hero ring */}
              <Animated.View
                entering={FadeInDown.delay(60).duration(400)}
                style={styles.progressSection}
              >
                <Text style={styles.progressLabel}>Today's Progress</Text>
                <Animated.View style={[styles.ringWrap, glowStyle]}>
                  <ProgressRing
                    progress={progress}
                    size={rw(150)}
                    strokeWidth={rw(12)}
                    gradient={!isGoalReached}
                    gradientColors={[colors.secondary, colors.primary]}
                    color={colors.successAlt}
                  >
                    <View style={styles.ringCenter}>
                      <View style={styles.ringInnerHighlight} />
                      <Text style={styles.ringValue}>{currentLiters.toFixed(1)}</Text>
                      <Text style={styles.ringUnit}>of {goalLiters.toFixed(1)}L</Text>
                      {progress > 0 && (
                        <Text style={styles.ringPercent}>{Math.round(progress)}%</Text>
                      )}
                    </View>
                  </ProgressRing>
                </Animated.View>
                {isGoalReached && (
                  <View style={styles.goalReachedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.successAlt} />
                    <Text style={styles.goalReachedText}>Daily goal achieved!</Text>
                  </View>
                )}
              </Animated.View>

              {/* Quick Add Options */}
              <Animated.View entering={FadeInDown.delay(120).duration(400)}>
                <Text style={styles.sectionTitle}>Quick Add</Text>
                <View style={styles.quickOptionsContainer}>
                  {quickOptions.map((option) => (
                    <AnimatedPressable
                      key={option.label}
                      onPress={() => handleQuickAdd(option.amount)}
                      scaleValue={0.94}
                      hapticType="light"
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${option.label} of water`}
                      accessibilityHint="Quickly adds this amount to today's water intake"
                      style={styles.quickOption}
                    >
                      <View style={styles.quickOptionPill}>
                        <View style={styles.quickOptionIconDisc}>
                          <Ionicons name={option.icon} size={rf(20)} color={colors.secondary} />
                        </View>
                        <Text style={styles.quickOptionLabel}>{option.label}</Text>
                      </View>
                    </AnimatedPressable>
                  ))}
                </View>
              </Animated.View>

              {/* Custom Amount Input - always visible for accessibility */}
              <Animated.View entering={FadeInDown.delay(180).duration(400)}>
                <Text style={styles.sectionTitle}>Custom Amount (Milliliters)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="water-outline"
                    size={20}
                    color={colors.secondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={customAmount}
                    onChangeText={(text) => {
                      setCustomAmount(text);
                      setError(null);
                    }}
                    placeholder="e.g., 250"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleCustomSubmit}
                  />
                  <Text style={styles.unitLabel}>ml</Text>
                </View>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color={colors.errorLight} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </Animated.View>

              {/* Add Water Button */}
              <Animated.View entering={FadeInDown.delay(240).duration(400)}>
                <GlassButton
                  label="Add Water"
                  onPress={handleCustomSubmit}
                  icon="add"
                  fullWidth
                  accessibilityLabel="Add water"
                />
              </Animated.View>
            </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: rp(24),
    paddingTop: rp(20),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rp(20),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(10),
  },
  headerIconDisc: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    backgroundColor: hexToRgba(colors.secondary, TINT_ALPHA_LOW),
    borderWidth: 1,
    borderColor: hexToRgba(colors.secondary, TINT_ALPHA_MEDIUM),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: rf(20),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.white,
  },
  closeButton: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    marginBottom: rp(24),
  },
  progressLabel: {
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: rp(12),
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    // Editorial Dark: depth from the ring stroke + hairline border accent,
    // not a cast shadow (which reads as dated glow on pure black).
    borderRadius: rw(150) / 2,
    padding: rw(8),
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInnerHighlight: {
    position: 'absolute',
    width: rw(150) - rw(24),
    height: rw(150) - rw(24),
    borderRadius: (rw(150) - rw(24)) / 2,
    borderWidth: 1,
    borderColor: hexToRgba(colors.white, 0.06),
  },
  ringValue: {
    fontSize: rf(34),
    fontWeight: String(typography.fontWeight.extrabold) as any,
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  ringUnit: {
    fontSize: rf(12),
    color: colors.textTertiary,
    marginTop: rh(2),
    fontVariant: ['tabular-nums'],
  },
  ringPercent: {
    fontSize: rf(12),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.secondary,
    marginTop: rh(4),
    fontVariant: ['tabular-nums'],
  },
  goalReachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(6),
    marginTop: rp(12),
  },
  goalReachedText: {
    fontSize: rf(13),
    color: colors.successAlt,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
  sectionTitle: {
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: rp(12),
  },
  quickOptionsContainer: {
    flexDirection: 'row',
    gap: rp(12),
    marginBottom: rp(20),
  },
  quickOption: {
    flex: 1,
  },
  quickOptionPill: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: rp(16),
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: hexToRgba(colors.secondary, TINT_ALPHA_MEDIUM),
    backgroundColor: hexToRgba(colors.secondary, TINT_ALPHA_LOW),
  },
  quickOptionIconDisc: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    backgroundColor: hexToRgba(colors.secondary, TINT_ALPHA_MEDIUM),
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickOptionLabel: {
    fontSize: rf(14),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.white,
    marginTop: rp(8),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: rp(16),
    marginBottom: rp(16),
    borderWidth: 1,
    borderColor: hexToRgba(colors.secondary, TINT_ALPHA_MEDIUM),
  },
  inputIcon: {
    marginRight: rp(12),
  },
  input: {
    flex: 1,
    fontSize: rf(18),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.white,
    paddingVertical: rp(16),
  },
  unitLabel: {
    fontSize: rf(16),
    fontWeight: String(typography.fontWeight.medium) as any,
    color: colors.textMuted,
    marginLeft: rp(8),
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(8),
    marginBottom: rp(16),
    paddingHorizontal: rp(12),
    paddingVertical: rp(10),
    borderRadius: borderRadius.md,
    backgroundColor: hexToRgba(colors.error, TINT_ALPHA_LOW),
    borderWidth: 1,
    borderColor: hexToRgba(colors.error, TINT_ALPHA_MEDIUM),
  },
  errorText: {
    flex: 1,
    fontSize: rf(13),
    color: colors.errorLight,
  },
});

export default WaterIntakeModal;
