/**
 * YouTab — S1 "You" ("Better than 2026" redesign).
 *
 * One focal question: "What should we call you?" Three answer-as-tap inputs:
 *   - Name: two underline-only inputs (premium, Notion/Linear style — no boxy borders)
 *   - Age: a horizontal slider with a big number readout (no keyboard)
 *   - Gender: 2×2 large tappable tiles with an accent ring on select
 * Pure black, brand-orange accent, QuestionHero + ScreenFrame + NavRail.
 *
 * Data wiring UNCHANGED: uses usePersonalInfoForm → updatePersonalInfo.
 * (wake_time/sleep_time/country/state moved to S6 Rhythm — not collected here.)
 */

import React, { useMemo, useCallback } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { hexToRgba, TINT_ALPHA_LOW } from "../../../utils/colors";
import {
  ScreenFrame,
  UnderlineInput,
  RangeSlider,
} from "../../../components/onboarding/aurora";
import { GENDER_OPTIONS } from "../../../components/onboarding/PersonalInfoConstants";
import { PersonalInfoData } from "../../../types/onboarding";
import { usePersonalInfoForm } from "../../../hooks/usePersonalInfoForm";

const ACCENT = colors.primary.DEFAULT;

interface YouTabProps {
  data: PersonalInfoData | null;
  onUpdate: (data: Partial<PersonalInfoData>) => void;
  onNext: () => void;
  onBack: () => void;
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
}

const fireSelection = () => Haptics.selectionAsync().catch(() => {});

export const YouTab: React.FC<YouTabProps> = ({
  data,
  onUpdate,
  onNext,
  onBack,
  isEditingFromReview,
  onReturnToReview,
}) => {
  const { state, actions } = usePersonalInfoForm({ data, onUpdate });
  const { formData } = state;

  // usePersonalInfoForm.updateField only updates local formData — it does NOT
  // call onUpdate (the hook syncs to the store only via a debounced auto-save
  // effect gated on `validationResult`, which this redesigned flow does not
  // pass). Bridge every field write to the parent store immediately so the
  // per-screen validation gate on Next sees the real values (CLAUDE.md "Store
  // is the Runtime Source — update the store immediately").
  const handleField = useCallback(
    <K extends keyof PersonalInfoData>(field: K, value: PersonalInfoData[K]) => {
      actions.updateField(field, value);
      onUpdate({ [field]: value } as Partial<PersonalInfoData>);
    },
    [actions, onUpdate],
  );

  // Live-validity for the Next gate (mirrors screenValidation screen 1 rules).
  const canAdvance = useMemo(() => {
    return (
      !!formData.first_name?.trim() &&
      !!formData.last_name?.trim() &&
      formData.age >= 13 &&
      formData.age <= 120 &&
      !!formData.gender // any of male/female/other/prefer_not_to_say satisfies the validator
    );
  }, [formData.first_name, formData.last_name, formData.age, formData.gender]);

  return (
    <ScreenFrame
      question="What should we call you?"
      reassurance="This takes about a minute."
      onBack={onBack}
      onNext={onNext}
      nextLabel={isEditingFromReview ? "Review" : "Next"}
      disabled={!canAdvance}
      isEditingFromReview={isEditingFromReview}
      onReturnToReview={onReturnToReview}
      bloomColor={ACCENT}
      testID="onboarding-you-tab"
    >
      {/* Name — two underline-only inputs */}
      <View style={styles.nameRow}>
        <UnderlineInput
          label="First name"
          value={formData.first_name}
          onChangeText={(t) => handleField("first_name", t)}
          placeholder="John"
          accentColor={ACCENT}
          testID="onboarding-first-name"
        />
        <View style={styles.nameGap} />
        <UnderlineInput
          label="Last name"
          value={formData.last_name}
          onChangeText={(t) => handleField("last_name", t)}
          placeholder="Doe"
          accentColor={ACCENT}
          testID="onboarding-last-name"
        />
      </View>

      {/* Age — slider with live bubble (no keyboard) */}
      <View style={styles.ageBlock}>
        <Text style={styles.fieldLabel}>Age</Text>
        <View style={styles.ageReadoutRow}>
          <Text style={styles.ageReadout}>
            {formData.age > 0 ? formData.age : "—"}
          </Text>
          <Text style={styles.ageUnit}>yrs</Text>
        </View>
        <RangeSlider
          value={formData.age > 0 ? formData.age : 25}
          min={13}
          max={120}
          step={1}
          onChange={(v) => handleField("age", v)}
          accentColor={ACCENT}
          testID="onboarding-age-slider"
        />
        <Text style={styles.ageHint}>Slide to set — 13 to 120</Text>
      </View>

      {/* Gender — 2×2 tiles */}
      <View>
        <Text style={styles.fieldLabel}>Gender</Text>
        <View style={styles.genderGrid}>
          {GENDER_OPTIONS.map((opt) => (
            <GenderTile
              key={opt.value}
              label={opt.label}
              icon={opt.iconName}
              selected={formData.gender === opt.value}
              accentColor={ACCENT}
              onPress={() => {
                fireSelection();
                handleField("gender", opt.value as PersonalInfoData["gender"]);
              }}
            />
          ))}
        </View>
      </View>
    </ScreenFrame>
  );
};

// ── Gender tile ────────────────────────────────────────────────────────────
interface GenderTileProps {
  label: string;
  icon: string;
  selected: boolean;
  accentColor: string;
  onPress: () => void;
}

const GenderTile: React.FC<GenderTileProps> = ({ label, icon, selected, accentColor, onPress }) => {
  const scale = useSharedValue(1);
  React.useEffect(() => {
    scale.value = withSpring(selected ? 1.03 : 1, { damping: 14, stiffness: 150 });
  }, [selected]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const selectedBg = hexToRgba(accentColor, TINT_ALPHA_LOW);

  return (
    <Animated.View style={[styles.genderTileWrap, animStyle]}>
      <Pressable
        onPress={onPress}
        style={[
          styles.genderTile,
          selected
            ? { backgroundColor: selectedBg, borderColor: accentColor }
            : { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.08)" },
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
      >
        <Ionicons
          name={icon as React.ComponentProps<typeof Ionicons>["name"]}
          size={26}
          color={selected ? accentColor : colors.text.secondary}
          style={styles.genderIcon}
        />
        <Text
          style={[styles.genderLabel, { color: selected ? colors.text.primary : colors.text.secondary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  nameRow: {
    flexDirection: "row",
  },
  nameGap: {
    width: spacing.md,
  },
  fieldLabel: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    lineHeight: typography.variants.caption.fontSize * typography.variants.caption.lineHeight,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  ageBlock: {
    gap: spacing.xs,
  },
  ageReadoutRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
  },
  ageReadout: {
    fontFamily: typography.variants.heroStat.fontFamily,
    fontSize: typography.variants.heroStat.fontSize,
    lineHeight: typography.variants.heroStat.fontSize * typography.variants.heroStat.lineHeight,
    color: colors.text.primary,
  },
  ageUnit: {
    fontFamily: typography.variants.body.fontFamily,
    fontSize: typography.variants.body.fontSize,
    color: colors.text.tertiary,
  },
  ageHint: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    color: colors.text.tertiary,
  },
  genderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  genderTileWrap: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  genderTile: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    minHeight: 92,
  },
  genderIcon: {
    marginBottom: spacing.xs,
  },
  genderLabel: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: typography.variants.cardHeadline.fontSize,
    lineHeight: typography.variants.cardHeadline.fontSize * typography.variants.cardHeadline.lineHeight,
  },
});

export default YouTab;
