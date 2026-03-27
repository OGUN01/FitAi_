import React from "react";
import { Modal, View, StyleSheet } from "react-native";
import { FoodRecognitionPanel } from "./FoodRecognitionPanel";
import MealTypeSelector from "./MealTypeSelector";
import JobStatusIndicator from "./JobStatusIndicator";
import CreateRecipeModal from "./CreateRecipeModal";
import { ResponsiveTheme } from "../../utils/constants";

interface DietModalsProps {
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
  showMealTypeSelector: boolean;
  handleMealTypeSelected: (type: any) => void;
  setShowMealTypeSelector: (show: boolean) => void;
  userProfile: any;
  asyncJob: any;
  cancelAsyncGeneration: () => void;
  showCreateRecipe: boolean;
  setShowCreateRecipe: (show: boolean) => void;
  handleRecipeCreated: (recipe: any) => void;
  portionGrams?: number | null;
  setPortionGrams?: (grams: number | null) => void;
}

export const DietModals: React.FC<DietModalsProps> = (props) => {
  return (
    <>
      <FoodRecognitionPanel
        showCamera={props.showCamera}
        cameraMode={props.cameraMode}
        onHandleCameraCapture={props.onHandleCameraCapture}
        onHandleLabelCapture={props.onHandleLabelCapture}
        handleBarcodeScanned={props.handleBarcodeScanned}
        handleLabelLibraryPick={props.handleLabelLibraryPick}
        handleBarcodeCameraClose={props.handleBarcodeCameraClose}
        setShowCamera={props.setShowCamera}
        setCameraMode={props.setCameraMode}
        barcodeCameraState={props.barcodeCameraState}
        barcodeStatusMessage={props.barcodeStatusMessage}
        barcodeInlineActions={props.barcodeInlineActions}
        portionData={props.portionData}
        showPortionAdjustment={props.showPortionAdjustment}
        setShowPortionAdjustment={props.setShowPortionAdjustment}
        setPortionData={props.setPortionData}
        handlePortionAdjustmentComplete={props.handlePortionAdjustmentComplete}
        feedbackData={props.feedbackData}
        showFeedbackModal={props.showFeedbackModal}
        setShowFeedbackModal={props.setShowFeedbackModal}
        setFeedbackData={props.setFeedbackData}
        handleFeedbackSubmit={props.handleFeedbackSubmit}
        portionGrams={props.portionGrams}
        setPortionGrams={props.setPortionGrams}
      />

      <MealTypeSelector
        visible={props.showMealTypeSelector}
        onSelect={props.handleMealTypeSelected}
        onClose={() => props.setShowMealTypeSelector(false)}
      />

      {props.asyncJob && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={props.cancelAsyncGeneration}
        >
          <View style={styles.asyncJobModalOverlay}>
            <JobStatusIndicator
              job={{
                jobId: props.asyncJob.jobId,
                status: props.asyncJob.status,
                error: props.asyncJob.error,
                createdAt: props.asyncJob.createdAt,
                estimatedTimeRemaining: props.asyncJob.estimatedTimeRemaining,
                generationTimeMs: props.asyncJob.generationTimeMs,
              }}
              onCancel={props.cancelAsyncGeneration}
              onDismiss={() => {}}
            />
          </View>
        </Modal>
      )}

      <CreateRecipeModal
        visible={props.showCreateRecipe}
        onClose={() => props.setShowCreateRecipe(false)}
        onRecipeCreated={props.handleRecipeCreated}
        profile={props.userProfile}
      />
    </>
  );
};

const styles = StyleSheet.create({
  asyncJobModalOverlay: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: ResponsiveTheme.spacing.lg,
  },
});
