export * from "./types";
export * from "./config";
export { MigrationEngine } from "./MigrationEngine";

import { MigrationEngine } from "./MigrationEngine";

const migrationEngineInstance = new MigrationEngine();
export { migrationEngineInstance as migrationEngine };
export default migrationEngineInstance;
