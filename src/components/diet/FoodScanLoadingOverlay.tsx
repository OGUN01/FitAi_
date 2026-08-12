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

// Elapsed-time based status copy. Unlike a fixed-interval text cycle, this
// reflects how long the request has actually been running so a 1s request
// and a 30s request don't show identical, meaningless "still analyzing"
// copy — the message only changes when there is something honest to say.
const STATUS_STAGES: Array<{ afterSeconds: number; text: string }> = [
  { afterSeconds: 0, text: 'Analyzing your meal...' },
  { afterSeconds: 10, text: 'Still working — this can take a moment...' },
  { afterSeconds: 20, text: 'Almost there...' },
  { afterSeconds: 30, text: 'Taking longer than usual, hang tight...' },
];

const getStatusText = (elapsedSeconds: number): string => {
  let text = STATUS_STAGES[0].text;
  for (const stage of STATUS_STAGES) {
    if (elapsedSeconds >= stage.afterSeconds) {
      text = stage.text;
    }
  }
  return text;
};

interface FoodScanLoadingOverlayProps {
  visible: boolean;
  /** Optional cancel callback. When provided, renders a subtle "Cancel" text button below the status text. */
  onCancel?: () => void;
}

export const FoodScanLoadingOverlay: React.FC<FoodScanLoadingOverlayProps> = ({
  visible,
  onCancel,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setElapsedSeconds(0);
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
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

  const statusText = getStatusText(elapsedSeconds);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <AuroraSpinner size="lg" theme="primary" />
          <Animated.Text key={statusText} entering={FadeIn.duration(400)} style={styles.text}>
            {statusText}
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
