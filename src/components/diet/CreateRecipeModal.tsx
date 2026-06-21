// 📝 Create Recipe Modal Component
// Natural language recipe creation with AI assistance

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,

  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Card } from "../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rh, rw, rs } from "../../utils/responsive";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

// Stub for deprecated AI service (migrated to Cloudflare Workers)
const geminiService = {
  isAvailable: () => false,
  generateResponse: async () => ({
    success: false,
    error: "Feature migrated to backend",
  }),
};

interface CreateRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onRecipeCreated: (recipe: any) => void;
  profile?: any;
}

interface RecipePrompt {
  id: string;
  title: string;
  placeholder: string;
  icon: string;
  examples: string[];
}

const recipePrompts: RecipePrompt[] = [
  {
    id: "description",
    title: "What would you like to cook?",
    placeholder: "Describe the dish you want to make...",
    icon: "🍽️",
    examples: [
      "Healthy chicken stir-fry with vegetables",
      "Vegan pasta with spinach and mushrooms",
      "High-protein breakfast smoothie bowl",
      "Low-carb cauliflower rice bowl",
    ],
  },
  {
    id: "dietary",
    title: "Any dietary preferences?",
    placeholder: "Dietary restrictions or preferences...",
    icon: "🥗",
    examples: [
      "Gluten-free and dairy-free",
      "High protein, low carb",
      "Vegetarian with no nuts",
      "Keto-friendly",
    ],
  },
  {
    id: "time",
    title: "How much time do you have?",
    placeholder: "Cooking and prep time...",
    icon: "⏰",
    examples: [
      "Under 30 minutes total",
      "Quick 15-minute meal",
      "1 hour including prep",
      "Slow cooker recipe",
    ],
  },
  {
    id: "servings",
    title: "How many servings?",
    placeholder: "Number of people or portions...",
    icon: "👥",
    examples: [
      "2 servings for dinner",
      "Meal prep for 4 days",
      "Family of 5",
      "Single serving",
    ],
  },
];

