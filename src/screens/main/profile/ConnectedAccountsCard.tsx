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
  borderRadius,
} from "../../../theme/aurora-tokens";
import { rf, rs, rw } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";
import { GoogleIcon } from "../../../components/icons/GoogleIcon";
import { useReducedMotion } from "../../../utils/accessibility/hooks";
import { maskEmail } from "../../../utils/validators/emailValidator";

const { variants } = typography;

interface ConnectedAccount {
  id: string;
  name: string;
  // Either a monochrome Ionicons glyph, or a brand SVG icon rendered as-is
  // (e.g. Google's multi-color "G") — only one of `icon`/`iconElement` is set.
  icon?: keyof typeof Ionicons.glyphMap;
  iconElement?: React.ReactNode;
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
    <View style={styles.rowWrapper}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${account.name}, ${account.isConnected ? "connected. Tap to disconnect" : "not connected. Tap to connect"}`}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        {/* Provider icon */}
        <View style={[styles.iconSquircle, { backgroundColor: account.bgColor }]}>
          {account.iconElement ??
            (account.icon ? (
              <Ionicons name={account.icon} size={rs(16)} color={account.iconColor} />
            ) : null)}
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.providerName} numberOfLines={2}>
            {account.name}
          </Text>
          {account.isConnected && account.email ? (
            // Masked (e.g. "h***@gmail.com") — the full address was previously
            // shown in plaintext, visible to anyone glancing at the screen.
            <Text style={styles.email} numberOfLines={2}>
              {maskEmail(account.email)}
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

        {/* Trailing affordance — visually distinguishes the destructive tap
            (disconnect a connected account) from the additive one (connect a
            new account) via glyph shape only. Both stay neutral text.tertiary
            — colors.error is reserved for the actual confirm modal, so this
            row never mixes a "problem" red next to the "Connected" green
            badge on the same permanently-visible row. */}
        <Ionicons
          name={account.isConnected ? "close-circle-outline" : "chevron-forward"}
          size={rs(16)}
          color={colors.text.tertiary}
          style={styles.trailingIcon}
        />
      </Pressable>
      {!isLast && <View style={styles.divider} />}
    </View>
  );
});

export const ConnectedAccountsCard: React.FC<ConnectedAccountsCardProps> = ({
  isGoogleConnected,
  googleEmail,
  onGooglePress,
  onApplePress,
  animationDelay = 0,
}) => {
  const reducedMotion = useReducedMotion();
  const accounts: ConnectedAccount[] = [
    {
      id: "google",
      name: "Google",
      // Real multi-color Google "G" (see components/icons/GoogleIcon) on the
      // same neutral surface[2] squircle every other row uses — matches the
      // dark Aurora language instead of a clashing full-white badge. Never
      // tint this row with a semantic color (error/success/etc.) — it reads
      // as a broken/alarming state.
      iconElement: <GoogleIcon size={rs(16)} />,
      iconColor: colors.text.primary,
      bgColor: surface[2],
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
      entering={
        reducedMotion ? undefined : FadeInDown.delay(animationDelay).duration(350)
      }
      style={styles.container}
    >
      {/* No visible header — the "Accounts" quick-jump chip on ProfileScreen
          is the single source of this section's label now. */}
      <View style={styles.listSurface} accessibilityLabel="Connected accounts">
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
    marginBottom: spacing.xl,
  },
  listSurface: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: border.subtle,
    overflow: "hidden",
  },
  rowWrapper: {
    // Positioning context for the absolutely-positioned inset divider.
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md + spacing.xxs,
    paddingHorizontal: spacing.md,
    minHeight: 64,
  },
  rowPressed: {
    backgroundColor: surface[2],
  },
  // Inset divider — matches SettingsSection: a separate absolutely-positioned
  // line rather than a borderBottom on the row, so insetting it can't shift
  // the row's own content.
  divider: {
    position: "absolute",
    left: rw(32) + spacing.md,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: border.DEFAULT,
  },
  iconSquircle: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(10),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
  },
  infoContainer: {
    flex: 1,
    flexShrink: 1,
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
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    marginLeft: spacing.sm,
  },
  trailingIcon: {
    marginLeft: spacing.xs,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
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
