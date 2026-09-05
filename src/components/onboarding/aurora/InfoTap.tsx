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
import { StyleSheet, Pressable, View, ViewStyle } from "react-native";
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
  title,
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
      // Real (not hitSlop) 44px touch layer — hitSlop is confirmed inert on
      // web (react-native-web's View drops it, not in the module's own prop
      // allow-list). `touchArea` wraps the visual 28px surface[2] chip so
      // the hit-testable box genuinely measures 44x44 on web too; hitSlop
      // is kept for the real, additional expansion it still provides on
      // native. NOTE: this component is currently unreferenced elsewhere in
      // the app (no live call site as of this fix) — fixed defensively so
      // the same web touch-target defect isn't reintroduced the moment it's
      // adopted.
      style={[styles.touchArea, style]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={`More info about ${title}`}
      testID={testID}
    >
      <View style={styles.chip}>
        <Ionicons name="information-circle-outline" size={18} color={colors.text.tertiary} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  touchArea: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
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
