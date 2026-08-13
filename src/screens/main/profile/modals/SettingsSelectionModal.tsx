/**
 * SettingsSelectionModal - Aurora 2026: bottom-sheet selection dialog.
 * Flat surface.2 panel over blur backdrop, option rows with radio-style check.
 * No GlassCard, no shadows, tokens only.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../../components/ui/aurora/AnimatedPressable";
import { DialogShell } from "../../../../components/ui/CustomDialog";
import {
  colors,
  surface,
  border,
  spacing,
  typography,
  borderRadius,
} from "../../../../theme/aurora-tokens";
import { rf, rw } from "../../../../utils/responsive";
import { useReducedMotion } from "../../../../utils/accessibility/hooks";

const { variants } = typography;

export interface SelectionOption {
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description?: string;
  disabled?: boolean;
}

interface SettingsSelectionModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  options: SelectionOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Optional note displayed below options */
  footerNote?: string;
}

export const SettingsSelectionModal: React.FC<SettingsSelectionModalProps> = ({
  visible,
  title,
  subtitle,
  icon,
  iconColor,
  options,
  selectedValue,
  onSelect,
  onClose,
  footerNote,
}) => {
  const reducedMotion = useReducedMotion();

  return (
    <DialogShell
      visible={visible}
      animationType={reducedMotion ? "none" : "fade"}
      onRequestClose={onClose}
      bare
    >
      {/* Web-safe DOM: backdrop Pressable is an absolute-fill SIBLING behind
          the dialog (never an ancestor) — see AdjustmentWizard.tsx. */}
      <View style={styles.root}>
        <Pressable
          onPress={onClose}
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss ${title} dialog`}
        >
          <BlurView intensity={80} style={styles.blurFill} />
        </Pressable>
        <View style={styles.dialogContainer} accessibilityRole="alert">
              {/* Header */}
              <View style={styles.headerRow}>
                <View
                  style={[
                    styles.headerIconWrap,
                    { backgroundColor: `${iconColor}1F` },
                  ]}
                >
                  <Ionicons name={icon} size={rf(20)} color={iconColor} />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.title} numberOfLines={2}>
                    {title}
                  </Text>
                  {subtitle && (
                    <Text style={styles.subtitle} numberOfLines={2}>
                      {subtitle}
                    </Text>
                  )}
                </View>
                <AnimatedPressable
                  onPress={onClose}
                  scaleValue={0.9}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Close ${title}`}
                >
                  <Ionicons
                    name="close"
                    size={rf(18)}
                    color={colors.text.secondary}
                  />
                </AnimatedPressable>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              <ScrollView
                style={styles.optionsViewport}
                contentContainerStyle={styles.optionsContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View
                  style={styles.optionsList}
                  accessibilityRole="radiogroup"
                  accessibilityLabel={title}
                >
                {options.map((opt) => {
                  const isSelected = opt.value === selectedValue;
                  const isDisabled = opt.disabled === true;

                  return (
                    <AnimatedPressable
                      key={opt.value}
                      onPress={() => {
                        if (!isDisabled) {
                          onSelect(opt.value);
                        }
                      }}
                      scaleValue={isDisabled ? 1.0 : 0.97}
                      disabled={isDisabled}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={opt.label}
                      accessibilityHint={opt.description}
                      style={[
                        styles.optionRow,
                        isSelected && styles.optionRowSelected,
                        isDisabled && styles.optionRowDisabled,
                      ]}
                    >
                      <View
                        style={[
                          styles.optionIconWrap,
                          isSelected && {
                            backgroundColor: `${iconColor}2E`,
                          },
                        ]}
                      >
                        <Ionicons
                          name={opt.icon}
                          size={rf(18)}
                          color={
                            isSelected
                              ? iconColor
                              : colors.text.secondary
                          }
                        />
                      </View>

                      <View style={styles.optionContent}>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelSelected,
                            isDisabled && styles.optionLabelDisabled,
                          ]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {opt.label}
                        </Text>
                        {opt.description && (
                          <Text
                            style={styles.optionDescription}
                            numberOfLines={3}
                            ellipsizeMode="tail"
                          >
                            {opt.description}
                          </Text>
                        )}
                      </View>

                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={rf(20)}
                          color={iconColor}
                        />
                      )}
                    </AnimatedPressable>
                  );
                })}
                </View>

                {/* Footer note */}
                {footerNote && (
                  <View style={styles.footerNoteWrap}>
                    <Ionicons
                      name="information-circle-outline"
                      size={rf(14)}
                      color={colors.text.tertiary}
                    />
                    <Text style={styles.footerNoteText}>{footerNote}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
      </View>
    </DialogShell>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  blurFill: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dialogContainer: {
    width: "88%",
    maxWidth: 380,
    backgroundColor: surface[2],
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  headerIconWrap: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(12),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...variants.sectionTitle,
    color: colors.text.primary,
  },
  subtitle: {
    ...variants.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
  closeBtn: {
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: Math.max(rw(20), 22),
    backgroundColor: surface[1],
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: border.DEFAULT,
    marginVertical: spacing.sm,
  },
  optionsList: {
    gap: spacing.xs,
  },
  optionsContent: {
    flexGrow: 1,
  },
  optionsViewport: {
    flexShrink: 1,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: surface[1],
  },
  optionRowSelected: {
    borderWidth: 1,
    borderColor: border.strong,
  },
  optionRowDisabled: {
    opacity: 0.5,
  },
  optionIconWrap: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(10),
    backgroundColor: surface[2],
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  optionContent: {
    flex: 1,
    minWidth: 0,
  },
  optionLabel: {
    ...variants.body,
    color: colors.text.secondary,
  },
  optionLabelSelected: {
    color: colors.text.primary,
    fontFamily: "Manrope_600SemiBold",
  },
  optionLabelDisabled: {
    color: colors.text.tertiary,
  },
  optionDescription: {
    ...variants.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
  },
  footerNoteWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  footerNoteText: {
    ...variants.caption,
    color: colors.text.tertiary,
    flex: 1,
  },
});

export default SettingsSelectionModal;
