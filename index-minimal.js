/**
 * MINIMAL TEST - Proper React Native imports
 */

console.log('🧪 MINIMAL TEST: Starting...');

// Import React Native components properly
import React from 'react';
import { AppRegistry, View, Text } from 'react-native';

console.log('🧪 MINIMAL TEST: Imports successful');

// Proper React Native component
const MinimalApp = () => {
  console.log('🧪 MINIMAL TEST: Component rendering');
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#000', 
      justifyContent: 'center',
      alignItems: 'center' 
    }}>
      <Text style={{ color: 'white', fontSize: 20 }}>
        ✅ REGISTRATION FIXED!
      </Text>
    </View>
  );
};

console.log('🧪 MINIMAL TEST: Component defined');

// Register the component
try {
  AppRegistry.registerComponent('main', () => MinimalApp);
  console.log('✅ MINIMAL TEST: Registration successful!');
} catch (error) {
  console.error('❌ MINIMAL TEST: Registration failed:', error);
}

console.log('🧪 MINIMAL TEST: Complete');