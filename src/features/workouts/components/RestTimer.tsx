import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from "react-native";
import {
  getRemainingTime,
  isExpired,
} from "../../../services/restTimerService";

interface RestTimerProps {
  targetEndTime: number | null;
  onExpire: () => void;
  onSkip: () => void;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function RestTimer({ targetEndTime, onExpire, onSkip }: RestTimerProps) {
  const [remaining, setRemaining] = useState(0);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (targetEndTime == null) return;

    expiredRef.current = false;
    setRemaining(getRemainingTime(targetEndTime));

    const intervalId = setInterval(() => {
      const secs = getRemainingTime(targetEndTime);
      setRemaining(secs);

      if (isExpired(targetEndTime) && !expiredRef.current) {
        expiredRef.current = true;
        Vibration.vibrate([0, 500]);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [targetEndTime]);

  if (targetEndTime == null) return null;

  return (
    <View testID="rest-timer-container" style={styles.overlay}>
      <View style={styles.content}>
        <Text style={styles.label}>Rest</Text>
        <Text testID="rest-timer-countdown" style={styles.countdown}>
          {formatTime(remaining)}
        </Text>
        <TouchableOpacity
          testID="rest-timer-skip"
          style={styles.skipButton}
          onPress={onSkip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  content: {
    backgroundColor: "#1E1E2E",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    minWidth: 200,
  },
  label: {
    color: "#AAAAAA",
    fontSize: 14,
    marginBottom: 4,
  },
  countdown: {
    color: "#FFFFFF",
    fontSize: 48,
    fontWeight: "700",
  },
  skipButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#333344",
    borderRadius: 8,
  },
  skipText: {
    color: "#FF6B6B",
    fontSize: 16,
    fontWeight: "600",
  },
});
