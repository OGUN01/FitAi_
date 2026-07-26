/**
 * SettingsSelectionModal - Reusable bottom-sheet style selection modal
 *
 * Used for Theme, Units, and Language preference selection.
 * Web-safe (no Alert.alert), uses Modal + GlassCard + AnimatedPressable pattern.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../../components/ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius } from "../../../../theme/aurora-tokens";
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_MEDIUM } from "../../../../utils/colors";
import { rf, rp, rbr, rw, rh } from "../../../../utils/responsive";

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
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose}>
        <BlurView intensity={80} style={styles.blurContainer}>
          <Pressable onPress={() => {}}>
            <View style={styles.dialogContainer}>
              <GlassCard
                elevation={5}
                blurIntensity="heavy"
                padding="lg"
                borderRadius="xl"
              >
                {/* Header */}
                <View style={styles.headerRow}>
                  <View
                    style={[
                      styles.headerIconWrap,
                      { backgroundColor: hexToRgba(iconColor, TINT_ALPHA_LOW) },
                    ]}
                  >
                    <Ionicons name={icon} size={rf(22)} color={iconColor} />
                  </View>
                  <View style={styles.headerText}>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                    {subtitle && (
                      <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
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
                      color={colors.textSecondary}
                    />
                  </AnimatedPressable>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Options */}
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
                        style={[
                          styles.optionRow,
                          ...(isSelected ? [styles.optionRowSelected] : []),
                          ...(isDisabled ? [styles.optionRowDisabled] : []),
                        ]}
                      >
                        <View
                          style={[
                            styles.optionIconWrap,
                            isSelected && {
                              backgroundColor: hexToRgba(iconColor, TINT_ALPHA_MEDIUM),
                            },
                          ]}
                        >
                          <Ionicons
                            name={opt.icon}
                            size={rf(18)}
                            color={
                              isSelected
                                ? iconColor
                                : colors.textSecondary
                            }
                          />
                        </View>

                        <View style={styles.optionContent}>
                          <Text
                            style={[
                              styles.optionLabel,
                              isSelected && { color: colors.white },
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
                      color={colors.textMuted}
                    />
                    <Text style={styles.footerNoteText}>{footerNote}</Text>
                  </View>
                )}
              </GlassCard>
            </View>
          </Pressable>
        </BlurView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.overlay,
  },
  dialogContainer: {
    width: "88%",
    maxWidth: 380,
    // Use percentage maxHeight so the dialog never exceeds the viewport on
    // short screens (rh(682) was an absolute px value that could exceed
    // screen height on small devices).
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
    fontSize: rf(18),
    fontWeight: "700",
    color: colors.white,
  },
  subtitle: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  closeBtn: {
    // Match headerIconWrap dimensions (rw(40)) so the header row stays
    // visually symmetric (previously closeBtn was rw(32) — smaller than the
    // icon wrap on the other side).
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: Math.max(rw(20), 22),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: spacing.sm,
  },
  optionsList: {
    gap: spacing.xs,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  optionRowSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  optionRowDisabled: {
    opacity: 0.5,
  },
  optionIconWrap: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(10),
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  optionContent: {
    flex: 1,
    minWidth: 0,
  },
  optionLabel: {
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.textSecondary,
  },
  optionLabelDisabled: {
    color: colors.textMuted,
  },
  optionDescription: {
    fontSize: rf(12),
    color: colors.textMuted,
    marginTop: rp(2),
  },
  footerNoteWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  footerNoteText: {
    fontSize: rf(12),
    color: colors.textMuted,
    fontStyle: "italic",
    flex: 1,
  },
});

export default SettingsSelectionModal;
