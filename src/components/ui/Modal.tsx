import React from "react";
import {
  Modal as RNModal,
  View,
  StyleSheet,
  Pressable,
  ViewStyle,
  DimensionValue,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { rh, rw } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";

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

// Bottom Sheet Modal variant
interface BottomSheetModalProps
  extends Omit<ModalProps, "style" | "contentStyle"> {
  height?: number | string;
}

export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  visible,
  onClose,
  children,
  height = "50%",
  overlayStyle,
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
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.overlay, overlayStyle, { paddingTop: insets.top }]}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleOverlayPress}
          accessibilityRole="button"
          accessibilityLabel="Dismiss modal"
        />
        <View style={styles.bottomSheetContainer} pointerEvents="box-none">
          <View
            style={[
              styles.bottomSheetContent,
              {
                height: height as DimensionValue,
                paddingBottom: insets.bottom + ResponsiveTheme.spacing.lg,
              },
            ]}
          >
            <View style={styles.bottomSheetHandle} />
            {children}
          </View>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.overlayDark,
  },
  container: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  content: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    padding: ResponsiveTheme.spacing.lg,
    width: "90%", // Use percentage instead of screenWidth calculation
    maxHeight: "80%", // Use percentage instead of screenHeight calculation
    ...ResponsiveTheme.shadows.lg,
  },

  // Bottom Sheet styles
  bottomSheetContainer: {
    flex: 1,
    justifyContent: "flex-end" as const,
  },

  bottomSheetContent: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderTopLeftRadius: ResponsiveTheme.borderRadius.xxl,
    borderTopRightRadius: ResponsiveTheme.borderRadius.xxl,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.md,
    ...ResponsiveTheme.shadows.lg,
  },

  bottomSheetHandle: {
    width: rw(40),
    height: rh(4),
    backgroundColor: ResponsiveTheme.colors.textMuted,
    borderRadius: ResponsiveTheme.borderRadius.full,
    alignSelf: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
  },
});
