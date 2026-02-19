export type {
  DiscrepancySeverity,
  Discrepancy,
  ConsistencyReport,
  DataType,
  SchemaField,
  TableSchema,
} from "./types";

export { DATABASE_SCHEMAS } from "./schemas";

export {
  validateFieldType,
  validateLocalDataType,
  validateDataIntegrity,
} from "./validators";

export {
  deepEqual,
  determineSeverity,
  compareObjects,
  compareLocalData,
} from "./comparators";

export { generateRecommendations, createReport, getSummary } from "./reporters";

export {
  ConsistencyChecker,
  consistencyChecker,
  default,
} from "./ConsistencyChecker";
