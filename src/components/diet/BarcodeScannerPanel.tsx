import React from "react";
import { ProductDetailsModal } from "./ProductDetailsModal";

interface BarcodeScannerPanelProps {
  scannedProduct: any;
  showProductModal: boolean;
  setShowProductModal: (show: boolean) => void;
  productHealthAssessment: any;
  onHandleAddProductToMeal: (
    product: any,
    grams: number,
  ) => Promise<void> | void;
}

export const BarcodeScannerPanel: React.FC<BarcodeScannerPanelProps> = ({
  scannedProduct,
  showProductModal,
  setShowProductModal,
  productHealthAssessment,
  onHandleAddProductToMeal,
}) => {
  if (!scannedProduct) return null;

  return (
    <ProductDetailsModal
      visible={showProductModal}
      onClose={() => setShowProductModal(false)}
      product={scannedProduct}
      healthAssessment={productHealthAssessment}
      onAddToMeal={onHandleAddProductToMeal}
    />
  );
};
