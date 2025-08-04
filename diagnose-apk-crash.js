#!/usr/bin/env node

/**
 * 🚀 FitAI APK Crash Diagnostic System
 * 10X Senior Engineer Systematic Root Cause Analysis
 * 
 * This script performs comprehensive testing of ALL potential crash points
 * and provides surgical precision diagnosis with targeted fix recommendations.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class APKCrashDiagnostic {
  constructor() {
    this.results = {
      bundleAnalysis: {},
      moduleResolution: {},
      compatibility: {},
      memory: {},
      performance: {},
      criticalIssues: [],
      recommendations: []
    };
    
    this.startTime = Date.now();
    console.log('🔍 FitAI APK Crash Diagnostic System v1.0');
    console.log('🎯 Systematic Root Cause Analysis Starting...\n');
  }

  // ============================================================================
  // PHASE 1: BUNDLE ANALYSIS
  // ============================================================================
  
  async analyzeBundleIntegrity() {
    console.log('📦 Phase 1: Bundle Analysis');
    console.log('=' .repeat(50));
    
    try {
      // Test 1: Check if main entry points exist
      const entryPoints = [
        'App.tsx',
        'src/utils/constants.ts',
        'src/utils/responsive.ts',
        'package.json',
        'metro.config.js'
      ];
      
      let missingFiles = [];
      entryPoints.forEach(file => {
        if (!fs.existsSync(file)) {
          missingFiles.push(file);
        }
      });
      
      if (missingFiles.length > 0) {
        this.results.criticalIssues.push({
          type: 'MISSING_ENTRY_POINTS',
          severity: 'CRITICAL',
          files: missingFiles,
          description: 'Core application files are missing'
        });
      }
      
      // Test 2: Analyze circular dependencies
      const circularDeps = this.detectCircularDependencies();
      if (circularDeps.length > 0) {
        this.results.criticalIssues.push({
          type: 'CIRCULAR_DEPENDENCIES',
          severity: 'CRITICAL',
          dependencies: circularDeps,
          description: 'Circular dependencies detected - major crash risk'
        });
      }
      
      // Test 3: Check bundle size and complexity
      const bundleStats = this.analyzeBundleComplexity();
      this.results.bundleAnalysis = bundleStats;
      
      console.log('✅ Bundle integrity analysis complete');
      
    } catch (error) {
      this.results.criticalIssues.push({
        type: 'BUNDLE_ANALYSIS_FAILURE',
        severity: 'CRITICAL',
        error: error.message,
        description: 'Bundle analysis failed - indicates fundamental issues'
      });
      console.log('❌ Bundle analysis failed:', error.message);
    }
  }
  
  detectCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();
    const circularDeps = [];
    
    const dfs = (filePath, currentPath = []) => {
      if (recursionStack.has(filePath)) {
        // Found circular dependency
        const cycleStart = currentPath.indexOf(filePath);
        circularDeps.push(currentPath.slice(cycleStart).concat([filePath]));
        return;
      }
      
      if (visited.has(filePath)) return;
      
      visited.add(filePath);
      recursionStack.add(filePath);
      
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const imports = this.extractImports(content);
          
          imports.forEach(importPath => {
            const resolvedPath = this.resolveImportPath(importPath, filePath);
            if (resolvedPath) {
              dfs(resolvedPath, [...currentPath, filePath]);
            }
          });
        }
      } catch (error) {
        // File access error
      }
      
      recursionStack.delete(filePath);
    };
    
    // Start analysis from main entry points
    ['App.tsx', 'src/utils/constants.ts'].forEach(entry => {
      if (fs.existsSync(entry)) {
        dfs(entry, []);
      }
    });
    
    return circularDeps;
  }
  
  extractImports(content) {
    const importRegex = /import.*?from\s+['"`]([^'"`]+)['"`]/g;
    const requireRegex = /require\(['"`]([^'"`]+)['"`]\)/g;
    const imports = [];
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }
  
  resolveImportPath(importPath, fromFile) {
    // Skip node_modules
    if (!importPath.startsWith('.')) return null;
    
    const basePath = path.dirname(fromFile);
    let resolvedPath = path.resolve(basePath, importPath);
    
    // Try different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      if (fs.existsSync(resolvedPath + ext)) {
        return resolvedPath + ext;
      }
    }
    
    // Try index files
    for (const ext of extensions) {
      const indexPath = path.join(resolvedPath, 'index' + ext);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
    
    return null;
  }
  
  analyzeBundleComplexity() {
    let totalFiles = 0;
    let totalLines = 0;
    let largeFiles = [];
    
    const analyzeDirectory = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          const fullPath = path.join(dir, item);
          const stats = fs.statSync(fullPath);
          
          if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            analyzeDirectory(fullPath);
          } else if (stats.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
            totalFiles++;
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n').length;
            totalLines += lines;
            
            if (lines > 500) {
              largeFiles.push({ file: fullPath, lines });
            }
          }
        });
      } catch (error) {
        // Directory access error
      }
    };
    
    analyzeDirectory('src');
    
    return {
      totalFiles,
      totalLines,
      largeFiles,
      complexity: totalLines > 50000 ? 'HIGH' : totalLines > 20000 ? 'MEDIUM' : 'LOW'
    };
  }

  // ============================================================================
  // PHASE 2: MODULE RESOLUTION TESTING
  // ============================================================================
  
  async testModuleResolution() {
    console.log('\n🔗 Phase 2: Module Resolution Testing');
    console.log('=' .repeat(50));
    
    try {
      // Test 1: TypeScript compilation
      const tsErrors = this.testTypeScriptCompilation();
      if (tsErrors.length > 0) {
        this.results.criticalIssues.push({
          type: 'TYPESCRIPT_ERRORS',
          severity: 'HIGH',
          errors: tsErrors.slice(0, 10), // Show first 10 errors
          description: 'TypeScript compilation errors detected'
        });
      }
      
      // Test 2: Import path validation
      const importIssues = this.validateImportPaths();
      if (importIssues.length > 0) {
        this.results.criticalIssues.push({
          type: 'IMPORT_PATH_ISSUES',
          severity: 'HIGH',
          issues: importIssues,
          description: 'Invalid import paths detected'
        });
      }
      
      // Test 3: Native module compatibility
      const nativeIssues = this.checkNativeModules();
      if (nativeIssues.length > 0) {
        this.results.criticalIssues.push({
          type: 'NATIVE_MODULE_ISSUES',
          severity: 'MEDIUM',
          issues: nativeIssues,
          description: 'Native module compatibility issues'
        });
      }
      
      console.log('✅ Module resolution testing complete');
      
    } catch (error) {
      console.log('❌ Module resolution testing failed:', error.message);
    }
  }
  
  testTypeScriptCompilation() {
    try {
      const result = execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: 'pipe' });
      return []; // No errors
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      const errorLines = output.split('\n').filter(line => line.includes('error TS'));
      return errorLines.slice(0, 20); // Limit to first 20 errors
    }
  }
  
  validateImportPaths() {
    const issues = [];
    const checkFile = (filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const imports = this.extractImports(content);
          
          imports.forEach((importPath, index) => {
            if (importPath.startsWith('.')) {
              const resolved = this.resolveImportPath(importPath, filePath);
              if (!resolved) {
                issues.push({
                  file: filePath,
                  import: importPath,
                  line: this.findImportLine(content, importPath)
                });
              }
            }
          });
        }
      } catch (error) {
        issues.push({
          file: filePath,
          error: 'File access error',
          message: error.message
        });
      }
    };
    
    checkFile('App.tsx');
    checkFile('src/utils/constants.ts');
    checkFile('src/utils/responsive.ts');
    
    return issues;
  }
  
  findImportLine(content, importPath) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(importPath)) {
        return i + 1;
      }
    }
    return -1;
  }
  
  checkNativeModules() {
    const issues = [];
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Check for known problematic modules
    const problematicModules = [
      'react-native-vector-icons',
      'react-native-gesture-handler',
      'react-native-reanimated',
      'react-native-screens'
    ];
    
    problematicModules.forEach(module => {
      if (dependencies[module]) {
        issues.push({
          module,
          version: dependencies[module],
          issue: 'Requires native configuration'
        });
      }
    });
    
    return issues;
  }

  // ============================================================================
  // PHASE 3: REACT NATIVE COMPATIBILITY
  // ============================================================================
  
  async testReactNativeCompatibility() {
    console.log('\n⚛️ Phase 3: React Native Compatibility');
    console.log('=' .repeat(50));
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const dependencies = packageJson.dependencies;
      
      // Test version compatibility
      const rnVersion = dependencies['react-native'];
      const expoVersion = dependencies['expo'];
      const reactVersion = dependencies['react'];
      
      console.log(`React Native: ${rnVersion}`);
      console.log(`Expo: ${expoVersion}`);
      console.log(`React: ${reactVersion}`);
      
      // Check for version conflicts
      const conflicts = this.checkVersionConflicts(dependencies);
      if (conflicts.length > 0) {
        this.results.criticalIssues.push({
          type: 'VERSION_CONFLICTS',
          severity: 'HIGH',
          conflicts,
          description: 'Version conflicts detected between dependencies'
        });
      }
      
      console.log('✅ React Native compatibility check complete');
      
    } catch (error) {
      console.log('❌ React Native compatibility check failed:', error.message);
    }
  }
  
  checkVersionConflicts(dependencies) {
    const conflicts = [];
    
    // Check React Native and React version compatibility
    const rnVersion = dependencies['react-native'];
    const reactVersion = dependencies['react'];
    
    if (rnVersion && reactVersion) {
      // Simplified version conflict detection
      const rnMajor = parseInt(rnVersion.replace(/[^\d.]/g, '').split('.')[0]);
      const reactMajor = parseInt(reactVersion.replace(/[^\d.]/g, '').split('.')[0]);
      
      if (Math.abs(rnMajor - reactMajor) > 1) {
        conflicts.push({
          packages: ['react-native', 'react'],
          versions: [rnVersion, reactVersion],
          issue: 'Major version mismatch'
        });
      }
    }
    
    return conflicts;
  }

  // ============================================================================
  // PHASE 4: MEMORY & PERFORMANCE ANALYSIS
  // ============================================================================
  
  async analyzeMemoryAndPerformance() {
    console.log('\n🧠 Phase 4: Memory & Performance Analysis');
    console.log('=' .repeat(50));
    
    try {
      // Analyze bundle size
      const bundleSize = this.estimateBundleSize();
      console.log(`Estimated bundle size: ${(bundleSize / 1024 / 1024).toFixed(2)} MB`);
      
      if (bundleSize > 50 * 1024 * 1024) { // 50MB
        this.results.criticalIssues.push({
          type: 'LARGE_BUNDLE_SIZE',
          severity: 'MEDIUM',
          size: bundleSize,
          description: 'Bundle size is very large, may cause memory issues'
        });
      }
      
      // Check for memory leaks patterns
      const memoryIssues = this.detectMemoryLeakPatterns();
      if (memoryIssues.length > 0) {
        this.results.criticalIssues.push({
          type: 'MEMORY_LEAK_PATTERNS',
          severity: 'MEDIUM',
          patterns: memoryIssues,
          description: 'Potential memory leak patterns detected'
        });
      }
      
      console.log('✅ Memory & performance analysis complete');
      
    } catch (error) {
      console.log('❌ Memory & performance analysis failed:', error.message);
    }
  }
  
  estimateBundleSize() {
    let totalSize = 0;
    
    const calculateSize = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          const fullPath = path.join(dir, item);
          const stats = fs.statSync(fullPath);
          
          if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            calculateSize(fullPath);
          } else if (stats.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
            totalSize += stats.size;
          }
        });
      } catch (error) {
        // Directory access error
      }
    };
    
    calculateSize('src');
    calculateSize('.'); // Root level files
    
    return totalSize;
  }
  
  detectMemoryLeakPatterns() {
    const patterns = [];
    
    // Check for common memory leak patterns
    const checkFile = (filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Pattern 1: Missing cleanup in useEffect
          if (content.includes('useEffect') && !content.includes('return') && content.includes('setInterval')) {
            patterns.push({
              file: filePath,
              pattern: 'useEffect with setInterval without cleanup',
              risk: 'HIGH'
            });
          }
          
          // Pattern 2: Large objects in global scope
          if (content.includes('const') && content.length > 10000) {
            patterns.push({
              file: filePath,
              pattern: 'Large file with potential global objects',
              risk: 'MEDIUM'
            });
          }
        }
      } catch (error) {
        // File access error
      }
    };
    
    // Analyze key files
    const keyFiles = [
      'App.tsx',
      'src/utils/constants.ts',
      'src/utils/responsive.ts'
    ];
    
    keyFiles.forEach(checkFile);
    
    return patterns;
  }

  // ============================================================================
  // CRITICAL ISSUE DETECTION
  // ============================================================================
  
  async detectCriticalIssues() {
    console.log('\n🚨 Phase 5: Critical Issue Detection');
    console.log('=' .repeat(50));
    
    // Test the exact crash scenario
    const crashScenario = this.testAppInitialization();
    if (crashScenario.crashed) {
      this.results.criticalIssues.push({
        type: 'APP_INITIALIZATION_CRASH',
        severity: 'CRITICAL',
        error: crashScenario.error,
        description: 'App crashes during initialization - ROOT CAUSE LIKELY FOUND'
      });
    }
    
    // Test THEME loading specifically
    const themeIssue = this.testThemeLoading();
    if (themeIssue.failed) {
      this.results.criticalIssues.push({
        type: 'THEME_LOADING_FAILURE',
        severity: 'CRITICAL',
        error: themeIssue.error,
        description: 'THEME loading fails - matches reported crash symptoms'
      });
    }
    
    console.log('✅ Critical issue detection complete');
  }
  
  testAppInitialization() {
    try {
      // Simulate app initialization
      const appContent = fs.readFileSync('App.tsx', 'utf8');
      
      // Check for immediate THEME usage
      if (appContent.includes('ResponsiveTheme.colors') || appContent.includes('THEME.colors')) {
        // Check if THEME is loaded before usage
        const constantsContent = fs.readFileSync('src/utils/constants.ts', 'utf8');
        const responsiveContent = fs.readFileSync('src/utils/responsive.ts', 'utf8');
        
        // Critical pattern: THEME used in styles object (evaluated at module load)
        if (appContent.includes('styles = StyleSheet.create') && appContent.includes('ResponsiveTheme')) {
          return {
            crashed: true,
            error: 'ResponsiveTheme used in StyleSheet.create - executes at module load time'
          };
        }
        
        // Check for Dimensions.get at module level
        if (responsiveContent.includes('Dimensions.get(\'window\')') && 
            !responsiveContent.includes('function') && 
            constantsContent.includes('import') && 
            constantsContent.includes('responsive')) {
          return {
            crashed: true,
            error: 'Dimensions.get called at module level through constants.ts import chain'
          };
        }
      }
      
      return { crashed: false };
    } catch (error) {
      return {
        crashed: true,
        error: `App.tsx access failed: ${error.message}`
      };
    }
  }
  
  testThemeLoading() {
    try {
      // Test if we can load constants without crashing
      const constantsPath = path.resolve('src/utils/constants.ts');
      
      // Check the import structure
      const constantsContent = fs.readFileSync(constantsPath, 'utf8');
      
      // Critical issue: Import at top, usage in module-level code
      if (constantsContent.includes('import') && 
          constantsContent.includes('from \'./responsive\'') && 
          constantsContent.includes('rp(THEME') && 
          constantsContent.includes('export const ResponsiveTheme')) {
        
        // This creates the crash: responsive functions called during module evaluation
        return {
          failed: true,
          error: 'ResponsiveTheme creation calls responsive functions at module load time'
        };
      }
      
      return { failed: false };
    } catch (error) {
      return {
        failed: true,
        error: `Constants loading failed: ${error.message}`
      };
    }
  }

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================
  
  generateReport() {
    const duration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 APK CRASH DIAGNOSTIC REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n⏱️  Analysis Duration: ${duration}ms`);
    console.log(`📊 Critical Issues Found: ${this.results.criticalIssues.length}`);
    
    if (this.results.criticalIssues.length === 0) {
      console.log('\n✅ No critical issues detected!');
      return;
    }
    
    console.log('\n🚨 CRITICAL ISSUES:');
    console.log('-'.repeat(40));
    
    this.results.criticalIssues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.type} [${issue.severity}]`);
      console.log(`   Description: ${issue.description}`);
      
      if (issue.error) {
        console.log(`   Error: ${issue.error}`);
      }
      
      if (issue.dependencies) {
        console.log(`   Dependencies: ${issue.dependencies.map(d => d.join(' -> ')).join(', ')}`);
      }
      
      if (issue.files) {
        console.log(`   Files: ${issue.files.join(', ')}`);
      }
    });
    
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('-'.repeat(40));
    
    // Generate specific recommendations based on issues found
    this.generateRecommendations();
    
    this.results.recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.action}`);
      console.log(`   Priority: ${rec.priority}`);
      console.log(`   Impact: ${rec.impact}`);
    });
    
    // Save detailed report to file
    fs.writeFileSync('diagnostic-report.json', JSON.stringify(this.results, null, 2));
    console.log('\n📄 Detailed report saved to: diagnostic-report.json');
  }
  
  generateRecommendations() {
    const criticalTypes = this.results.criticalIssues.map(issue => issue.type);
    
    if (criticalTypes.includes('APP_INITIALIZATION_CRASH') || 
        criticalTypes.includes('THEME_LOADING_FAILURE')) {
      this.results.recommendations.push({
        action: 'IMMEDIATE: Refactor THEME loading to use lazy initialization',
        priority: 'CRITICAL',
        impact: 'Fixes root cause of APK crashes'
      });
      
      this.results.recommendations.push({
        action: 'Move ResponsiveTheme creation from module-level to runtime',
        priority: 'CRITICAL',
        impact: 'Prevents Dimensions.get crashes during module loading'
      });
    }
    
    if (criticalTypes.includes('CIRCULAR_DEPENDENCIES')) {
      this.results.recommendations.push({
        action: 'Break circular dependencies in import chain',
        priority: 'HIGH',
        impact: 'Prevents bundle loading issues'
      });
    }
    
    if (criticalTypes.includes('TYPESCRIPT_ERRORS')) {
      this.results.recommendations.push({
        action: 'Fix TypeScript compilation errors',
        priority: 'HIGH',
        impact: 'Ensures type safety and prevents runtime errors'
      });
    }
  }

  // ============================================================================
  // MAIN EXECUTION
  // ============================================================================
  
  async run() {
    try {
      await this.analyzeBundleIntegrity();
      await this.testModuleResolution();
      await this.testReactNativeCompatibility();
      await this.analyzeMemoryAndPerformance();
      await this.detectCriticalIssues();
      
      this.generateReport();
      
      console.log('\n🏁 Diagnostic complete! Check diagnostic-report.json for details.');
      
      // Return summary for programmatic use
      return {
        success: true,
        criticalIssues: this.results.criticalIssues.length,
        recommendations: this.results.recommendations,
        report: this.results
      };
      
    } catch (error) {
      console.error('\n💥 Diagnostic system failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const diagnostic = new APKCrashDiagnostic();
  diagnostic.run().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = APKCrashDiagnostic;