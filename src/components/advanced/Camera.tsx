import React, { useState, useRef, ErrorInfo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleProp,
  ViewStyle,
  Keyboard,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../ui';
import { GlassButton } from '../ui/aurora/GlassButton';
import { AuroraSpinner } from '../ui/aurora/AuroraSpinner';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from '../../theme/aurora-tokens';
import { rf, rbr, rs, rh } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_MEDIUM } from '../../utils/colors';
import {
  isProductBarcode,
  matchesPackagedFoodBarcodeType,
  normalizeBarcode,
} from '@/utils/countryMapping';
import { crossPlatformAlert } from '../../utils/crossPlatformAlert';

// Error Boundary Component
class CameraErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Camera Error:', error, errorInfo);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText} numberOfLines={1}>
            Camera Error
          </Text>
          <Text style={styles.errorSubtext} numberOfLines={3}>
            Unable to load camera. Please try again.
          </Text>
          <Button title="Close" onPress={this.props.onError} variant="outline" />
        </View>
      );
    }

    return this.props.children;
  }
}

interface CameraProps {
  mode: 'food' | 'progress' | 'barcode' | 'label';
  onCapture: (uri: string) => void;
  onBarcodeScanned?: (barcode: string, type: string, rawBarcode?: string) => void;
  onLabelLibraryPick?: () => void | Promise<void>;
  onClose: () => void;
  visible?: boolean;
  style?: StyleProp<ViewStyle>;
  portionGrams?: number | null;
  onPortionGramsChange?: (grams: number | null) => void;
  barcodeSessionState?: 'idle' | 'decoding' | 'lookup_in_progress' | 'transient_retry' | 'resolved';
  barcodeStatusMessage?: string | null;
  barcodeActions?: Array<{
    id: string;
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  }>;
}

