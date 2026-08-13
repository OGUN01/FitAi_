/**
 * ScreenScaffold — the per-screen frame (docs/onboarding-fresh-design.md)
 *
 * Renders: big question (question type) top-left, optional subtext (body),
 * a flex-1 ScrollView (screenPad horizontal, qGap top, contentContainer
 * paddingBottom 40) with the children, then a footer with a Back ghost
 * button (ink2 text) and the primary Next button.
 *
 * Primary Next: flex-1 ("full-width minus back"), height 56, borderRadius 16,
 * background accent, label Manrope 700 16px color #050505. Disabled:
 * background hairline, label ink3. This is the ONE place a solid accent fill
 * is allowed in the entire onboarding re-skin.
 */

import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleProp,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens, type as typeScale, font, spacing } from "./tokens";
import { AuroraSpinner } from "../../ui/aurora/AuroraSpinner";

const PRESS_DURATION = 120;

export interface ScreenScaffoldProps {
  /** The big screen question (top-left). */
  question: string;
  /** Optional helper subtext under the question. */
  subtext?: string;
  children: React.ReactNode;
  /** Omit to hide the Back ghost button (Next goes full width). */
  onBack?: () => void;
  /** Omit to hide the footer buttons entirely (e.g. final summary screens). */
  onNext?: () => void;
  /** @default "Next" */
  nextLabel?: string;
  nextDisabled?: boolean;
  /**
   * Shows an inline AuroraSpinner in place of the label and disables
   * interaction — mirrors GlassButton's `loading` prop (same spinner
   * component, same disable-on-loading semantics) for the one bespoke
   * button in the onboarding re-skin that isn't GlassButton itself.
   * @default false
   */
  nextLoading?: boolean;
  /** Optional note rendered above the footer buttons (e.g. caption fine print). */
  footerNote?: React.ReactNode;
  /** Extra container style. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ScreenScaffold: React.FC<ScreenScaffoldProps> = ({
  question,
  subtext,
  children,
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled = false,
  nextLoading = false,
  footerNote,
  style,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const nextOpacity = useSharedValue(1);
  const backOpacity = useSharedValue(1);

  const nextAnimStyle = useAnimatedStyle(() => ({
    opacity: nextOpacity.value,
  }));
  const backAnimStyle = useAnimatedStyle(() => ({
    opacity: backOpacity.value,
  }));

  const showFooter = !!onNext || !!onBack;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top > 0 ? insets.top : spacing.l },
        style,
      ]}
      testID={testID}
    >
      {/* Header + content share one scroll surface so a wrapped/localized
          question cannot squeeze the form out of a short landscape viewport. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <Text style={styles.question}>{question}</Text>
          {subtext && <Text style={styles.subtext}>{subtext}</Text>}
        </View>
        {children}
        {footerNote && <View style={styles.footerNote}>{footerNote}</View>}
      </ScrollView>

      {/* Footer */}
      {showFooter && (
        <View
          style={[
            styles.footer,
            {
              paddingBottom:
                insets.bottom > 0 ? insets.bottom + spacing.s : spacing.l,
            },
          ]}
        >
          <View style={styles.footerRow}>
            {onBack && (
              <Pressable
                onPress={onBack}
                onPressIn={() => {
                  backOpacity.value = withTiming(0.6, { duration: PRESS_DURATION });
                }}
                onPressOut={() => {
                  backOpacity.value = withTiming(1, { duration: PRESS_DURATION });
                }}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Animated.View style={[styles.backButton, backAnimStyle]}>
                  <Text style={styles.backLabel}>Back</Text>
                </Animated.View>
              </Pressable>
            )}
            {onNext && (
              <Pressable
                onPress={nextDisabled || nextLoading ? undefined : onNext}
                onPressIn={() => {
                  if (!nextDisabled && !nextLoading) {
                    nextOpacity.value = withTiming(0.85, { duration: PRESS_DURATION });
                  }
                }}
                onPressOut={() => {
                  nextOpacity.value = withTiming(1, { duration: PRESS_DURATION });
                }}
                disabled={nextDisabled || nextLoading}
                accessibilityRole="button"
                accessibilityState={{ disabled: nextDisabled || nextLoading, busy: nextLoading }}
                accessibilityLabel={nextLabel}
                style={styles.nextWrap}
              >
                <Animated.View
                  style={[
                    styles.nextButton,
                    nextDisabled && styles.nextButtonDisabled,
                    nextAnimStyle,
                  ]}
                >
                  {nextLoading ? (
                    <AuroraSpinner customSize={20} theme="dark" />
                  ) : (
                    <Text
                      style={[
                        styles.nextLabel,
                        nextDisabled && styles.nextLabelDisabled,
                      ]}
                    >
                      {nextLabel}
                    </Text>
                  )}
                </Animated.View>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  header: {
    marginBottom: spacing.qGap,
  },
  question: {
    ...typeScale.question,
  },
  subtext: {
    ...typeScale.body,
    marginTop: spacing.m,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPad,
    paddingTop: spacing.s,
    paddingBottom: 40,
  },
  footer: {
    paddingHorizontal: spacing.screenPad,
    paddingTop: spacing.m,
    backgroundColor: tokens.bg,
  },
  footerNote: {
    marginTop: spacing.l,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    minHeight: spacing.rowH,
    justifyContent: "center",
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    marginRight: spacing.s,
  },
  backLabel: {
    ...typeScale.body,
    fontSize: 16,
  },
  nextWrap: {
    flex: 1,
  },
  nextButton: {
    flex: 1,
    minHeight: spacing.rowH,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    borderRadius: 16,
    backgroundColor: tokens.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonDisabled: {
    backgroundColor: tokens.hairline,
  },
  nextLabel: {
    fontFamily: font.bold,
    fontSize: 16,
    color: tokens.bg,
  },
  nextLabelDisabled: {
    color: tokens.ink3,
  },
});

export default ScreenScaffold;
