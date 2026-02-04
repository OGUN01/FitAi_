import { useState, useEffect, useRef } from "react";
import { Alert } from "react-native";

export function useCookingTimer() {
  const [cookingTimer, setCookingTimer] = useState<number | null>(null);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null,
  );
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = (minutes: number) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    const totalSeconds = minutes * 60;
    setCookingTimer(totalSeconds);

    const interval = setInterval(() => {
      setCookingTimer((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          timerIntervalRef.current = null;
          setTimerInterval(null);
          Alert.alert("Timer Complete!", "Your cooking step is ready.");
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    timerIntervalRef.current = interval;
    setTimerInterval(interval);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
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
