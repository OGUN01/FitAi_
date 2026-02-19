import { api } from "../../services/api";

export const initializeBackend = async () => {
  try {
    await api.initialize();

    try {
      const { dataBridge } = await import("../../services/DataBridge");
      await dataBridge.initialize();
    } catch (dmErr) {
      console.warn("Data Manager initialization warning:", dmErr);
    }

    try {
      const { crudOperations } = await import("../../services/crudOperations");
      await crudOperations.initialize();
    } catch (crudErr) {
      console.warn("CRUD Operations initialization warning:", crudErr);
    }

    console.log("Backend initialized successfully");
  } catch (error) {
    console.warn("Failed to initialize backend:", error);
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
