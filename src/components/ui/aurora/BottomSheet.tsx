/**
 * BottomSheet Component
 * Shared glass bottom sheet for the Aurora design language.
 *
 * Replaces ~15 flat RN `Modal`s across the app (SetLogModal, MealDetailModal,
 * ProductDetailsModal, ExerciseInstructionModal, ExerciseSessionModal, edit
 * modals, DeloadModal) which each disagreed on animation type, backdrop
 * opacity, and dismissal pattern.
 *
 * Built only on already-installed deps (Reanimated 3, gesture-handler,
 * safe-area-context, expo-blur via GlassCard) — no new dependencies:
 *  - slide-up entrance via withSpring(animations.spring.smooth)
 *  - backdrop fade (Reanimated)
 *  - drag-to-dismiss gesture (pan down past threshold → close)
 *  - GlassCard surface (blur + border + elevation)
 *  - safe-area aware bottom inset
 *  - closeOnOverlayPress + hardware-back (Android) via onRequestClose
 *  - KeyboardAvoidingView for input sheets
 *
 * Uses the stock RN `Modal` as the portal with transparent presentation and
 * `animationType="none"` so Reanimated owns all motion (avoids the double
 * animation that react-native-modal would introduce).
 */

import React, { useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  ViewStyle,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal as RNModal,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  useAnimatedGestureHandler,
} from "react-native-reanimated";
import {
  GestureHandlerRootView,
  PanGestureHandler,
  type PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "./GlassCard";
import { colors, spacing, borderRadius, zIndex } from "../../../theme/aurora-tokens";
import { animations } from "../../../theme/animations";
import { haptics } from "../../../utils/haptics";
import { rp, rf } from "../../../utils/responsive";

// Resolve screen height lazily so the module is safe to import in environments
// where `Dimensions` is mocked away (e.g. jest test files that stub
// react-native with a minimal object). Mirrors the defensive pattern in
// utils/responsive.ts. Falls back to the reference device height (852).
const getScreenHeight = (): number => {
  try {
    return Dimensions.get("window").height;
  } catch {
    return 852;
  }
};
const DISMISS_THRESHOLD = 120; // px dragged before dismissing

export interface BottomSheetProps {
  /** Controls visibility. */
  visible: boolean;
  /** Close handler (overlay tap, drag-dismiss, hardware back, close button). */
  onClose: () => void;
  /** Sheet content. */
  children: React.ReactNode;
  /** Optional header title (renders the grabber + title row). */
  title?: string;
  /** Show a close (X) button in the header. @default true */
  showCloseButton?: boolean;
  /** Dismiss when the backdrop is tapped. @default true */
  closeOnOverlayPress?: boolean;
  /** Allow drag-down to dismiss. @default true */
  dismissOnDrag?: boolean;
  /** Maximum sheet height as a fraction of screen height. @default 0.9 */
  maxHeightFraction?: number;
  /** Extra content style. */
  contentStyle?: ViewStyle;
  /** Backdrop opacity (0–1). @default 0.6 */
  backdropOpacity?: number;
  /** Test ID. */
  testID?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  title,
  showCloseButton = true,
  closeOnOverlayPress = true,
  dismissOnDrag = true,
  maxHeightFraction = 0.9,
  contentStyle,
  backdropOpacity = 0.6,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(getScreenHeight());
  const backdropOpacitySV = useSharedValue(0);

  // Animate in/out when `visible` changes.
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, animations.spring.smooth);
      backdropOpacitySV.value = withTiming(backdropOpacity, {
        duration: animations.duration.normal,
      });
    } else {
      translateY.value = withTiming(getScreenHeight(), {
        duration: animations.duration.normal,
      });
      backdropOpacitySV.value = withTiming(0, {
        duration: animations.duration.normal,
      });
    }
  }, [visible, backdropOpacity, translateY, backdropOpacitySV]);

  const handleClose = useCallback(() => {
    haptics.trigger("light");
    onClose();
  }, [onClose]);

  // Drag-to-dismiss gesture.
  const gestureHandler =
    useAnimatedGestureHandler<
      PanGestureHandlerGestureEvent,
      { startY: number }
    >({
      onStart: (_, ctx) => {
        ctx.startY = translateY.value;
      },
      onActive: (event, ctx) => {
        // Only allow dragging DOWN (positive translation).
        translateY.value = Math.max(ctx.startY, ctx.startY + event.translationY);
      },
      onEnd: (event, _ctx) => {
        if (event.translationY > DISMISS_THRESHOLD) {
          translateY.value = withTiming(getScreenHeight(), {
            duration: animations.duration.normal,
          });
          runOnJS(handleClose)();
        } else {
          translateY.value = withSpring(0, animations.spring.smooth);
        }
      },
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacitySV.value,
  }));

  // Grabber opacity fades slightly as the sheet is dragged down.
  const grabberAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, DISMISS_THRESHOLD], [1, 0.4]),
  }));

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      testID={testID}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        {/* Animated backdrop. */}
        <Pressable
          onPress={closeOnOverlayPress ? handleClose : undefined}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View style={[styles.backdrop, backdropAnimatedStyle]} />
        </Pressable>

        <PanGestureHandler
          enabled={dismissOnDrag}
          onGestureEvent={gestureHandler}
        >
          <Animated.View
            style={[
              styles.sheetWrapper,
              {
                maxHeight: getScreenHeight() * maxHeightFraction,
                paddingBottom: insets.bottom || rp(spacing.md),
              },
              sheetAnimatedStyle,
            ]}
          >
            <GlassCard
              blurIntensity="heavy"
              elevation={6}
              padding="none"
              borderRadius="xxl"
              contentStyle={styles.sheetContent}
            >
              {/* Grabber */}
              <Animated.View style={[styles.grabberRow, grabberAnimatedStyle]}>
                <View style={styles.grabber} />
              </Animated.View>

              {/* Header */}
              {(title || showCloseButton) && (
                <View style={styles.header}>
                  {title ? (
                    <Animated.Text style={styles.title}>{title}</Animated.Text>
                  ) : (
                    <View />
                  )}
                  {showCloseButton ? (
                    <Pressable
                      onPress={handleClose}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel="Close"
                      style={styles.closeButton}
                    >
                      <Animated.Text style={styles.closeIcon}>✕</Animated.Text>
                    </Pressable>
                  ) : null}
                </View>
              )}

              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={[styles.content, contentStyle]}
              >
                {children}
              </KeyboardAvoidingView>
            </GlassCard>
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
  },
  sheetWrapper: {
    width: "100%",
    zIndex: zIndex.modal,
  },
  sheetContent: {
    backgroundColor: "transparent",
  },
  grabberRow: {
    alignItems: "center",
    paddingTop: rp(spacing.sm),
    paddingBottom: rp(spacing.xs),
  },
  grabber: {
    width: rp(40),
    height: rf(4),
    borderRadius: borderRadius.full,
    backgroundColor: colors.text.tertiary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rp(spacing.lg),
    paddingBottom: rp(spacing.sm),
  },
  title: {
    color: colors.text.primary,
    fontSize: rf(18),
    fontWeight: "700",
    flex: 1,
  },
  closeButton: {
    // 44x44 minimum touch target for accessibility compliance.
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass.background,
  },
  closeIcon: {
    color: colors.text.secondary,
    fontSize: rf(14),
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: rp(spacing.lg),
    paddingBottom: rp(spacing.lg),
  },
});

export default BottomSheet;
