/**
 * ScreenFrame — the shared layout shell for every redesigned onboarding screen.
 *
 * Pure OLED black, a QuestionHero at the top (left-aligned), a ScrollView body
 * for the ≤3 answer controls, and the NavRail footer (Back/Next). This keeps
 * each of the 7 screens to ~60 lines of actual content — the chrome lives here.
 *
 * Presentational only. The screen passes its store-driven accent + question +
 * the body content + the NavRail props (onBack/onNext/disabled/bloom).
 */

import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../../../theme/aurora-tokens";
import { QuestionHero } from "./QuestionHero";
import { NavRail } from "./NavRail";

export interface ScreenFrameProps {
  question: string;
  reassurance?: string;
  /** NavRail next/back wiring. */
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  disabled?: boolean;
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
  /** Accent for the NavRail bloom burst. */
  bloomColor?: string;
  /** When true, hides the NavRail Next button — for screens that render their
   *  own primary CTA in the body (e.g. the Plan screen's gradient CTA). */
  hideNext?: boolean;
  /** The ≤3 answer controls. */
  children: React.ReactNode;
  /** Optional content to render below the hero but above the body (e.g. a
   *  live readout). */
  headerExtra?: React.ReactNode;
  testID?: string;
}

export const ScreenFrame: React.FC<ScreenFrameProps> = ({
  question,
  reassurance,
  onBack,
  onNext,
  nextLabel,
  disabled,
  isEditingFromReview,
  onReturnToReview,
  bloomColor,
  hideNext,
  children,
  headerExtra,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container} testID={testID}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kav}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <QuestionHero question={question} reassurance={reassurance} />
          {headerExtra}
          <View style={styles.body}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View
        style={[
          styles.footer,
          { paddingBottom: Platform.OS === "ios" ? spacing.lg : Math.max(insets.bottom, spacing.lg) },
        ]}
      >
        <NavRail
          onBack={onBack}
          onNext={onNext}
          nextLabel={nextLabel}
          disabled={disabled}
          isEditingFromReview={isEditingFromReview}
          onReturnToReview={onReturnToReview}
          bloomColor={bloomColor}
          hideNext={hideNext}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT, // OLED black
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
