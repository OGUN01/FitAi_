#!/usr/bin/env node
/**
 * Comprehensive Reliability Fixes Script
 * Fixes: useEffect cleanup, unhandled promises, 'any' types, TODOs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Track progress
const stats = {
  filesProcessed: 0,
  useEffectFixed: 0,
  promisesFixed: 0,
  anyTypesFixed: 0,
  todosResolved: 0,
  errors: [],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getAllTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllTsFiles(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(filePath);
    }
  });

  return results;
}

function backupFile(filePath) {
  const backupPath = filePath + '.backup';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }
}

// ============================================================================
// FIX USEE FFECT CLEANUP
// ============================================================================

function fixUseEffectCleanup(content, filePath) {
  let fixed = 0;

  // Pattern: useEffect without return statement
  const useEffectRegex = /useEffect\(\(\)\s*=>\s*\{([^}]+)\},\s*\[([^\]]*)\]\);/gs;

  const newContent = content.replace(useEffectRegex, (match, body, deps) => {
    // Skip if already has return cleanup
    if (body.includes('return () =>') || body.includes('return()=>')) {
      return match;
    }

    // Check for cleanup-worthy operations
    const needsCleanup =
      body.includes('setInterval') ||
      body.includes('setTimeout') ||
      body.includes('addEventListener') ||
      body.includes('subscribe') ||
      body.includes('AppState.addEventListener') ||
      body.includes('Keyboard.addListener') ||
      body.includes('NetInfo.addEventListener') ||
      body.includes('.on(') ||
      body.includes('BackHandler.addEventListener');

    if (!needsCleanup) {
      return match;
    }

    // Add appropriate cleanup
    let cleanup = '';

    if (body.includes('setInterval')) {
      const intervalVarMatch = body.match(/const\s+(\w+)\s*=\s*setInterval/);
      if (intervalVarMatch) {
        cleanup += `\n    clearInterval(${intervalVarMatch[1]});`;
      }
    }

    if (body.includes('setTimeout')) {
      const timeoutVarMatch = body.match(/const\s+(\w+)\s*=\s*setTimeout/);
      if (timeoutVarMatch) {
        cleanup += `\n    clearTimeout(${timeoutVarMatch[1]});`;
      }
    }

    if (body.includes('addEventListener')) {
      const listenerMatch = body.match(/const\s+(\w+)\s*=\s*\w+\.addEventListener/);
      if (listenerMatch) {
        cleanup += `\n    ${listenerMatch[1]}?.remove();`;
      }
    }

    if (body.includes('subscribe')) {
      const subMatch = body.match(/const\s+(\w+)\s*=\s*\w+\.subscribe/);
      if (subMatch) {
        cleanup += `\n    ${subMatch[1]}?.unsubscribe();`;
      }
    }

    if (cleanup) {
      fixed++;
      return `useEffect(() => {${body}\n    return () => {${cleanup}\n    };\n  }, [${deps}]);`;
    }

    return match;
  });

  if (fixed > 0) {
    stats.useEffectFixed += fixed;
    console.log(`  ✓ Fixed ${fixed} useEffect cleanup issues in ${path.basename(filePath)}`);
  }

  return newContent;
}

// ============================================================================
// FIX UNHANDLED PROMISES
// ============================================================================

function fixUnhandledPromises(content, filePath) {
  let fixed = 0;

  // Pattern: await calls not in try-catch
  const lines = content.split('\n');
  const newLines = [];
  let inTryCatch = false;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track try-catch blocks
    if (trimmed.startsWith('try {')) {
      inTryCatch = true;
      braceCount = 1;
    } else if (inTryCatch) {
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      if (braceCount === 0) {
        inTryCatch = false;
      }
    }

    // Check for unhandled await
    if (!inTryCatch && trimmed.includes('await ') && !trimmed.startsWith('//')) {
      // Skip if it's already in a try-catch on the same line
      if (!line.includes('try') && !line.includes('catch')) {
        const indent = line.match(/^\s*/)[0];

        // Add try-catch wrapper
        newLines.push(`${indent}try {`);
        newLines.push(line);
        newLines.push(`${indent}} catch (error) {`);
        newLines.push(`${indent}  console.error('Operation failed:', error);`);
        newLines.push(`${indent}}`);
        fixed++;
        continue;
      }
    }

    newLines.push(line);
  }

  if (fixed > 0) {
    stats.promisesFixed += fixed;
    console.log(`  ✓ Fixed ${fixed} unhandled promises in ${path.basename(filePath)}`);
  }

  return newLines.join('\n');
}

// ============================================================================
// FIX ANY TYPES
// ============================================================================

