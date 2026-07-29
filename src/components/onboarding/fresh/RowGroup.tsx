/**
 * RowGroup — SectionLabel + a vertical stack of rows (docs/onboarding-fresh-design.md)
 *
 * NO container box. A section is a label + content + hairlines, nothing else.
 * Children are usually OptionRows, but any row element works.
 */

import React from "react";
import { StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import { SectionLabel } from "./SectionLabel";
import { spacing } from "./tokens";

export interface RowGroupProps {
  /** Optional section label rendered above the rows. */
  label?: string;
  children: React.ReactNode;
  /** Extra container style. */
  style?: StyleProp<ViewStyle>;
}

export const RowGroup: React.FC<RowGroupProps> = ({ label, children, style }) => (
  <View style={[styles.container, style]}>
    {label && <SectionLabel style={styles.label}>{label}</SectionLabel>}
    <View>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
  },
  label: {
    marginBottom: spacing.m,
  },
});

export default RowGroup;
