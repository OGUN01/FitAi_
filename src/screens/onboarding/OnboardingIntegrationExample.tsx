import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { useOnboardingIntegration } from "../../utils/integration";
import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
import { PersonalInfo, FitnessGoals } from "../../types/user";

/**
 * Example of how to integrate the existing onboarding screens with the backend
 * This shows the pattern for connecting UI components to real data
 */

interface OnboardingIntegrationExampleProps {
  onComplete: () => void;
}

export const OnboardingIntegrationExample: React.FC<
  OnboardingIntegrationExampleProps
> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<
    "personal" | "goals" | "complete"
  >("personal");
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const { profile, isProfileComplete } = useUser();
  const { savePersonalInfo, saveFitnessGoals, saveOnboardingData } =
    useOnboardingIntegration();

  /**
   * Handle personal info submission
   * This replaces the mock data saving in PersonalInfoScreen
   */
  const handlePersonalInfoSubmit = async (personalInfo: PersonalInfo) => {
    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setIsLoading(true);

    try {
      const result = await savePersonalInfo(personalInfo);

      if (result.success) {
        setCurrentStep("goals");
        Alert.alert("Success", "Personal information saved successfully!");
      } else {
        Alert.alert(
          "Error",
          result.error || "Failed to save personal information",
        );
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error("Personal info save error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle fitness goals submission
   * This replaces the mock data saving in GoalsScreen
   */
  const handleFitnessGoalsSubmit = async (fitnessGoals: FitnessGoals) => {
    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setIsLoading(true);

    try {
      const result = await saveFitnessGoals(fitnessGoals);

      if (result.success) {
        setCurrentStep("complete");
        Alert.alert("Success", "Fitness goals saved successfully!");

        // Complete onboarding
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        Alert.alert("Error", result.error || "Failed to save fitness goals");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error("Fitness goals save error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Alternative: Save complete onboarding data at once
   * This can be used if you collect all data first, then save
   */
  const handleCompleteOnboardingSubmit = async (
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
  ) => {
    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setIsLoading(true);

    try {
      const result = await saveOnboardingData({
        personalInfo,
        fitnessGoals,
        isComplete: true,
      });

      if (result.success) {
        Alert.alert("Success", "Onboarding completed successfully!");
        onComplete();
      } else {
        Alert.alert("Error", result.error || "Failed to complete onboarding");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error("Complete onboarding save error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show completion message
  if (currentStep === "complete") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🎉 Welcome to FitAI!</Text>
        <Text style={styles.subtitle}>
          Your profile has been created successfully.
        </Text>
        <Text style={styles.description}>
          You can now access all features of the app with your personalized
          experience.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Onboarding Integration Example</Text>
      <Text style={styles.subtitle}>
        Current Step:{" "}
        {currentStep === "personal" ? "Personal Info" : "Fitness Goals"}
      </Text>

      {/* Show current user info */}
      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.userInfoText}>User: {user.email}</Text>
          <Text style={styles.userInfoText}>
            Profile Complete: {isProfileComplete ? "Yes" : "No"}
          </Text>
          {profile && (
            <Text style={styles.userInfoText}>
              Name: {profile.personalInfo.name || "Not set"}
            </Text>
          )}
        </View>
      )}

      {/* Integration instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>How to integrate:</Text>
        <Text style={styles.instructionsText}>
          1. Replace mock data saving in PersonalInfoScreen with
          handlePersonalInfoSubmit
        </Text>
        <Text style={styles.instructionsText}>
          2. Replace mock data saving in GoalsScreen with
          handleFitnessGoalsSubmit
        </Text>
        <Text style={styles.instructionsText}>
          3. Add loading states and error handling
        </Text>
        <Text style={styles.instructionsText}>
          4. Use useAuth and useUser hooks for state management
        </Text>
      </View>

      {/* Example code snippet */}
      <View style={styles.codeExample}>
        <Text style={styles.codeTitle}>Example Integration Code:</Text>
        <Text style={styles.codeText}>
          {`// In PersonalInfoScreen.tsx
import { useOnboardingIntegration } from '../../utils/integration';

const { savePersonalInfo } = useOnboardingIntegration();

const handleSubmit = async (data) => {
  const result = await savePersonalInfo(data);
  if (result.success) {
    // Navigate to next screen
  } else {
    // Show error
  }
};`}
        </Text>
      </View>

      {isLoading && (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Saving data...</Text>
        </View>
      )}
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#0a0f1c",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#8e9aaf",
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: "#8e9aaf",
    textAlign: "center" as const,
    lineHeight: 20,
  },
  userInfo: {
    backgroundColor: "#1a1f2e",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  userInfoText: {
    color: "#ffffff",
    fontSize: 14,
    marginBottom: 4,
  },
  instructions: {
    backgroundColor: "#1a1f2e",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  instructionsTitle: {
    color: "#ff6b35",
    fontSize: 16,
    fontWeight: "bold" as const,
    marginBottom: 8,
  },
  instructionsText: {
    color: "#8e9aaf",
    fontSize: 14,
    marginBottom: 4,
  },
  codeExample: {
    backgroundColor: "#0f1419",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  codeTitle: {
    color: "#ff6b35",
    fontSize: 14,
    fontWeight: "bold" as const,
    marginBottom: 8,
  },
  codeText: {
    color: "#8e9aaf",
    fontSize: 12,
    fontFamily: "monospace",
    lineHeight: 16,
  },
  loading: {
    padding: 16,
    alignItems: "center" as const,
  },
  loadingText: {
    color: "#ff6b35",
    fontSize: 16,
  },
};

export default OnboardingIntegrationExample;
