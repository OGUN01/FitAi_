import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rbr, rf } from '../../utils/responsive';

interface RatingSelectorProps {
  value: number;
  onRatingChange: (rating: number) => void;
  maxRating?: number;
  type?: "stars" | "difficulty" | "satisfaction" | "intensity";
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
}

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export const RatingSelector: React.FC<RatingSelectorProps> = ({
  value,
  onRatingChange,
  maxRating = 5,
  type = "stars",
  label,
  showValue = true,
  disabled = false,
  size = "md",
  style,
}) => {
  const [hoveredRating, setHoveredRating] = useState(0);
  // Animated.Value must live in a ref so it persists across renders without
  // being recreated (the prior useState pattern created new Animated.Values
  // on every render and leaked the animation bindings).
  const animatedValuesRef = useRef<Animated.Value[]>(
    Array.from({ length: maxRating }, () => new Animated.Value(1)),
  );

  const getIconName = (isHighlighted: boolean): IconName => {
    switch (type) {
      case "stars":
        return isHighlighted ? "star" : "star-outline";
      case "difficulty":
        return isHighlighted ? "flame" : "ellipse-outline";
      case "satisfaction":
        return isHighlighted ? "happy-outline" : "sad-outline";
      case "intensity":
        return isHighlighted ? "fitness" : "ellipse-outline";
      default:
        return isHighlighted ? "star" : "star-outline";
    }
  };

  const getColor = (index: number) => {
    const rating = hoveredRating || value;
    const isHighlighted = index < rating;

    if (!isHighlighted) return colors.textMuted;

    switch (type) {
      case "stars":
        return colors.warning;
      case "difficulty":
        return rating <= 2
          ? colors.success
          : rating <= 4
            ? colors.warning
            : colors.error;
      case "satisfaction":
        return rating <= 2
          ? colors.error
          : rating <= 4
            ? colors.warning
            : colors.success;
      case "intensity":
        return rating <= 2
          ? colors.info
          : rating <= 4
            ? colors.warning
            : colors.error;
      default:
        return colors.primary;
    }
  };

  const getSize = () => {
    switch (size) {
      case "sm":
        return 28;
      case "md":
        return 36;
      case "lg":
        return 44;
      default:
        return 36;
    }
  };

  const getLabel = () => {
    if (!showValue) return "";

    switch (type) {
      case "difficulty":
        if (value === 0) return "Not rated";
        if (value <= 2) return "Easy";
        if (value <= 4) return "Moderate";
        return "Hard";
      case "satisfaction":
        if (value === 0) return "Not rated";
        if (value <= 2) return "Poor";
        if (value <= 4) return "Good";
        return "Excellent";
      case "intensity":
        if (value === 0) return "Not rated";
        if (value <= 2) return "Light";
        if (value <= 4) return "Moderate";
        return "Intense";
      default:
        return `${value}/${maxRating}`;
    }
  };

  const handlePress = (rating: number) => {
    if (disabled) return;

    // Animate the pressed item
    Animated.sequence([
      Animated.timing(animatedValuesRef.current[rating - 1], {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValuesRef.current[rating - 1], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onRatingChange(rating);
  };

  const handlePressIn = (rating: number) => {
    if (disabled) return;
    setHoveredRating(rating);
  };

  const handlePressOut = () => {
    if (disabled) return;
    setHoveredRating(0);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.ratingContainer}>
        <View style={styles.iconsContainer}>
          {Array.from({ length: maxRating }, (_, index) => {
            const rating = index + 1;
            const isActive = rating <= (hoveredRating || value);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.iconButton,
                  { width: Math.max(getSize(), 44), height: Math.max(getSize(), 44) },
                  disabled && styles.iconButtonDisabled,
                ]}
                onPress={() => handlePress(rating)}
                onPressIn={() => handlePressIn(rating)}
                onPressOut={handlePressOut}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${rating} of ${maxRating}`}
                accessibilityState={{ disabled, selected: isActive }}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Animated.View
                  style={[
                    styles.iconWrap,
                    {
                      transform: [{ scale: animatedValuesRef.current[index] }],
                    },
                  ]}
                >
                  <Ionicons
                    name={getIconName(isActive)}
                    size={rf(getSize() * 0.8)}
                    color={getColor(index)}
                  />
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>

        {showValue && (
          <View style={styles.valueContainer}>
            <Text style={styles.valueText} numberOfLines={1}>{getLabel()}</Text>
            <Text style={styles.numericValue} numberOfLines={1}>
              ({value}/{maxRating})
            </Text>
          </View>
        )}
      </View>

      {/* Description based on type */}
      {type !== "stars" && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText} numberOfLines={2}>
            {type === "difficulty" && "Rate how challenging this was"}
            {type === "satisfaction" && "How satisfied are you?"}
            {type === "intensity" && "Rate the workout intensity"}
          </Text>
        </View>
      )}

      {/* Scale Labels */}
      <View style={styles.scaleContainer}>
        <Text style={styles.scaleText} numberOfLines={1}>
          {type === "difficulty" && "Easy"}
          {type === "satisfaction" && "Poor"}
          {type === "intensity" && "Light"}
          {type === "stars" && "1"}
        </Text>
        <Text style={styles.scaleText} numberOfLines={1}>
          {type === "difficulty" && "Hard"}
          {type === "satisfaction" && "Excellent"}
          {type === "intensity" && "Intense"}
          {type === "stars" && maxRating.toString()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },

  label: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.medium as "500",
    color: colors.text,
    marginBottom: spacing.sm,
  },

  ratingContainer: {
    alignItems: "center",
  },

  iconsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },

  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: rbr(22),
  },

  iconButtonDisabled: {
    opacity: 0.5,
  },

  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },

  valueContainer: {
    alignItems: "center",
    gap: spacing.xs,
  },

  valueText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold as "600",
    color: colors.text,
  },

  numericValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  descriptionContainer: {
    marginTop: spacing.sm,
    alignItems: "center",
  },

  descriptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },

  scaleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },

  scaleText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
