import React from "react";
import {
  Modal as RNModal,
  View,
  StyleSheet,
  Pressable,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { flatColors as colors, spacing, borderRadius, flatShadows as shadows } from "../../theme/aurora-tokens";

// REMOVED: Module-level Dimensions.get() causes crash - use rw/rh functions instead
// const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  animationType?: "none" | "slide" | "fade";
  transparent?: boolean;
  style?: ViewStyle;
  overlayStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  closeOnOverlayPress?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  animationType = "fade",
  transparent = true,
  style,
  overlayStyle,
  contentStyle,
  closeOnOverlayPress = true,
}) => {
  const insets = useSafeAreaInsets();

  const handleOverlayPress = () => {
    if (closeOnOverlayPress) {
      onClose();
    }
  };

  return (
    <RNModal
      visible={visible}
      animationType={animationType}
      transparent={transparent}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.overlay, overlayStyle, { paddingTop: insets.top }]}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleOverlayPress}
          accessibilityRole="button"
          accessibilityLabel="Dismiss modal"
          accessibilityHint="Closes this dialog"
          accessible={closeOnOverlayPress}
        />
        <View style={[styles.container, style]} pointerEvents="box-none">
          <View style={[styles.content, contentStyle]}>
            {children}
          </View>
        </View>
      </View>
    </RNModal>
  );
};

// NOTE: A BottomSheetModal variant used to live here (flat, non-glass,
// slide-up RNModal). It had zero production imports and is fully superseded
// by `ui/aurora/BottomSheet.tsx`, which is the glass bottom-sheet every
// other in-app sheet (LogMealModal, ExercisePickerSheet, TemplateDetailSheet,
// etc.) already uses. Removed rather than kept as an unmaintained duplicate
// — use `ui/aurora/BottomSheet` for any new bottom sheet.

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
  },
  container: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: spacing.lg,
  },

  content: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: "90%",
    // Use percentage maxHeight so the dialog never exceeds the viewport on
    // small phones. The previous rh(682) was an absolute px value that
    // could exceed screen height on small devices.
    maxHeight: "85%",
    ...shadows.lg,
  },
});
