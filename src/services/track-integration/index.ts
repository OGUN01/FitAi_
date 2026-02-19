export {
  TrackIntegrationService,
  trackIntegrationService,
} from "./track-integration-service";
export { ServiceManager } from "./service-manager";
export { AuthHandler } from "./auth-handler";
export { MigrationHandler } from "./migration-handler";
export { EventSystem } from "./event-system";
export type {
  TrackAAuthData,
  IntegrationConfig,
  IntegrationStatus,
  IntegrationEvent,
  ServiceStatus,
  ServiceType,
} from "./types";

import { trackIntegrationService as service } from "./track-integration-service";
export default service;
