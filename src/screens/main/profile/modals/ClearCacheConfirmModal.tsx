/**
 * ClearCacheConfirmModal - Aurora 2026: cache-clear confirmation dialog.
 *
 * Thin wrapper around the shared DestructiveConfirmModal so every destructive
 * confirmation in Profile/Settings (sign out, unlink account, delete account,
 * clear cache) shares one visual language — flat surface.2 panel over a real
 * BlurView backdrop, destructive (error) CTA.
 */

import React, { useState } from "react";
import { DestructiveConfirmModal } from "../../../../components/profile/DestructiveConfirmModal";
import { crossPlatformAlert } from "../../../../utils/crossPlatformAlert";

interface ClearCacheConfirmModalProps {
  visible: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ClearCacheConfirmModal: React.FC<ClearCacheConfirmModalProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const [isClearing, setIsClearing] = useState(false);

  const handleConfirm = async () => {
    setIsClearing(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error("ClearCacheConfirmModal: cache clear failed:", error);
      crossPlatformAlert(
        "Error",
        "Failed to clear cache. Please try again.",
      );
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <DestructiveConfirmModal
      visible={visible}
      icon="trash-outline"
      title="Clear Cache"
      message="Are you sure you want to clear the cache? This will remove temporary data and may briefly slow down the app while it rebuilds."
      confirmLabel="Clear Cache"
      cancelLabel="Cancel"
      isLoading={isClearing}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    />
  );
};

export default ClearCacheConfirmModal;
