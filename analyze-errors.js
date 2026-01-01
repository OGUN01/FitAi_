const fs = require('fs');

// Read the error log
const errors = fs.readFileSync('typescript-errors-raw.txt', 'utf-8')
  .split('\n')
  .filter(line => line.includes('error TS'));

// Categorize errors
const categories = {
  className: [],
  missingModule: [],
  missingProperty: [],
  typeAssignment: [],
  viewStyleArray: [],
  webManifest: [],
  other: []
};

const errorTypes = new Map();
const fileErrors = new Map();

errors.forEach(error => {
  // Extract error code
  const match = error.match(/error (TS\d+)/);
  if (!match) return;

  const errorCode = match[1];
  errorTypes.set(errorCode, (errorTypes.get(errorCode) || 0) + 1);

  // Extract file path
  const fileMatch = error.match(/^([^(]+)\(/);
  if (fileMatch) {
    const file = fileMatch[1];
    fileErrors.set(file, (fileErrors.get(file) || 0) + 1);
  }

  // Categorize by pattern
  if (error.includes('className')) {
    categories.className.push(error);
  } else if (error.includes('Cannot find module')) {
    categories.missingModule.push(error);
  } else if (error.includes('does not exist on type')) {
    categories.missingProperty.push(error);
  } else if (error.includes("Type 'any[]' is not assignable to type 'ViewStyle'")) {
    categories.viewStyleArray.push(error);
  } else if (error.includes('WebManifest')) {
    categories.webManifest.push(error);
  } else if (error.includes('is not assignable to type')) {
    categories.typeAssignment.push(error);
  } else {
    categories.other.push(error);
  }
});

// Generate report
const report = {
  summary: {
    total: errors.length,
    byCategory: {
      className: categories.className.length,
      missingModule: categories.missingModule.length,
      missingProperty: categories.missingProperty.length,
      viewStyleArray: categories.viewStyleArray.length,
      webManifest: categories.webManifest.length,
      typeAssignment: categories.typeAssignment.length,
      other: categories.other.length
    },
    byErrorCode: Object.fromEntries(
      Array.from(errorTypes.entries()).sort((a, b) => b[1] - a[1])
    ),
    topFiles: Array.from(fileErrors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([file, count]) => ({ file, count }))
  },
  categories: {
    className: {
      count: categories.className.length,
      files: [...new Set(categories.className.map(e => e.match(/^([^(]+)/)?.[1]))].filter(Boolean)
    },
    missingModule: {
      count: categories.missingModule.length,
      modules: [...new Set(categories.missingModule.map(e => {
        const match = e.match(/Cannot find module '([^']+)'/);
        return match ? match[1] : null;
      }))].filter(Boolean)
    },
    missingProperty: {
      count: categories.missingProperty.length,
      properties: [...new Set(categories.missingProperty.map(e => {
        const match = e.match(/Property '([^']+)' does not exist/);
        return match ? match[1] : null;
      }))].filter(Boolean).reduce((acc, prop) => {
        acc[prop] = (acc[prop] || 0) + 1;
        return acc;
      }, {})
    }
  }
};

console.log('='.repeat(80));
console.log('TYPESCRIPT ERROR ANALYSIS REPORT');
console.log('='.repeat(80));
console.log(`\nTotal Errors: ${report.summary.total}`);
console.log('\n--- BY CATEGORY ---');
Object.entries(report.summary.byCategory).forEach(([cat, count]) => {
  console.log(`${cat.padEnd(20)}: ${count}`);
});
console.log('\n--- BY ERROR CODE ---');
Object.entries(report.summary.byErrorCode).slice(0, 10).forEach(([code, count]) => {
  console.log(`${code.padEnd(10)}: ${count}`);
});
console.log('\n--- TOP 20 FILES WITH MOST ERRORS ---');
report.summary.topFiles.forEach(({ file, count }) => {
  console.log(`${count.toString().padStart(4)} errors: ${file}`);
});
console.log('\n--- MISSING MODULES ---');
report.categories.missingModule.modules.forEach(mod => {
  console.log(`  - ${mod}`);
});
console.log('\n--- MISSING PROPERTIES (with counts) ---');
Object.entries(report.categories.missingProperty.properties)
  .sort((a, b) => b[1] - a[1])
  .forEach(([prop, count]) => {
    console.log(`  ${prop.padEnd(30)}: ${count} occurrences`);
  });
console.log('\n--- FILES WITH CLASSNAME ERRORS ---');
report.categories.className.files.forEach(file => {
  console.log(`  - ${file}`);
});

fs.writeFileSync('ERROR_ANALYSIS.json', JSON.stringify(report, null, 2));
console.log('\n\nFull report saved to: ERROR_ANALYSIS.json');
console.log('='.repeat(80));
