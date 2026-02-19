// AI Response Schemas for Google Gemini Structured Output
// Motivational content schema definitions

// ============================================================================
// MOTIVATIONAL CONTENT SCHEMA
// ============================================================================

export const MOTIVATIONAL_CONTENT_SCHEMA = {
  type: "object",
  properties: {
    dailyTip: {
      type: "string",
      description: "Practical fitness tip for the day",
    },
    encouragement: {
      type: "string",
      description: "Personalized motivational message",
    },
    challenge: {
      type: "object",
      description: "Daily or weekly challenge",
      properties: {
        title: {
          type: "string",
          description: "Challenge name",
        },
        description: {
          type: "string",
          description: "What the user needs to do",
        },
        reward: {
          type: "string",
          description: "What they'll gain from completing it",
        },
        duration: {
          type: "number",
          description: "Duration in days",
        },
      },
      required: ["title", "description", "reward", "duration"],
      propertyOrdering: ["title", "description", "reward", "duration"],
    },
    quote: {
      type: "string",
      description: "Inspirational quote",
    },
    factOfTheDay: {
      type: "string",
      description: "Interesting fitness or health fact",
    },
  },
  required: ["dailyTip", "encouragement", "challenge", "quote", "factOfTheDay"],
  propertyOrdering: [
    "dailyTip",
    "encouragement",
    "challenge",
    "quote",
    "factOfTheDay",
  ],
};
