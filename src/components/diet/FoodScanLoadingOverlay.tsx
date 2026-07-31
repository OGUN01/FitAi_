import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AuroraSpinner } from '../ui/aurora/AuroraSpinner';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
} from '../../theme/aurora-tokens';
import { rf } from '../../utils/responsive';

const CYCLING_TEXTS = [
  'Analyzing your meal...',
  'Identifying foods...',
  'Calculating nutrition...',
  'Estimating portions...',
];

interface FoodScanLoadingOverlayProps {
  visible: boolean;
  /** Optional cancel callback. When provided, renders a subtle "Cancel" text button below the status text. */
  onCancel?: () => void;
}

export const FoodScanLoadingOverlay: React.FC<FoodScanLoadingOverlayProps> = ({
  visible,
  onCancel,
}) => {
  const [textIndex, setTextIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setTextIndex(0);
      intervalRef.current = setInterval(() => {
        setTextIndex((prev) => (prev + 1) % CYCLING_TEXTS.length);
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <AuroraSpinner size="lg" theme="primary" />
          <Animated.Text key={textIndex} entering={FadeIn.duration(400)} style={styles.text}>
            {CYCLING_TEXTS[textIndex]}
          </Animated.Text>
          {onCancel && (
            <TouchableOpacity
              onPress={onCancel}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel scan"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl * 1.5,
    alignItems: 'center',
    gap: spacing.lg,
    minWidth: 220,
  },
  text: {
    fontSize: rf(15),
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
  cancelText: {
    fontSize: rf(fontSize.sm),
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default FoodScanLoadingOverlay;
