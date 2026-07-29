/**
 * ConnectedAccountsCard - Aurora 2026: linked social accounts.
 * iOS-style grouped list — one surface.1 container, hairline separators.
 */

import React, { useCallback } from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  surface,
  border,
  spacing,
  typography,
} from "../../../theme/aurora-tokens";
import { rf, rw } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";

const { variants } = typography;

interface ConnectedAccount {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  isConnected: boolean;
  email?: string;
  onPress: () => void;
}

interface ConnectedAccountsCardProps {
  isGoogleConnected: boolean;
  googleEmail?: string;
  onGooglePress: () => void;
  onApplePress?: () => void;
  animationDelay?: number;
}

const AccountRow: React.FC<{
  account: ConnectedAccount;
  isLast: boolean;
}> = React.memo(({ account, isLast }) => {
  const handlePress = useCallback(() => {
    haptics.light();
    account.onPress();
  }, [account]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${account.name} ${account.isConnected ? "connected" : "connect"}`}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
        !isLast && styles.rowBorder,
      ]}
    >
      {/* Provider icon */}
      <View style={[styles.iconSquircle, { backgroundColor: account.bgColor }]}>
        <Ionicons name={account.icon} size={rf(16)} color={account.iconColor} />
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.providerName} numberOfLines={1}>
          {account.name}
        </Text>
        {account.isConnected && account.email ? (
          <Text style={styles.email} numberOfLines={1}>
            {account.email}
          </Text>
        ) : (
          <Text style={styles.notConnected}>Not connected</Text>
        )}
      </View>

      {/* Status */}
      <View
        style={[
          styles.statusBadge,
          account.isConnected
            ? styles.connectedBadge
            : styles.disconnectedBadge,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            account.isConnected
              ? styles.connectedText
              : styles.disconnectedText,
          ]}
        >
          {account.isConnected ? "Connected" : "Connect"}
        </Text>
      </View>
    </Pressable>
  );
});

export const ConnectedAccountsCard: React.FC<ConnectedAccountsCardProps> = ({
  isGoogleConnected,
  googleEmail,
  onGooglePress,
  onApplePress,
  animationDelay = 0,
}) => {
  const accounts: ConnectedAccount[] = [
    {
      id: "google",
      name: "Google",
      icon: "logo-google",
      iconColor: colors.text.primary,
      bgColor: colors.error.DEFAULT,
      isConnected: isGoogleConnected,
      email: googleEmail,
      onPress: onGooglePress,
    },
    // Only render the Apple row when the host actually wires onApplePress —
    // otherwise the row was a dead "Connect" button that did nothing on tap.
    ...(Platform.OS === "ios" && onApplePress
      ? [
          {
            id: "apple",
            name: "Apple",
            icon: "logo-apple" as keyof typeof Ionicons.glyphMap,
            iconColor: colors.text.primary,
            bgColor: surface[2],
            isConnected: false,
            email: undefined,
            onPress: onApplePress,
          },
        ]
      : []),
  ];

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(350)}
      style={styles.container}
    >
      <View style={styles.sectionHeader}>
        <Ionicons
          name="link-outline"
          size={rf(14)}
          color={colors.text.secondary}
          style={styles.sectionIcon}
        />
        <Text style={styles.sectionTitle}>Connected Accounts</Text>
      </View>

      <View style={styles.listSurface}>
        {accounts.map((account, index) => (
          <AccountRow
            key={account.id}
            account={account}
            isLast={index === accounts.length - 1}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionIcon: {
    marginRight: spacing.xs,
  },
  sectionTitle: {
    ...variants.caption,
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  listSurface: {
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border.subtle,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  rowPressed: {
    backgroundColor: surface[2],
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: border.DEFAULT,
  },
  iconSquircle: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(10),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
    minWidth: 0,
  },
  providerName: {
    ...variants.body,
    color: colors.text.primary,
  },
  email: {
    ...variants.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
  notConnected: {
    ...variants.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
  connectedBadge: {
    backgroundColor: `${colors.success.DEFAULT}26`,
  },
  disconnectedBadge: {
    backgroundColor: surface[2],
  },
  statusText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: rf(11),
  },
  connectedText: {
    color: colors.success.DEFAULT,
  },
  disconnectedText: {
    color: colors.text.secondary,
  },
});

export default ConnectedAccountsCard;
