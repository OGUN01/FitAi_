/**
 * SectionLabel — uppercase small-caps section header (docs/onboarding-fresh-design.md)
 *
 * Manrope 600, 11px, uppercase, letterSpacing 1.6, ink3. Sections are a label
 * + content + a hairline — never a container.
 *
 * Optional `caption`: the conversational "why we ask" line (type.captionStrong)
 * rendered directly under the label. Every tab hand-rolled this label+caption
 * wrap before — first-class now.
 */

import React from "react";
import { StyleSheet, View, Text, StyleProp, TextStyle } from "react-native";
import { type as typeScale, spacing } from "./tokens";

export interface SectionLabelProps {
  children: React.ReactNode;
  /** Optional conversational caption under the label ("why we ask" line). */
  caption?: string;
  /** Extra style overrides on the label text (e.g. marginBottom). */
  style?: StyleProp<TextStyle>;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({
  children,
  caption,
  style,
}) => {
  if (!caption) {
    return <Text style={[styles.label, style]}>{children}</Text>;
  }
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, style]}>{children}</Text>
      <Text style={styles.caption} numberOfLines={2}>
        {caption}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 0,
  },
  label: {
    ...typeScale.sectionLabel,
  },
  caption: {
    ...typeScale.captionStrong,
    marginTop: spacing.xs,
  },
});

export default SectionLabel;
