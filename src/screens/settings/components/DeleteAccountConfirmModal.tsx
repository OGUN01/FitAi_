/**
 * DeleteAccountConfirmModal - typed-confirmation dialog for the single most
 * severe, irreversible action in the app: permanent account deletion.
 *
 * Wraps the shared DestructiveConfirmModal (same visual language as Sign
 * Out / Unlink Google) but requires the user to type "DELETE" before the
 * confirm button enables, matching the friction best-in-class apps apply to
 * credential-destroying, unrecoverable actions.
 */

import React from "react";
import { DestructiveConfirmModal } from "../../../components/profile/DestructiveConfirmModal";

const CONFIRMATION_PHRASE = "DELETE";

interface DeleteAccountConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const DeleteAccountConfirmModal: React.FC<
  DeleteAccountConfirmModalProps
> = ({ visible, onConfirm, onCancel, isLoading = false }) => {
  return (
    <DestructiveConfirmModal
      visible={visible}
      icon="trash-outline"
      title="Delete Account"
      message="This permanently deletes your FitAI account, all your data (profile, plans, logs, achievements), and your sign-in credential. There is no way to recover them."
      confirmLabel="Delete Forever"
      cancelLabel="Cancel"
      isLoading={isLoading}
      requireTypedConfirmation={CONFIRMATION_PHRASE}
      typedConfirmationLabel={`Type ${CONFIRMATION_PHRASE} to confirm`}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};

export default DeleteAccountConfirmModal;
