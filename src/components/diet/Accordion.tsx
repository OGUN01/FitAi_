import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
} from '../../theme/aurora-tokens';
import { rf } from '../../utils/responsive';

export interface AccordionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  testID?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  title,
  subtitle,
  defaultOpen = false,
  children,
  testID,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const rotation = useSharedValue(defaultOpen ? 1 : 0);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    rotation.value = withTiming(next ? 1 : 0);
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(rotation.value, [0, 1], [0, 90])}deg`,
      },
    ],
  }));

  return (
    <View style={styles.container} testID={testID}>
      <AnimatedPressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={styles.subtitle}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-forward" size={rf(18)} color={colors.textSecondary} />
        </Animated.View>
      </AnimatedPressable>
      {isOpen ? (
        <Animated.View entering={FadeInUp.duration(300)} style={styles.content}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: rf(fontSize.md),
    fontWeight: '700' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: rf(fontSize.xs),
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  content: {
    overflow: 'hidden',
    paddingBottom: spacing.md,
  },
});

export default Accordion;
