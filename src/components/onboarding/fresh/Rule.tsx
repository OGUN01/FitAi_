/**
 * Rule — 1px hairline divider (docs/onboarding-fresh-design.md)
 *
 * The ONLY separator in the Editorial Dark language. Full-width, transparent
 * either side; optional vertical margin via `spacing`.
 */

import React from "react";
import { StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import { tokens, spacing as sp } from "./tokens";

export interface RuleProps {
  /** Vertical margin applied above AND below the rule (4pt grid). @default 0 */
  spacing?: number;
  /** Extra style overrides. */
  style?: StyleProp<ViewStyle>;
}

export const Rule: React.FC<RuleProps> = ({ spacing = 0, style }) => (
  <View
    style={[
      styles.rule,
      spacing > 0 && { marginVertical: spacing },
      style,
    ]}
  />
);

const styles = StyleSheet.create({
  rule: {
    height: sp.hair,
    backgroundColor: tokens.hairline,
    alignSelf: "stretch",
  },
});

export default Rule;
