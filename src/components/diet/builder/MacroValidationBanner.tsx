/**
 * MacroValidationBanner — InlineValidationBanner's shell, real diet content.
 *
 * Identical shell (severity tint + left strip + collapsed "N warnings"
 * summary + expand + one-tap fixAction) but wired to the already-built
 * customDietProjection output via mealBuilderValidation.ts instead of new
 * logic:
 *  - BELOW_ABSOLUTE_MINIMUM / BELOW_BMR -> error, fixAction "Add more food"
 *  - MACRO_FLOOR -> warning
 *  - GOAL_DIRECTION_CONFLICT -> warning (no projected date shown — see
 *    NutritionInsightsPanel, which owns the direction guard for the date)
 *  - Clean state -> the same "Plan looks balanced" pill, unchanged
 *
 * Takes `warnings`/`hasValidationRun` as PROPS (screen-local state) rather
 * than subscribing to dietBuilderStore.validationWarnings directly: that
 * store field is typed as the generic ValidationResult[] shape (mirroring
 * workoutBuilderStore), while mealBuilderValidation.ts's
 * DietValidationWarning[] carries severity + fixAction the banner needs to
 * render. The screen still calls store.setValidationWarnings with a mapped
 * ValidationResult[] to keep that field's "held here" contract intact for
 * any other consumer — this component just reads the richer shape directly.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, type TextStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { haptics } from "../../../utils/haptics";
import { hexToRgba } from "../../../utils/colors";
import type { DietValidationWarning } from "../../../services/mealBuilderValidation";
import { colors, spacing, borderRadius, typography } from "../../../theme/aurora-tokens";
import { rp, rf, rw } from "../../../utils/responsive";

const fw = (w: typeof typography.fontWeight[keyof typeof typography.fontWeight]): TextStyle["fontWeight"] =>
  String(w) as TextStyle["fontWeight"];

interface SeverityStyle {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}

const SEVERITY_STYLES: Record<DietValidationWarning["severity"], SeverityStyle> = {
  info: { color: colors.info.DEFAULT, icon: "information-circle-outline", tint: hexToRgba(colors.info.DEFAULT, 0.12) },
  warning: { color: colors.warning.DEFAULT, icon: "warning-outline", tint: hexToRgba(colors.warning.DEFAULT, 0.12) },
  error: { color: colors.error.DEFAULT, icon: "alert-circle-outline", tint: hexToRgba(colors.error.DEFAULT, 0.12) },
};

export interface MacroValidationBannerProps {
  warnings: DietValidationWarning[];
  hasValidationRun: boolean;
  onFixAction: (warning: DietValidationWarning) => void;
}

export const MacroValidationBanner: React.FC<MacroValidationBannerProps> = ({
  warnings,
  hasValidationRun,
  onFixAction,
}) => {
  const [expanded, setExpanded] = useState(false);

  const prevIdsRef = useRef<Set<string>>(new Set(warnings.map((w) => w.id)));
  useEffect(() => {
    const currentIds = new Set(warnings.map((w) => w.id));
    const prevIds = prevIdsRef.current;
    const hasNew = [...currentIds].some((id) => !prevIds.has(id));
    if (hasNew && warnings.length > 0) {
      haptics.warning();
    } else if (prevIds.size > 0 && warnings.length === 0) {
      haptics.success();
    }
    prevIdsRef.current = currentIds;
  }, [warnings]);

  if (warnings.length === 0) {
    return (
      <Animated.View entering={FadeInDown.springify()} style={styles.emptyWrap}>
        <View style={styles.balancedChip}>
          <Ionicons
            name={hasValidationRun ? "checkmark-circle" : "time-outline"}
            size={rf(14)}
            color={hasValidationRun ? colors.success.DEFAULT : colors.text.secondary}
          />
          <Text style={styles.balancedText}>
            {hasValidationRun ? "Plan looks balanced" : "Validation pending"}
          </Text>
        </View>
      </Animated.View>
    );
  }

  const topWarning = warnings[0];
  const topSeverity = SEVERITY_STYLES[topWarning.severity];
  const errorCount = warnings.filter((w) => w.severity === "error").length;
  const warningCount = warnings.filter((w) => w.severity === "warning").length;

  const headerLabel =
    errorCount > 0
      ? `${errorCount} error${errorCount > 1 ? "s" : ""}${warningCount > 0 ? ` · ${warningCount} warning${warningCount > 1 ? "s" : ""}` : ""}`
      : `${warnings.length} warning${warnings.length > 1 ? "s" : ""}`;

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.container}>
      <View style={styles.card}>
        <Pressable
          onPress={() => {
            haptics.selection();
            setExpanded((e) => !e);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Validation: ${headerLabel}. ${expanded ? "Collapse" : "Expand"} for details.`}
          accessibilityState={{ expanded }}
          style={styles.header}
        >
          <View style={[styles.severityDot, { backgroundColor: topSeverity.color }]} />
          <Ionicons name={topSeverity.icon} size={rf(18)} color={topSeverity.color} />
          <Text style={styles.headerLabel} numberOfLines={1}>
            {headerLabel}
          </Text>
          <Text style={styles.topMessage} numberOfLines={2}>
            {topWarning.message}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
            size={rf(16)}
            color={colors.text.tertiary}
            style={styles.chevron}
          />
        </Pressable>

        {expanded && (
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            scrollEnabled={warnings.length > 3}
            nestedScrollEnabled
          >
            {warnings.map((w, idx) => {
              const style = SEVERITY_STYLES[w.severity];
              return (
                <Animated.View
                  key={w.id}
                  entering={FadeInDown.springify().delay(idx * 30)}
                  style={[styles.warningCard, { backgroundColor: style.tint }]}
                >
                  <View style={[styles.strip, { backgroundColor: style.color }]} />
                  <View style={styles.warningBody}>
                    <View style={styles.warningHeader}>
                      <Ionicons name={style.icon} size={rf(16)} color={style.color} />
                      <Text style={styles.warningMessage}>{w.message}</Text>
                    </View>
                    {w.fixAction && (
                      <GlassButton
                        label={w.fixAction.label}
                        onPress={() => {
                          haptics.selection();
                          onFixAction(w);
                        }}
                        variant={w.severity === "error" ? "error" : "warning"}
                        hapticType="light"
                        style={styles.fixBtn}
                        textStyle={styles.fixBtnText}
                      />
                    )}
                  </View>
                </Animated.View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: rp(spacing.sm) },
  emptyWrap: { marginBottom: rp(spacing.sm) },
  balancedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    alignSelf: "flex-start",
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.xs),
    minHeight: 44,
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.success.DEFAULT, 0.18),
    borderWidth: 1,
    borderColor: hexToRgba(colors.success.DEFAULT, 0.4),
  },
  balancedText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  card: {
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: rp(spacing.sm),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    minHeight: 44,
  },
  severityDot: { width: rw(6), height: rw(6), borderRadius: borderRadius.full, flexShrink: 0 },
  headerLabel: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.bold),
    flexShrink: 0,
  },
  topMessage: {
    flex: 1,
    flexShrink: 1,
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    marginLeft: rp(spacing.xs),
  },
  chevron: { marginLeft: rp(spacing.xs), flexShrink: 0 },
  listScroll: { marginTop: rp(spacing.sm), maxHeight: rp(240) },
  listContent: { gap: rp(spacing.xs) },
  warningCard: { flexDirection: "row", borderRadius: borderRadius.md, overflow: "hidden" },
  strip: { width: rw(4), alignSelf: "stretch" },
  warningBody: { flex: 1, padding: rp(spacing.sm), gap: rp(spacing.xs) },
  warningHeader: { flexDirection: "row", alignItems: "flex-start", gap: rp(spacing.xs) },
  warningMessage: {
    flex: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    lineHeight: rf(typography.fontSize.body) * typography.lineHeight.normal,
  },
  fixBtn: { alignSelf: "flex-start", minHeight: 40 },
  fixBtnText: { fontSize: rf(typography.fontSize.micro) },
});

export default MacroValidationBanner;
