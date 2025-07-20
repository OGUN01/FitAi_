import React, { useEffect, useState } from 'react';
import { View, Text, StatusBar, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import your existing screens
// import { HomeScreen } from './src/screens/main/HomeScreen';
// import { OnboardingFlow } from './src/screens/onboarding/OnboardingFlow';

// Import new backend integration components
import { AuthWrapper } from './src/components/auth/AuthWrapper';
import { AuthenticationExample } from './src/screens/auth/AuthenticationExample';
import { OnboardingIntegrationExample } from './src/screens/onboarding/OnboardingIntegrationExample';
import { HomeScreenIntegrationExample } from './src/screens/main/HomeScreenIntegrationExample';

// Import hooks and utilities
import { useAuth } from './src/hooks/useAuth';
import { useUser } from './src/hooks/useUser';
import { useOffline } from './src/hooks/useOffline';
import { initializeBackend, checkBackendHealth } from './src/utils/integration';

const Stack = createStackNavigator();

/**
 * Example of how to integrate the FitAI app with the new backend
 * This shows the complete app structure with authentication and data flow
 */

export default function AppIntegrationExample() {
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  // Initialize backend and check health on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize backend services
        await initializeBackend();
        
        // Check backend health
        const healthResult = await checkBackendHealth();
        setIsBackendHealthy(healthResult.success);
        
        if (!healthResult.success) {
          Alert.alert(
            'Backend Warning',
            'Some features may not work properly. Please check your internet connection.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('App initialization error:', error);
        setIsBackendHealthy(false);
      }
    };

    initializeApp();
  }, []);

  // Show loading screen while checking backend health
  if (isBackendHealthy === null) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1c" />
      
      <NavigationContainer>
        <AuthWrapper
          fallback={<AuthenticationExample />}
          loadingComponent={<LoadingScreen />}
        >
          <AppNavigator />
        </AuthWrapper>
      </NavigationContainer>
      
      {/* Global offline indicator */}
      <GlobalOfflineIndicator />
    </>
  );
}

/**
 * Main app navigator - only shown when user is authenticated
 */
const AppNavigator: React.FC = () => {
  const { profile, isProfileComplete } = useUser();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#0a0f1c' },
      }}
    >
      {/* Show onboarding if profile is not complete */}
      {!isProfileComplete ? (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingNavigator}
          options={{ gestureEnabled: false }}
        />
      ) : (
        <Stack.Screen
          name="Main"
          component={MainNavigator}
        />
      )}
    </Stack.Navigator>
  );
};

/**
 * Onboarding navigator
 */
const OnboardingNavigator: React.FC = () => {
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
    // The AuthWrapper will automatically detect the profile completion
    // and switch to the main app
  };

  return (
    <OnboardingIntegrationExample onComplete={handleOnboardingComplete} />
  );
};

/**
 * Main app navigator - your existing tab navigator would go here
 */
const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#0a0f1c' },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreenIntegrationExample}
      />
      {/* Add your other main screens here */}
      {/* 
      <Stack.Screen name="Fitness" component={FitnessScreen} />
      <Stack.Screen name="Diet" component={DietScreen} />
      <Stack.Screen name="Progress" component={ProgressScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      */}
    </Stack.Navigator>
  );
};

/**
 * Loading screen component
 */
const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingTitle}>FitAI</Text>
      <Text style={styles.loadingSubtitle}>Initializing your fitness journey...</Text>
      <View style={styles.loadingDots}>
        <Text style={styles.loadingDot}>●</Text>
        <Text style={styles.loadingDot}>●</Text>
        <Text style={styles.loadingDot}>●</Text>
      </View>
    </View>
  );
};

/**
 * Global offline indicator
 */
