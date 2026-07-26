/**
 * NaturalLanguageEditBar — Phase 9 AI instruction bar.
 *
 * Renders at the top of WeeklyBuilderScreen (below GlassHeader). Collapses
 * to a small "AI Edit" chip by default; expands on tap to reveal a TextInput
 * where the user types a natural-language instruction (e.g. "Make Friday
 * heavier", "Reduce to 45 minutes", "Replace barbell with dumbbells"). On
 * submit, calls workoutBuilderAi.editNaturalLanguage → updates the draft +
 * fires a success haptic.
 *
 * Loading state: AuroraSpinner inside the Apply button during the AI call.
 * Error state: inline red text (non-blocking).
 *
 * Tokens: aurora-tokens. Haptics: src/utils/haptics.ts. Springs: Reanimated
 * FadeInDown springify entrance.
 */
import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type TextStyle,
  type NativeSyntheticEvent,
  type TextInputChangeEventData,
  type TextInputSubmitEditingEventData,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../ui/aurora/GlassCard";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { AuroraSpinner } from "../../ui/aurora/AuroraSpinner";
import { useWorkoutBuilderStore } from "../../../stores/workoutBuilderStore";
import { workoutBuilderAi } from "../../../ai/workoutBuilderAi";
import { haptics } from "../../../utils/haptics";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf, rw } from "../../../utils/responsive";

/**
 * Cast a typography font-weight token to RN's TextStyle['fontWeight'] without
 * `any` (TS strict). Mirrors the InlineValidationBanner pattern.
 */
const fw = (w: typeof typography.fontWeight[keyof typeof typography.fontWeight]): TextStyle["fontWeight"] =>
  String(w) as TextStyle["fontWeight"];

const PLACEHOLDER = "Try 'Make Friday heavier' or 'Reduce to 45 minutes'";

