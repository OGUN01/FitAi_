import { logger } from '../utils/logger';
// 🪝 Create Recipe Hook
// Form state management and recipe generation logic

import { useState } from "react";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";

const geminiService = {
  isAvailable: () => false,
  generateResponse: async () => ({
    success: false,
    error: "Feature migrated to backend",
  }),
};

interface UseCreateRecipeParams {
  profile?: any;
  onRecipeCreated: (recipe: any) => void;
  onClose: () => void;
}

export const useCreateRecipe = ({
  profile,
  onRecipeCreated,
  onClose,
}: UseCreateRecipeParams) => {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeInput, setActiveInput] = useState<string | null>(null);

  const handleInputChange = (id: string, value: string) => {
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleExamplePress = (promptId: string, example: string) => {
    setInputs((prev) => ({ ...prev, [promptId]: example }));
  };

  const validateInputs = () => {
    const required = ["description"];
    const missing = required.filter((key) => !inputs[key]?.trim());

    if (missing.length > 0) {
      crossPlatformAlert(
        "Missing Information",
        "Please describe what you want to cook.",
        [{ text: "OK" }],
      );
      return false;
    }

    return true;
  };

  const handleCreateRecipe = async () => {
    if (!validateInputs()) return;

    if (!geminiService.isAvailable()) {
      crossPlatformAlert(
        "Feature Not Available",
        "AI recipe generation is currently disabled. This feature will be available when the backend integration is complete.\n\n🔧 Using Cloudflare Workers backend for AI features.",
        [{ text: "OK" }],
      );
      return;
    }

    setIsGenerating(true);

    try {
      const prompt = `Create a detailed, personalized recipe based on the following request:

DISH DESCRIPTION: ${inputs.description}
${inputs.dietary ? `DIETARY REQUIREMENTS: ${inputs.dietary}` : ""}
${inputs.time ? `TIME CONSTRAINT: ${inputs.time}` : ""}
${inputs.servings ? `SERVINGS: ${inputs.servings}` : ""}

${
  profile?.personalInfo
    ? `
USER PROFILE:
- Age: ${profile.personalInfo.age}
- Gender: ${profile.personalInfo.gender}
- Activity Level: ${profile.workoutPreferences?.activity_level || (profile.personalInfo as any).activityLevel}
- Fitness Goals: ${profile.fitnessGoals?.primaryGoals?.join(", ") || "General health"}
`
    : ""
}

Requirements:
- Create a complete recipe with creative name and detailed description
- Provide exact ingredient measurements and step-by-step instructions
- Include accurate nutritional information per serving
- Consider user's profile for portion sizes and nutritional goals
- Add cooking tips, variations, and equipment needed
- Specify prep time, cook time, and difficulty level
- Include storage instructions and allergen information

Generate a comprehensive recipe that's practical, healthy, and aligned with the user's goals.`;

      const response = await geminiService.generateResponse();

      if (response.success && "data" in response && response.data) {
        const structuredRecipe = response.data as any;

        const recipeData = {
          id: Date.now().toString(),
          name: structuredRecipe.name,
          description: structuredRecipe.description,
          content: structuredRecipe,
          createdAt: new Date().toISOString(),
          dietary: inputs.dietary || "",
          time: inputs.time || "",
          servings:
            structuredRecipe.servings?.toString() || inputs.servings || "",
          userGenerated: true,
          structuredData: structuredRecipe,
        };

        onRecipeCreated(recipeData);

        crossPlatformAlert(
          "🎉 Recipe Created!",
          `Your custom recipe has been generated successfully!`,
          [
            {
              text: "View Recipe",
              onPress: () => {
                onClose();
              },
            },
          ],
        );

        setInputs({});
      } else {
        throw new Error(response.error || "Failed to generate recipe");
      }
    } catch (error) {
      logger.error('Recipe creation failed', { error: String(error) });
      crossPlatformAlert(
        "Creation Failed",
        "Failed to create recipe. Please try again with a clearer description.",
        [{ text: "OK" }],
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const getFilledFields = () => {
    return Object.keys(inputs).filter((key) => inputs[key]?.trim()).length;
  };

  return {
    inputs,
    isGenerating,
    activeInput,
    handleInputChange,
    handleExamplePress,
    handleCreateRecipe,
    setActiveInput,
    getFilledFields,
  };
};
