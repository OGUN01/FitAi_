import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  exerciseHistoryService,
  LastSessionData,
} from "../../../services/exerciseHistoryService";
import {
  progressionService,
  ProgressionResult,
} from "../../../services/progressionService";
import { prDetectionService } from "../../../services/prDetectionService";
import { useFitnessStore } from "../../../stores/fitnessStore";

const SET_TYPES = ["normal", "warmup", "failure", "drop"] as const;
type SetType = (typeof SET_TYPES)[number];

const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: "W",
  warmup: "WU",
  failure: "F",
  drop: "D",
};

const SET_TYPE_COLORS: Record<SetType, string> = {
  normal: "#E0E0E0",
  warmup: "#FF9800",
  failure: "#F44336",
  drop: "#9C27B0",
};

export interface SetCompletionData {
  weightKg: number;
  reps: number;
  setType: SetType;
  completed: boolean;
}

interface ExerciseCardExercise {
  exerciseId: string;
  exerciseName?: string;
  name?: string;
  sets: number;
  reps: number | string;
  restTime?: number;
  duration?: number;
  weight?: number;
}

export interface ExerciseCardProps {
  exercise: ExerciseCardExercise;
  exerciseIndex: number;
  currentWeightKg?: number;
  onSetComplete: (setIndex: number, data: SetCompletionData) => void;
  onExerciseNamePress?: () => void;
  userId?: string;
  userUnits?: "kg" | "lbs";
}

const KG_TO_LBS = 2.2046;

function kgToDisplay(kg: number, units: "kg" | "lbs"): string {
  if (units === "lbs") {
    return (kg * KG_TO_LBS).toFixed(1);
  }
  return String(kg);
}

function displayToKg(display: string, units: "kg" | "lbs"): number {
  const val = parseFloat(display) || 0;
  if (units === "lbs") {
    return val / KG_TO_LBS;
  }
  return val;
}

export function parseRepRange(reps: number | string): [number, number] {
  if (typeof reps === "number") return [reps, reps];
  const parts = String(reps)
    .split("-")
    .map((s) => parseInt(s.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]];
  }
  const single = parseInt(String(reps), 10);
  if (!isNaN(single)) return [single, single];
  return [0, 0];
}

interface SetRowState {
  weight: string;
  reps: string;
  setType: SetType;
  completed: boolean;
}

