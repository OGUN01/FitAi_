/**
 * DietOptionsSheet - Shared bottom-sheet shell for the diet scan-flow's
 * options prompts (barcode options, label-scan prep, weight prompt).
 *
 * Built on the shared BottomSheet (src/components/ui/aurora/BottomSheet.tsx).
 * Previously these three prompts each hand-rolled an identical
 * optionsOverlay/optionsSheet Modal in DietScreen.tsx (single-source-of-truth
 * violation) and used animationType="fade" despite being bottom-anchored, so
 * they faded in place instead of sliding up like every other sheet in the
 * app (WaterIntakeModal, FoodSearchSheet, ScanResultModal). Routing all three
 * through BottomSheet fixes both issues in one place.
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { BottomSheet } from '../ui/aurora/BottomSheet';
import { flatColors as colors, spacing, flatFontSize as fontSize } from '../../theme/aurora-tokens';

interface DietOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  testID?: string;
}

export const DietOptionsSheet: React.FC<DietOptionsSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  testID,
}) => (
  <BottomSheet
    visible={visible}
    onClose={onClose}
    showCloseButton={false}
    contentStyle={styles.content}
    testID={testID}
  >
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    {children}
  </BottomSheet>
);

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});

export default DietOptionsSheet;
