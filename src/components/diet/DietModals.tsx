import React from "react";
import { Modal, View, StyleSheet } from "react-native";
import { FoodRecognitionPanel } from "./FoodRecognitionPanel";
import MealTypeSelector from "./MealTypeSelector";
import AIMealsPanel from "./AIMealsPanel";
import JobStatusIndicator from "./JobStatusIndicator";
import CreateRecipeModal from "./CreateRecipeModal";
import { BarcodeScannerPanel } from "./BarcodeScannerPanel";
import { ResponsiveTheme } from "../../utils/constants";

interface DietModalsProps {
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
  showMealTypeSelector: boolean;
  handleMealTypeSelected: (type: any) => void;
  setShowMealTypeSelector: (show: boolean) => void;
  showAIMealsPanel: boolean;
  setShowAIMealsPanel: (show: boolean) => void;
  onGenerateAIMeal: (type: string, options?: any) => Promise<void>;
  isGeneratingMeal: boolean;
  userProfile: any;
  asyncJob: any;
  cancelAsyncGeneration: () => void;
  showCreateRecipe: boolean;
  setShowCreateRecipe: (show: boolean) => void;
  handleRecipeCreated: (recipe: any) => void;
  scannedProduct: any;
  showProductModal: boolean;
  setShowProductModal: (show: boolean) => void;
  productHealthAssessment: any;
  onHandleAddProductToMeal: (product: any) => Promise<void> | void;
}

export const DietModals: React.FC<DietModalsProps> = (props) => {
  return (
    <>
      <FoodRecognitionPanel
        showCamera={props.showCamera}
        cameraMode={props.cameraMode}
        onHandleCameraCapture={props.onHandleCameraCapture}
        handleBarcodeScanned={props.handleBarcodeScanned}
        setShowCamera={props.setShowCamera}
        setCameraMode={props.setCameraMode}
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
      />

      <MealTypeSelector
        visible={props.showMealTypeSelector}
        onSelect={props.handleMealTypeSelected}
        onClose={() => props.setShowMealTypeSelector(false)}
      />

      <AIMealsPanel
        visible={props.showAIMealsPanel}
        onClose={() => props.setShowAIMealsPanel(false)}
        onGenerateMeal={props.onGenerateAIMeal}
        isGenerating={props.isGeneratingMeal}
        profile={props.userProfile}
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

      <BarcodeScannerPanel
        scannedProduct={props.scannedProduct}
        showProductModal={props.showProductModal}
        setShowProductModal={props.setShowProductModal}
        productHealthAssessment={props.productHealthAssessment}
        onHandleAddProductToMeal={props.onHandleAddProductToMeal}
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
