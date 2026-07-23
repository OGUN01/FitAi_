import { flatColors as colors, spacing, borderRadius } from "../../theme/aurora-tokens";
import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rp, rbr, rh } from "../../utils/responsive";
import { ValidationResult } from "../../services/validationEngine";
import {
  useAdjustmentWizard,
  } from "../../hooks/adjustment-wizard";
import type { Alternative } from "../../hooks/adjustment-wizard/types";
import { AlternativeCard } from "./wizard/AlternativeCard";

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop — fills screen, tap to dismiss */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <BlurView intensity={40} tint="dark" style={styles.blurOverlay}>
          {/* Inner — stops propagation so taps inside don't dismiss */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContainer}>
              {/* ── Header ── */}
              <LinearGradient
                colors={[
                  colors.background,
                  colors.backgroundSecondary,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
              >
                {/* Close Button */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close goal adjustment"
                >
                  <Ionicons
                    name="close"
                    size={rf(20)}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Header Icon */}
                <View style={styles.headerIconContainer}>
                  <LinearGradient
                    colors={[
                      colors.primary,
                      colors.secondary,
                    ]}
                    style={styles.headerIconGradient}
                  >
                    <Ionicons
                      name="analytics"
                      size={rf(24)}
                      color={colors.white}
                    />
                  </LinearGradient>
                </View>

                <Text style={styles.title}>Goal Adjustment</Text>
                <Text style={styles.subtitle}>
                  Your current plan needs optimization for safe, sustainable
                  results
                </Text>

                {/* Error Alert */}
                <View style={styles.errorAlert}>
                  <View style={styles.errorIconContainer}>
                    <Ionicons
                      name="warning"
                      size={rf(16)}
                      color={colors.errorAlt}
                    />
                  </View>
                  <Text style={styles.errorMessage} numberOfLines={2}>
                    {error.message}
                  </Text>
                </View>
              </LinearGradient>

              {/* ── Alternatives List ── */}
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sectionLabel}>
                  Choose a safe alternative
                </Text>

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
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel goal adjustment"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.applyButton,
                    selectedIndex === null && styles.applyButtonDisabled,
                  ]}
                  onPress={handleSelectAlternative}
                  disabled={selectedIndex === null}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Apply goal adjustment"
                >
                  <LinearGradient
                    colors={
                      selectedIndex !== null
                        ? [
                            colors.primary,
                            colors.secondary,
                          ]
                        : [
                            colors.surfaceLight,
                            colors.surfaceLight,
                          ]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.applyButtonGradient}
                  >
                    <Text style={styles.applyButtonText}>
                      {isSaving ? "Saving..." : "Apply Changes"}
                    </Text>
                    {!isSaving && (
                      <Ionicons
                        name="checkmark-circle"
                        size={rf(18)}
                        color={colors.white}
                      />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </BlurView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalContainer: {
    maxHeight: rh(784),
    backgroundColor: colors.background,
    borderTopLeftRadius: rbr(24),
    borderTopRightRadius: rbr(24),
    overflow: "hidden",
  },

  // Header
  header: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: "center",
  },

  closeButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: Math.max(rw(32), 44),
    height: Math.max(rw(32), 44),
    borderRadius: Math.max(rw(16), 22),
    backgroundColor: colors.glassSurface,
    alignItems: "center",
    justifyContent: "center",
  },

  headerIconContainer: {
    marginBottom: spacing.md,
  },

  headerIconGradient: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(28),
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: rf(22),
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: rf(13),
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(18),
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },

  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorTint,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${colors.errorAlt}4D`,
    width: "100%",
  },

  errorIconContainer: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: `${colors.errorAlt}33`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },

  errorMessage: {
    flex: 1,
    fontSize: rf(12),
    color: colors.errorLight,
    fontWeight: "500",
    lineHeight: rf(16),
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  scrollPadding: {
    height: spacing.lg,
  },

  sectionLabel: {
    fontSize: rf(12),
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },

  // Footer
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: `${colors.backgroundSecondary}F2`,
    borderTopWidth: 1,
    borderTopColor: colors.glassSurface,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },

  cancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glassSurface,
    borderWidth: 1,
    borderColor: colors.glassHighlight,
  },

  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: rf(14),
    fontWeight: "600",
  },

  applyButton: {
    flex: 2,
    minHeight: 44,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    elevation: 4,
  },

  applyButtonDisabled: {
    opacity: 0.5,
  },

  applyButtonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(8),
  },

  applyButtonText: {
    color: colors.white,
    fontSize: rf(14),
    fontWeight: "700",
  },
});
