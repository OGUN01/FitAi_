export const DIET_TYPE_OPTIONS = [
  {
    id: "non-veg",
    title: "Non-Vegetarian",
    iconName: "nutrition-outline",
    description: "Includes all types of meat and fish",
  },
  {
    id: "vegetarian",
    title: "Vegetarian",
    iconName: "leaf-outline",
    description: "No meat or fish, includes dairy and eggs",
  },
  {
    id: "vegan",
    title: "Vegan",
    iconName: "flower-outline",
    description: "No animal products whatsoever",
  },
  {
    id: "pescatarian",
    title: "Pescatarian",
    iconName: "fish-outline",
    description: "Vegetarian diet that includes fish",
  },
];

export const DIET_READINESS_OPTIONS = [
  {
    key: "keto_ready",
    title: "Ketogenic Diet",
    iconName: "leaf-outline",
    description:
      "High fat, very low carb diet (5% carbs, 70% fat, 25% protein)",
    benefits: ["Rapid weight loss", "Mental clarity", "Reduced appetite"],
  },
  {
    key: "intermittent_fasting_ready",
    title: "Intermittent Fasting",
    iconName: "time-outline",
    description: "Time-restricted eating patterns (16:8, 18:6, etc.)",
    benefits: ["Improved metabolism", "Weight management", "Cellular repair"],
  },
  {
    key: "paleo_ready",
    title: "Paleo Diet",
    iconName: "flame-outline",
    description: "Whole foods based on paleolithic era eating",
    benefits: ["Natural nutrition", "Reduced inflammation", "Better digestion"],
  },
  {
    key: "mediterranean_ready",
    title: "Mediterranean Diet",
    iconName: "heart-outline",
    description: "Rich in olive oil, fish, vegetables, and whole grains",
    benefits: ["Heart health", "Brain function", "Longevity"],
  },
  {
    key: "low_carb_ready",
    title: "Low Carb Diet",
    iconName: "restaurant-outline",
    description: "Reduced carbohydrate intake (under 100g daily)",
    benefits: ["Blood sugar control", "Weight loss", "Energy stability"],
  },
  {
    key: "high_protein_ready",
    title: "High Protein Diet",
    iconName: "barbell-outline",
    description: "Increased protein intake for muscle building",
    benefits: ["Muscle growth", "Satiety", "Recovery"],
  },
];

export const COOKING_SKILL_LEVELS = [
  {
    level: "beginner",
    title: "Beginner",
    iconName: "restaurant-outline",
    description: "Simple recipes, basic cooking skills",
    timeRange: "15-30 minutes",
  },
  {
    level: "intermediate",
    title: "Intermediate",
    iconName: "pizza-outline",
    description: "Comfortable with various techniques",
    timeRange: "30-60 minutes",
  },
  {
    level: "advanced",
    title: "Advanced",
    iconName: "flame-outline",
    description: "Complex recipes, professional techniques",
    timeRange: "60+ minutes",
  },
  {
    level: "not_applicable",
    title: "Not Applicable",
    iconName: "home-outline",
    description: "Made/home food prepared by others",
    timeRange: "N/A",
  },
];

export const BUDGET_LEVELS = [
  {
    level: "low",
    title: "Budget-Friendly",
    iconName: "cash-outline",
    description: "Cost-effective ingredients and meals",
    range: "$50-100/week",
  },
  {
    level: "medium",
    title: "Moderate",
    iconName: "wallet-outline",
    description: "Balance of quality and affordability",
    range: "$100-200/week",
  },
  {
    level: "high",
    title: "Premium",
    iconName: "diamond-outline",
    description: "High-quality, organic ingredients",
    range: "$200+/week",
  },
];

