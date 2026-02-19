import { useEditContext } from "./EditProvider";

export const useEditMode = () => {
  const { isEditMode, editSection } = useEditContext();
  return { isEditMode, editSection };
};

export const useEditData = () => {
  const { currentData, originalData, hasChanges, updateData } =
    useEditContext();
  return { currentData, originalData, hasChanges, updateData };
};

export const useEditActions = () => {
  const { startEdit, saveChanges, cancelEdit, validateData } = useEditContext();
  return { startEdit, saveChanges, cancelEdit, validateData };
};

export const useEditValidation = () => {
  const { validationErrors, validateData } = useEditContext();
  return { validationErrors, validateData };
};

export const useEditStatus = () => {
  const { isLoading, isSaving, showOverlay, setShowOverlay } = useEditContext();
  return { isLoading, isSaving, showOverlay, setShowOverlay };
};
