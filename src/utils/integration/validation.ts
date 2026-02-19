import { api } from "../../services/api";

export const useFormValidation = () => {
  return {
    validateEmail: api.utils.isValidEmail,
    validatePassword: api.utils.validatePassword,
    validateRequiredFields: api.utils.validateRequiredFields,
    sanitizeInput: api.utils.sanitizeInput,
  };
};
