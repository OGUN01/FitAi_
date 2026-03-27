import React from "react";
import { StyleSheet } from "react-native";
import { Camera } from "../advanced/Camera";
import PortionAdjustment from "./PortionAdjustment";
import FoodRecognitionFeedback from "./FoodRecognitionFeedback";

interface FoodRecognitionPanelProps {
  showCamera: boolean;
  cameraMode: "food" | "barcode" | "progress" | "label" | string;
  onHandleCameraCapture: (uri: string) => Promise<void>;
  onHandleLabelCapture: (uri: string) => Promise<void>;
  handleBarcodeScanned: (
    barcode: string,
    rawSymbology?: string,
    rawBarcode?: string,
  ) => Promise<void>;
  handleLabelLibraryPick: () => Promise<void>;
  handleBarcodeCameraClose: () => void;
  setShowCamera: (show: boolean) => void;
  setCameraMode: (mode: any) => void;
  barcodeCameraState?: "idle" | "decoding" | "lookup_in_progress" | "transient_retry" | "resolved";
  barcodeStatusMessage?: string | null;
  barcodeInlineActions?: Array<{
    id: string;
    label: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "ghost";
  }>;
  portionData: any;
  showPortionAdjustment: boolean;
  setShowPortionAdjustment: (show: boolean) => void;
  setPortionData: (data: any) => void;
  handlePortionAdjustmentComplete: (data: any) => Promise<void>;
  feedbackData: any;
  showFeedbackModal: boolean;
  setShowFeedbackModal: (show: boolean) => void;
  setFeedbackData: (data: any) => void;
  handleFeedbackSubmit: (feedback: any) => Promise<void>;
  // Optional pre-scan grams hint for AI accuracy
  portionGrams?: number | null;
  setPortionGrams?: (grams: number | null) => void;
}

export const FoodRecognitionPanel: React.FC<FoodRecognitionPanelProps> = ({
  showCamera,
  cameraMode,
  onHandleCameraCapture,
  onHandleLabelCapture,
  handleBarcodeScanned,
  handleLabelLibraryPick,
  handleBarcodeCameraClose,
  setShowCamera,
  setCameraMode,
  barcodeCameraState,
  barcodeStatusMessage,
  barcodeInlineActions,
  portionData,
  showPortionAdjustment,
  setShowPortionAdjustment,
  setPortionData,
  handlePortionAdjustmentComplete,
  feedbackData,
  showFeedbackModal,
  setShowFeedbackModal,
  setFeedbackData,
  handleFeedbackSubmit,
  portionGrams,
  setPortionGrams,
}) => {
  return (
    <>
      {showCamera && (
        <Camera
          mode={cameraMode as "food" | "progress" | "barcode" | "label"}
          onCapture={
            cameraMode === "label" ? onHandleLabelCapture : onHandleCameraCapture
          }
          onBarcodeScanned={
            cameraMode === "barcode" ? handleBarcodeScanned : undefined
          }
          onLabelLibraryPick={
            cameraMode === "label" ? handleLabelLibraryPick : undefined
          }
          onClose={() => {
            if (cameraMode === "barcode") {
              handleBarcodeCameraClose();
            } else {
              setShowCamera(false);
            }
            setCameraMode("food");
            if (setPortionGrams) setPortionGrams(null);
          }}
          style={styles.cameraModal}
          barcodeSessionState={barcodeCameraState}
          barcodeStatusMessage={barcodeStatusMessage}
          barcodeActions={barcodeInlineActions}
          portionGrams={cameraMode === "food" ? portionGrams : undefined}
          onPortionGramsChange={cameraMode === "food" ? setPortionGrams : undefined}
        />
      )}

      {portionData && (
        <PortionAdjustment
          visible={showPortionAdjustment}
          recognizedFoods={portionData.recognizedFoods}
          onClose={() => {
            setShowPortionAdjustment(false);
            setPortionData(null);
          }}
          onAdjustmentComplete={handlePortionAdjustmentComplete}
        />
      )}

      {feedbackData && (
        <FoodRecognitionFeedback
          visible={showFeedbackModal}
          recognizedFoods={feedbackData.recognizedFoods}
          onClose={() => {
            setShowFeedbackModal(false);
            setFeedbackData(null);
          }}
          onSubmitFeedback={handleFeedbackSubmit}
          originalImageUri={feedbackData.imageUri}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  cameraModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
});
