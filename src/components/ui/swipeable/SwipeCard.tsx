import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { PanGestureHandler } from "react-native-gesture-handler";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf, rp } from "../../../utils/responsive";
import { SwipeableCard } from "./types";
import { SwipeIndicators } from "./SwipeIndicators";

interface SwipeCardProps {
  card: SwipeableCard;
  currentIndex: number;
  totalCards: number;
  isBackground?: boolean;
  gestureHandler?: any;
  panHandlers?: any;
  cardAnimatedStyle?: any;
  leftIndicatorStyle?: any;
  rightIndicatorStyle?: any;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  card,
  currentIndex,
  totalCards,
  isBackground = false,
  gestureHandler,
  panHandlers,
  cardAnimatedStyle,
  leftIndicatorStyle,
  rightIndicatorStyle,
}) => {
  const renderCardContent = () => (
    <LinearGradient
      colors={card.gradient as unknown as readonly [string, string, ...string[]]}
      style={styles.cardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {!isBackground && leftIndicatorStyle && rightIndicatorStyle && (
        <SwipeIndicators
          leftIndicatorStyle={leftIndicatorStyle}
          rightIndicatorStyle={rightIndicatorStyle}
        />
      )}

      <View style={styles.cardContent}>
        <Ionicons
          name={card.iconName as ComponentProps<typeof Ionicons>['name']}
          size={rf(36)}
          color={colors.white}
          style={styles.cardIcon}
        />
        <Text style={styles.cardTitle}>{card.title}</Text>
        <Text style={styles.cardDescription}>{card.description}</Text>

        {card.details && card.details.length > 0 && (
          <View style={styles.detailsContainer}>
            {card.details.map((detail) => (
              <Text
                key={`detail-${isBackground ? "bg" : "fg"}-${detail.substring(0, 30)}`}
                style={styles.detailText}
              >
                • {detail}
              </Text>
            ))}
          </View>
        )}
      </View>

      {!isBackground && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {totalCards}
          </Text>
        </View>
      )}
    </LinearGradient>
  );

  if (isBackground) {
    return (
      <View style={[styles.card, styles.cardBackground]}>
        {renderCardContent()}
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <Animated.View {...panHandlers} style={[styles.card, cardAnimatedStyle]}>
        {renderCardContent()}
      </Animated.View>
    );
  }

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        {renderCardContent()}
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "80%",
    height: rp(200),
    borderRadius: borderRadius.xl,
    position: "absolute",
    overflow: "hidden",
    boxShadow: '0px 4px 8px rgba(0,0,0,0.3)',
    elevation: 10,
  },

  cardBackground: {
    transform: [{ scale: 0.95 }],
    opacity: 0.5,
  },

  cardGradient: {
    flex: 1,
    padding: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },

  cardContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },

  cardIcon: {
    marginBottom: spacing.sm,
  },

  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: "center",
    marginBottom: spacing.xs,
  },

  cardDescription: {
    fontSize: fontSize.sm,
    color: colors.glassHighlight,
    textAlign: "center",
    lineHeight: rf(18),
    paddingHorizontal: spacing.md,
  },

  detailsContainer: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
    paddingHorizontal: spacing.xl,
  },

  detailText: {
    fontSize: fontSize.sm,
    color: colors.glassHighlight,
    marginBottom: spacing.xs,
  },

  progressContainer: {
    position: "absolute",
    bottom: spacing.md,
    alignSelf: "center",
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },

  progressText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
});
