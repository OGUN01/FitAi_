/**
 * ProfileHeader - Aurora 2026: Large avatar with gradient ring, name, member-since
 * Sits directly on bg, no card container.
 */

import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, surface, spacing, typography } from "../../../theme/aurora-tokens";
import { rf, rw } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";

const { variants } = typography;

interface ProfileHeaderProps {
  userName: string;
  memberSince?: string | null;
  onEditPress: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = React.memo(({
  userName,
  memberSince,
  onEditPress,
}) => {
  const getInitials = useCallback((name?: string) => {
    if (!name || !name.trim()) return "?";
    // Filter empty parts: a trailing/double space produced ""[0] → undefined,
    // rendering "JUNDEFINED" for a name like "John ". Drop blanks first.
    return name
      .trim()
      .split(/\s+/)
      .filter((n) => n.length > 0)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const memberSinceLabel =
    memberSince === null || memberSince === undefined
      ? "Just joined today"
      : /^\d+ (day|week)/.test(memberSince)
        ? `Member for ${memberSince}`
        : `Member since ${memberSince}`;

  const handlePress = useCallback(() => {
    haptics.light();
    onEditPress();
  }, [onEditPress]);

  return (
    <Animated.View
      entering={FadeInDown.delay(0).duration(350)}
      style={styles.container}
    >
      {/* Avatar with gradient ring */}
      <Pressable
        onPress={handlePress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Edit personal information"
        accessibilityHint="Opens the personal info editor"
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={styles.avatarRingOuter}>
          <LinearGradient
            colors={[colors.primary.DEFAULT, colors.secondary.DEFAULT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarRing}
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>{getInitials(userName)}</Text>
            </View>
          </LinearGradient>
          {/* Edit badge */}
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={rf(11)} color={colors.text.primary} />
          </View>
        </View>
      </Pressable>

      {/* Name */}
      <Text
        style={styles.userName}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {userName || ""}
      </Text>

      {/* Member since */}
      {memberSinceLabel ? (
        <Text style={styles.memberSince} numberOfLines={1}>
          {memberSinceLabel}
        </Text>
      ) : null}
    </Animated.View>
  );
});

const AVATAR_SIZE = rw(80);
const RING_SIZE = AVATAR_SIZE + rw(6);
const RING_RADIUS = RING_SIZE / 2;
const AVATAR_RADIUS = AVATAR_SIZE / 2;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: surface[0],
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  avatarRingOuter: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_RADIUS,
    marginBottom: spacing.md,
  },
  avatarRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_RADIUS,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_RADIUS,
    backgroundColor: surface[1],
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: rf(30),
    color: colors.text.primary,
    includeFontPadding: false,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: rw(2),
    width: rw(24),
    height: rw(24),
    borderRadius: rw(12),
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: surface[0],
  },
  userName: {
    ...variants.pageTitle,
    fontSize: rf(22),
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  memberSince: {
    ...variants.caption,
    color: colors.text.secondary,
    textAlign: "center",
  },
});

export default ProfileHeader;
