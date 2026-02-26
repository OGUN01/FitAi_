import { OptimisticRollbackState, OfflineData } from "./types";
import { StorageManager } from "./storage";

export class RollbackManager {
  private rollbackStates: Map<string, OptimisticRollbackState> = new Map();

  setRollback(state: OptimisticRollbackState): void {
    this.rollbackStates.set(state.actionId, state);
  }

  clearRollback(actionId: string): void {
    this.rollbackStates.delete(actionId);
  }

  async rollbackAction(
    actionId: string,
    storage: StorageManager,
  ): Promise<void> {
    const rollbackState = this.rollbackStates.get(actionId);
    if (!rollbackState) {
      return;
    }

    const { key, originalData, type } = rollbackState;

    switch (type) {
      case "UPDATE":
        if (originalData) {
          storage.setOfflineData(key, originalData);
        } else {
          storage.removeOfflineData(key);
        }
        break;
      case "CREATE":
        storage.removeOfflineData(key);
        break;
      case "DELETE":
        if (originalData) {
          storage.setOfflineData(key, originalData);
        }
        break;
    }

    await storage.saveData();
    this.rollbackStates.delete(actionId);
  }
}
