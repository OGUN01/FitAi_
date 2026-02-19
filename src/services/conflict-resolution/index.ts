export * from "./types";
export * from "./detection";
export * from "./resolution";
export * from "./merge";
export * from "./rules";
export * from "./utils";
export { ConflictResolutionService } from "./service";

import { ConflictResolutionService } from "./service";

export const conflictResolutionService = new ConflictResolutionService();
export default conflictResolutionService;
