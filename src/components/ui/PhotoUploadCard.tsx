import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { rf, rp } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";

interface PhotoUploadCardProps {
  label: string;
  description?: string;
  imageUri?: string;
  onUpload: () => void;
  onDelete?: () => void;
  showAIBadge?: boolean;
  aiProcessing?: boolean;
  style?: ViewStyle;
}

export const PhotoUploadCard: React.FC<PhotoUploadCardProps> = ({
  label,
  description,
  imageUri,
  onUpload,
  onDelete,
  showAIBadge = true,
  aiProcessing = false,
  style,
}) => {
  const scaleValue = useSharedValue(1);
  const badgeScale = useSharedValue(0);

  React.useEffect(() => {
    if (showAIBadge && imageUri) {
      badgeScale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
    } else {
      badgeScale.value = withTiming(0, { duration: 200 });
    }
  }, [showAIBadge, imageUri]);

  const animatedBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const handlePressIn = () => {
    scaleValue.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scaleValue.value = withSpring(1);
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedCardStyle, style]}>
      <View style={styles.card}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}

        {/* Upload Area */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onUpload}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.uploadArea}
        >
          {imageUri ? (
            <>
              {/* Image Preview */}
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="cover"
              />

              {/* AI Badge */}
              {showAIBadge && (
                <Animated.View style={[styles.aiBadge, animatedBadgeStyle]}>
                  <LinearGradient
                    colors={
                      aiProcessing
                        ? ["#FF6B35", "#FF8A5C"]
                        : ["#4CAF50", "#45A049"]
                    }
                    style={styles.aiBadgeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.aiBadgeText}>
                      {aiProcessing ? "AI Processing..." : "AI Analyzed"}
                    </Text>
                  </LinearGradient>
                </Animated.View>
              )}

              {/* Delete Button */}
              {onDelete && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={onDelete}
                >
                  <LinearGradient
                    colors={["#F44336", "#D32F2F"]}
                    style={styles.deleteButtonGradient}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Replace Overlay */}
              <View style={styles.replaceOverlay}>
                <Text style={styles.replaceText}>Tap to Replace</Text>
              </View>
            </>
          ) : (
            <>
              {/* Upload Placeholder */}
              <LinearGradient
                colors={[
                  ResponsiveTheme.colors.backgroundSecondary,
                  ResponsiveTheme.colors.backgroundTertiary,
                ]}
                style={styles.placeholder}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <View style={styles.uploadIcon}>
                  <View style={styles.uploadIconCircle}>
                    <Text style={styles.uploadIconPlus}>+</Text>
                  </View>
                </View>
                <Text style={styles.uploadText}>Upload Photo</Text>
                <Text style={styles.uploadHint}>
                  Tap to select from gallery
                </Text>
              </LinearGradient>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  card: {
    borderRadius: ResponsiveTheme.borderRadius.xl,
    backgroundColor: ResponsiveTheme.colors.background,
    padding: ResponsiveTheme.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },

  label: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  description: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(18),
  },

  uploadArea: {
    position: "relative",
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  placeholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.border,
    borderStyle: "dashed",
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },

  uploadIcon: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  uploadIconCircle: {
    width: rf(60),
    height: rf(60),
    borderRadius: rf(30),
    backgroundColor: ResponsiveTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ResponsiveTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  uploadIconPlus: {
    fontSize: rf(36),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    lineHeight: rf(40),
  },

  uploadText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  uploadHint: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  aiBadge: {
    position: "absolute",
    top: rp(12),
    right: rp(12),
    borderRadius: ResponsiveTheme.borderRadius.full,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  aiBadgeGradient: {
    paddingHorizontal: rp(12),
    paddingVertical: rp(6),
  },

  aiBadgeText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
  },

  deleteButton: {
    position: "absolute",
    top: rp(12),
    left: rp(12),
    width: rf(32),
    height: rf(32),
    borderRadius: rf(16),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  deleteButtonGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButtonText: {
    fontSize: rf(24),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    lineHeight: rf(28),
  },

  replaceOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: rp(8),
    alignItems: "center",
  },

  replaceText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.white,
  },
});
