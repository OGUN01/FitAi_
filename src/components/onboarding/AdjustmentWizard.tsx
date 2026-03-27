import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw, rp, rbr } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { ValidationResult } from "../../services/validationEngine";
import {
  useAdjustmentWizard,
  } from "../../hooks/adjustment-wizard";
import type { Alternative } from "../../hooks/adjustment-wizard/types";
import { AlternativeCard } from "./wizard/AlternativeCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
      {/* OB-UX-011: Touchable backdrop to dismiss modal */}
      <Pressable onPress={onClose}>
        <View style={styles.modalOverlay}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalTouchableContainer}>
              <BlurView intensity={40} tint="dark" style={styles.blurOverlay}>
                <View style={styles.modalContainer}>
                  {/* Header */}
                  <LinearGradient
                    colors={[ResponsiveTheme.colors.background, ResponsiveTheme.colors.backgroundSecondary]}
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
                        color={ResponsiveTheme.colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {/* Header Icon */}
                    <View style={styles.headerIconContainer}>
                      <LinearGradient
                        colors={[
                          ResponsiveTheme.colors.primary,
                          ResponsiveTheme.colors.secondary,
                        ]}
                        style={styles.headerIconGradient}
                      >
                        <Ionicons name="analytics" size={rf(24)} color={ResponsiveTheme.colors.white} />
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
                          color={ResponsiveTheme.colors.errorAlt}
                        />
                      </View>
                      <Text style={styles.errorMessage} numberOfLines={2}>
                        {error.message}
                      </Text>
                    </View>
                  </LinearGradient>

                  {/* Alternatives List */}
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

                  {/* Footer */}
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
                                ResponsiveTheme.colors.primary,
                                ResponsiveTheme.colors.secondary,
                              ]
                            : [ResponsiveTheme.colors.surfaceLight, ResponsiveTheme.colors.surfaceLight]
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
                            color={ResponsiveTheme.colors.white}
                          />
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.overlayDark,
  },

  modalTouchableContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },

  blurOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalContainer: {
    flex: 1,
    maxHeight: "92%",
    backgroundColor: ResponsiveTheme.colors.background,
    borderTopLeftRadius: rbr(24),
    borderTopRightRadius: rbr(24),
    overflow: "hidden",
  },

  // Header
  header: {
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.lg,
    alignItems: "center",
  },

  closeButton: {
    position: "absolute",
    top: ResponsiveTheme.spacing.md,
    right: ResponsiveTheme.spacing.md,
    width: Math.max(rw(32), 44),
    height: Math.max(rw(32), 44),
    borderRadius: Math.max(rw(16), 22),
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    alignItems: "center",
    justifyContent: "center",
  },

  headerIconContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
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
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(18),
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.errorTint,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.errorAlt}4D`,
    width: "100%",
  },

  errorIconContainer: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: `${ResponsiveTheme.colors.errorAlt}33`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: ResponsiveTheme.spacing.sm,
  },

  errorMessage: {
    flex: 1,
    fontSize: rf(12),
    color: ResponsiveTheme.colors.errorLight,
    fontWeight: "500",
    lineHeight: rf(16),
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
  },

  scrollPadding: {
    height: ResponsiveTheme.spacing.lg,
  },

  sectionLabel: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
  },

  // Footer
  footer: {
    padding: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.backgroundSecondary}F2`,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.glassSurface,
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.md,
    paddingBottom: ResponsiveTheme.spacing.xl, // Safe area
  },

  cancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: ResponsiveTheme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassHighlight,
  },

  cancelButtonText: {
    color: ResponsiveTheme.colors.textSecondary,
    fontSize: rf(14),
    fontWeight: "600",
  },

  applyButton: {
    flex: 2,
    minHeight: 44,
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: "hidden",
    shadowColor: ResponsiveTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    boxShadow: `0px 4px 8px ${ResponsiveTheme.colors.primary}4D`,
    elevation: 4,
  },

  applyButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },

  applyButtonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(8),
  },

  applyButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(14),
    fontWeight: "700",
  },
});
