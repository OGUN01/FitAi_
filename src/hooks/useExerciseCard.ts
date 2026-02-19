import { useState } from "react";
import { LayoutAnimation } from "react-native";

interface UseExerciseCardProps {
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export const useExerciseCard = ({
  expanded = false,
  onToggleExpand,
}: UseExerciseCardProps) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const handleToggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggleExpand?.();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatReps = (reps: number | string) => {
    if (typeof reps === "string") return reps;
    return reps.toString();
  };

  const getMuscleGroupColor = (group: string) => {
    const colors: Record<string, string> = {
      chest: "#FF6B6B",
      back: "#4ECDC4",
      shoulders: "#45B7D1",
      biceps: "#96CEB4",
      triceps: "#FFEAA7",
      legs: "#DDA0DD",
      abs: "#98D8C8",
      glutes: "#F7DC6F",
      cardio: "#FF7675",
      flexibility: "#A29BFE",
    };
    return colors[group.toLowerCase()] || "#007AFF";
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "🟢";
      case "intermediate":
        return "🟡";
      case "advanced":
        return "🔴";
      default:
        return "⚪";
    }
  };

  return {
    isExpanded,
    handleToggleExpand,
    formatTime,
    formatReps,
    getMuscleGroupColor,
    getDifficultyIcon,
  };
};
