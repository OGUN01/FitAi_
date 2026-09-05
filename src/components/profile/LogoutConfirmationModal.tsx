/**
 * LogoutConfirmationModal - Aurora 2026: sign-out confirmation dialog.
 *
 * Thin wrapper around the shared DestructiveConfirmModal so every destructive
 * confirmation in Profile/Settings (sign out, unlink account, delete account,
 * clear cache) shares one visual language — a bottom sheet with a destructive
 * (error) CTA, per DESIGN.md's modal-presentation standard.
 */

import React from "react";
import { DestructiveConfirmModal } from "./DestructiveConfirmModal";

interface LogoutConfirmationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const LogoutConfirmationModal: React.FC<
  LogoutConfirmationModalProps
> = ({ visible, onConfirm, onCancel, isLoading = false }) => {
  return (
    <DestructiveConfirmModal
      visible={visible}
      icon="log-out-outline"
      title="Sign Out"
      message="Are you sure you want to sign out? Your progress will be saved."
      confirmLabel="Sign Out"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
      isLoading={isLoading}
    />
  );
};

export default LogoutConfirmationModal;
