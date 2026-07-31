/**
 * AdjustmentWizard — validation-error bottom sheet ("Editorial Dark", no glass)
 *
 * Rebuilt on the fresh pattern: plain dim backdrop (no BlurView), transparent
 * sheet chrome on tokens.bg, hairline separators only, ink type scale. The ONE
 * solid accent element is the "Apply Changes" primary CTA (the allowed CTA
 * fill). No gradients, no glass surfaces, no elevation, no fontWeight hacks.
 *
 * DOM structure (web-safe): the backdrop Pressable is an absolute-fill SIBLING
 * rendered BEHIND the sheet — never an ancestor of sheet content. Nesting it
 * around the sheet produced <button> inside <button> on react-native-web
 * ("Dismiss goal adjustment" wrapping "Close goal adjustment"), which broke
 * HTML hydration. Sheet taps can't hit the backdrop because the sheet paints
 * above it in z-order, so no stopPropagation wrapper is needed either.
 *
 * Selection / save / close logic — UNCHANGED.
 */

import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ValidationResult } from "../../services/validationEngine";
import { useAdjustmentWizard } from "../../hooks/adjustment-wizard";
import type { Alternative } from "../../hooks/adjustment-wizard/types";
import { AlternativeCard } from "./wizard/AlternativeCard";
import { SectionLabel, tokens, font, type as typeScale } from "./fresh";

interface AdjustmentWizardProps {
  visible: boolean;
  error: ValidationResult;
  currentData: {
    bmr: number;
    tdee: number;
    currentWeight: number;
    targetWeight: number;
    currentTimeline: number;
    currentFrequency: number;
    currentIntensity?: string;
    currentProtein?: number;
    currentCardioMinutes?: number;
    currentStrengthSessions?: number;
    /** S15: sex-based calorie floor + healthy-BMI target clamp in wizard options. */
    gender?: string;
    heightCm?: number;
  };
  primaryGoals?: string[];
  onSelectAlternative: (alternative: Alternative) => void;
  onSaveToDatabase?: () => Promise<boolean>;
  onClose: () => void;
}

export const AdjustmentWizard: React.FC<AdjustmentWizardProps> = (props) => {
  const {
    selectedIndex,
    setSelectedIndex,
    alternatives,
    isSaving,
    handleSelectAlternative,
  } = useAdjustmentWizard(props);

  const { visible, error, onClose } = props;
  const applyEnabled = selectedIndex !== null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Root lays the sheet at the bottom; the backdrop is a sibling BEHIND
          it (absolute-fill), never an ancestor — see header note. */}
      <View style={styles.root}>
        {/* Dim backdrop — fills screen, tap to dismiss (plain dim, no blur) */}
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss goal adjustment"
          accessibilityHint="Closes the adjustment wizard without saving"
        />
        <View style={styles.modalContainer}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close goal adjustment"
            >
              <Ionicons name="close" size={20} color={tokens.ink2} />
            </Pressable>

            <SectionLabel>Goal adjustment</SectionLabel>
            <Text style={styles.subtitle}>
              Your current plan needs optimization for safe, sustainable
              results
            </Text>

            {/* Error — hairline callout, not a tinted alert box */}
            <View style={styles.errorCallout}>
              <Ionicons name="warning" size={16} color={tokens.danger} />
              <Text style={styles.errorMessage} numberOfLines={2}>
                {error.message}
              </Text>
            </View>
          </View>

          {/* ── Alternatives List ── */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <SectionLabel style={styles.sectionLabel}>
              Choose a safe alternative
            </SectionLabel>

            {alternatives.map((alt, index) => (
              <AlternativeCard
                key={index}
                alternative={alt}
                index={index}
                isSelected={selectedIndex === index}
                isRecommended={index === 0}
                onSelect={() => setSelectedIndex(index)}
              />
            ))}

            <View style={styles.scrollPadding} />
          </ScrollView>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel goal adjustment"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.applyButton,
                applyEnabled
                  ? styles.applyButtonEnabled
                  : styles.applyButtonDisabled,
                pressed && applyEnabled && styles.pressed,
              ]}
              onPress={handleSelectAlternative}
              disabled={!applyEnabled}
              accessibilityRole="button"
              accessibilityLabel="Apply goal adjustment"
            >
              <Text
                style={[
                  styles.applyButtonText,
                  !applyEnabled && styles.applyButtonTextDisabled,
                ]}
              >
                {isSaving ? "Saving..." : "Apply Changes"}
              </Text>
              {!isSaving && applyEnabled && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={tokens.bg}
                />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  pressed: {
    opacity: 0.6,
  },

  modalContainer: {
    maxHeight: "85%",
    backgroundColor: tokens.bg,
    borderTopWidth: 1,
    borderTopColor: tokens.hairline,
  },

  // Header
  header: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: tokens.hairline,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  subtitle: {
    marginTop: 8,
    ...typeScale.body,
    lineHeight: 20,
    paddingRight: 32,
  },
  errorCallout: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tokens.hairline,
  },
  errorMessage: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: tokens.danger,
  },

  // ScrollView
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  scrollPadding: {
    height: 24,
  },
  sectionLabel: {
    marginBottom: 8,
  },

  // Footer — hairline separator, ghost cancel + one solid accent CTA
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: tokens.hairline,
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontFamily: font.semibold,
    fontSize: 15,
    color: tokens.ink2,
  },
  applyButton: {
    flex: 2,
    minHeight: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  applyButtonEnabled: {
    backgroundColor: tokens.accent,
  },
  applyButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  applyButtonText: {
    fontFamily: font.semibold,
    fontSize: 16,
    color: tokens.bg,
  },
  applyButtonTextDisabled: {
    color: tokens.ink3,
  },
});
