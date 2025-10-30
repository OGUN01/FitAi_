/**
 * Professional Edit Overlay Modal
 * Provides smooth overlay experience for profile editing with proper animations
 * Designed for $1M app quality with seamless user experience
 */

import React, { useEffect, useRef } from 'react';
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
  Platform,
  ScrollView,
} from 'react-native';
import { useEditContext } from '../../contexts/EditContext';
import { THEME } from '../ui';

// Import onboarding screens for reuse
import { PersonalInfoScreen } from '../../screens/onboarding/PersonalInfoScreen';
import { DietPreferencesScreen } from '../../screens/onboarding/DietPreferencesScreen';
import { WorkoutPreferencesScreen } from '../../screens/onboarding/WorkoutPreferencesScreen';
import { FitnessGoalsScreen } from '../../screens/onboarding/FitnessGoalsScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EditOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export const EditOverlay: React.FC<EditOverlayProps> = ({ visible, onClose }) => {
  // Safe context access with error handling
  const contextData = (() => {
    try {
      return useEditContext();
    } catch (error) {
      console.error('EditOverlay: Error accessing EditContext:', error);
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
    if (!editSection) {
      return (
        <View style={styles.errorContainer}>
          <Text>No edit section selected</Text>
        </View>
      );
    }

    // Common props for all onboarding screens when used in edit mode
    const commonProps = {
      isEditMode: true,
      onEditComplete: onClose,
      onEditCancel: onClose,
    };

    try {
      switch (editSection) {
        case 'personalInfo':
          return <PersonalInfoScreen {...commonProps} />;
        case 'fitnessGoals':
          return <FitnessGoalsScreen {...commonProps} />;
        case 'dietPreferences':
          return <DietPreferencesScreen {...commonProps} />;
        case 'workoutPreferences':
          return <WorkoutPreferencesScreen {...commonProps} />;
        default:
          return (
            <View style={styles.errorContainer}>
              <Text>Unknown edit section: {editSection}</Text>
            </View>
          );
      }
    } catch (error) {
      console.error('🚨 EditOverlay: Error rendering edit screen:', error);
      return (
        <View style={styles.errorContainer}>
          <Text>Error loading edit screen</Text>
          <Text style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
            {error instanceof Error ? error.message : 'Unknown error'}
          </Text>
        </View>
      );
    }
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
      <StatusBar backgroundColor="rgba(0, 0, 0, 0.5)" barStyle="light-content" translucent={true} />

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
            <ScrollView
              style={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={true}
            >
              {renderEditScreen()}
            </ScrollView>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },

  backdropTouchable: {
    flex: 1,
  },

  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    justifyContent: 'flex-end',
  },

  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.95,
    minHeight: SCREEN_HEIGHT * 0.6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
  },

  modalHeader: {
    alignItems: 'center',
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
    flexGrow: 1,
    backgroundColor: THEME.colors.surface,
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },

  loadingContainer: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    padding: THEME.spacing.xl,
    shadowColor: '#000',
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
    // Note: In a real app, you'd use an ActivityIndicator or Lottie animation
  },

  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
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
