import React from "react";
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
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";

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
                        ? [colors.primary, colors.primaryLight]
                        : [colors.success, colors.success]
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
                    colors={[colors.error, colors.error]}
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
                  colors.backgroundSecondary,
                  colors.backgroundTertiary,
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
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background,
    padding: spacing.md,
    boxShadow: '0px 4px 8px rgba(0,0,0,0.1)',
    elevation: 5,
  },

  label: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: rf(18),
  },

  uploadArea: {
    position: "relative",
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: borderRadius.lg,
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
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: borderRadius.lg,
  },

  uploadIcon: {
    marginBottom: spacing.md,
  },

  uploadIconCircle: {
    width: rf(60),
    height: rf(60),
    borderRadius: rf(30),
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 4px 8px 0px rgba(255,107,53,0.3)",
    elevation: 5,
  },

  uploadIconPlus: {
    fontSize: rf(36),
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    lineHeight: rf(40),
  },

  uploadText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  uploadHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  aiBadge: {
    position: "absolute",
    top: rp(12),
    right: rp(12),
    borderRadius: borderRadius.full,
    overflow: "hidden",
    boxShadow: "0px 2px 4px 0px rgba(0,0,0,0.3)",
    elevation: 5,
  },

  aiBadgeGradient: {
    paddingHorizontal: rp(12),
    paddingVertical: rp(6),
  },

  aiBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },

  deleteButton: {
    position: "absolute",
    top: rp(12),
    left: rp(12),
    width: rf(32),
    height: rf(32),
    borderRadius: rf(16),
    overflow: "hidden",
    boxShadow: "0px 2px 4px 0px rgba(0,0,0,0.3)",
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
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    lineHeight: rf(28),
  },

  replaceOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.overlayDark,
    paddingVertical: rp(8),
    alignItems: "center",
  },

  replaceText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
});
