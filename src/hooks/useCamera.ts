import { logger } from '../utils/logger';
import { useState, useRef, useEffect } from "react";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";

export interface UseCameraProps {
  mode: "food" | "progress" | "barcode";
  visible?: boolean;
  onCapture: (uri: string) => void;
  onBarcodeScanned?: (barcode: string, type: string) => void;
}

export const useCamera = ({
  mode,
  visible = true,
  onCapture,
  onBarcodeScanned,
}: UseCameraProps) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<"off" | "on">("off");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
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
        logger.error('Camera capture error', { error: String(error) });
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
    if (!isScanning && onBarcodeScanned) {
      setIsScanning(true);
      onBarcodeScanned(data, type);

      // Reset scanning state after a delay to prevent multiple scans
      setTimeout(() => {
        setIsScanning(false);
      }, 2000);
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case "food":
        return "Scan Food";
      case "progress":
        return "Progress Photo";
      case "barcode":
        return "Scan Product";
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
        return "Point your camera at the barcode or QR code on the product";
      default:
        return "Take a photo";
    }
  };

  return {
    cameraRef,
    permission,
    requestPermission,
    cameraType,
    flashMode,
    isCapturing,
    isCameraReady,
    isScanning,
    setIsCameraReady,
    takePicture,
    toggleCameraType,
    toggleFlash,
    handleBarcodeScanned,
    getModeTitle,
    getModeInstructions,
  };
};
