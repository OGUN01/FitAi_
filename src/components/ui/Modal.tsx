import React from 'react';
import {
  Modal as RNModal,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { THEME } from '../../utils/constants';

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
    paddingHorizontal: THEME.spacing.lg,
  },
  
  content: {
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    maxWidth: screenWidth - (THEME.spacing.lg * 2),
    maxHeight: screenHeight * 0.8,
    ...THEME.shadows.lg,
  },
  
  // Bottom Sheet styles
  bottomSheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  
  bottomSheetContent: {
    backgroundColor: THEME.colors.backgroundSecondary,
    borderTopLeftRadius: THEME.borderRadius.xxl,
    borderTopRightRadius: THEME.borderRadius.xxl,
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    ...THEME.shadows.lg,
  },
  
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: THEME.colors.textMuted,
    borderRadius: THEME.borderRadius.full,
    alignSelf: 'center',
    marginBottom: THEME.spacing.lg,
  },
});
