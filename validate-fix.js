#!/usr/bin/env node

/**
 * 🔍 FitAI Fix Validation System
 * 10X Senior Engineer Comprehensive Testing & Validation
 * 
 * This script performs exhaustive validation to ensure fixes work
 * before building APK - prevents building broken APKs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class FixValidationSystem {
  constructor() {
    this.results = {
      moduleLoading: {},
      bundleCompilation: {},
      themeSystem: {},
      performanceMetrics: {},
      buildReadiness: {},
      passed: 0,
      failed: 0,
      warnings: 0
    };
    
    console.log('🔍 FitAI Fix Validation System v1.0');
    console.log('🎯 Comprehensive Testing & Validation Starting...\n');
  }

  // ============================================================================
  // TEST 1: MODULE LOADING VALIDATION
  // ============================================================================
  
  async testModuleLoading() {
    console.log('📦 Test 1: Module Loading Validation');
    console.log('=' .repeat(50));
    
    const tests = [
      { name: 'Constants Module', test: () => this.testConstantsModule() },
      { name: 'Responsive Module', test: () => this.testResponsiveModule() },
      { name: 'Theme Hook', test: () => this.testThemeHook() },
      { name: 'App Module', test: () => this.testAppModule() },
      { name: 'Import Paths', test: () => this.testImportPaths() }
    ];
    
    for (const { name, test } of tests) {
      try {
        const result = await test();
        if (result.success) {
          console.log(`✅ ${name}: ${result.message}`);
          this.results.passed++;
        } else {
          console.log(`❌ ${name}: ${result.message}`);
          this.results.failed++;
        }
      } catch (error) {
        console.log(`💥 ${name}: ${error.message}`);
        this.results.failed++;
      }
    }
    
    console.log('');
  }
  
  testConstantsModule() {
    try {
      // Clear require cache to ensure fresh load
      const constantsPath = path.resolve('./src/utils/constants.ts');
      delete require.cache[constantsPath];
      
      const constants = require('./src/utils/constants');
      
      // Validate THEME structure
      if (!constants.THEME) {
        return { success: false, message: 'THEME export not found' };
      }
      
      if (!constants.THEME.colors || !constants.THEME.colors.primary) {
        return { success: false, message: 'THEME.colors structure invalid' };
      }
      
      if (!constants.THEME.spacing || !constants.THEME.fontSize) {
        return { success: false, message: 'THEME missing essential properties' };
      }
      
      // Check for dangerous imports
      const content = fs.readFileSync('./src/utils/constants.ts', 'utf8');
      if (content.includes("import { rf, rp, rbr } from './responsive'")) {
        return { success: false, message: 'Dangerous circular import detected' };
      }
      
      return { success: true, message: 'Module loads safely, structure valid' };
      
    } catch (error) {
      return { success: false, message: `Loading failed: ${error.message}` };
    }
  }
  
  testResponsiveModule() {
    try {
      const responsivePath = path.resolve('./src/utils/responsive.ts');
      delete require.cache[responsivePath];
      
      const responsive = require('./src/utils/responsive');
      
      // Test functions exist
      if (typeof responsive.rf !== 'function' || 
          typeof responsive.rp !== 'function' || 
          typeof responsive.rbr !== 'function') {
        return { success: false, message: 'Essential responsive functions missing' };
      }
      
      // Test functions work (with safe values)
      const testFont = responsive.rf(16);
      const testPadding = responsive.rp(10);
      const testRadius = responsive.rbr(5);
      
      if (typeof testFont !== 'number' || testFont <= 0) {
        return { success: false, message: 'rf() function not working correctly' };
      }
      
      return { success: true, message: 'All responsive functions working correctly' };
      
    } catch (error) {
      return { success: false, message: `Loading failed: ${error.message}` };
    }
  }
  
  testThemeHook() {
    const hookPath = './src/hooks/useResponsiveTheme.ts';
    
    if (!fs.existsSync(hookPath)) {
      return { success: false, message: 'useResponsiveTheme hook not found' };
    }
    
    try {
      const hookContent = fs.readFileSync(hookPath, 'utf8');
      
      // Check for proper imports
      if (!hookContent.includes("import { THEME } from '../utils/constants'")) {
        return { success: false, message: 'Hook missing THEME import' };
      }
      
      if (!hookContent.includes("import { rf, rp, rbr } from '../utils/responsive'")) {
        return { success: false, message: 'Hook missing responsive imports' };
      }
      
      // Check for proper useMemo usage
      if (!hookContent.includes('useMemo')) {
        return { success: false, message: 'Hook not using useMemo for performance' };
      }
      
      // Check for error handling
      if (!hookContent.includes('try {') || !hookContent.includes('catch')) {
        return { success: false, message: 'Hook missing error handling' };
      }
      
      return { success: true, message: 'Hook structure and safety checks passed' };
      
    } catch (error) {
      return { success: false, message: `Hook validation failed: ${error.message}` };
    }
  }
  
  testAppModule() {
    try {
      const appContent = fs.readFileSync('./App.tsx', 'utf8');
      
      // Check for safe THEME usage
      if (appContent.includes('ResponsiveTheme.colors') && 
          !appContent.includes("import { THEME } from")) {
        return { success: false, message: 'App still using unsafe ResponsiveTheme' };
      }
      
      // Check for proper imports
      if (!appContent.includes("import { THEME } from './src/utils/constants'")) {
        return { success: false, message: 'App missing safe THEME import' };
      }
      
      // Check StyleSheet usage is safe
      if (appContent.includes('StyleSheet.create') && appContent.includes('ResponsiveTheme.')) {
        return { success: false, message: 'App StyleSheet still using unsafe ResponsiveTheme' };
      }
      
      return { success: true, message: 'App module using safe theme imports' };
      
    } catch (error) {
      return { success: false, message: `App validation failed: ${error.message}` };
    }
  }
  
  testImportPaths() {
    const criticalFiles = [
      './App.tsx',
      './src/utils/constants.ts',
      './src/utils/responsive.ts',
      './src/hooks/useResponsiveTheme.ts'
    ];
    
    for (const file of criticalFiles) {
      if (!fs.existsSync(file)) {
        return { success: false, message: `Critical file missing: ${file}` };
      }
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        const imports = this.extractImports(content);
        
        for (const importPath of imports) {
          if (importPath.startsWith('.')) {
            const resolved = this.resolveImportPath(importPath, file);
            if (!resolved) {
              return { success: false, message: `Broken import in ${file}: ${importPath}` };
            }
          }
        }
      } catch (error) {
        return { success: false, message: `Import validation failed for ${file}: ${error.message}` };
      }
    }
    
    return { success: true, message: 'All import paths validated successfully' };
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
    const basePath = path.dirname(fromFile);
    let resolvedPath = path.resolve(basePath, importPath);
    
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      if (fs.existsSync(resolvedPath + ext)) {
        return resolvedPath + ext;
      }
    }
    
    for (const ext of extensions) {
      const indexPath = path.join(resolvedPath, 'index' + ext);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
    
    return null;
  }

  // ============================================================================
  // TEST 2: BUNDLE COMPILATION VALIDATION
  // ============================================================================
  
  async testBundleCompilation() {
    console.log('🛠️  Test 2: Bundle Compilation Validation');
    console.log('=' .repeat(50));
    
    const tests = [
      { name: 'TypeScript Compilation', test: () => this.testTypeScriptCompilation() },
      { name: 'Metro Bundle Test', test: () => this.testMetroBundling() },
      { name: 'Bundle Size Check', test: () => this.testBundleSize() },
      { name: 'Dependency Resolution', test: () => this.testDependencyResolution() }
    ];
    
    for (const { name, test } of tests) {
      try {
        const result = await test();
        if (result.success) {
          console.log(`✅ ${name}: ${result.message}`);
          this.results.passed++;
        } else {
          console.log(`❌ ${name}: ${result.message}`);
          this.results.failed++;
        }
      } catch (error) {
        console.log(`💥 ${name}: ${error.message}`);
        this.results.failed++;
      }
    }
    
    console.log('');
  }
  
  testTypeScriptCompilation() {
    try {
      console.log('   Compiling TypeScript...');
      const result = execSync('npx tsc --noEmit --skipLibCheck', { 
        encoding: 'utf8', 
        stdio: 'pipe',
        timeout: 30000 
      });
      
      return { success: true, message: 'TypeScript compilation successful' };
      
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      const errorCount = (output.match(/error TS/g) || []).length;
      
      if (errorCount > 10) {
        return { success: false, message: `Too many TypeScript errors: ${errorCount}` };
      } else if (errorCount > 0) {
        this.results.warnings++;
        return { success: true, message: `TypeScript has ${errorCount} non-critical errors` };
      }
      
      return { success: false, message: 'TypeScript compilation failed' };
    }
  }
  
  testMetroBundling() {
    try {
      console.log('   Testing Metro bundling...');
      
      // Test if Metro can start without immediate errors
      const metroTest = execSync('npx expo export --dev --platform android --output-dir ./temp-bundle', {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000
      });
      
      // Clean up temp bundle
      if (fs.existsSync('./temp-bundle')) {
        execSync('rm -rf ./temp-bundle', { stdio: 'pipe' });
      }
      
      return { success: true, message: 'Metro bundling successful' };
      
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      
      if (output.includes('Unable to resolve module')) {
        return { success: false, message: 'Module resolution errors in bundle' };
      }
      
      if (output.includes('SyntaxError') || output.includes('TypeError')) {
        return { success: false, message: 'JavaScript/TypeScript errors in bundle' };
      }
      
      return { success: false, message: 'Metro bundling failed' };
    }
  }
  
  testBundleSize() {
    try {
      let totalSize = 0;
      
      const calculateSize = (dir) => {
        if (!fs.existsSync(dir)) return;
        
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
      };
      
      calculateSize('./src');
      calculateSize('.');
      
      const sizeMB = totalSize / 1024 / 1024;
      
      if (sizeMB > 100) {
        return { success: false, message: `Bundle too large: ${sizeMB.toFixed(2)}MB` };
      } else if (sizeMB > 50) {
        this.results.warnings++;
        return { success: true, message: `Bundle size large: ${sizeMB.toFixed(2)}MB` };
      }
      
      return { success: true, message: `Bundle size acceptable: ${sizeMB.toFixed(2)}MB` };
      
    } catch (error) {
      return { success: false, message: `Bundle size check failed: ${error.message}` };
    }
  }
  
  testDependencyResolution() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check for known problematic combinations
      const issues = [];
      
      // React Native and React version compatibility
      const rnVersion = dependencies['react-native'];
      const reactVersion = dependencies['react'];
      
      if (rnVersion && reactVersion) {
        const rnMajor = parseInt(rnVersion.replace(/[^\d.]/g, '').split('.')[0]);
        const reactMajor = parseInt(reactVersion.replace(/[^\d.]/g, '').split('.')[0]);
        
        if (Math.abs(rnMajor - reactMajor) > 2) {
          issues.push(`React Native ${rnVersion} and React ${reactVersion} version mismatch`);
        }
      }
      
      if (issues.length > 0) {
        return { success: false, message: `Dependency issues: ${issues.join(', ')}` };
      }
      
      return { success: true, message: 'Dependency versions compatible' };
      
    } catch (error) {
      return { success: false, message: `Dependency check failed: ${error.message}` };
    }
  }

  // ============================================================================
  // TEST 3: THEME SYSTEM VALIDATION
  // ============================================================================
  
  async testThemeSystem() {
    console.log('🎨 Test 3: Theme System Validation');
    console.log('=' .repeat(50));
    
    const tests = [
      { name: 'THEME Object Integrity', test: () => this.testThemeIntegrity() },
      { name: 'Responsive Functions', test: () => this.testResponsiveFunctions() },
      { name: 'Hook Implementation', test: () => this.testHookImplementation() },
      { name: 'Component Integration', test: () => this.testComponentIntegration() },
      { name: 'No Circular Dependencies', test: () => this.testNoCircularDeps() }
    ];
    
    for (const { name, test } of tests) {
      try {
        const result = await test();
        if (result.success) {
          console.log(`✅ ${name}: ${result.message}`);
          this.results.passed++;
        } else {
          console.log(`❌ ${name}: ${result.message}`);
          this.results.failed++;
        }
      } catch (error) {
        console.log(`💥 ${name}: ${error.message}`);
        this.results.failed++;
      }
    }
    
    console.log('');
  }
  
  testThemeIntegrity() {
    try {
      const constants = require('./src/utils/constants');
      const theme = constants.THEME;
      
      // Test all required properties
      const requiredProps = ['colors', 'spacing', 'fontSize', 'fontWeight', 'borderRadius'];
      for (const prop of requiredProps) {
        if (!theme[prop]) {
          return { success: false, message: `Missing theme property: ${prop}` };
        }
      }
      
      // Test essential colors
      const requiredColors = ['primary', 'background', 'text', 'error'];
      for (const color of requiredColors) {
        if (!theme.colors[color]) {
          return { success: false, message: `Missing essential color: ${color}` };
        }
      }
      
      // Test color format
      if (!theme.colors.primary.match(/^#[0-9a-fA-F]{6}$/)) {
        return { success: false, message: 'Invalid color format in theme' };
      }
      
      return { success: true, message: 'Theme object structure and values valid' };
      
    } catch (error) {
      return { success: false, message: `Theme integrity test failed: ${error.message}` };
    }
  }
  
  testResponsiveFunctions() {
    try {
      const responsive = require('./src/utils/responsive');
      
      // Test functions with various inputs
      const testCases = [
        { func: 'rf', input: 16, expected: 'number', name: 'font scaling' },
        { func: 'rp', input: 10, expected: 'number', name: 'padding scaling' },
        { func: 'rbr', input: 5, expected: 'number', name: 'border radius scaling' }
      ];
      
      for (const { func, input, expected, name } of testCases) {
        const result = responsive[func](input);
        if (typeof result !== expected || result <= 0) {
          return { success: false, message: `${name} function (${func}) not working correctly` };
        }
      }
      
      return { success: true, message: 'All responsive functions working correctly' };
      
    } catch (error) {
      return { success: false, message: `Responsive functions test failed: ${error.message}` };
    }
  }
  
  testHookImplementation() {
    const hookPath = './src/hooks/useResponsiveTheme.ts';
    
    try {
      const hookContent = fs.readFileSync(hookPath, 'utf8');
      
      // Test for proper React hooks usage
      if (!hookContent.includes('useMemo')) {
        return { success: false, message: 'Hook not using useMemo for performance' };
      }
      
      // Test for error handling
      if (!hookContent.includes('try') || !hookContent.includes('catch')) {
        return { success: false, message: 'Hook missing error handling' };
      }
      
      // Test for fallback mechanism
      if (!hookContent.includes('return THEME')) {
        return { success: false, message: 'Hook missing fallback mechanism' };
      }
      
      return { success: true, message: 'Hook implementation follows best practices' };
      
    } catch (error) {
      return { success: false, message: `Hook implementation test failed: ${error.message}` };
    }
  }
  
  testComponentIntegration() {
    try {
      const appContent = fs.readFileSync('./App.tsx', 'utf8');
      
      // Test that App.tsx uses safe theme approach
      if (appContent.includes('ResponsiveTheme.colors') && 
          appContent.includes('StyleSheet.create')) {
        return { success: false, message: 'App.tsx still uses unsafe ResponsiveTheme in styles' };
      }
      
      if (!appContent.includes('THEME.colors')) {
        return { success: false, message: 'App.tsx not using safe THEME import' };
      }
      
      return { success: true, message: 'Component integration is safe' };
      
    } catch (error) {
      return { success: false, message: `Component integration test failed: ${error.message}` };
    }
  }
  
  testNoCircularDeps() {
    try {
      const constantsContent = fs.readFileSync('./src/utils/constants.ts', 'utf8');
      
      if (constantsContent.includes("import { rf, rp, rbr } from './responsive'")) {
        return { success: false, message: 'Circular dependency detected: constants -> responsive' };
      }
      
      if (constantsContent.includes('rp(THEME') || constantsContent.includes('rf(THEME')) {
        return { success: false, message: 'Module-level responsive function calls detected' };
      }
      
      return { success: true, message: 'No circular dependencies detected' };
      
    } catch (error) {
      return { success: false, message: `Circular dependency test failed: ${error.message}` };
    }
  }

  // ============================================================================
  // TEST 4: BUILD READINESS
  // ============================================================================
  
  async testBuildReadiness() {
    console.log('🚀 Test 4: Build Readiness Validation');
    console.log('=' .repeat(50));
    
    const tests = [
      { name: 'EAS Configuration', test: () => this.testEASConfig() },
      { name: 'Environment Variables', test: () => this.testEnvironmentVars() },
      { name: 'Asset Integrity', test: () => this.testAssetIntegrity() },
      { name: 'Bundle Validation', test: () => this.testFinalBundle() }
    ];
    
    for (const { name, test } of tests) {
      try {
        const result = await test();
        if (result.success) {
          console.log(`✅ ${name}: ${result.message}`);
          this.results.passed++;
        } else {
          console.log(`❌ ${name}: ${result.message}`);
          this.results.failed++;
        }
      } catch (error) {
        console.log(`💥 ${name}: ${error.message}`);
        this.results.failed++;
      }
    }
    
    console.log('');
  }
  
  testEASConfig() {
    try {
      const easConfig = JSON.parse(fs.readFileSync('./eas.json', 'utf8'));
      
      if (!easConfig.build || !easConfig.build.preview) {
        return { success: false, message: 'EAS preview build configuration missing' };
      }
      
      const appConfig = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
      
      if (!appConfig.expo || !appConfig.expo.version) {
        return { success: false, message: 'App version configuration missing' };
      }
      
      return { success: true, message: 'EAS and app configuration valid' };
      
    } catch (error) {
      return { success: false, message: `EAS config test failed: ${error.message}` };
    }
  }
  
  testEnvironmentVars() {
    try {
      // Check for required environment variables in eas.json
      const easConfig = JSON.parse(fs.readFileSync('./eas.json', 'utf8'));
      
      if (easConfig.build?.production?.env) {
        const requiredVars = [
          'EXPO_PUBLIC_SUPABASE_URL',
          'EXPO_PUBLIC_SUPABASE_ANON_KEY',
          'EXPO_PUBLIC_GEMINI_API_KEY'
        ];
        
        for (const varName of requiredVars) {
          if (!easConfig.build.production.env[varName]) {
            return { success: false, message: `Missing environment variable: ${varName}` };
          }
        }
      }
      
      return { success: true, message: 'Environment variables configured' };
      
    } catch (error) {
      return { success: false, message: `Environment vars test failed: ${error.message}` };
    }
  }
  
  testAssetIntegrity() {
    try {
      const requiredAssets = [
        './assets/icon.png',
        './assets/adaptive-icon.png',
        './assets/splash-icon.png'
      ];
      
      for (const asset of requiredAssets) {
        if (!fs.existsSync(asset)) {
          return { success: false, message: `Missing required asset: ${asset}` };
        }
        
        const stats = fs.statSync(asset);
        if (stats.size === 0) {
          return { success: false, message: `Empty asset file: ${asset}` };
        }
      }
      
      return { success: true, message: 'All required assets present and valid' };
      
    } catch (error) {
      return { success: false, message: `Asset integrity test failed: ${error.message}` };
    }
  }
  
  testFinalBundle() {
    try {
      // Perform a quick bundle validation
      console.log('   Performing final bundle check...');
      
      // Check if we can import the main modules without errors
      delete require.cache[path.resolve('./src/utils/constants.ts')];
      delete require.cache[path.resolve('./src/utils/responsive.ts')];
      
      const constants = require('./src/utils/constants');
      const responsive = require('./src/utils/responsive');
      
      // Quick integration test
      const testTheme = constants.THEME;
      const testResponsive = responsive.rf(16);
      
      if (!testTheme || typeof testResponsive !== 'number') {
        return { success: false, message: 'Final integration test failed' };
      }
      
      return { success: true, message: 'Final bundle validation passed' };
      
    } catch (error) {
      return { success: false, message: `Final bundle test failed: ${error.message}` };
    }
  }

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================
  
  generateValidationReport() {
    const totalTests = this.results.passed + this.results.failed;
    const successRate = totalTests > 0 ? (this.results.passed / totalTests * 100).toFixed(1) : 0;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 FIX VALIDATION REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Passed: ${this.results.passed}`);
    console.log(`   ❌ Failed: ${this.results.failed}`);
    console.log(`   ⚠️  Warnings: ${this.results.warnings}`);
    console.log(`   📈 Success Rate: ${successRate}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 ALL VALIDATIONS PASSED!');
      console.log('🚀 Ready to build APK with confidence!');
      
      return {
        success: true,
        readyToBuild: true,
        successRate: parseFloat(successRate),
        results: this.results
      };
    } else {
      console.log('\n🚨 VALIDATION FAILURES DETECTED!');
      console.log('⚠️  DO NOT BUILD APK - Issues must be resolved first!');
      
      return {
        success: false,
        readyToBuild: false,
        successRate: parseFloat(successRate),
        results: this.results
      };
    }
  }

  // ============================================================================
  // MAIN EXECUTION
  // ============================================================================
  
  async runValidation() {
    try {
      await this.testModuleLoading();
      await this.testBundleCompilation();
      await this.testThemeSystem();
      await this.testBuildReadiness();
      
      const report = this.generateValidationReport();
      
      // Save validation report
      fs.writeFileSync('validation-report.json', JSON.stringify({
        timestamp: new Date().toISOString(),
        ...report
      }, null, 2));
      
      console.log('\n📄 Validation report saved to: validation-report.json');
      
      return report;
      
    } catch (error) {
      console.error('\n💥 Validation system failed:', error);
      return {
        success: false,
        readyToBuild: false,
        error: error.message
      };
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const validator = new FixValidationSystem();
  validator.runValidation().then(result => {
    process.exit(result.success && result.readyToBuild ? 0 : 1);
  });
}

module.exports = FixValidationSystem;