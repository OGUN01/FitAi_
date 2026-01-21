# Logging Migration Guide

## Overview

This guide explains how to migrate from `console.log` statements to the centralized `Logger` service in the FitAI codebase.

## Why Migrate?

The audit found **1,488 console.log statements across 140 files**. Problems with console.log:

- ❌ No log levels (can't filter by importance)
- ❌ Pollutes production console
- ❌ No structured metadata
- ❌ Can't be disabled per module
- ❌ No integration with error reporting services
- ❌ Hard to debug in production

## Logger Benefits

- ✅ Multiple log levels (DEBUG, INFO, WARN, ERROR)
- ✅ Automatic `__DEV__` wrapping for development-only logs
- ✅ Production-safe error reporting hooks (Sentry integration ready)
- ✅ Structured logging with metadata
- ✅ Module-specific log level control
- ✅ File/function/line tracking
- ✅ Performance timing with scoped loggers

## Quick Start

### 1. Import the Logger

```typescript
import { createLogger } from "@/services/logging";

const logger = createLogger("ModuleName");
```

### 2. Replace console.log Calls

**Before:**

```typescript
console.log("User loaded:", user);
console.log("Error saving data:", error);
console.warn("Missing required field");
```

**After:**

```typescript
logger.info("User loaded", { user });
logger.error("Error saving data", error);
logger.warn("Missing required field");
```

## Log Levels

### DEBUG - Development-only detailed information

```typescript
// Automatically wrapped in __DEV__ check
logger.debug("Detailed state update", {
  oldState,
  newState,
  diff: calculateDiff(oldState, newState),
});
```

**When to use:**

- Detailed state/data dumps
- Loop iterations and intermediate values
- Function entry/exit traces
- Test/development information

### INFO - Important information

```typescript
logger.info("Data synced successfully", {
  recordCount: 150,
  syncDuration: 1234,
  source: "HealthConnect",
});
```

**When to use:**

- Successful operations
- Important state changes
- Data load/save completions
- User actions

### WARN - Warning conditions

```typescript
logger.warn("Missing optional field", {
  field: "heartRate",
  fallback: "using default value",
});
```

**When to use:**

- Missing optional data
- Deprecation warnings
- Recoverable errors
- Data quality issues

### ERROR - Error conditions

```typescript
logger.error("Failed to save profile", error, {
  userId,
  operation: "updateProfile",
  retryCount: 3,
});
```

**When to use:**

- Exceptions and errors
- Failed operations
- Data validation failures
- Critical issues

## Migration Patterns

### Pattern 1: Simple Message

```typescript
// Before
console.log("Starting sync...");

// After
logger.info("Starting sync");
```

### Pattern 2: Message with Data

```typescript
// Before
console.log("User data:", userData);

// After
logger.debug("User data loaded", { userData });
```

### Pattern 3: Conditional Logging

```typescript
// Before
if (__DEV__) {
  console.log("Debug info:", data);
}

// After - __DEV__ is automatic for debug level
logger.debug("Debug info", { data });
```

### Pattern 4: Error Logging

```typescript
// Before
console.error("Save failed:", error);

// After
logger.error("Save failed", error, {
  context: "additional info",
});
```

### Pattern 5: Emoji-Heavy Logs

```typescript
// Before
console.log("💾 [DB-SERVICE] Saving data...", data);
console.log("✅ [DB-SERVICE] Data saved successfully");

// After
logger.info("Saving data", { data });
logger.info("Data saved successfully");
```

### Pattern 6: Multi-Line Operations

```typescript
// Before
console.log("Starting operation...");
// ... operation code ...
console.log("Operation completed in", endTime - startTime, "ms");

// After - Use scoped logger for timing
const scopedLogger = logger.scope("operationName");
scopedLogger.start("Starting operation");
// ... operation code ...
scopedLogger.success("Operation completed"); // Automatically logs duration
```

## Advanced Features

### Scoped Loggers (With Timing)

```typescript
async function syncData() {
  const scopedLogger = logger.scope("syncData");

  scopedLogger.start("Syncing data");

  try {
    const result = await performSync();
    scopedLogger.success("Sync completed", { recordCount: result.count });
  } catch (error) {
    scopedLogger.failure("Sync failed", error);
  }
}
// Automatically logs: "[SUCCESS] Sync completed (1234ms)"
```

### Child Loggers (Sub-modules)

```typescript
const logger = createLogger("HealthService");
const healthConnectLogger = logger.child("HealthConnect");
const googleFitLogger = logger.child("GoogleFit");

healthConnectLogger.info("Syncing..."); // Logs as "[HealthService.HealthConnect]"
googleFitLogger.info("Syncing..."); // Logs as "[HealthService.GoogleFit]"
```

### Structured Metadata

```typescript
logger.info("User action", {
  action: "button_click",
  screen: "DietScreen",
  userId: user.id,
  timestamp: Date.now(),
  metadata: {
    experimentGroup: "A",
    feature: "new_ui",
  },
});
```

## Configuration

### Module-Specific Log Levels

Edit `src/services/logging/config.ts`:

```typescript
export const MODULE_LEVELS: Record<string, LogLevel> = {
  HealthConnect: "INFO", // Only INFO and above
  GoogleFit: "DEBUG", // All logs including DEBUG
  DietScreen: "WARN", // Only WARN and ERROR
};
```

### Runtime Configuration

```typescript
import { setModuleLogLevel, enableDebugMode } from "@/services/logging";

// Change log level at runtime
setModuleLogLevel("HealthConnect", "DEBUG");

// Enable debug mode for troubleshooting
enableDebugMode("SyncEngine");
```

## Module Name Conventions

Use PascalCase for module names matching your file/class names:

- `HealthConnect` for `healthConnect.ts`
- `OnboardingService` for `onboardingService.ts`
- `DietScreen` for `DietScreen.tsx`
- `FitnessStore` for `fitnessStore.ts`

## ESLint Rule

Add to `.eslintrc.js` to prevent new console.log:

```javascript
module.exports = {
  rules: {
    "no-console": [
      "warn",
      {
        allow: ["warn", "error"], // Allow console.warn and console.error
      },
    ],
  },
};
```

## Migration Checklist

For each file:

1. ✅ Add Logger import
2. ✅ Create logger instance with module name
3. ✅ Replace console.log with appropriate logger method
4. ✅ Add metadata objects where helpful
5. ✅ Remove emoji prefixes (optional, but cleaner)
6. ✅ Keep console.error and console.warn as-is (or migrate to logger.error/warn)
7. ✅ Test the changes
8. ✅ Update module log level in config if needed

## Example: Complete File Migration

**Before (healthConnect.ts):**

```typescript
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

class HealthConnectService {
  async syncData() {
    console.log("🔄 Starting HealthConnect sync...");

    try {
      const data = await this.fetchData();
      console.log("✅ Data fetched:", data);

      const saved = await this.saveData(data);
      console.log("💾 Data saved successfully");

      return { success: true };
    } catch (error) {
      console.error("❌ Sync failed:", error);
      return { success: false, error };
    }
  }

  async fetchData() {
    if (__DEV__) {
      console.log("Fetching from HealthConnect API...");
    }
    // implementation
  }
}
```

**After (healthConnect.ts):**

```typescript
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createLogger } from "@/services/logging";

const logger = createLogger("HealthConnect");

class HealthConnectService {
  async syncData() {
    const scopedLogger = logger.scope("syncData");
    scopedLogger.start("Starting HealthConnect sync");

    try {
      const data = await this.fetchData();
      logger.info("Data fetched", { recordCount: data.length });

      const saved = await this.saveData(data);
      logger.info("Data saved successfully");

      scopedLogger.success("Sync completed");
      return { success: true };
    } catch (error) {
      scopedLogger.failure("Sync failed", error);
      return { success: false, error };
    }
  }

  async fetchData() {
    logger.debug("Fetching from HealthConnect API");
    // implementation
  }
}
```

## Top 10 Files Migrated

The following files have been migrated to use the Logger service:

1. ✅ `hooks/useOnboardingState.tsx` - 100 statements migrated
2. ✅ `services/healthConnect.ts` - 75 statements migrated
3. ✅ `services/onboardingService.ts` - 74 statements migrated
4. ✅ `screens/main/DietScreen.tsx` - 66 statements migrated
5. ✅ `services/exerciseVisualService.ts` - 45 statements migrated
6. ✅ `services/SyncEngine.ts` - 44 statements migrated
7. ✅ `services/DataBridge.ts` - 39 statements migrated
8. ✅ `stores/fitnessStore.ts` - 35 statements migrated
9. ✅ `services/googleFit.ts` - 34 statements migrated
10. ✅ `test/geminiStructuredOutputTest.ts` - 32 statements migrated

**Total migrated: ~544 console.log statements**
**Remaining: ~944 console.log statements** across 130 files

## Next Steps

1. **Immediate:** Use Logger for all new code
2. **Short-term:** Migrate remaining high-traffic files (services, stores, screens)
3. **Medium-term:** Migrate all remaining files
4. **Long-term:** Integrate with Sentry for production error reporting

## Error Reporting Integration (Sentry)

To enable production error reporting:

```typescript
import * as Sentry from "@sentry/react-native";
import { getLoggerService } from "@/services/logging";

// Register Sentry as error reporter
getLoggerService().registerErrorReporter((error, context) => {
  Sentry.captureException(error, {
    level: context.level.toLowerCase(),
    tags: {
      module: context.module,
    },
    extra: {
      message: context.message,
      metadata: context.metadata,
    },
  });
});
```

## Tips and Best Practices

1. **Use metadata objects instead of string concatenation:**

   ```typescript
   // ❌ Bad
   logger.info(`User ${userId} completed action ${action}`);

   // ✅ Good
   logger.info("User completed action", { userId, action });
   ```

2. **Prefer scoped loggers for operations:**

   ```typescript
   // ✅ Automatically tracks timing and provides context
   const scopedLogger = logger.scope("expensiveOperation");
   scopedLogger.start();
   // ... work ...
   scopedLogger.success();
   ```

3. **Don't over-log in production:**

   ```typescript
   // DEBUG logs are automatically stripped in production
   logger.debug("This only appears in development");
   ```

4. **Include relevant context in metadata:**

   ```typescript
   logger.error("API request failed", error, {
     endpoint: "/api/sync",
     method: "POST",
     retryCount: 3,
     userId: currentUser.id,
   });
   ```

5. **Use child loggers for related functionality:**
   ```typescript
   const healthLogger = createLogger("HealthService");
   const syncLogger = healthLogger.child("Sync");
   const cacheLogger = healthLogger.child("Cache");
   ```

## Questions?

- Check the Logger source: `src/services/logging/Logger.ts`
- Review config options: `src/services/logging/config.ts`
- See examples in migrated files (top 10 list above)

---

**Migration Status:** 544/1,488 console.log statements migrated (36.6%)
**Last Updated:** 2026-01-21
