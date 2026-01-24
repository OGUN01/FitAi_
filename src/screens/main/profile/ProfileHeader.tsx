/**
 * ProfileHeader - Compact Hero Section with Avatar and User Info
 *
 * Features:
 * - Compact animated avatar with edit badge
 * - User name and member since date
 * - Minimal, elegant design
 * - NO streak badge (moved to stats row)
 */

import React, { useRef, useCallback } from "react";
import { View, Text, StyleSheet, Animated as RNAnimated } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import {
  gradientAuroraSpace,
  toLinearGradientProps,
} from "../../../theme/gradients";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";

interface ProfileHeaderProps {
  userName: string;
  memberSince?: string;
  onEditPress: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userName,
  memberSince,
  onEditPress,
}) => {
  const avatarScale = useRef(new RNAnimated.Value(1)).current;

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarPress = useCallback(() => {
    RNAnimated.sequence([
      RNAnimated.timing(avatarScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      RNAnimated.spring(avatarScale, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
    haptics.medium();
    onEditPress();
  }, [avatarScale, onEditPress]);

  return (
    <LinearGradient
      {...toLinearGradientProps(gradientAuroraSpace)}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Compact Animated Avatar */}
        <Animated.View
          entering={FadeIn.delay(100).duration(400)}
          style={styles.avatarContainer}
        >
          <AnimatedPressable
            onPress={handleAvatarPress}
            scaleValue={0.95}
            hapticFeedback={false}
          >
            <RNAnimated.View style={{ transform: [{ scale: avatarScale }] }}>
              <LinearGradient
                colors={["#FF6B6B", "#FF8E53"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{getInitials(userName)}</Text>
              </LinearGradient>
              <View style={styles.editBadge}>
                <Ionicons name="create-outline" size={rf(12)} color="#fff" />
              </View>
            </RNAnimated.View>
          </AnimatedPressable>
        </Animated.View>

        {/* User Info */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={styles.userName}>{userName || "Fitness Champion"}</Text>
          <Text style={styles.memberSince}>
            {memberSince && memberSince !== "Recently"
              ? `Member since ${memberSince}`
              : "Just joined today"}
          </Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.lg,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  content: {
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  avatar: {
    width: rw(80),
    height: rw(80),
    borderRadius: rw(40),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: {
    fontSize: rf(32),
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.background,
    shadowColor: ResponsiveTheme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  userName: {
    fontSize: rf(22),
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  memberSince: {
    fontSize: rf(12),
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
});

export default ProfileHeader;
