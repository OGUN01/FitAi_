import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { Card } from "../../ui";
import { rf } from "../../../utils/responsive";

interface AccuracyRatingProps {
  rating: number;
  onRatingChange: (rating: 1 | 2 | 3 | 4 | 5) => void;
}

export const AccuracyRating: React.FC<AccuracyRatingProps> = ({
  rating,
  onRatingChange,
}) => {
  const getRatingLabel = (rating: number): string => {
    switch (rating) {
      case 1:
        return "Very Poor - Completely wrong";
      case 2:
        return "Poor - Mostly wrong";
      case 3:
        return "Fair - Some mistakes";
      case 4:
        return "Good - Mostly correct";
      case 5:
        return "Excellent - Perfect recognition";
      default:
        return "";
    }
  };

  return (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>How accurate is this recognition?</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRatingChange(star as 1 | 2 | 3 | 4 | 5)}
            style={styles.starButton}
          >
            <Text
              style={[
                styles.star,
                { color: star <= rating ? ResponsiveTheme.colors.amberBright : "#d1d5db" },
              ]}
            >
              ⭐
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingLabel}>{getRatingLabel(rating)}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  starButton: {
    padding: ResponsiveTheme.spacing.xs,
  },

  star: {
    fontSize: rf(24),
  },

  ratingLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontStyle: "italic",
  },
});
