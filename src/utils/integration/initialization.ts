import { api } from "../../services/api";

export const initializeBackend = async () => {
  try {
    await api.initialize();

    try {
      const { dataBridge } = await import("../../services/DataBridge");
      await dataBridge.initialize();
    } catch (dmErr) {
    }

    try {
      const { crudOperations } = await import("../../services/crudOperations");
      await crudOperations.initialize();
    } catch (crudErr) {
    }

  } catch (error) {
  }
};

export const checkBackendHealth = async () => {
  try {
    const result = await api.healthCheck();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Health check failed",
    };
  }
};
