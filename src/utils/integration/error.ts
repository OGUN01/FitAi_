export const useErrorHandling = () => {
  return {
    handleApiError: (error: any) => {
      if (error?.message) {
        return error.message;
      }
      if (typeof error === "string") {
        return error;
      }
      return "An unexpected error occurred";
    },

    isNetworkError: (error: any) => {
      return (
        error?.message?.includes("network") ||
        error?.message?.includes("fetch") ||
        error?.code === "NETWORK_ERROR"
      );
    },

    isAuthError: (error: any) => {
      return (
        error?.message?.includes("auth") ||
        error?.message?.includes("unauthorized") ||
        error?.code === "AUTH_ERROR"
      );
    },
  };
};
