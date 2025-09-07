/**
 * BULLETPROOF INDEX - Avoid Metro dependency resolution issues
 * Using require() instead of import to prevent Metro graph issues
 */

console.log('🚀 BULLETPROOF: Starting...');

// Use require() to avoid Metro dependency graph issues
const React = require('react');
const { AppRegistry, View, Text } = require('react-native');

console.log('✅ BULLETPROOF: Basic imports successful');

// Load polyfills synchronously to avoid Metro issues
console.log('🔧 BULLETPROOF: Loading polyfills...');

// Essential polyfills without complex dependencies
if (typeof global.FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() { this._parts = []; }
    append(name, value, filename) { this._parts.push({ name, value, filename }); }
    toString() { return '[object FormData]'; }
  };
}

if (typeof global.URLSearchParams === 'undefined') {
  global.URLSearchParams = class URLSearchParams {
    constructor(params) {
      this.params = new Map();
      if (typeof params === 'string') {
        params.split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          if (key) this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
        });
      }
    }
    toString() {
      const pairs = [];
      this.params.forEach((value, key) => {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      });
      return pairs.join('&');
    }
  };
}

// ENHANCED Hermes-compatible URL polyfill - Force override existing URL
console.log('🔧 BULLETPROOF: Installing enhanced URL polyfill...');

// Force override even if URL exists but protocol is not implemented
const needsURLPolyfill = (
  typeof global.URL === 'undefined' || 
  !global.URL.prototype ||
  !Object.getOwnPropertyDescriptor(global.URL.prototype, 'protocol') ||
  typeof Object.getOwnPropertyDescriptor(global.URL.prototype, 'protocol').get !== 'function'
);

if (needsURLPolyfill) {
  console.log('🔧 BULLETPROOF: Overriding URL implementation for Hermes compatibility...');
  
  global.URL = function URL(url, base) {
    if (base && typeof url === 'string' && !url.includes('://')) {
      if (url.startsWith('/')) {
        const baseMatch = base.match(/^([^:]+):\/\/([^\/]+)/);
        if (baseMatch) url = baseMatch[1] + '://' + baseMatch[2] + url;
      } else {
        url = base + (base.endsWith('/') ? '' : '/') + url;
      }
    }
    
    const match = (url || '').match(/^([^:]+):\/\/([^\/]+)(\/.*)?$/);
    if (match) {
      this._protocol = match[1] + ':';
      this._host = match[2];
      this._hostname = match[2].split(':')[0];
      this._pathname = match[3] || '/';
      this._href = url;
      this._origin = match[1] + '://' + match[2];
    } else {
      this._protocol = 'https:';
      this._host = 'localhost';
      this._hostname = 'localhost';
      this._pathname = url || '/';
      this._href = url || 'https://localhost';
      this._origin = 'https://localhost';
    }
  };
  
  // Force define all properties with getters (Hermes requirement)
  Object.defineProperty(global.URL.prototype, 'protocol', {
    get: function() { return this._protocol; },
    enumerable: true, configurable: true
  });
  Object.defineProperty(global.URL.prototype, 'host', {
    get: function() { return this._host; },
    enumerable: true, configurable: true
  });
  Object.defineProperty(global.URL.prototype, 'hostname', {
    get: function() { return this._hostname; },
    enumerable: true, configurable: true
  });
  Object.defineProperty(global.URL.prototype, 'pathname', {
    get: function() { return this._pathname; },
    enumerable: true, configurable: true
  });
  Object.defineProperty(global.URL.prototype, 'href', {
    get: function() { return this._href; },
    enumerable: true, configurable: true
  });
  Object.defineProperty(global.URL.prototype, 'origin', {
    get: function() { return this._origin; },
    enumerable: true, configurable: true
  });
  
  global.URL.prototype.toString = function() { return this._href; };
  
  console.log('✅ BULLETPROOF: Enhanced URL polyfill installed successfully');
} else {
  console.log('✅ BULLETPROOF: URL already properly implemented');
}

// Test the URL polyfill to ensure it works
try {
  const testUrl = new global.URL('https://test.com/path');
  const protocol = testUrl.protocol;
  console.log('✅ BULLETPROOF: URL polyfill test successful, protocol:', protocol);
} catch (urlTestError) {
  console.error('❌ BULLETPROOF: URL polyfill test failed:', urlTestError.message);
}

console.log('✅ BULLETPROOF: Polyfills loaded');

// Simple test component first
const TestApp = () => {
  console.log('📱 BULLETPROOF: Test component rendering');
  return React.createElement(View, {
    style: { flex: 1, backgroundColor: '#004', justifyContent: 'center', alignItems: 'center' }
  }, React.createElement(Text, {
    style: { color: 'white', fontSize: 24, fontWeight: 'bold' }
  }, '🚀 BULLETPROOF SUCCESS!'));
};

console.log('✅ BULLETPROOF: Test component defined');

// Try to load the actual App component safely
let AppComponent = TestApp;
try {
  const AppModule = require('./App');
  if (AppModule && AppModule.default) {
    AppComponent = AppModule.default;
    console.log('✅ BULLETPROOF: Real App component loaded');
  }
} catch (appError) {
  console.error('⚠️ BULLETPROOF: App component failed, using test component:', appError.message);
}

// Multiple registration attempts
console.log('🎯 BULLETPROOF: Starting registration...');

let registrationSuccess = false;

// Attempt 1: Register 'main' 
try {
  AppRegistry.registerComponent('main', () => AppComponent);
  console.log('✅ BULLETPROOF: PRIMARY registration successful (main)');
  registrationSuccess = true;
} catch (error1) {
  console.error('❌ BULLETPROOF: Primary registration failed:', error1.message);
}

// Attempt 2: Fallback to 'FitAI'
if (!registrationSuccess) {
  try {
    AppRegistry.registerComponent('FitAI', () => AppComponent);
    console.log('✅ BULLETPROOF: FALLBACK registration successful (FitAI)');
    registrationSuccess = true;
  } catch (error2) {
    console.error('❌ BULLETPROOF: Fallback registration failed:', error2.message);
  }
}

// Attempt 3: Emergency with test component
if (!registrationSuccess) {
  try {
    AppRegistry.registerComponent('main', () => TestApp);
    console.log('✅ BULLETPROOF: EMERGENCY registration successful (test component)');
    registrationSuccess = true;
  } catch (error3) {
    console.error('❌ BULLETPROOF: Emergency registration failed:', error3.message);
  }
}

if (registrationSuccess) {
  console.log('🎉 BULLETPROOF: Registration complete - App ready to launch!');
} else {
  console.error('💥 BULLETPROOF: All registration attempts failed - Critical error');
}

console.log('🏁 BULLETPROOF: Index loading complete');