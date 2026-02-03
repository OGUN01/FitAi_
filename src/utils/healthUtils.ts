// Recovery score color mapping
export const getRecoveryColor = (score: number) => {
  if (score >= 80)
    return {
      color: "#4CAF50",
      label: "Optimal",
      gradient: ["#4CAF50", "#8BC34A"],
    };
  if (score >= 60)
    return {
      color: "#FFC107",
      label: "Moderate",
      gradient: ["#FFC107", "#FFD54F"],
    };
  if (score >= 40)
    return { color: "#FF9800", label: "Low", gradient: ["#FF9800", "#FFB74D"] };
  return { color: "#F44336", label: "Poor", gradient: ["#F44336", "#EF5350"] };
};

// Sleep quality color mapping
export const getSleepColor = (quality: string) => {
  switch (quality) {
    case "excellent":
      return "#4CAF50";
    case "good":
      return "#8BC34A";
    case "fair":
      return "#FFC107";
    case "poor":
      return "#F44336";
    default:
      return "#9E9E9E";
  }
};
