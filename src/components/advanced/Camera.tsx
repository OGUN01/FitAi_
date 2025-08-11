import React, { useState, useRef, ErrorInfo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Button, THEME } from '../ui';

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
    console.error('Camera Error:', error, errorInfo);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Camera Error</Text>
          <Text style={styles.errorSubtext}>Unable to load camera. Please try again.</Text>
          <Button title="Close" onPress={this.props.onError} variant="outline" />
        </View>
      );
    }

    return this.props.children;
  }
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CameraProps {
  mode: 'food' | 'progress';
  onCapture: (uri: string) => void;
  onClose: () => void;
  style?: any;
}

const CameraComponent: React.FC<CameraProps> = ({ mode, onCapture, onClose, style }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  React.useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

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
        Alert.alert('Error', 'Failed to take picture. Please try again.');
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

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
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
        <Button title="Close" onPress={onClose} variant="outline" style={styles.closeButton} />
      </View>
    );
  }

  const getModeTitle = () => {
    switch (mode) {
      case 'food':
        return 'Scan Food';
      case 'progress':
        return 'Progress Photo';
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
      default:
        return 'Take a photo';
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{getModeTitle()}</Text>
        <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
          <Text style={styles.flashIcon}>{flashMode === 'on' ? '⚡' : '⚡'}</Text>
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
          </View>
        </CameraView>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.flipButton} onPress={toggleCameraType}>
          <Text style={styles.flipIcon}>🔄</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
          onPress={takePicture}
          disabled={isCapturing}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <View style={styles.placeholder} />
      </View>

      {/* Tips */}
      <View style={styles.tipsContainer}>
        {mode === 'food' && (
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>
              Ensure good lighting and place food on a contrasting background
            </Text>
          </View>
        )}

        {mode === 'progress' && (
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>📏</Text>
            <Text style={styles.tipText}>Stand 3-4 feet away from the camera for best results</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    paddingHorizontal: THEME.spacing.lg,
  },

  permissionText: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold as '600',
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: THEME.spacing.sm,
  },

  permissionSubtext: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    paddingTop: THEME.spacing.lg,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeIcon: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.text,
  },

  title: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold as '600',
    color: THEME.colors.text,
  },

  flashButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  flashIcon: {
    fontSize: THEME.fontSize.lg,
  },

  instructionsContainer: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
  },

  instructionsText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },

  cameraContainer: {
    flex: 1,
    marginHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    overflow: 'hidden',
  },

  camera: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  foodFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },

  frameCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: THEME.colors.primary,
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
    width: 200,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bodyOutline: {
    width: 150,
    height: 350,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderRadius: 75,
    borderStyle: 'dashed',
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.lg,
  },

  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  flipIcon: {
    fontSize: 24,
  },

  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: THEME.colors.white,
  },

  captureButtonDisabled: {
    opacity: 0.5,
  },

  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.white,
  },

  placeholder: {
    width: 50,
    height: 50,
  },

  tipsContainer: {
    paddingHorizontal: THEME.spacing.md,
    paddingBottom: THEME.spacing.lg,
  },

  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },

  tipIcon: {
    fontSize: THEME.fontSize.md,
    marginRight: THEME.spacing.sm,
  },

  tipText: {
    flex: 1,
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.xl,
  },

  errorText: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold as '700',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
    textAlign: 'center',
  },

  errorSubtext: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.xl,
  },
});

// Export Camera component with error boundary
export const Camera: React.FC<CameraProps> = (props) => {
  return (
    <CameraErrorBoundary onError={props.onClose}>
      <CameraComponent {...props} />
    </CameraErrorBoundary>
  );
};
