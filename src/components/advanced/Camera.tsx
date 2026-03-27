import React, { useState, useRef, ErrorInfo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  StyleProp,
  ViewStyle,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Button } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rbr, rs } from '../../utils/responsive';
import {
  isProductBarcode,
  matchesPackagedFoodBarcodeType,
  normalizeBarcode,
} from "@/utils/countryMapping";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

// Error Boundary Component
class CameraErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Camera Error:", error, errorInfo);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Camera Error</Text>
          <Text style={styles.errorSubtext}>
            Unable to load camera. Please try again.
          </Text>
          <Button
            title="Close"
            onPress={this.props.onError}
            variant="outline"
          />
        </View>
      );
    }

    return this.props.children;
  }
}

interface CameraProps {
  mode: "food" | "progress" | "barcode" | "label";
  onCapture: (uri: string) => void;
  onBarcodeScanned?: (
    barcode: string,
    type: string,
    rawBarcode?: string,
  ) => void;
  onLabelLibraryPick?: () => void | Promise<void>;
  onClose: () => void;
  visible?: boolean;
  style?: StyleProp<ViewStyle>;
  portionGrams?: number | null;
  onPortionGramsChange?: (grams: number | null) => void;
  barcodeSessionState?: "idle" | "decoding" | "lookup_in_progress" | "transient_retry" | "resolved";
  barcodeStatusMessage?: string | null;
  barcodeActions?: Array<{
    id: string;
    label: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "ghost";
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
  barcodeSessionState = "idle",
  barcodeStatusMessage,
  barcodeActions = [],
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<"off" | "on">("off");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [gramsText, setGramsText] = useState(() =>
    portionGrams != null ? String(portionGrams) : "",
  );
  const cameraRef = useRef<CameraView>(null);
  React.useEffect(() => {
    if (!visible) {
      return;
    }

    if (!permission || !permission.granted) {
      requestPermission();
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
        console.error("Camera capture error:", error);
        crossPlatformAlert("Error", "Failed to take picture. Please try again.");
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const toggleCameraType = () => {
    setCameraType((current) => (current === "back" ? "front" : "back"));
  };

  const toggleFlash = () => {
    setFlashMode((current) => (current === "off" ? "on" : "off"));
  };

  const handleBarcodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
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
        <ActivityIndicator size="large" color={ResponsiveTheme.colors.primary} />
        <Text style={styles.permissionText}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>No access to camera</Text>
        <Text style={styles.permissionSubtext}>
          Please enable camera permissions in your device settings
        </Text>
        <Button
          title="Close"
          onPress={onClose}
          variant="outline"
          style={styles.closeButton}
        />
      </View>
    );
  }

  const getModeTitle = () => {
    switch (mode) {
      case "food":
        return "Scan Food";
      case "progress":
        return "Progress Photo";
      case "barcode":
        return "Scan Product";
      case "label":
        return "Scan Label";
      default:
        return "Camera";
    }
  };

  const getModeInstructions = () => {
    switch (mode) {
      case "food":
        return "Position your food in the center of the frame for best results";
      case "progress":
        return "Stand in good lighting and position yourself in the frame";
      case "barcode":
        return "Point your camera at the barcode on the product packaging";
      case "label":
        return "Align the full nutrition facts table inside the frame";
      default:
        return "Take a photo";
    }
  };

  const isBarcodeBusy =
    mode === "barcode" &&
    (barcodeSessionState === "decoding" ||
      barcodeSessionState === "lookup_in_progress" ||
      barcodeSessionState === "transient_retry");

  const effectiveBarcodeStatus =
    barcodeStatusMessage ||
    (mode === "barcode"
      ? isBarcodeBusy
        ? "Looking up product..."
        : "Ready to scan"
      : null);

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel="Close camera"
          accessibilityRole="button"
          accessibilityHint="Double tap to close the camera"
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{getModeTitle()}</Text>
        <TouchableOpacity
          style={styles.flashButton}
          onPress={toggleFlash}
          accessibilityLabel={`Flash ${flashMode === "on" ? "on" : "off"}`}
          accessibilityRole="button"
          accessibilityHint="Double tap to toggle flash"
        >
          <Text style={styles.flashIcon}>
            {flashMode === "on" ? "⚡" : "⚡"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>{getModeInstructions()}</Text>
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
            mode === "barcode"
              ? {
                  barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
                }
              : undefined
          }
          onBarcodeScanned={
            mode === "barcode" ? handleBarcodeScanned : undefined
          }
        >
          {/* Camera Overlay */}
          <View style={styles.overlay}>
            {mode === "food" && (
              <View style={styles.foodFrame}>
                <View style={styles.frameCorner} />
                <View
                  style={[styles.frameCorner, styles.frameCornerTopRight]}
                />
                <View
                  style={[styles.frameCorner, styles.frameCornerBottomLeft]}
                />
                <View
                  style={[styles.frameCorner, styles.frameCornerBottomRight]}
                />
              </View>
            )}

            {mode === "progress" && (
              <View style={styles.progressFrame}>
                <View style={styles.bodyOutline} />
              </View>
            )}

            {mode === "barcode" && (
              <View style={styles.barcodeFrame}>
                <View style={styles.scanningArea}>
                  <View style={styles.scanningLine} />
                  {isBarcodeBusy && (
                    <View style={styles.scanningIndicator}>
                      <Text style={styles.scanningText}>
                        {effectiveBarcodeStatus}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.barcodeCorner} />
                <View
                  style={[styles.barcodeCorner, styles.barcodeCornerTopRight]}
                />
                <View
                  style={[styles.barcodeCorner, styles.barcodeCornerBottomLeft]}
                />
                <View
                  style={[
                    styles.barcodeCorner,
                    styles.barcodeCornerBottomRight,
                  ]}
                />
              </View>
            )}

            {mode === "label" && (
              <View style={styles.labelFrame}>
                <View style={styles.labelGuide} />
                <View style={styles.barcodeCorner} />
                <View
                  style={[styles.barcodeCorner, styles.barcodeCornerTopRight]}
                />
                <View
                  style={[styles.barcodeCorner, styles.barcodeCornerBottomLeft]}
                />
                <View
                  style={[
                    styles.barcodeCorner,
                    styles.barcodeCornerBottomRight,
                  ]}
                />
              </View>
            )}
          </View>
        </CameraView>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={toggleCameraType}
          accessibilityLabel="Flip camera"
          accessibilityRole="button"
          accessibilityHint="Double tap to switch between front and back camera"
        >
          <Text style={styles.flipIcon}>🔄</Text>
        </TouchableOpacity>

        {mode !== "barcode" ? (
          <TouchableOpacity
            style={[
              styles.captureButton,
              isCapturing && styles.captureButtonDisabled,
            ]}
            onPress={takePicture}
            disabled={isCapturing}
            accessibilityLabel="Take picture"
            accessibilityRole="button"
            accessibilityHint="Double tap to take a photo"
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        ) : (
          <View style={styles.scanningStatus}>
            <Text style={styles.scanningStatusText}>{effectiveBarcodeStatus}</Text>
          </View>
        )}

        <View style={styles.placeholder} />
      </View>

      {mode === "barcode" && barcodeActions.length > 0 && (
        <View style={styles.barcodeActionRow}>
          {barcodeActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.barcodeActionButton,
                action.variant === "primary" && styles.barcodeActionButtonPrimary,
              ]}
              onPress={action.onPress}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.barcodeActionText,
                  action.variant === "primary" && styles.barcodeActionTextPrimary,
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {mode === "label" && onLabelLibraryPick && (
        <View style={styles.labelLibraryRow}>
          <TouchableOpacity
            style={styles.labelLibraryButton}
            onPress={onLabelLibraryPick}
            accessibilityRole="button"
            accessibilityLabel="Choose nutrition label from library"
          >
            <Text style={styles.labelLibraryButtonText}>Choose From Library</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Portion size hint for food mode */}
      {mode === "food" && onPortionGramsChange && (
        <View style={styles.portionHintContainer}>
          <Text style={styles.portionHintLabel}>⚖️ Portion size hint (optional)</Text>
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
              }}
              placeholder="grams"
              placeholderTextColor={ResponsiveTheme.colors.textSecondary}
              keyboardType="numeric"
              maxLength={4}
              returnKeyType="done"
            />
            <Text style={styles.portionHintUnit}>g</Text>
            {gramsText.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setGramsText("");
                  onPortionGramsChange(null);
                }}
                style={styles.portionClearBtn}
              >
                <Text style={styles.portionClearText}>✕</Text>
              </TouchableOpacity>
            )}
            {portionGrams != null && portionGrams > 0 && (
              <Text style={styles.portionActiveText}>✓ {portionGrams}g set</Text>
            )}
          </View>
          <Text style={styles.portionHintSubtext}>
            Helps AI estimate nutrients more accurately
          </Text>
        </View>
      )}

