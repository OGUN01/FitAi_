import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StyleProp,
  ViewStyle,
} from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { rbr } from '../../utils/responsive';

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
  const [animatedValues] = useState(
    Array.from({ length: maxRating }, () => new Animated.Value(1)),
  );

  const getIcon = (index: number, isActive: boolean) => {
    const rating = hoveredRating || value;
    const isHighlighted = index < rating;

    switch (type) {
      case "stars":
        return isHighlighted ? "⭐" : "☆";
      case "difficulty":
        return isHighlighted ? "🔥" : "○";
      case "satisfaction":
        return isHighlighted ? "😊" : "😐";
      case "intensity":
        return isHighlighted ? "💪" : "○";
      default:
        return isHighlighted ? "⭐" : "☆";
    }
  };

  const getColor = (index: number) => {
    const rating = hoveredRating || value;
    const isHighlighted = index < rating;

    if (!isHighlighted) return ResponsiveTheme.colors.textMuted;

    switch (type) {
      case "stars":
        return ResponsiveTheme.colors.warning;
      case "difficulty":
        return rating <= 2
          ? ResponsiveTheme.colors.success
          : rating <= 4
            ? ResponsiveTheme.colors.warning
            : ResponsiveTheme.colors.error;
      case "satisfaction":
        return rating <= 2
          ? ResponsiveTheme.colors.error
          : rating <= 4
            ? ResponsiveTheme.colors.warning
            : ResponsiveTheme.colors.success;
      case "intensity":
        return rating <= 2
          ? ResponsiveTheme.colors.info
          : rating <= 4
            ? ResponsiveTheme.colors.warning
            : ResponsiveTheme.colors.error;
      default:
        return ResponsiveTheme.colors.primary;
    }
  };

  const getSize = () => {
    switch (size) {
      case "sm":
        return 24;
      case "md":
        return 32;
      case "lg":
        return 40;
      default:
        return 32;
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
      Animated.timing(animatedValues[rating - 1], {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValues[rating - 1], {
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
                  { width: getSize(), height: getSize() },
                  disabled && styles.iconButtonDisabled,
                ]}
                onPress={() => handlePress(rating)}
                onPressIn={() => handlePressIn(rating)}
                onPressOut={handlePressOut}
                disabled={disabled}
              >
                <Animated.Text
                  style={[
                    styles.icon,
                    {
                      fontSize: getSize() * 0.8,
                      color: getColor(index),
                      transform: [{ scale: animatedValues[index] }],
                    },
                  ]}
                >
                  {getIcon(index, isActive)}
                </Animated.Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {showValue && (
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>{getLabel()}</Text>
            <Text style={styles.numericValue}>
              ({value}/{maxRating})
            </Text>
          </View>
        )}
      </View>

      {/* Description based on type */}
      {type !== "stars" && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            {type === "difficulty" && "Rate how challenging this was"}
            {type === "satisfaction" && "How satisfied are you?"}
            {type === "intensity" && "Rate the workout intensity"}
          </Text>
        </View>
      )}

      {/* Scale Labels */}
      <View style={styles.scaleContainer}>
        <Text style={styles.scaleText}>
          {type === "difficulty" && "Easy"}
          {type === "satisfaction" && "Poor"}
          {type === "intensity" && "Light"}
          {type === "stars" && "1"}
        </Text>
        <Text style={styles.scaleText}>
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
    paddingVertical: ResponsiveTheme.spacing.sm,
  },

  label: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium as "500",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  ratingContainer: {
    alignItems: "center",
  },

  iconsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: rbr(20),
  },

  iconButtonDisabled: {
    opacity: 0.5,
  },

  icon: {
    textAlign: "center",
  },

  valueContainer: {
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs / 2,
  },

  valueText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.text,
  },

  numericValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  descriptionContainer: {
    marginTop: ResponsiveTheme.spacing.sm,
    alignItems: "center",
  },

  descriptionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  scaleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
  },

  scaleText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },
});