function fixAnyTypes(content, filePath) {
  let fixed = 0;

  // Replace common any patterns
  const replacements = [
    { pattern: /:\s*any\[\]/g, replacement: ': unknown[]', context: 'array' },
    { pattern: /:\s*any>/g, replacement: ': unknown>', context: 'generic' },
    { pattern: /Record<string,\s*any>/g, replacement: 'Record<string, unknown>', context: 'record' },
    { pattern: /<any>/g, replacement: '<unknown>', context: 'generic type' },
    // Be conservative with standalone ': any' - only in specific contexts
    {
      pattern: /\((\w+):\s*any\)/g,
      replacement: '($1: unknown)',
      context: 'parameter'
    },
  ];

  let newContent = content;

  replacements.forEach(({ pattern, replacement, context }) => {
    const matches = (newContent.match(pattern) || []).length;
    if (matches > 0) {
      newContent = newContent.replace(pattern, replacement);
      fixed += matches;
      console.log(`  ✓ Fixed ${matches} 'any' types (${context}) in ${path.basename(filePath)}`);
    }
  });

  stats.anyTypesFixed += fixed;
  return newContent;
}

// ============================================================================
// MAIN PROCESSING
// ============================================================================

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Apply fixes in order
    content = fixUseEffectCleanup(content, filePath);
    // Commented out as it's too aggressive - needs manual review
    // content = fixUnhandledPromises(content, filePath);
    content = fixAnyTypes(content, filePath);

    // Write back if changed
    if (content !== originalContent) {
      backupFile(filePath);
      fs.writeFileSync(filePath, content, 'utf8');
      stats.filesProcessed++;
    }

  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`  ✗ Error processing ${filePath}:`, error.message);
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

console.log('🔧 Starting Comprehensive Reliability Fixes...\n');
console.log('Phase 1: useEffect Cleanup Fixes');
console.log('─'.repeat(60));

// Process hooks first
console.log('\n📁 Processing hooks...');
const hooksDir = path.join(__dirname, '..', 'src', 'hooks');
if (fs.existsSync(hooksDir)) {
  const hookFiles = getAllTsFiles(hooksDir);
  hookFiles.forEach(processFile);
}

// Process screens
console.log('\n📁 Processing screens...');
const screensDir = path.join(__dirname, '..', 'src', 'screens');
if (fs.existsSync(screensDir)) {
  const screenFiles = getAllTsFiles(screensDir);
  screenFiles.forEach(processFile);
}

// Process components
console.log('\n📁 Processing components...');
const componentsDir = path.join(__dirname, '..', 'src', 'components');
if (fs.existsSync(componentsDir)) {
  const componentFiles = getAllTsFiles(componentsDir);
  componentFiles.forEach(processFile);
}

// Process services (for any types)
console.log('\n📁 Processing services...');
const servicesDir = path.join(__dirname, '..', 'src', 'services');
if (fs.existsSync(servicesDir)) {
  const serviceFiles = getAllTsFiles(servicesDir);
  serviceFiles.forEach(processFile);
}

// Process AI files (for any types)
console.log('\n📁 Processing AI files...');
const aiDir = path.join(__dirname, '..', 'src', 'ai');
if (fs.existsSync(aiDir)) {
  const aiFiles = getAllTsFiles(aiDir);
  aiFiles.forEach(processFile);
}

// Process utils (for any types)
console.log('\n📁 Processing utils...');
const utilsDir = path.join(__dirname, '..', 'src', 'utils');
if (fs.existsSync(utilsDir)) {
  const utilFiles = getAllTsFiles(utilsDir);
  utilFiles.forEach(processFile);
}

// ============================================================================
// REPORT
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('📊 RELIABILITY FIXES SUMMARY');
console.log('='.repeat(60));
console.log(`Files processed: ${stats.filesProcessed}`);
console.log(`useEffect cleanups added: ${stats.useEffectFixed}`);
console.log(`Unhandled promises fixed: ${stats.promisesFixed}`);
console.log(`'any' types replaced: ${stats.anyTypesFixed}`);
console.log(`TODOs resolved: ${stats.todosResolved}`);

if (stats.errors.length > 0) {
  console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
  stats.errors.forEach(({ file, error }) => {
    console.log(`  - ${path.basename(file)}: ${error}`);
  });
}

console.log('\n✅ Automated fixes complete!');
console.log('📝 Next steps:');
console.log('  1. Review changes with git diff');
console.log('  2. Run TypeScript compilation: npx tsc --noEmit');
console.log('  3. Test the application');
console.log('  4. Manually fix remaining issues');
console.log('  5. Backup files saved as *.backup');

// Save detailed report
const report = {
  timestamp: new Date().toISOString(),
  stats,
  errors: stats.errors,
};

fs.writeFileSync(
  path.join(__dirname, '..', 'reliability-fixes-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n📄 Detailed report saved to: reliability-fixes-report.json');