      {/* Tips */}
      <View style={styles.tipsContainer}>
        {mode === "food" && (
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>
              Ensure good lighting and place food on a contrasting background
            </Text>
          </View>
        )}

        {mode === "progress" && (
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>📏</Text>
            <Text style={styles.tipText}>
              Stand 3-4 feet away from the camera for best results
            </Text>
          </View>
        )}

        {mode === "barcode" && (
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>🔍</Text>
            <Text style={styles.tipText}>
              Hold the barcode 6-8 inches away and keep it steady for best
              scanning
            </Text>
          </View>
        )}

        {mode === "label" && (
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>Label</Text>
            <Text style={styles.tipText}>
              Keep the label flat, fill the frame, and avoid glare for the best
              reading accuracy
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
    backgroundColor: ResponsiveTheme.colors.background,
  },

  permissionContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: ResponsiveTheme.colors.background,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  permissionText: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  permissionSubtext: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingTop: ResponsiveTheme.spacing.lg,
  },

  closeButton: {
    width: 44,
    height: 44,
    borderRadius: rbr(22),
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  closeIcon: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.text,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.text,
  },

  flashButton: {
    width: 44,
    height: 44,
    borderRadius: rbr(22),
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  flashIcon: {
    fontSize: ResponsiveTheme.fontSize.lg,
  },

  instructionsContainer: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
  },

