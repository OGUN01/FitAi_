/**
 * ContributionPromptModal
 *
 * Shown after a label-scan extraction when the user entered the flow because
 * a barcode lookup missed (entry point "barcode_miss"). Asks the user to scan
 * the product's barcode so the just-extracted nutrition can be linked to it
 * and submitted to the community (Tier 3 crowd-sourced) database.
 *
 * The modal itself is stateless — the parent owns the `visible` flag and the
 * side-effects of the two actions:
 *   - onScanBarcode: close this modal, switch the camera to barcode mode in
 *     "link_contribution" purpose, open the camera.
 *   - onSkip: close this modal and clear the pending contribution data so the
 *     user is not prompted again for this scan.
 */

import React from "react";
import { CustomDialog } from "../ui/CustomDialog";

export interface ContributionPromptModalProps {
  visible: boolean;
  onScanBarcode: () => void;
  onSkip: () => void;
}

export const ContributionPromptModal: React.FC<ContributionPromptModalProps> = ({
  visible,
  onScanBarcode,
  onSkip,
}) => {
  return (
    <CustomDialog
      visible={visible}
      title="Help All FitAI Users"
      message="Scan this product's barcode to link these nutrition facts. Future scans by anyone will instantly return these stats."
      type="info"
      icon="people-outline"
      onDismiss={onSkip}
      actions={[
        {
          text: "Skip",
          onPress: onSkip,
          style: "cancel",
        },
        {
          text: "Scan Barcode",
          onPress: onScanBarcode,
          style: "default",
        },
      ]}
    />
  );
};

export default ContributionPromptModal;