const CameraComponent: React.FC<CameraProps> = ({
  visible = true,
  mode,
  onCapture,
  onBarcodeScanned,
  onLabelLibraryPick,
  onClose,
  style,
  portionGrams,
  onPortionGramsChange,
  barcodeSessionState = 'idle',
  barcodeStatusMessage,
  barcodeActions = [],
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [gramsText, setGramsText] = useState(() =>
    portionGrams != null ? String(portionGrams) : ''
  );
  const cameraRef = useRef<CameraView>(null);
  // Top inset so the header clears notches on fullScreen modal. The previous
  // static paddingTop: spacing.lg (24px) approximation clipped on devices
  // with taller status bars / notches.
  const insets = useSafeAreaInsets();
  const headerTopInset = Math.max(insets.top, spacing.sm);
  React.useEffect(() => {
    if (!visible) {
      return;
    }

    if (!permission || !permission.granted) {
      if (permission?.canAskAgain !== false) {
        requestPermission();
      }
    }
  }, [visible, permission, requestPermission]);

  const takePicture = async () => {
    if (cameraRef.current && !isCapturing && isCameraReady) {
      setIsCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          skipProcessing: false,
        });
        onCapture(photo.uri);
      } catch (error) {
        console.error('Camera capture error:', error);
        crossPlatformAlert('Error', 'Failed to take picture. Please try again.');
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const toggleCameraType = () => {
    setCameraType((current) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlashMode((current) => (current === 'off' ? 'on' : 'off'));
  };

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (!isProductBarcode(type) || !matchesPackagedFoodBarcodeType(type, data)) {
      return;
    }
    const normalized = normalizeBarcode(data);
    if (normalized === null || !onBarcodeScanned) {
      return;
    }
    onBarcodeScanned(normalized, type, data);
  };

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <AuroraSpinner size="lg" theme="primary" />
        <Text style={styles.permissionText} numberOfLines={2}>
          Requesting camera permission...
        </Text>
        <Text style={styles.permissionSubtext} numberOfLines={2}>
          This lets us identify your food
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons
          name="ban-outline"
          size={rf(48)}
          color={colors.textSecondary}
          style={styles.permissionIcon}
        />
        <Text style={styles.permissionText} numberOfLines={1}>
          No access to camera
        </Text>
        <Text style={styles.permissionSubtext} numberOfLines={3}>
          FitAI needs camera access to scan your meal
        </Text>
        <GlassButton
          label="Open Settings"
          onPress={() => Linking.openSettings()}
          variant="primary"
          fullWidth
          style={styles.permissionPrimaryBtn}
        />
        {permission.canAskAgain !== false && (
          <TouchableOpacity
            style={styles.permissionSecondaryBtn}
            onPress={requestPermission}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.permissionSecondaryText} numberOfLines={1}>
              Try Again
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.permissionCloseBtn}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close camera"
        >
          <Text style={styles.permissionCloseText} numberOfLines={1}>
            Close
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getModeTitle = () => {
    switch (mode) {
      case 'food':
        return 'Scan Food';
      case 'progress':
        return 'Progress Photo';
      case 'barcode':
        return 'Scan Product';
      case 'label':
        return 'Scan Label';
      default:
        return 'Camera';
    }
  };

  const getModeInstructions = () => {
    switch (mode) {
      case 'food':
        return 'Position your food in the center of the frame for best results';
      case 'progress':
        return 'Stand in good lighting and position yourself in the frame';
      case 'barcode':
        return 'Point your camera at the barcode on the product packaging';
      case 'label':
        return 'Align the full nutrition facts table inside the frame';
      default:
        return 'Take a photo';
    }
  };

  const isBarcodeBusy =
    mode === 'barcode' &&
    (barcodeSessionState === 'decoding' ||
      barcodeSessionState === 'lookup_in_progress' ||
      barcodeSessionState === 'transient_retry');

  const effectiveBarcodeStatus =
    barcodeStatusMessage ||
    (mode === 'barcode' ? (isBarcodeBusy ? 'Looking up product...' : 'Ready to scan') : null);

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerTopInset }]}>
        <AnimatedPressable
          style={styles.closeButton}
          onPress={onClose}
          hapticType="light"
          accessibilityLabel="Close camera"
          accessibilityRole="button"
          accessibilityHint="Double tap to close the camera"
        >
          <Ionicons name="close" size={rf(22)} color={colors.text} />
        </AnimatedPressable>
        <Text style={styles.title} numberOfLines={1}>
          {getModeTitle()}
        </Text>
        <AnimatedPressable
          style={styles.flashButton}
          onPress={toggleFlash}
          hapticType="light"
          accessibilityLabel={`Flash ${flashMode === 'on' ? 'on' : 'off'}`}
          accessibilityRole="button"
          accessibilityHint="Double tap to toggle flash"
        >
          <Ionicons
            name={flashMode === 'on' ? 'flash' : 'flash-off'}
            size={rf(22)}
            color={flashMode === 'on' ? colors.primary : colors.text}
          />
        </AnimatedPressable>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText} numberOfLines={2} adjustsFontSizeToFit>
          {getModeInstructions()}
        </Text>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraType}
          flash={flashMode}
          onCameraReady={() => setIsCameraReady(true)}
          barcodeScannerSettings={
            mode === 'barcode'
              ? {
                  barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
                }
              : undefined
          }
          onBarcodeScanned={mode === 'barcode' ? handleBarcodeScanned : undefined}
        >
          {/* Camera Overlay */}
          <View style={styles.overlay}>
            {mode === 'food' && (
              <View style={styles.foodFrame}>
                <View style={styles.frameCorner} />
                <View style={[styles.frameCorner, styles.frameCornerTopRight]} />
                <View style={[styles.frameCorner, styles.frameCornerBottomLeft]} />
                <View style={[styles.frameCorner, styles.frameCornerBottomRight]} />
              </View>
            )}

            {mode === 'progress' && (
              <View style={styles.progressFrame}>
                <View style={styles.bodyOutline} />
              </View>
            )}

            {mode === 'barcode' && (
              <View style={styles.barcodeFrame}>
                <View style={styles.scanningArea}>
                  <View style={styles.scanningLine} />
                  {isBarcodeBusy && (
                    <View style={styles.scanningIndicator}>
                      <Text style={styles.scanningText} numberOfLines={1} adjustsFontSizeToFit>
                        {effectiveBarcodeStatus}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.barcodeCorner} />
                <View style={[styles.barcodeCorner, styles.barcodeCornerTopRight]} />
                <View style={[styles.barcodeCorner, styles.barcodeCornerBottomLeft]} />
                <View style={[styles.barcodeCorner, styles.barcodeCornerBottomRight]} />
              </View>
            )}

            {mode === 'label' && (
              <View style={styles.labelFrame}>
                <View style={styles.labelGuide} />
                <View style={styles.barcodeCorner} />
                <View style={[styles.barcodeCorner, styles.barcodeCornerTopRight]} />
                <View style={[styles.barcodeCorner, styles.barcodeCornerBottomLeft]} />
                <View style={[styles.barcodeCorner, styles.barcodeCornerBottomRight]} />
              </View>
            )}
          </View>
        </CameraView>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <AnimatedPressable
          style={styles.flipButton}
          onPress={toggleCameraType}
          hapticType="light"
          accessibilityLabel="Flip camera"
          accessibilityRole="button"
          accessibilityHint="Double tap to switch between front and back camera"
        >
          <Ionicons name="camera-reverse-outline" size={rf(24)} color={colors.text} />
        </AnimatedPressable>

        {mode !== 'barcode' ? (
          <AnimatedPressable
            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
            onPress={takePicture}
            disabled={isCapturing}
            hapticType="medium"
            accessibilityLabel="Take picture"
            accessibilityRole="button"
            accessibilityHint="Double tap to take a photo"
          >
            <View style={styles.captureButtonInner} />
          </AnimatedPressable>
        ) : barcodeSessionState === 'resolved' ? (
          <View
            style={styles.scanningStatus}
            accessible
            accessibilityLabel="Scan result"
          >
            <Ionicons name="information-circle-outline" size={rf(28)} color={colors.primary} />
          </View>
        ) : (
          <View style={styles.scanningStatus}>
            <Text style={styles.scanningStatusText} numberOfLines={2} adjustsFontSizeToFit>
              {effectiveBarcodeStatus}
            </Text>
          </View>
        )}

        <View style={styles.placeholder} />
      </View>

      {mode === 'barcode' && barcodeSessionState === 'resolved' && effectiveBarcodeStatus && (
        <View style={styles.barcodeResolutionCard}>
          <Text style={styles.barcodeResolutionText}>{effectiveBarcodeStatus}</Text>
        </View>
      )}

      {mode === 'barcode' && barcodeActions.length > 0 && (
        <View style={styles.barcodeActionRow}>
          {barcodeActions.map((action) => (
            <AnimatedPressable
              key={action.id}
              style={[
                styles.barcodeActionButton,
                action.variant === 'primary' && styles.barcodeActionButtonPrimary,
              ]}
              onPress={action.onPress}
              hapticType="light"
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Text
                style={[
                  styles.barcodeActionText,
                  action.variant === 'primary' && styles.barcodeActionTextPrimary,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {action.label}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      )}

      {mode === 'label' && onLabelLibraryPick && (
        <View style={styles.labelLibraryRow}>
          <AnimatedPressable
            style={styles.labelLibraryButton}
            onPress={onLabelLibraryPick}
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel="Choose nutrition label from library"
          >
            <Text style={styles.labelLibraryButtonText} numberOfLines={1} adjustsFontSizeToFit>
              Choose From Library
            </Text>
          </AnimatedPressable>
        </View>
      )}

      {/* Portion size hint for food mode */}
      {mode === 'food' && onPortionGramsChange && (
        <View style={styles.portionHintContainer}>
          <View style={styles.portionHintLabelRow}>
            <Ionicons name="scale-outline" size={rf(13)} color={colors.text} />
            <Text style={styles.portionHintLabel} numberOfLines={1} adjustsFontSizeToFit>
              Portion size hint (optional)
            </Text>
          </View>
          <View style={styles.portionHintRow}>
            <TextInput
              style={styles.portionHintInput}
              value={gramsText}
              onChangeText={setGramsText}
              onBlur={() => {
                const val = parseFloat(gramsText);
                onPortionGramsChange(!isNaN(val) && val > 0 ? val : null);
              }}
              onSubmitEditing={() => {
                const val = parseFloat(gramsText);
                onPortionGramsChange(!isNaN(val) && val > 0 ? val : null);
                Keyboard.dismiss();
              }}
              placeholder="grams"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={4}
              returnKeyType="done"
              accessibilityLabel="Portion size in grams"
            />
            <Text style={styles.portionHintUnit}>g</Text>
            {gramsText.length > 0 && (
              <AnimatedPressable
                onPress={() => {
                  setGramsText('');
                  onPortionGramsChange(null);
                }}
                style={styles.portionClearBtn}
                hapticType="light"
                accessibilityLabel="Clear portion size"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={rf(16)} color={colors.textSecondary} />
              </AnimatedPressable>
            )}
            {portionGrams != null && portionGrams > 0 && (
              <View style={styles.portionActiveRow}>
                <Ionicons name="checkmark" size={rf(11)} color={colors.primary} />
                <Text style={styles.portionActiveText} numberOfLines={1}>
                  {portionGrams}g set
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.portionHintSubtext} numberOfLines={2}>
            Helps AI estimate nutrients more accurately
          </Text>
        </View>
      )}

      {/* Tips */}
      <View style={styles.tipsContainer}>
        {mode === 'food' && (
          <View style={styles.tipItem}>
            <Ionicons
              name="bulb-outline"
              size={rf(16)}
              color={colors.textSecondary}
              style={styles.tipIcon}
            />
            <Text style={styles.tipText} numberOfLines={3}>
              Ensure good lighting and place food on a contrasting background
            </Text>
          </View>
        )}

        {mode === 'progress' && (
          <View style={styles.tipItem}>
            <Ionicons
              name="resize-outline"
              size={rf(16)}
              color={colors.textSecondary}
              style={styles.tipIcon}
            />
            <Text style={styles.tipText} numberOfLines={3}>
              Stand 3-4 feet away from the camera for best results
            </Text>
          </View>
        )}

        {mode === 'barcode' && (
          <View style={styles.tipItem}>
            <Ionicons
              name="search"
              size={rf(16)}
              color={colors.textSecondary}
              style={styles.tipIcon}
            />
            <Text style={styles.tipText} numberOfLines={3}>
              Hold the barcode 6-8 inches away and keep it steady for best scanning
            </Text>
          </View>
        )}

        {mode === 'label' && (
          <View style={styles.tipItem}>
            <Ionicons
              name="document-text-outline"
              size={rf(16)}
              color={colors.textSecondary}
              style={styles.tipIcon}
            />
            <Text style={styles.tipText} numberOfLines={3}>
              Keep the label flat, fill the frame, and avoid glare for the best reading accuracy
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  permissionContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },

  permissionText: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold as '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  permissionSubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  permissionIcon: {
    marginBottom: spacing.md,
  },

  permissionPrimaryBtn: {
    width: '100%',
    marginBottom: spacing.sm,
  },

  permissionSecondaryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    marginBottom: spacing.sm,
  },

  permissionSecondaryText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold as '600',
    color: colors.text,
  },

  permissionCloseBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },

  permissionCloseText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: spacing.lg,
  },

  closeButton: {
    width: 44,
    height: 44,
    borderRadius: rbr(22),
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  title: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold as '600',
    color: colors.text,
    textAlign: 'center',
  },

  flashButton: {
    width: 44,
    height: 44,
    borderRadius: rbr(22),
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  instructionsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  instructionsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  cameraContainer: {
    flex: 1,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },

  camera: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  foodFrame: {
    width: rs(250),
    height: rs(250),
    position: 'relative',
  },

  frameCorner: {
    position: 'absolute',
    width: rs(30),
    height: rs(30),
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.primary,
    top: 0,
    left: 0,
  },

  frameCornerTopRight: {
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    top: 0,
    right: 0,
    left: 'auto',
  },

  frameCornerBottomLeft: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    bottom: 0,
    top: 'auto',
    left: 0,
  },

  frameCornerBottomRight: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
  },

  progressFrame: {
    width: rs(200),
    height: rs(400),
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  bodyOutline: {
    width: rs(150),
    height: rs(350),
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: rbr(75),
    borderStyle: 'dashed',
  },

  labelFrame: {
    width: rs(260),
    height: rs(340),
    position: 'relative',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  labelGuide: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    backgroundColor: hexToRgba(colors.black, TINT_ALPHA_LOW),
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  flipButton: {
    width: Math.max(rs(50), 44),
    height: Math.max(rs(50), 44),
    borderRadius: rbr(25),
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  captureButton: {
    width: rs(80),
    height: rs(80),
    borderRadius: rbr(40),
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 4,
    borderColor: colors.white,
  },

  captureButtonDisabled: {
    opacity: 0.5,
  },

  captureButtonInner: {
    width: rs(60),
    height: rs(60),
    borderRadius: rbr(30),
    backgroundColor: colors.white,
  },

  placeholder: {
    width: rs(50),
    height: rs(50),
  },

  portionHintContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW + 0.05),
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM + 0.1),
  },
  portionHintLabelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginBottom: 4,
  },
  portionHintLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600' as const,
    color: colors.text,
  },
  portionHintRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 2,
  },
  portionHintInput: {
    width: 72,
    minHeight: Math.max(rh(36), 36),
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    fontSize: fontSize.sm,
    fontWeight: '600' as const,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center' as const,
  },
  portionHintUnit: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600' as const,
  },
  portionClearBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portionActiveRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
  },
  portionActiveText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '600' as const,
  },
  portionHintSubtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  tipsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },

  tipItem: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },

  tipIcon: {
    marginRight: spacing.sm,
  },

  tipText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.background,
    padding: spacing.xl,
  },

  errorText: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold as '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },

  errorSubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  // Barcode scanning styles
  barcodeFrame: {
    width: rs(280),
    height: rs(160),
    position: 'relative',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  scanningArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    backgroundColor: hexToRgba(colors.black, TINT_ALPHA_LOW),
  },

  scanningLine: {
    width: '90%',
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.7,
  },

  scanningIndicator: {
    position: 'absolute',
    top: -30,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },

  scanningText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium as '500',
  },

  barcodeCorner: {
    position: 'absolute',
    width: rs(20),
    height: rs(20),
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.primary,
    top: -2,
    left: -2,
  },

  barcodeCornerTopRight: {
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    top: -2,
    right: -2,
    left: 'auto',
  },

  barcodeCornerBottomLeft: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    bottom: -2,
    top: 'auto',
    left: -2,
  },

  barcodeCornerBottomRight: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    bottom: -2,
    right: -2,
    top: 'auto',
    left: 'auto',
  },

  scanningStatus: {
    width: rs(80),
    height: rs(80),
    borderRadius: rbr(40),
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: colors.primary,
  },

  scanningStatusText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium as '500',
    textAlign: 'center',
  },
  // Full-width, unclamped readable container for the barcode-resolution
  // explanation (retry/not-found/etc.) — mirrors tipItem's card treatment.
  // The small circular scanningStatus badge above is reserved for short
  // in-progress copy; long guidance sentences render here instead so they
  // stay legible ahead of the action buttons below.
  barcodeResolutionCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  barcodeResolutionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    textAlign: 'center',
  },
  barcodeActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    justifyContent: 'center' as const,
  },
  barcodeActionButton: {
    minWidth: Math.max(rs(110), 110),
    minHeight: Math.max(rh(44), 44),
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
  },
  barcodeActionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  barcodeActionText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold as '600',
    color: colors.text,
  },
  barcodeActionTextPrimary: {
    color: colors.white,
  },
  labelLibraryRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center' as const,
  },
  labelLibraryButton: {
    minWidth: Math.max(rs(190), 190),
    minHeight: Math.max(rh(44), 44),
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
  },
  labelLibraryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold as '600',
    color: colors.text,
  },
});

// Export Camera component with error boundary
export const Camera: React.FC<CameraProps> = ({ visible = true, ...rest }) => {
  // onDismiss fires on iOS when the Modal is dismissed via swipe/overlay;
  // we ensure onClose is called so camera refs and listeners are cleaned up
  // even when the user dismisses via the OS rather than our Close button.
  // onRequestClose covers Android hardware-back.
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={rest.onClose}
      onDismiss={rest.onClose}
      transparent={false}
      statusBarTranslucent
      hardwareAccelerated
    >
      <CameraErrorBoundary onError={rest.onClose}>
        <CameraComponent visible={visible} {...rest} />
      </CameraErrorBoundary>
    </Modal>
  );
};