  instructionsText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  cameraContainer: {
    flex: 1,
    marginHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: "hidden",
  },

  camera: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  foodFrame: {
    width: rs(250),
    height: rs(250),
    position: "relative",
  },

  frameCorner: {
    position: "absolute",
    width: rs(30),
    height: rs(30),
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: ResponsiveTheme.colors.primary,
    top: 0,
    left: 0,
  },

  frameCornerTopRight: {
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    top: 0,
    right: 0,
    left: "auto",
  },

  frameCornerBottomLeft: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    bottom: 0,
    top: "auto",
    left: 0,
  },

  frameCornerBottomRight: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    bottom: 0,
    right: 0,
    top: "auto",
    left: "auto",
  },

  progressFrame: {
    width: rs(200),
    height: rs(400),
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  bodyOutline: {
    width: rs(150),
    height: rs(350),
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(75),
    borderStyle: "dashed",
  },

  labelFrame: {
    width: rs(260),
    height: rs(340),
    position: "relative",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  labelGuide: {
    width: "100%",
    height: "100%",
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  controls: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.lg,
  },

  flipButton: {
    width: rs(50),
    height: rs(50),
    borderRadius: rbr(25),
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  flipIcon: {
    fontSize: rf(24),
  },

  captureButton: {
    width: rs(80),
    height: rs(80),
    borderRadius: rbr(40),
    backgroundColor: ResponsiveTheme.colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 4,
    borderColor: ResponsiveTheme.colors.white,
  },

  captureButtonDisabled: {
    opacity: 0.5,
  },

  captureButtonInner: {
    width: rs(60),
    height: rs(60),
    borderRadius: rbr(30),
    backgroundColor: ResponsiveTheme.colors.white,
  },

  placeholder: {
    width: rs(50),
    height: rs(50),
  },

  portionHintContainer: {
    marginHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.sm,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.primary}30`,
  },
  portionHintLabel: {
    fontSize: rf(11),
    fontWeight: "600" as const,
    color: ResponsiveTheme.colors.text,
    marginBottom: 4,
  },
  portionHintRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 2,
  },
  portionHintInput: {
    width: 72,
    height: 32,
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    paddingHorizontal: 8,
    fontSize: rf(13),
    fontWeight: "600" as const,
    color: ResponsiveTheme.colors.text,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    textAlign: "center" as const,
  },
  portionHintUnit: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "600" as const,
  },
  portionClearBtn: { padding: 4 },
  portionClearText: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
  },
  portionActiveText: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.primary,
    fontWeight: "600" as const,
  },
  portionHintSubtext: {
    fontSize: rf(9),
    color: ResponsiveTheme.colors.textSecondary,
  },
  tipsContainer: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingBottom: ResponsiveTheme.spacing.lg,
  },

  tipItem: {
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: ResponsiveTheme.colors.surface,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  tipIcon: {
    fontSize: ResponsiveTheme.fontSize.md,
    marginRight: ResponsiveTheme.spacing.sm,
  },

  tipText: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: ResponsiveTheme.colors.background,
    padding: ResponsiveTheme.spacing.xl,
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: "center",
  },

  errorSubtext: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  // Barcode scanning styles
  barcodeFrame: {
    width: rs(280),
    height: rs(160),
    position: "relative",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  scanningArea: {
    width: "100%",
    height: "100%",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: "rgba(0,0,0,0.1)",
  },

  scanningLine: {
    width: "90%",
    height: 2,
    backgroundColor: ResponsiveTheme.colors.primary,
    opacity: 0.7,
  },

  scanningIndicator: {
    position: "absolute",
    top: -30,
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  scanningText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium as "500",
  },

  barcodeCorner: {
    position: "absolute",
    width: rs(20),
    height: rs(20),
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: ResponsiveTheme.colors.primary,
    top: -2,
    left: -2,
  },

  barcodeCornerTopRight: {
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    top: -2,
    right: -2,
    left: "auto",
  },

  barcodeCornerBottomLeft: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    bottom: -2,
    top: "auto",
    left: -2,
  },

  barcodeCornerBottomRight: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    bottom: -2,
    right: -2,
    top: "auto",
    left: "auto",
  },

  scanningStatus: {
    width: rs(80),
    height: rs(80),
    borderRadius: rbr(40),
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary,
  },

  scanningStatusText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium as "500",
    textAlign: "center",
  },
  barcodeActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingBottom: ResponsiveTheme.spacing.md,
    justifyContent: "center" as const,
  },
  barcodeActionButton: {
    minWidth: rs(110),
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center" as const,
  },
  barcodeActionButtonPrimary: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  barcodeActionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.text,
  },
  barcodeActionTextPrimary: {
    color: ResponsiveTheme.colors.white,
  },
  labelLibraryRow: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingBottom: ResponsiveTheme.spacing.md,
    alignItems: "center" as const,
  },
  labelLibraryButton: {
    minWidth: rs(190),
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center" as const,
  },
  labelLibraryButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.text,
  },
});

// Export Camera component with error boundary
export const Camera: React.FC<CameraProps> = ({ visible = true, ...rest }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={rest.onClose}
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
