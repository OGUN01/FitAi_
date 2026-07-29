/**
 * InfoTap — info-tooltip trigger (blueprint §7.10)
 *
 * A small "i" icon inside a surface.2 chip. selectionAsync on tap. This
 * component is PRESENTATIONAL only — it does NOT import the existing
 * InfoTooltipModal. It exposes `onPress` so each screen can wire the modal
 * open action (via the existing `showInfoTooltip` hook pattern). Props
 * `title`/`description`/`benefits` are passed through to the screen's modal
 * handler via `onPress`, so screens have everything they need.
 */

import React from "react";
import { StyleSheet, Pressable, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { surface, colors, borderRadius, spacing } from "../../../theme/aurora-tokens";

export interface InfoTapProps {
  /** Tooltip title (passed through to the screen's modal handler). */
  title: string;
  /** Tooltip body (passed through). */
  description: string;
  /** Optional benefit bullets (passed through). */
  benefits?: string[];
  /** Fired on tap; screens open InfoTooltipModal with title/description/benefits. */
  onPress: () => void;
  /** Extra style. */
  style?: ViewStyle;
  testID?: string;
}

const fireSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

export const InfoTap: React.FC<InfoTapProps> = ({
  title: _title,
  description: _description,
  benefits: _benefits,
  onPress,
  style,
  testID,
}) => {
  return (
    <Pressable
      onPress={() => {
        fireSelection();
        onPress();
      }}
      style={[styles.chip, style]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="More info"
      testID={testID}
    >
      <Ionicons name="information-circle-outline" size={18} color={colors.text.tertiary} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: surface[2],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxs,
  },
});
