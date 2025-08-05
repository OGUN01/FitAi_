/**
 * TEST 2: Add App import to see if that's the issue
 */

console.log('🧪 TEST 2: Starting - Testing App import...');

// Import only what's absolutely necessary
const { AppRegistry } = require('react-native');
const React = require('react');

console.log('🧪 TEST 2: Basic imports successful');

// Try to import App component
let App;
try {
  App = require('./App').default;
  console.log('✅ TEST 2: App import successful');
} catch (error) {
  console.error('❌ TEST 2: App import FAILED:', error);
  
  // Fallback to minimal component
  App = () => React.createElement('View', { 
    style: { flex: 1, backgroundColor: '#FF0000' } 
  });
  console.log('🔄 TEST 2: Using fallback component');
}

console.log('🧪 TEST 2: Component ready');

// Register the component
try {
  AppRegistry.registerComponent('main', () => App);
  console.log('✅ TEST 2: Registration successful!');
} catch (error) {
  console.error('❌ TEST 2: Registration failed:', error);
}

console.log('🧪 TEST 2: Complete');