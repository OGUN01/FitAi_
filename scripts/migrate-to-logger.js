#!/usr/bin/env node

/**
 * Console.log to Logger Migration Script
 *
 * This script helps migrate console.log statements to the centralized Logger service.
 * It performs intelligent pattern matching to determine the appropriate log level.
 *
 * Usage:
 *   node scripts/migrate-to-logger.js <file-path>
 *
 * The script will:
 * 1. Read the file
 * 2. Detect console.log patterns
 * 3. Determine appropriate log level based on context
 * 4. Replace with Logger calls
 * 5. Add Logger import if needed
 */

const fs = require("fs");
const path = require("path");

// Pattern detection rules
const LOG_LEVEL_PATTERNS = {
  ERROR: [/error/i, /fail/i, /exception/i, /❌/, /⚠️/, /critical/i, /fatal/i],
  WARN: [/warn/i, /caution/i, /⚠/, /deprecat/i, /missing/i, /not found/i],
  INFO: [
    /✅/,
    /success/i,
    /complete/i,
    /start/i,
    /end/i,
    /load/i,
    /save/i,
    /update/i,
    /💾/,
    /📥/,
    /📤/,
  ],
  DEBUG: [/debug/i, /trace/i, /🔍/, /\[DEBUG\]/i, /testing/i],
};

function detectLogLevel(logStatement) {
  const lowerStatement = logStatement.toLowerCase();

  // Check each level's patterns
  for (const [level, patterns] of Object.entries(LOG_LEVEL_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(logStatement))) {
      return level;
    }
  }

  // Default to DEBUG for most console.log statements
  return "DEBUG";
}

function extractModuleName(filePath) {
  const basename = path.basename(filePath, path.extname(filePath));

  // Convert from camelCase/PascalCase to proper name
  const moduleName = basename
    .replace(/([A-Z])/g, " $1")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  return moduleName;
}

function migrateFile(filePath) {
  console.log(`\nMigrating: ${filePath}`);

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const moduleName = extractModuleName(filePath);
  let hasLogger =
    content.includes("from '@/services/logging'") ||
    content.includes("from '../services/logging'") ||
    content.includes("from './logging'");

  let modified = false;
  let consoleLogCount = 0;
  let replacements = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0 };

  // Process each line
  const newLines = lines.map((line, index) => {
    // Skip lines that are comments
    if (line.trim().startsWith("//")) {
      return line;
    }

    // Match console.log statements
    const consoleLogMatch = line.match(/console\.log\((.*)\)/);
    if (consoleLogMatch) {
      consoleLogCount++;
      const args = consoleLogMatch[1];
      const level = detectLogLevel(args);
      replacements[level]++;
      modified = true;

      // Replace console.log with logger call
      const indent = line.match(/^\s*/)[0];

      // Simple replacement - just change the method
      if (level === "DEBUG") {
        return line.replace("console.log", "logger.debug");
      } else if (level === "INFO") {
        return line.replace("console.log", "logger.info");
      } else if (level === "WARN") {
        return line.replace("console.log", "logger.warn");
      } else if (level === "ERROR") {
        return line.replace("console.log", "logger.error");
      }
    }

    return line;
  });

  if (!modified) {
    console.log("  No console.log statements found.");
    return;
  }

  // Add Logger import if needed
  if (!hasLogger) {
    // Find the import section
    let lastImportIndex = 0;
    for (let i = 0; i < newLines.length; i++) {
      if (newLines[i].trim().startsWith("import ")) {
        lastImportIndex = i;
      } else if (lastImportIndex > 0 && newLines[i].trim() === "") {
        break;
      }
    }

    // Determine relative path to logging service
    const fileDir = path.dirname(filePath);
    const loggingPath = path.relative(
      fileDir,
      path.join(__dirname, "../src/services/logging"),
    );
    const importPath = loggingPath.replace(/\\/g, "/").replace(/^/, "./");

    const loggerImport = `import { createLogger } from '@/services/logging';`;
    const loggerInit = `\nconst logger = createLogger('${moduleName}');\n`;

    newLines.splice(lastImportIndex + 1, 0, loggerImport);

    // Add logger initialization after imports
    let firstNonImportLine = lastImportIndex + 2;
    while (
      firstNonImportLine < newLines.length &&
      (newLines[firstNonImportLine].trim() === "" ||
        newLines[firstNonImportLine].trim().startsWith("//"))
    ) {
      firstNonImportLine++;
    }
    newLines.splice(firstNonImportLine, 0, loggerInit);
  }

  // Write the modified content
  const newContent = newLines.join("\n");
  fs.writeFileSync(filePath, newContent, "utf-8");

  console.log(`  ✅ Migrated ${consoleLogCount} console.log statements:`);
  console.log(`     - DEBUG: ${replacements.DEBUG}`);
  console.log(`     - INFO: ${replacements.INFO}`);
  console.log(`     - WARN: ${replacements.WARN}`);
  console.log(`     - ERROR: ${replacements.ERROR}`);
  console.log(
    `  ${hasLogger ? "(Logger already imported)" : "✨ Added Logger import"}`,
  );
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node migrate-to-logger.js <file-path>");
  process.exit(1);
}

const filePath = args[0];
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

try {
  migrateFile(filePath);
} catch (error) {
  console.error(`Error migrating file: ${error.message}`);
  process.exit(1);
}