const GlobalOfflineIndicator: React.FC = () => {
  const { isOnline, syncInProgress, queueLength } = useOffline();

  if (isOnline && queueLength === 0) {
    return null;
  }

  return (
    <View style={[styles.globalIndicator, !isOnline && styles.globalIndicatorOffline]}>
      <Text style={styles.globalIndicatorText}>
        {!isOnline ? '📱 Offline' : syncInProgress ? '🔄 Syncing...' : `📤 ${queueLength} pending`}
      </Text>
    </View>
  );
};

/**
 * Styles
 */
const styles = {
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#0a0f1c',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 48,
    fontWeight: 'bold' as const,
    color: '#ff6b35',
    marginBottom: 16,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#8e9aaf',
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  loadingDots: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingDot: {
    fontSize: 24,
    color: '#ff6b35',
    marginHorizontal: 4,
    opacity: 0.6,
  },
  globalIndicator: {
    position: 'absolute' as const,
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#ff6b35',
    padding: 8,
    borderRadius: 6,
    zIndex: 1000,
  },
  globalIndicatorOffline: {
    backgroundColor: '#666',
  },
  globalIndicatorText: {
    color: '#ffffff',
    textAlign: 'center' as const,
    fontSize: 14,
    fontWeight: '500' as const,
  },
};

/**
 * Integration Instructions Component
 * Add this to any screen to show integration guidance
 */
export const IntegrationInstructions: React.FC = () => {
  return (
    <View style={instructionStyles.container}>
      <Text style={instructionStyles.title}>🚀 Backend Integration Complete!</Text>
      
      <Text style={instructionStyles.sectionTitle}>How to integrate your existing screens:</Text>
      
      <Text style={instructionStyles.instruction}>
        1. <Text style={instructionStyles.bold}>Replace AuthenticationExample</Text> with your login/register screens
      </Text>
      
      <Text style={instructionStyles.instruction}>
        2. <Text style={instructionStyles.bold}>Replace OnboardingIntegrationExample</Text> with your OnboardingFlow
      </Text>
      
      <Text style={instructionStyles.instruction}>
        3. <Text style={instructionStyles.bold}>Replace HomeScreenIntegrationExample</Text> with your HomeScreen
      </Text>
      
      <Text style={instructionStyles.instruction}>
        4. <Text style={instructionStyles.bold}>Add your tab navigator</Text> to MainNavigator
      </Text>
      
      <Text style={instructionStyles.instruction}>
        5. <Text style={instructionStyles.bold}>Use integration hooks</Text> in your existing components:
      </Text>
      
      <View style={instructionStyles.codeBlock}>
        <Text style={instructionStyles.code}>
          {`// In your existing screens:
import { useDashboardIntegration } from '../utils/integration';
import { useAuth } from '../hooks/useAuth';
import { useUser } from '../hooks/useUser';

const { getUserStats } = useDashboardIntegration();
const { isAuthenticated } = useAuth();
const { profile } = useUser();`}
        </Text>
      </View>
      
      <Text style={instructionStyles.sectionTitle}>Key Benefits:</Text>
      <Text style={instructionStyles.benefit}>✅ Real user authentication</Text>
      <Text style={instructionStyles.benefit}>✅ Persistent user profiles</Text>
      <Text style={instructionStyles.benefit}>✅ Offline-first data sync</Text>
      <Text style={instructionStyles.benefit}>✅ Production-ready security</Text>
      <Text style={instructionStyles.benefit}>✅ Type-safe API calls</Text>
      <Text style={instructionStyles.benefit}>✅ Automatic error handling</Text>
    </View>
  );
};

const instructionStyles = {
  container: {
    margin: 20,
    padding: 20,
    backgroundColor: '#1a1f2e',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b35',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#ff6b35',
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  instruction: {
    fontSize: 14,
    color: '#8e9aaf',
    marginBottom: 8,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold' as const,
    color: '#ffffff',
  },
  benefit: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
  },
  codeBlock: {
    backgroundColor: '#0f1419',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  code: {
    fontSize: 12,
    color: '#8e9aaf',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
};
