import React from 'react';
import {
  Modal as RNModal,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { THEME } from '../../utils/constants';
import { ResponsiveTheme } from '../../utils/responsiveTheme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: 'none' | 'slide' | 'fade';
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
  animationType = 'fade',
  transparent = true,
  style,
  overlayStyle,
  contentStyle,
  closeOnOverlayPress = true,
}) => {
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
      <View style={[styles.overlay, overlayStyle]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleOverlayPress}
        >
          <View style={[styles.container, style]}>
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.content, contentStyle]}
              onPress={(e) => e.stopPropagation()}
            >
              {children}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </RNModal>
  );
};

// Bottom Sheet Modal variant
interface BottomSheetModalProps extends Omit<ModalProps, 'style' | 'contentStyle'> {
  height?: number | string;
}

export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  visible,
  onClose,
  children,
  height = '50%',
  overlayStyle,
  closeOnOverlayPress = true,
}) => {
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
      <View style={[styles.overlay, overlayStyle]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleOverlayPress}
        >
          <View style={styles.bottomSheetContainer}>
            <TouchableOpacity
              activeOpacity={1}
              style={[
                styles.bottomSheetContent,
                { height: typeof height === 'string' ? height : height },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.bottomSheetHandle} />
              {children}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  
  overlayTouchable: {
    flex: 1,
  },
  
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  
  content: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    padding: ResponsiveTheme.spacing.lg,
    maxWidth: screenWidth - (ResponsiveTheme.spacing.lg * 2),
    maxHeight: screenHeight * 0.8,
    ...THEME.shadows.lg,
  },
  
  // Bottom Sheet styles
  bottomSheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  
  bottomSheetContent: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.md,
    ...THEME.shadows.lg,
  },
  
  bottomSheetHandle: {
    width: rw(40),
    height: rh(4),
    backgroundColor: ResponsiveTheme.colors.textMuted,
    borderRadius: ResponsiveTheme.borderRadius.full,
    alignSelf: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
  },
});