export const HEALTH_HABITS = {
  hydration: [
    {
      key: "drinks_enough_water",
      title: "Drinks 3-4L Water Daily",
      iconName: "water-outline",
      description: "Maintains proper hydration levels",
    },
    {
      key: "limits_sugary_drinks",
      title: "Limits Sugary Drinks",
      iconName: "warning-outline",
      description: "Avoids sodas, juices with added sugar",
    },
  ],
  eating_patterns: [
    {
      key: "eats_regular_meals",
      title: "Eats Regular Meals",
      iconName: "fast-food-outline",
      description: "Consistent meal timing throughout day",
    },
    {
      key: "avoids_late_night_eating",
      title: "Avoids Late Night Eating",
      iconName: "moon-outline",
      description: "No eating 3 hours before bedtime",
    },
    {
      key: "controls_portion_sizes",
      title: "Controls Portion Sizes",
      iconName: "scale-outline",
      description: "Mindful of serving sizes",
    },
    {
      key: "reads_nutrition_labels",
      title: "Reads Nutrition Labels",
      iconName: "document-text-outline",
      description: "Checks food labels before purchasing",
    },
  ],
  food_choices: [
    {
      key: "eats_processed_foods",
      title: "Eats Processed Foods",
      iconName: "cube-outline",
      description: "Regularly consumes packaged/processed foods",
    },
    {
      key: "eats_5_servings_fruits_veggies",
      title: "Eats 5+ Servings Fruits/Vegetables",
      iconName: "nutrition-outline",
      description: "Daily fruit and vegetable intake",
    },
    {
      key: "limits_refined_sugar",
      title: "Limits Refined Sugar",
      iconName: "close-circle-outline",
      description: "Reduces added sugars in diet",
    },
    {
      key: "includes_healthy_fats",
      title: "Includes Healthy Fats",
      iconName: "leaf-outline",
      description: "Nuts, avocado, olive oil, etc.",
    },
  ],
  substances: [
    {
      key: "drinks_alcohol",
      title: "Drinks Alcohol",
      iconName: "wine-outline",
      description: "Regular alcohol consumption",
    },
    {
      key: "smokes_tobacco",
      title: "Smokes Tobacco",
      iconName: "ban-outline",
      description: "Tobacco use (any form)",
    },
    {
      key: "drinks_coffee",
      title: "Drinks Coffee",
      iconName: "cafe-outline",
      description: "Daily caffeine intake",
    },
    {
      key: "takes_supplements",
      title: "Takes Supplements",
      iconName: "medkit-outline",
      description: "Vitamins, protein powder, etc.",
    },
  ],
};

export const ALLERGY_OPTIONS = [
  { id: "nuts", label: "Nuts", value: "nuts", iconName: "warning-outline" },
  { id: "dairy", label: "Dairy", value: "dairy", iconName: "warning-outline" },
  { id: "eggs", label: "Eggs", value: "eggs", iconName: "warning-outline" },
  {
    id: "gluten",
    label: "Gluten",
    value: "gluten",
    iconName: "warning-outline",
  },
  { id: "soy", label: "Soy", value: "soy", iconName: "warning-outline" },
  {
    id: "shellfish",
    label: "Shellfish",
    value: "shellfish",
    iconName: "warning-outline",
  },
  { id: "fish", label: "Fish", value: "fish", iconName: "warning-outline" },
  {
    id: "sesame",
    label: "Sesame",
    value: "sesame",
    iconName: "warning-outline",
  },
];

export const RESTRICTION_OPTIONS = [
  {
    id: "low-sodium",
    label: "Low Sodium",
    value: "low-sodium",
    iconName: "remove-circle-outline",
  },
  {
    id: "low-sugar",
    label: "Low Sugar",
    value: "low-sugar",
    iconName: "close-circle-outline",
  },
  {
    id: "low-carb",
    label: "Low Carb",
    value: "low-carb",
    iconName: "restaurant-outline",
  },
  {
    id: "high-protein",
    label: "High Protein",
    value: "high-protein",
    iconName: "barbell-outline",
  },
  {
    id: "diabetic-friendly",
    label: "Diabetic Friendly",
    value: "diabetic-friendly",
    iconName: "pulse-outline",
  },
  {
    id: "heart-healthy",
    label: "Heart Healthy",
    value: "heart-healthy",
    iconName: "heart-outline",
  },
];
