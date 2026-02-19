import { CookingStep, CookingMethod, DayMeal } from "./types";

export function generateStepsByMethod(
  method: CookingMethod,
  meal: DayMeal,
): CookingStep[] {
  const ingredients = meal.items?.map((item) => item.name ?? "") || [];
  const hasProtein = ingredients.some((ing) =>
    ["paneer", "chicken", "tofu", "eggs"].some((protein) =>
      (ing ?? "").toLowerCase().includes(protein),
    ),
  );
  const hasVegetables = ingredients.some((ing) =>
    ["spinach", "onion", "tomato", "broccoli"].some((veg) =>
      (ing ?? "").toLowerCase().includes(veg),
    ),
  );

  switch (method) {
    case "scrambled":
      return [
        {
          step: 1,
          instruction: "Prepare and gather all ingredients",
          timeRequired: 3,
          icon: "📋",
          tips: "Mise en place - having everything ready makes cooking smoother",
        },
        {
          step: 2,
          instruction: "Heat pan over medium heat with a little oil",
          timeRequired: 2,
          icon: "🔥",
          tips: "Medium heat prevents burning and ensures even cooking",
        },
        {
          step: 3,
          instruction: hasVegetables
            ? "Add vegetables and cook until softened"
            : "Add main ingredients to the pan",
          timeRequired: hasVegetables ? 4 : 3,
          icon: "🥬",
          tips: "Cook vegetables first to release their flavors",
        },
        {
          step: 4,
          instruction: hasProtein
            ? "Add protein and scramble gently"
            : "Scramble ingredients gently with spatula",
          timeRequired: 4,
          icon: "🥚",
          tips: "Gentle scrambling creates fluffy, not rubbery texture",
        },
        {
          step: 5,
          instruction: "Season to taste and serve hot",
          timeRequired: 1,
          icon: "🧂",
          tips: "Taste before serving and adjust seasoning if needed",
        },
      ];

    case "stir-fry":
      return [
        {
          step: 1,
          instruction: "Prep all ingredients - cut into uniform pieces",
          timeRequired: 5,
          icon: "🔪",
          tips: "Uniform pieces ensure even cooking",
        },
        {
          step: 2,
          instruction: "Heat wok or large pan over high heat",
          timeRequired: 2,
          icon: "🔥",
          tips: "High heat is key for proper stir-frying",
        },
        {
          step: 3,
          instruction: "Add oil and swirl to coat the pan",
          timeRequired: 1,
          icon: "🫒",
          tips: "Use oil with high smoke point like avocado or peanut oil",
        },
        {
          step: 4,
          instruction: hasProtein
            ? "Add protein first, cook until almost done"
            : "Add harder vegetables first",
          timeRequired: 3,
          icon: "🥩",
          tips: "Cook ingredients in order of cooking time needed",
        },
        {
          step: 5,
          instruction: "Add remaining vegetables, stir constantly",
          timeRequired: 4,
          icon: "🥕",
          tips: "Keep ingredients moving to prevent burning",
        },
        {
          step: 6,
          instruction: "Season and serve immediately",
          timeRequired: 1,
          icon: "🍽️",
          tips: "Serve immediately to maintain crispness",
        },
      ];

    case "curry":
      return [
        {
          step: 1,
          instruction: "Prepare spice mix and chop all ingredients",
          timeRequired: 8,
          icon: "🌶️",
          tips: "Fresh spices make a huge difference in flavor",
        },
        {
          step: 2,
          instruction: "Heat oil in heavy-bottomed pot",
          timeRequired: 2,
          icon: "🍲",
          tips: "Heavy bottom prevents burning and ensures even heat",
        },
        {
          step: 3,
          instruction: "Add aromatics (onion, garlic, ginger) and cook",
          timeRequired: 5,
          icon: "🧅",
          tips: "Cook until fragrant but not brown for best flavor",
        },
        {
          step: 4,
          instruction: "Add spices and cook for 30 seconds",
          timeRequired: 1,
          icon: "🌿",
          tips: "Blooming spices releases their essential oils",
        },
        {
          step: 5,
          instruction: hasProtein
            ? "Add protein and cook until browned"
            : "Add main vegetables",
          timeRequired: 6,
          icon: "🥩",
          tips: "Browning adds depth of flavor",
        },
        {
          step: 6,
          instruction: "Add liquid and simmer until tender",
          timeRequired: 15,
          icon: "🥥",
          tips: "Low simmer prevents breaking apart ingredients",
        },
        {
          step: 7,
          instruction: "Taste, adjust seasoning, and serve",
          timeRequired: 2,
          icon: "✨",
          tips: "Let curry rest 5 minutes before serving for flavors to meld",
        },
      ];

    case "salad":
      return [
        {
          step: 1,
          instruction: "Wash and thoroughly dry all vegetables",
          timeRequired: 5,
          icon: "💧",
          tips: "Dry vegetables ensure dressing adheres properly",
        },
        {
          step: 2,
          instruction: "Chop vegetables into bite-sized pieces",
          timeRequired: 4,
          icon: "🔪",
          tips: "Uniform pieces make eating easier and look more appealing",
        },
        {
          step: 3,
          instruction: "Prepare dressing in a small bowl",
          timeRequired: 2,
          icon: "🥄",
          tips: "Whisk dressing well to emulsify ingredients",
        },
        {
          step: 4,
          instruction: "Combine vegetables in large bowl",
          timeRequired: 1,
          icon: "🥗",
          tips: "Start with heartier vegetables at the bottom",
        },
        {
          step: 5,
          instruction: "Add dressing and toss gently",
          timeRequired: 1,
          icon: "🥄",
          tips: "Start with less dressing - you can always add more",
        },
        {
          step: 6,
          instruction: "Add any proteins or nuts and serve",
          timeRequired: 1,
          icon: "🥜",
          tips: "Add delicate ingredients last to prevent wilting",
        },
      ];

    case "smoothie":
      return [
        {
          step: 1,
          instruction: "Gather all ingredients and wash fruits",
          timeRequired: 2,
          icon: "🍓",
          tips: "Frozen fruits create a thicker, colder smoothie",
        },
        {
          step: 2,
          instruction: "Add liquid ingredients to blender first",
          timeRequired: 1,
          icon: "🥛",
          tips: "Liquids help the blender work more efficiently",
        },
        {
          step: 3,
          instruction: "Add soft ingredients (banana, yogurt)",
          timeRequired: 1,
          icon: "🍌",
          tips: "Layer ingredients by density for best blending",
        },
        {
          step: 4,
          instruction: "Add harder ingredients (frozen fruits)",
          timeRequired: 1,
          icon: "🧊",
          tips: "Frozen ingredients go on top for easier blending",
        },
        {
          step: 5,
          instruction: "Blend until smooth, add liquid if needed",
          timeRequired: 2,
          icon: "🌪️",
          tips: "Stop and scrape sides if needed for even blending",
        },
        {
          step: 6,
          instruction: "Taste, adjust sweetness, and serve",
          timeRequired: 1,
          icon: "🥤",
          tips: "Serve immediately for best texture and nutrition",
        },
      ];

    default:
      return [
        {
          step: 1,
          instruction: "Prepare and organize all ingredients",
          timeRequired: 5,
          icon: "📋",
          tips: "Having everything ready makes cooking much smoother",
        },
        {
          step: 2,
          instruction: "Heat cooking vessel to appropriate temperature",
          timeRequired: 3,
          icon: "🔥",
          tips: "Proper temperature is key to good cooking",
        },
        {
          step: 3,
          instruction: "Cook ingredients according to their needs",
          timeRequired: 8,
          icon: "👨‍🍳",
          tips: "Cook harder ingredients first, softer ones last",
        },
        {
          step: 4,
          instruction: "Season and combine all components",
          timeRequired: 2,
          icon: "🧂",
          tips: "Taste as you go and adjust seasoning",
        },
        {
          step: 5,
          instruction: "Plate beautifully and serve",
          timeRequired: 2,
          icon: "🍽️",
          tips: "We eat with our eyes first - make it look good!",
        },
      ];
  }
}
