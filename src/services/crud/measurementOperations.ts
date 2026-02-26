import { dataBridge } from "../DataBridge";
import { BodyMeasurement } from "../../types/localData";

export async function createBodyMeasurement(
  measurement: BodyMeasurement,
  initialize: () => Promise<void>,
): Promise<void> {
  try {
    await initialize();
    await dataBridge.storeBodyMeasurement(measurement);
  } catch (error) {
    console.error("Failed to create body measurement:", error);
    throw error;
  }
}

export async function readBodyMeasurements(
  limit: number | undefined,
  initialize: () => Promise<void>,
): Promise<BodyMeasurement[]> {
  try {
    await initialize();
    return await dataBridge.getBodyMeasurements(limit);
  } catch (error) {
    console.error("Failed to read body measurements:", error);
    return [];
  }
}

export async function readBodyMeasurement(
  measurementId: string,
  initialize: () => Promise<void>,
): Promise<BodyMeasurement | null> {
  try {
    await initialize();
    const measurements = await dataBridge.getBodyMeasurements();
    return (
      measurements.find((measurement) => measurement.id === measurementId) ||
      null
    );
  } catch (error) {
    console.error("Failed to read body measurement:", error);
    return null;
  }
}

export async function updateBodyMeasurement(
  measurementId: string,
  updates: Partial<BodyMeasurement>,
  initialize: () => Promise<void>,
): Promise<void> {
  try {
    const existing = await readBodyMeasurement(measurementId, initialize);
    if (!existing) {
      throw new Error(`Body measurement ${measurementId} not found`);
    }

    const updated: BodyMeasurement = {
      ...existing,
      ...updates,
      syncStatus: "pending",
    };

    await dataBridge.storeBodyMeasurement(updated);
  } catch (error) {
    console.error("Failed to update body measurement:", error);
    throw error;
  }
}

export async function deleteBodyMeasurement(
  measurementId: string,
  initialize: () => Promise<void>,
): Promise<void> {
  try {
    await updateBodyMeasurement(
      measurementId,
      {
        notes:
          (await readBodyMeasurement(measurementId, initialize))?.notes +
            " [DELETED]" || "[DELETED]",
      },
      initialize,
    );
  } catch (error) {
    console.error("Failed to delete body measurement:", error);
    throw error;
  }
}
