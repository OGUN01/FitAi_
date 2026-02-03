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

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEditContext } from "../../contexts/EditContext";
import { THEME } from "../ui";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  // Safe context access with error handling
  const contextData = (() => {
    try {
      return useEditContext();
    } catch (error) {
      console.error("EditOverlay: Error accessing EditContext:", error);
      return {
        editSection: null,
        isLoading: false,
        isSaving: false,
      };
    }
  })();

  const { editSection, isLoading, isSaving } = contextData;

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
              color={THEME.colors.primary}
            />
          </View>
          <Text style={styles.title}>No Section Selected</Text>
          <Text style={styles.description}>
            Please use the dedicated edit buttons on the Profile screen to
            modify your information.
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        <View style={styles.iconCircle}>
          <Ionicons
            name={sectionInfo.icon as any}
            size={48}
            color={THEME.colors.primary}
          />
        </View>
        <Text style={styles.title}>{sectionInfo.title}</Text>
        <Text style={styles.description}>{sectionInfo.description}</Text>
        <View style={styles.infoBox}>
          <Ionicons
            name="bulb-outline"
            size={20}
            color={THEME.colors.warning}
          />
          <Text style={styles.infoText}>
            This overlay is deprecated. Use the edit icons on each section of
            the Profile screen for a better experience.
          </Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
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
        backgroundColor="rgba(0, 0, 0, 0.5)"
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
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdropTouchable} />
        </TouchableWithoutFeedback>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.6,
    minHeight: SCREEN_HEIGHT * 0.4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
  },

  modalHeader: {
    alignItems: "center",
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },

  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: THEME.colors.textSecondary,
    borderRadius: 2,
    opacity: 0.3,
  },

  contentContainer: {
    flex: 1,
    padding: THEME.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },

  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${THEME.colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: THEME.spacing.lg,
  },

  title: {
    fontSize: 20,
    fontWeight: "600",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
    textAlign: "center",
  },

  description: {
    fontSize: 15,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: THEME.spacing.lg,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${THEME.colors.warning}15`,
    padding: THEME.spacing.md,
    borderRadius: 12,
    marginBottom: THEME.spacing.lg,
    gap: THEME.spacing.sm,
  },

  infoText: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },

  closeButton: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.xl * 2,
    borderRadius: 12,
  },

  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
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
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    padding: THEME.spacing.xl,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },

  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: THEME.colors.border,
    borderTopColor: THEME.colors.primary,
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