export const NaturalLanguageEditBar: React.FC = () => {
  const draft = useWorkoutBuilderStore((s) => s.draft);
  const applyAiEdit = useWorkoutBuilderStore((s) => s.applyAiEdit);

  const [expanded, setExpanded] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [summary, setSummary] = useState<string>("");

  const inputRef = useRef<TextInput>(null);

  const handleExpand = useCallback(() => {
    setExpanded((v) => !v);
    haptics.selection();
    // Focus the input on expand so the keyboard appears.
    if (!expanded) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [expanded]);

  const handleChange = useCallback(
    (e: NativeSyntheticEvent<TextInputChangeEventData>) => {
      setInstruction(e.nativeEvent.text);
      // Clear error/summary on new input.
      if (error) setError("");
      if (summary) setSummary("");
    },
    [error, summary],
  );

  const handleSubmit = useCallback(async () => {
    if (!draft) return;
    const trimmed = instruction.trim();
    if (trimmed.length < 3) {
      setError("Enter a longer instruction.");
      haptics.warning();
      return;
    }
    setLoading(true);
    setError("");
    setSummary("");
    haptics.medium();

    try {
      const result = await workoutBuilderAi.editNaturalLanguage({
        plan: draft,
        instruction: trimmed,
      });
      if (result.success && result.data) {
        applyAiEdit(result.data.updatedPlan);
        setSummary(result.data.summary);
        setInstruction("");
        haptics.success();
        // Collapse after a short delay so the user sees the success summary.
        setTimeout(() => {
          setExpanded(false);
          setSummary("");
        }, 2500);
      } else {
        setError(result.error ?? "Failed to apply instruction");
        haptics.error();
      }
    } catch (err) {
      console.error("[NaturalLanguageEditBar] edit failed:", err);
      setError("AI edit unavailable. Please try again.");
      haptics.error();
    } finally {
      setLoading(false);
    }
  }, [draft, instruction, applyAiEdit, error]);

  const handleSubmitEditing = useCallback(
    (_e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
      void handleSubmit();
    },
    [handleSubmit],
  );

  // ── Collapsed: small "AI Edit" chip ──
  if (!expanded) {
    return (
      <Animated.View entering={FadeInDown.springify()} style={styles.collapsedWrap}>
        <Pressable
          onPress={handleExpand}
          accessibilityRole="button"
          accessibilityLabel="Open AI edit bar"
          style={styles.chip}
        >
          <Ionicons name="sparkles" size={rf(14)} color={colors.primary.DEFAULT} />
          <Text style={styles.chipText}>AI Edit</Text>
        </Pressable>
        {summary.length > 0 && (
          <Text style={styles.summaryChip} numberOfLines={1}>
            {summary}
          </Text>
        )}
      </Animated.View>
    );
  }

  // ── Expanded: input + Apply button ──
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      style={styles.container}
    >
      <Animated.View entering={FadeInDown.springify()} style={styles.container}>
        <GlassCard
          blurIntensity="default"
          elevation={2}
          padding="sm"
          borderRadius="lg"
          showBorder
          style={styles.card}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Ionicons name="sparkles" size={rf(14)} color={colors.primary.DEFAULT} />
              <Text style={styles.title}>AI Edit</Text>
            </View>
            <Pressable
              hitSlop={10}
              onPress={handleExpand}
              accessibilityRole="button"
              accessibilityLabel="Collapse AI edit bar"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={rf(16)} color={colors.text.tertiary} />
            </Pressable>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputWrap}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={instruction}
                onChange={handleChange}
                onSubmitEditing={handleSubmitEditing}
                placeholder={PLACEHOLDER}
                placeholderTextColor={colors.text.tertiary}
                returnKeyType="done"
                editable={!loading}
                accessibilityLabel="Natural language workout instruction"
                accessibilityHint="Type an instruction like 'Make Friday heavier'"
                maxLength={500}
              />
            </View>
            <GlassButton
              label="Apply"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading || instruction.trim().length < 3}
              variant="primary"
              icon="sparkles"
              hapticType="medium"
              style={styles.applyBtn}
              textStyle={styles.applyBtnText}
            />
          </View>

          {/* Error and summary are mutually exclusive — error takes precedence
              so the user sees what went wrong, not a stale success summary. */}
          {error.length > 0 ? (
            <Text style={styles.errorText} numberOfLines={2}>
              {error}
            </Text>
          ) : summary.length > 0 && !loading ? (
            <Text style={styles.summaryText} numberOfLines={2}>
              {summary}
            </Text>
          ) : null}

          {/* Example instruction chips (tap to prefill) */}
          {instruction.length === 0 && !loading && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.examplesScroll}
              contentContainerStyle={styles.examplesRow}
            >
              {EXAMPLE_INSTRUCTIONS.map((ex) => (
                <Pressable
                  key={ex}
                  onPress={() => {
                    setInstruction(ex);
                    haptics.selection();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Prefill: ${ex}`}
                  style={styles.exampleChip}
                >
                  <Text style={styles.exampleText} numberOfLines={1}>{ex}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </GlassCard>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const EXAMPLE_INSTRUCTIONS = [
  "Make Friday heavier",
  "Reduce to 45 minutes",
  "Replace barbell with dumbbells",
] as const;

const styles = StyleSheet.create({
  container: {
    marginBottom: rp(spacing.sm),
  },
  collapsedWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.sm),
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    minHeight: Math.max(rp(36), 44),
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(255, 107, 53, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.4)",
  },
  chipText: {
    color: colors.primary.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  summaryChip: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontStyle: "italic",
  },
  card: {
    backgroundColor: colors.glass.backgroundDark,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: rp(spacing.xs),
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  title: {
    color: colors.primary.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.bold),
    textTransform: "uppercase",
  },
  closeBtn: {
    width: Math.max(rw(36), 44),
    height: Math.max(rw(36), 44),
    alignItems: "center",
    justifyContent: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: rp(spacing.sm),
  },
  input: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    paddingVertical: rp(spacing.sm),
    minHeight: Math.max(rp(44), 44),
  },
  applyBtn: {
    minWidth: rw(100),
    minHeight: Math.max(rf(40), 44),
  },
  applyBtnText: {
    fontSize: rf(typography.fontSize.caption),
  },
  errorText: {
    color: colors.error.light,
    fontSize: rf(typography.fontSize.micro),
    marginTop: rp(spacing.xs),
  },
  summaryText: {
    color: colors.success.light,
    fontSize: rf(typography.fontSize.micro),
    marginTop: rp(spacing.xs),
  },
  examplesScroll: {
    marginTop: rp(spacing.sm),
  },
  examplesRow: {
    flexDirection: "row",
    gap: rp(spacing.xs),
    paddingRight: rp(spacing.md),
  },
  exampleChip: {
    backgroundColor: colors.glass.backgroundLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    minHeight: Math.max(rp(36), 36),
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  exampleText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
  },
});

export default NaturalLanguageEditBar;
