import { useState, useEffect, useRef } from "react";
import { Alert } from "react-native";

export function useCookingTimer() {
  const [cookingTimer, setCookingTimer] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number>(0);

  const startTimer = (minutes: number) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    const totalSeconds = minutes * 60;
    setCookingTimer(totalSeconds);
    endTimeRef.current = Date.now() + totalSeconds * 1000;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      if (remaining <= 0) {
        clearInterval(interval);
        timerIntervalRef.current = null;
        setCookingTimer(null);
        Alert.alert("Timer Complete!", "Your cooking step is ready.");
      } else {
        setCookingTimer(remaining);
      }
    }, 1000);

    timerIntervalRef.current = interval;
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setCookingTimer(null);
  };

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  return {
    cookingTimer,
    startTimer,
    stopTimer,
    formatTimer,
  };
}
