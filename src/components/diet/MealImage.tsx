import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { DayMeal } from '../../types/ai';
import { borderRadius, flatColors as colors } from '../../theme/aurora-tokens';
import { rf } from '../../utils/responsive';

export interface MealImageProps {
  /** Meal photo URL. Absent or failed → gradient fallback with the meal-type icon. */
  uri?: string;
  meal: DayMeal;
  /** Square-ish thumbnail size (width & height). @default 72 */
  size?: number;
  testID?: string;
}

const mealIcon = (type: DayMeal['type']): keyof typeof Ionicons.glyphMap => {
  if (type === 'breakfast') return 'sunny';
  if (type === 'dinner') return 'moon';
  if (type === 'snack') return 'cafe';
  return 'restaurant';
};

/**
 * Meal thumbnail with a deterministic local gradient fallback.
 *
 * Renders the real `meal.imageUrl` when available; otherwise (or if the image
 * fails to load) shows a gradient placeholder with the meal-type icon so the
 * card never shows broken-image chrome. Spec: diet-ui-overhaul §Visual System.
 */
export const MealImage: React.FC<MealImageProps> = ({ uri, meal, size = 72, testID }) => {
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [uri]);

  const fallbackTestID = testID ? `meal-image-fallback-${meal.id}` : undefined;

  if (!uri || failed) {
    return (
      <LinearGradient
        colors={[colors.backgroundTertiary, colors.backgroundSecondary]}
        testID={fallbackTestID}
        style={[styles.image, { width: size, height: size, borderRadius: borderRadius.md }]}
      >
        <Ionicons
          name={mealIcon(meal.type)}
          size={rf(Math.round(size * 0.36))}
          color={colors.primary}
        />
      </LinearGradient>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, { width: size, height: size, borderRadius: borderRadius.md }]}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityLabel={`${meal.name} meal`}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MealImage;
