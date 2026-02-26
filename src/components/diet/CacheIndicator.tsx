/**
 * CacheIndicator Component
 *
 * Shows cache status badge for AI-generated content.
 * Displays cache hit/miss, cuisine detection, and generation time.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr } from "../../utils/responsive";
import type { APIMetadata } from "../../services/fitaiWorkersClient";

// ============================================================================
// TYPES
// ============================================================================

export interface CacheIndicatorProps {
  metadata?: APIMetadata;
  showGenerationTime?: boolean;
  showCuisine?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CacheIndicator: React.FC<CacheIndicatorProps> = ({
  metadata,
  showGenerationTime = true,
  showCuisine = true,
}) => {
  if (!metadata) return null;

  const { cached, cacheSource, generationTime, cuisineDetected } = metadata;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Cache Badge */}
      <View
        style={[styles.badge, cached ? styles.cachedBadge : styles.freshBadge]}
      >
        <Ionicons
          name={cached ? "flash" : "sparkles"}
          size={rf(12)}
          color={cached ? ResponsiveTheme.colors.successAlt : ResponsiveTheme.colors.primary}
        />
        <Text
          style={[
            styles.badgeText,
            cached ? styles.cachedText : styles.freshText,
          ]}
        >
          {cached ? `From Cache (${cacheSource})` : "Fresh Generation"}
        </Text>
      </View>

      {/* Generation Time */}
      {showGenerationTime && generationTime && (
        <View style={styles.badge}>
          <Ionicons
            name="time-outline"
            size={rf(12)}
            color={ResponsiveTheme.colors.textSecondary}
          />
          <Text style={styles.metaBadgeText}>
            {(generationTime / 1000).toFixed(1)}s
          </Text>
        </View>
      )}

      {/* Cuisine Detection */}
      {showCuisine && cuisineDetected && (
        <View style={styles.badge}>
          <Ionicons
            name="location-outline"
            size={rf(12)}
            color={ResponsiveTheme.colors.textSecondary}
          />
          <Text style={styles.metaBadgeText}>{cuisineDetected} Cuisine</Text>
        </View>
      )}
    </Animated.View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: rp(4),
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: ResponsiveTheme.colors.glassSurface,
  },
  cachedBadge: {
    backgroundColor: `${ResponsiveTheme.colors.successAlt}26`,
  },
  freshBadge: {
    backgroundColor: `${ResponsiveTheme.colors.primary}26`,
  },
  badgeText: {
    fontSize: rf(11),
    fontWeight: "600",
  },
  cachedText: {
    color: ResponsiveTheme.colors.successAlt,
  },
  freshText: {
    color: ResponsiveTheme.colors.primary,
  },
  metaBadgeText: {
    fontSize: rf(11),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
});

export default CacheIndicator;
