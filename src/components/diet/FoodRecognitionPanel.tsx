import React from "react";
import { StyleSheet } from "react-native";
import { Camera } from "../advanced/Camera";
import PortionAdjustment from "./PortionAdjustment";
import FoodRecognitionFeedback from "./FoodRecognitionFeedback";
import { ResponsiveTheme } from "../../utils/constants";

interface FoodRecognitionPanelProps {
  showCamera: boolean;
  cameraMode: "food" | "barcode" | "progress" | string;
  onHandleCameraCapture: (uri: string) => Promise<void>;
  handleBarcodeScanned: (data: string) => Promise<void>;
  setShowCamera: (show: boolean) => void;
  setCameraMode: (mode: any) => void;
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
}

export const FoodRecognitionPanel: React.FC<FoodRecognitionPanelProps> = ({
  showCamera,
  cameraMode,
  onHandleCameraCapture,
  handleBarcodeScanned,
  setShowCamera,
  setCameraMode,
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
}) => {
  return (
    <>
      {showCamera && (
        <Camera
          mode={cameraMode as "food" | "progress" | "barcode"}
          onCapture={onHandleCameraCapture}
          onBarcodeScanned={
            cameraMode === "barcode" ? handleBarcodeScanned : undefined
          }
          onClose={() => {
            setShowCamera(false);
            setCameraMode("food");
          }}
          style={styles.cameraModal}
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
