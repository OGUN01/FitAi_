// Analytics Helper Functions
// Utility functions for analytics screen

export const analyticsHelpers = {
  /**
   * Get personalized recommendation based on user data
   */
  getPersonalizedRecommendation(): string {
    const recommendations = [
      "Based on your recent progress, consider increasing workout intensity by 10% this week.",
      "You're doing great! Keep maintaining your current streak for optimal results.",
      "Try incorporating more protein-rich meals to support your fitness goals.",
      "Consider adding one extra rest day this week to optimize recovery.",
      "Your consistency is excellent! Focus on progressive overload for better gains.",
    ];

    // For now, return a random recommendation
    // In the future, this can be AI-powered based on user's analytics
    return recommendations[Math.floor(Math.random() * recommendations.length)];
  },

  /**
   * Calculate trend based on historical data
   */
  calculateTrend(data: number[]): "up" | "down" | "stable" {
    if (data.length < 2) return "stable";

    const recent = data.slice(-3);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const first = recent[0];

    if (avg > first * 1.05) return "up";
    if (avg < first * 0.95) return "down";
    return "stable";
  },

  /**
   * Format analytics value for display
   */
  formatValue(
    value: number,
    type: "weight" | "calories" | "percentage" | "count",
  ): string {
    switch (type) {
      case "weight":
        return `${value.toFixed(1)} kg`;
      case "calories":
        return `${Math.round(value).toLocaleString()} cal`;
      case "percentage":
        return `${Math.round(value)}%`;
      case "count":
        return Math.round(value).toString();
      default:
        return value.toString();
    }
  },
};
