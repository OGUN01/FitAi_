import type { TableSchema } from "./types";
import { USER_SCHEMAS } from "./schemas-user";
import { BODY_SCHEMAS } from "./schemas-body";
import { REVIEW_SCHEMAS } from "./schemas-review";

export const DATABASE_SCHEMAS: Record<string, TableSchema> = {
  ...USER_SCHEMAS,
  ...BODY_SCHEMAS,
  ...REVIEW_SCHEMAS,
};