export const CreateRecipeModal: React.FC<CreateRecipeModalProps> = ({
  visible,
  onClose,
  onRecipeCreated,
  profile,
}) => {
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

    // Check if AI service is available
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
      // Build comprehensive prompt for structured recipe generation
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
- Activity Level: ${profile.workoutPreferences?.activity_level || (profile.personalInfo as { activityLevel?: string }).activityLevel}
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

      // Use structured output for 100% reliable recipe generation
      const response = await geminiService.generateResponse();

      if (response.success && "data" in response && response.data) {
        // Recipe data is already structured - no parsing needed!
        const structuredRecipe = response.data as Record<string, unknown>;

        const recipeData = {
          id: Date.now().toString(),
          name: structuredRecipe.name,
          description: structuredRecipe.description,
          content: structuredRecipe, // Store full structured data
          createdAt: new Date().toISOString(),
          dietary: inputs.dietary || "",
          time: inputs.time || "",
          servings:
            structuredRecipe.servings?.toString() || inputs.servings || "",
          userGenerated: true,
          structuredData: structuredRecipe, // Include structured data for advanced features
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
                // You could navigate to a recipe detail screen here
              },
            },
          ],
        );

        // Reset form
        setInputs({});
      } else {
        throw new Error(response.error || "Failed to generate recipe");
      }
    } catch (error) {
      console.error("Recipe creation failed:", error);
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerEmoji}>📝</Text>
            <Text style={styles.headerTitle}>Create Recipe</Text>
            <Text style={styles.headerSubtitle}>
              Describe what you want to cook and AI will create a personalized
              recipe
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close recipe creator"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Progress indicator */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(getFilledFields() / recipePrompts.length) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {getFilledFields()}/{recipePrompts.length} fields completed
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {recipePrompts.map((prompt, index) => (
            <View key={prompt.id} style={styles.promptSection}>
              <View style={styles.promptHeader}>
                <Text style={styles.promptIcon}>{prompt.icon}</Text>
                <Text style={styles.promptTitle}>{prompt.title}</Text>
                {index === 0 && <Text style={styles.requiredIndicator}>*</Text>}
              </View>

              <TextInput
                style={[
                  styles.textInput,
                  activeInput === prompt.id && styles.textInputFocused,
                  inputs[prompt.id] && styles.textInputFilled,
                ]}
                placeholder={prompt.placeholder}
                placeholderTextColor={colors.textMuted}
                value={inputs[prompt.id] || ""}
                onChangeText={(value) => handleInputChange(prompt.id, value)}
                onFocus={() => setActiveInput(prompt.id)}
                onBlur={() => setActiveInput(null)}
                multiline={prompt.id === "description"}
                numberOfLines={prompt.id === "description" ? 3 : 1}
                textAlignVertical="top"
              />

              {/* Example suggestions */}
              <Text style={styles.examplesLabel}>Suggestions:</Text>
              <View style={styles.examplesContainer}>
                {prompt.examples.map((example, exampleIndex) => (
                  <TouchableOpacity
                    key={exampleIndex}
                    style={[
                      styles.exampleChip,
                      inputs[prompt.id] === example &&
                        styles.exampleChipSelected,
                    ]}
                    onPress={() => handleExamplePress(prompt.id, example)}
                  >
                    <Text
                      style={[
                        styles.exampleText,
                        inputs[prompt.id] === example &&
                          styles.exampleTextSelected,
                      ]}
                    >
                      {example}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* AI Intelligence Features */}
          <Card style={styles.aiCard} variant="outlined">
            <Text style={styles.aiTitle}>🤖 AI Recipe Intelligence</Text>
            <View style={styles.aiFeatures}>
              <Text style={styles.aiFeature}>
                • Personalized to your profile
              </Text>
              <Text style={styles.aiFeature}>
                • Accurate nutrition calculations
              </Text>
              <Text style={styles.aiFeature}>• Step-by-step instructions</Text>
              <Text style={styles.aiFeature}>
                • Cooking tips and variations
              </Text>
            </View>
          </Card>
        </ScrollView>

        {/* Create Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.createButton,
              (!inputs.description?.trim() || isGenerating) &&
                styles.createButtonDisabled,
            ]}
            onPress={handleCreateRecipe}
            disabled={!inputs.description?.trim() || isGenerating}
          >
            {isGenerating ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator
                  size="small"
                  color={colors.white}
                />
                <Text style={styles.createButtonText}>Creating Recipe...</Text>
              </View>
            ) : (
              <Text style={styles.createButtonText}>🧑‍🍳 Create Recipe</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerContent: {
    flex: 1,
    alignItems: "center",
  },

  headerEmoji: {
    fontSize: rf(32),
    marginBottom: spacing.sm,
  },

  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(18),
  },

  closeButton: {
    width: Math.max(rw(32), 44),
    height: Math.max(rh(32), 44),
    borderRadius: Math.max(rs(16), 22),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: spacing.lg,
    top: spacing.lg,
  },

  closeButtonText: {
    fontSize: rf(16),
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.bold,
  },

  progressSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  progressBar: {
    height: rh(4),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: rs(2),
    marginBottom: spacing.xs,
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: rs(2),
  },

  progressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: "center",
  },

  scrollView: {
    flex: 1,
  },

  promptSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  promptIcon: {
    fontSize: rf(20),
    marginRight: spacing.sm,
  },

  promptTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },

  requiredIndicator: {
    fontSize: rf(16),
    color: colors.error,
    fontWeight: typography.fontWeight.bold,
  },

  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: rh(44),
  },

  textInputFocused: {
    borderColor: colors.primary,
  },

  textInputFilled: {
    backgroundColor: colors.primary + "08",
  },

  examplesLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },

  examplesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  exampleChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },

  exampleChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  exampleText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  exampleTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },

  aiCard: {
    margin: spacing.lg,
    padding: spacing.lg,
  },

  aiTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  aiFeatures: {
    gap: spacing.xs,
  },

  aiFeature: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: rf(18),
  },

  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  createButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: rh(56),
  },

  createButtonDisabled: {
    backgroundColor: colors.textMuted,
  },

  createButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },

  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});

export default CreateRecipeModal;
