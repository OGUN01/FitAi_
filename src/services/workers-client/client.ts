/**
 * Re-exports from canonical FitAI Workers client.
 * The single source of truth is src/services/fitaiWorkersClient.ts.
 * This file exists only for backward compatibility.
 */
export {
  FitAIWorkersClient,
  fitaiWorkersClient,
  fitaiWorkersClient as default,
} from "../fitaiWorkersClient";