export function ExerciseCard({
  exercise,
  exerciseIndex,
  currentWeightKg,
  onSetComplete,
  onExerciseNamePress,
  userId,
  userUnits = "kg",
}: ExerciseCardProps) {
  const exerciseName =
    exercise.exerciseName || exercise.name || exercise.exerciseId;
  const setCount = exercise.sets || 1;

  const [previousSession, setPreviousSession] =
    useState<LastSessionData | null>(null);
  const [suggestedWeight, setSuggestedWeight] =
    useState<ProgressionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPR, setShowPR] = useState(false);

  const initialWeight =
    currentWeightKg != null ? kgToDisplay(currentWeightKg, userUnits) : "";

  const [setRows, setSetRows] = useState<SetRowState[]>(() =>
    Array.from({ length: setCount }, () => ({
      weight: initialWeight,
      reps: "",
      setType: "normal" as SetType,
      completed: false,
    })),
  );

  const setRowsRef = useRef(setRows);
  setRowsRef.current = setRows;

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      if (!userId || !exercise.exerciseId) {
        setIsLoading(false);
        return;
      }

      try {
        const session = await exerciseHistoryService.getLastSession(
          exercise.exerciseId,
          userId,
        );
        if (!cancelled) {
          setPreviousSession(session);

          if (session && session.sets.length > 0) {
            const repRange = parseRepRange(exercise.reps);
            const lastSets = session.sets.map((s) => ({
              reps: s.reps ?? 0,
              weight: s.weightKg ?? 0,
              setType: s.setType,
              completed: true,
            }));
            const result = progressionService.suggestNextWeight(
              exercise.exerciseId,
              lastSets,
              repRange,
              progressionService.isBodyweightExercise(exercise.exerciseId),
            );
            setSuggestedWeight(result);

            if (currentWeightKg == null && result.suggestedWeightKg > 0) {
              const prefillStr = kgToDisplay(
                result.suggestedWeightKg,
                userUnits,
              );
              setSetRows((prev) =>
                prev.map((row) => ({
                  ...row,
                  weight: row.weight || prefillStr,
                })),
              );
            }
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [exercise.exerciseId, userId]);

  const handleTapPrevious = useCallback(
    (setIndex: number) => {
      if (!previousSession || !previousSession.sets[setIndex]) return;

      const prevSet = previousSession.sets[setIndex];
      const weightStr =
        prevSet.weightKg != null
          ? kgToDisplay(prevSet.weightKg, userUnits)
          : "";
      const repsStr = prevSet.reps != null ? String(prevSet.reps) : "";

      setSetRows((prev) => {
        const updated = [...prev];
        updated[setIndex] = {
          ...updated[setIndex],
          weight: weightStr,
          reps: repsStr,
        };
        return updated;
      });
    },
    [previousSession, userUnits],
  );

  const handleSetTypePress = useCallback((setIndex: number) => {
    setSetRows((prev) => {
      const updated = [...prev];
      const currentIdx = SET_TYPES.indexOf(updated[setIndex].setType);
      updated[setIndex] = {
        ...updated[setIndex],
        setType: SET_TYPES[(currentIdx + 1) % SET_TYPES.length],
      };
      return updated;
    });
  }, []);

  const handleCheckmark = useCallback(
    (setIndex: number) => {
      const row = setRowsRef.current[setIndex];
      const weightKg = displayToKg(row.weight, userUnits);
      const reps = parseInt(row.reps, 10) || 0;

      const data: SetCompletionData = {
        weightKg,
        reps,
        setType: row.setType,
        completed: true,
      };

      setSetRows((prev) => {
        const updated = [...prev];
        updated[setIndex] = { ...updated[setIndex], completed: true };
        return updated;
      });

      onSetComplete(setIndex, data);

      useFitnessStore.getState().updateSetData(exercise.exerciseId, setIndex, {
        weightKg,
        reps,
        setType: row.setType,
        completed: true,
      });

      if (userId && weightKg > 0 && reps > 0) {
        exerciseHistoryService
          .getPersonalRecords(exercise.exerciseId, userId)
          .then((prs) => {
            const weightPR = prs.find((p) => p.prType === "weight");
            const e1rmPR = prs.find((p) => p.prType === "estimated_1rm");
            const result = prDetectionService.checkForPR(
              exercise.exerciseId,
              { weightKg, reps },
              {
                weight: weightPR?.value,
                estimated1rm: e1rmPR?.value,
              },
            );
            if (result) {
              setShowPR(true);
              setTimeout(() => setShowPR(false), 3000);
              if (result.isWeightPR && result.newWeightPR != null) {
                prDetectionService.recordPR(
                  userId,
                  exercise.exerciseId,
                  "weight",
                  result.newWeightPR,
                );
              }
              if (result.is1RMPR && result.new1RMPR != null) {
                prDetectionService.recordPR(
                  userId,
                  exercise.exerciseId,
                  "estimated_1rm",
                  result.new1RMPR,
                );
              }
            }
          })
          .catch((err: unknown) => {
            console.error("[ExerciseCard] PR detection error:", err);
          });
      }
    },
    [userUnits, onSetComplete, exercise.exerciseId],
  );

  const renderPrevious = (setIndex: number) => {
    if (isLoading) {
      return <Text style={styles.previousText}>...</Text>;
    }

    if (!previousSession || !previousSession.sets[setIndex]) {
      return <Text style={styles.previousText}>First time</Text>;
    }

    const prevSet = previousSession.sets[setIndex];
    const weightDisplay =
      prevSet.weightKg != null ? kgToDisplay(prevSet.weightKg, userUnits) : "-";
    const repsDisplay = prevSet.reps ?? "-";

    return (
      <Text style={styles.previousText}>
        {weightDisplay}×{repsDisplay}
      </Text>
    );
  };

  return (
    <View style={styles.card}>
      {showPR && (
        <View testID="pr-banner" style={styles.prBanner}>
          <Text style={styles.prBannerText}>🏆 NEW PR!</Text>
        </View>
      )}
      {onExerciseNamePress ? (
        <TouchableOpacity onPress={onExerciseNamePress}>
          <Text style={[styles.header, styles.headerTappable]}>
            {exerciseName}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.header}>{exerciseName}</Text>
      )}

      <View style={styles.columnHeader}>
        <Text style={styles.colLabel}>TYPE</Text>
        <Text style={styles.colLabel}>PREVIOUS</Text>
        <Text style={styles.colLabel}>
          {userUnits.toUpperCase()}
          {suggestedWeight?.action === "increase" && (
            <Text style={styles.increaseIndicator}> ↑</Text>
          )}
        </Text>
        <Text style={styles.colLabel}>REPS</Text>
        <Text style={styles.colLabel}>✓</Text>
      </View>

      {setRows.map((row, idx) => {
        const nextIncompleteIdx = setRows.findIndex((r) => !r.completed);
        const isActive = idx === nextIncompleteIdx;
        const isLocked = !row.completed && !isActive;

        return (
          <View
            key={idx}
            testID={`set-row-${idx}`}
            style={[
              styles.setRow,
              row.completed && styles.completedRow,
              isActive && styles.activeRow,
              isLocked && styles.lockedRow,
            ]}
          >
            {isActive && <View style={styles.activeAccent} />}

            <TouchableOpacity
              testID={`set-type-${idx}`}
              style={[
                styles.setTypeBadge,
                { backgroundColor: SET_TYPE_COLORS[row.setType] },
                isLocked && styles.lockedBadge,
              ]}
              onPress={() => !isLocked && !row.completed && handleSetTypePress(idx)}
              disabled={isLocked || row.completed}
            >
              <Text style={styles.setTypeText}>
                {SET_TYPE_LABELS[row.setType]}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID={`previous-${idx}`}
              style={styles.previousContainer}
              onPress={() => isActive && handleTapPrevious(idx)}
              disabled={!isActive}
            >
              {renderPrevious(idx)}
            </TouchableOpacity>

            <TextInput
              testID={`weight-input-${idx}`}
              style={[
                styles.input,
                isLocked && styles.lockedInput,
                row.completed && styles.completedInput,
              ]}
              value={row.weight}
              onChangeText={(text) => {
                setSetRows((prev) => {
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], weight: text };
                  return updated;
                });
              }}
              keyboardType="decimal-pad"
              placeholder="0"
              editable={isActive}
            />

            <TextInput
              testID={`reps-input-${idx}`}
              style={[
                styles.input,
                isLocked && styles.lockedInput,
                row.completed && styles.completedInput,
              ]}
              value={row.reps}
              onChangeText={(text) => {
                setSetRows((prev) => {
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], reps: text };
                  return updated;
                });
              }}
              keyboardType="number-pad"
              placeholder="0"
              editable={isActive}
            />

            <TouchableOpacity
              testID={`checkmark-${idx}`}
              style={[
                styles.checkButton,
                row.completed && styles.checkButtonDone,
                isActive && styles.checkButtonActive,
                isLocked && styles.checkButtonLocked,
              ]}
              onPress={() => handleCheckmark(idx)}
              disabled={!isActive}
            >
              <Text
                style={[
                  styles.checkText,
                  isLocked && styles.checkTextLocked,
                ]}
              >
                ✓
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1A1A2E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  headerTappable: {
    textDecorationLine: "underline" as const,
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  colLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  completedRow: {
    opacity: 0.6,
    backgroundColor: "#1E3A2F",
  },
  activeRow: {
    backgroundColor: "#1A1A3E",
    borderLeftWidth: 3,
    borderLeftColor: "#6C63FF",
    paddingLeft: 1,
  },
  lockedRow: {
    opacity: 0.35,
  },
  activeAccent: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "#6C63FF",
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  lockedBadge: {
    opacity: 0.5,
  },
  setTypeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  setTypeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#000",
  },
  previousContainer: {
    flex: 1,
    alignItems: "center",
  },
  previousText: {
    fontSize: 13,
    color: "#666",
  },
  input: {
    flex: 1,
    backgroundColor: "#2A2A4A",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: "#FFF",
    fontSize: 14,
    textAlign: "center",
    marginHorizontal: 4,
  },
  checkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  checkButtonDone: {
    backgroundColor: "#4CAF50",
  },
  checkButtonActive: {
    backgroundColor: "#6C63FF",
  },
  checkButtonLocked: {
    backgroundColor: "#222",
    opacity: 0.4,
  },
  checkText: {
    fontSize: 16,
    color: "#FFF",
    fontWeight: "700",
  },
  checkTextLocked: {
    color: "#555",
  },
  lockedInput: {
    backgroundColor: "#1E1E2E",
    color: "#555",
  },
  completedInput: {
    backgroundColor: "#1E3A2F",
  },
  increaseIndicator: {
    color: "#4CAF50",
    fontWeight: "700",
  },
  prBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFD700",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingVertical: 6,
    alignItems: "center",
    zIndex: 10,
  },
  prBannerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
});
