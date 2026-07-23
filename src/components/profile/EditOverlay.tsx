/**
 * Professional Edit Overlay Modal
 *
 * NOTE: This component is now largely deprecated. The new architecture uses
 * dedicated edit modals from src/screens/main/profile/modals/:
 * - PersonalInfoEditModal
 * - GoalsPreferencesEditModal
 * - BodyMeasurementsEditModal
 *
 * This overlay is kept for backward compatibility but simply shows
 * a message directing users to the appropriate section.
 */

import React, { useEffect, useRef, type ComponentProps } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  Pressable,
  StatusBar,
  TouchableOpacity,
  } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEditContext } from "../../contexts/EditContext";
import { flatColors as colors, spacing } from "../../theme/aurora-tokens";
import { rf, rp, rbr, dimensions } from "../../utils/responsive";

// Clamped screen height (capped to 900 on web/tablet) so the sheet's
// slide-animation distance and maxHeight/minHeight fractions size against the
// mobile design height, not a 1080px desktop window. `dimensions` carries its
// own fallback when Dimensions is mocked (jest).
const SCREEN_HEIGHT = dimensions.screenHeight;

interface EditOverlayProps {
  visible: boolean;
  onClose: () => void;
}

// Map section names to user-friendly labels
const SECTION_LABELS: Record<
  string,
  { title: string; description: string; icon: string }
> = {
  personalInfo: {
    title: "Personal Information",
    description:
      "Edit your name, age, gender, and activity level from the Profile screen.",
    icon: "person-outline",
  },
  fitnessGoals: {
    title: "Fitness Goals",
    description:
      "Update your fitness goals and preferences from the Profile screen.",
    icon: "trophy-outline",
  },
  dietPreferences: {
    title: "Diet Preferences",
    description:
      "Modify your diet type, allergies, and meal preferences from the Profile screen.",
    icon: "nutrition-outline",
  },
  workoutPreferences: {
    title: "Workout Preferences",
    description:
      "Change your workout settings and exercise preferences from the Profile screen.",
    icon: "barbell-outline",
  },
};

export const EditOverlay: React.FC<EditOverlayProps> = ({
  visible,
  onClose,
}) => {
  // Safe context access - call hook at top level (Rules of Hooks)
  let editSection: string | null = null;
  let isLoading = false;
  let isSaving = false;
  try {
    const ctx = useEditContext();
    editSection = ctx.editSection;
    isLoading = ctx.isLoading;
    isSaving = ctx.isSaving;
  } catch {
    // EditOverlay rendered outside EditProvider — use defaults
  }

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // ============================================================================
  // ANIMATION EFFECTS
  // ============================================================================

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  // ============================================================================
  // SCREEN RENDERING
  // ============================================================================

  const renderEditScreen = () => {
    const sectionInfo = editSection ? SECTION_LABELS[editSection] : null;

    if (!sectionInfo) {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="information-circle-outline"
              size={48}
              color={colors.primary}
            />
          </View>
          <Text style={styles.title}>No Section Selected</Text>
          <Text style={styles.description}>
            Please use the dedicated edit buttons on the Profile screen to
            modify your information.
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        <View style={styles.iconCircle}>
          <Ionicons
            name={sectionInfo.icon as ComponentProps<typeof Ionicons>['name']}
            size={48}
              color={colors.primary}
          />
        </View>
        <Text style={styles.title}>{sectionInfo.title}</Text>
        <Text style={styles.description}>{sectionInfo.description}</Text>
        <View style={styles.infoBox}>
          <Ionicons
            name="bulb-outline"
            size={20}
            color={colors.warning}
          />
          <Text style={styles.infoText}>
            This overlay is deprecated. Use the edit icons on each section of
            the Profile screen for a better experience.
          </Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.closeButtonText}>Got it</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Don't render modal if there's no valid edit section
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar
        backgroundColor={colors.overlay}
        barStyle="light-content"
        translucent={true}
      />

      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss overlay">
          <View style={styles.backdropTouchable} />
        </Pressable>
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.dragIndicator} />
            </View>

            {/* Content */}
            {renderEditScreen()}
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* Loading Overlay */}
      {(isLoading || isSaving) && (
        <Animated.View
          style={[
            styles.loadingOverlay,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.loadingContainer}>
            <View style={styles.loadingSpinner} />
          </View>
        </Animated.View>
      )}
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    zIndex: 1,
  },

  backdropTouchable: {
    flex: 1,
  },

  modalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    justifyContent: "flex-end",
  },

  safeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: rbr(24),
    borderTopRightRadius: rbr(24),
    maxHeight: SCREEN_HEIGHT * 0.6,
    minHeight: SCREEN_HEIGHT * 0.4,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    boxShadow: '0px -4px 12px rgba(0, 0, 0, 0.25)',
    elevation: 20,
  },

  modalHeader: {
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  dragIndicator: {
    width: rp(40),
    height: rp(4),
    backgroundColor: colors.textSecondary,
    borderRadius: rbr(2),
    opacity: 0.3,
  },

  contentContainer: {
    flex: 1,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },

  iconCircle: {
    width: rp(80),
    height: rp(80),
    borderRadius: rbr(40),
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },

  title: {
    fontSize: rf(20),
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },

  description: {
    fontSize: rf(15),
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(22),
    marginBottom: spacing.lg,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${colors.warning}15`,
    padding: spacing.md,
    borderRadius: rbr(12),
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },

  infoText: {
    flex: 1,
    fontSize: rf(13),
    color: colors.textSecondary,
    lineHeight: rf(18),
  },

  closeButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl * 2,
    borderRadius: rbr(12),
  },

  closeButtonText: {
    color: colors.white,
    fontSize: rf(16),
    fontWeight: "600",
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
  },

  loadingContainer: {
    backgroundColor: colors.surface,
    borderRadius: rbr(12),
    padding: spacing.xl,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.25)',
    elevation: 10,
  },

  loadingSpinner: {
    width: rp(40),
    height: rp(40),
    borderRadius: rbr(20),
    borderWidth: 3,
    borderColor: colors.border,
    borderTopColor: colors.primary,
  },
});

// ============================================================================
// ENHANCED EDIT OVERLAY WITH GESTURE SUPPORT
// ============================================================================

interface EnhancedEditOverlayProps extends EditOverlayProps {
  enableSwipeToClose?: boolean;
  enableBackdropClose?: boolean;
}

export const EnhancedEditOverlay: React.FC<EnhancedEditOverlayProps> = ({
  visible,
  onClose,
  enableSwipeToClose = true,
  enableBackdropClose = true,
}) => {
  const { editSection, hasChanges } = useEditContext();

  const handleClose = () => {
    if (hasChanges) {
      // If there are unsaved changes, let the EditContext handle the confirmation
      // This will be handled by the cancelEdit function in EditContext
      onClose();
    } else {
      // No changes, safe to close
      onClose();
    }
  };

  const handleBackdropPress = () => {
    if (enableBackdropClose) {
      handleClose();
    }
  };

  return <EditOverlay visible={visible} onClose={handleClose} />;
};

export default EditOverlay;
