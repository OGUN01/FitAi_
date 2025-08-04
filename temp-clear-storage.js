
// Clear AsyncStorage Script
import AsyncStorage from '@react-native-async-storage/async-storage';

async function clearWorkoutData() {
  try {
    // Clear fitness store data
    await AsyncStorage.removeItem('fitness-storage');
    console.log('✅ Cleared fitness-storage');
    
    // Clear any other workout-related keys
    const allKeys = await AsyncStorage.getAllKeys();
    const workoutKeys = allKeys.filter(key => 
      key.includes('workout') || 
      key.includes('fitness') || 
      key.includes('exercise')
    );
    
    if (workoutKeys.length > 0) {
      await AsyncStorage.multiRemove(workoutKeys);
      console.log(`✅ Cleared ${workoutKeys.length} workout-related keys`);
    }
    
    console.log('🎯 AsyncStorage cleared successfully');
  } catch (error) {
    console.error('❌ Failed to clear AsyncStorage:', error);
  }
}

clearWorkoutData();
