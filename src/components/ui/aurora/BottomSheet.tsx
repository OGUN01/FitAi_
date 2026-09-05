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
  KeyboardAvoidingView,
  Platform,
  Modal as RNModal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { rp, rf, dimensions } from "../../../utils/responsive";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

// Clamped screen height from responsive.ts (capped to 900 on web/tablet so the
// sheet sizes against the mobile design height, not a 1080px desktop window).
// NOTE: do NOT read `dimensions.screenHeight` at module load — several Jest
// suites mock `@/utils/responsive` without exporting `dimensions`, so the
// import is `undefined` at module-load and a top-level read throws. We read
// it lazily inside the component body via `getScreenHeight()` instead.
const getScreenHeight = (): number => dimensions.screenHeight;
const DISMISS_THRESHOLD = 120; // px dragged before dismissing

// Web-only, lazily-loaded — kept out of the native runtime path (require,
// not a static import, so native never needs `react-dom` to actually run;
// it's still resolvable in node_modules for bundling purposes since it's an
// existing project dependency, but native code never calls require() here
// because of the Platform.OS guard below).
//
// BUG FIX: the web scrim below used to be a plain `<View position:'fixed'>`
// rendered IN PLACE in the component tree (i.e. still a structural
// descendant of whatever screen mounted this BottomSheet). react-native-web
// gives every View an explicit `z-index: 0` (not `auto`), and
// `position:relative` + a non-auto z-index each establish a NEW stacking
// context — so a sheet opened from deep inside a screen's own render tree
// has its z-index compared only among ITS OWN ancestor's siblings, not
// globally. Confirmed empirically: even forcing the scrim's z-index to
// 99999 inline did NOT make it paint above the app's bottom tab bar when
// the sheet was opened via a cross-tab quick action (Home -> Barcode/Scan
// Label, which mounts the sheet inside the just-navigated-to Diet screen)
// — the tab bar's own branch of the tree sits in a later/higher-precedence
// sibling stacking context that no amount of LOCAL z-index can out-rank.
// The correct fix for "escape an ancestor's stacking context on web" is a
// real DOM portal — mounting the scrim as an actual sibling of the tab
// bar's own root instead of a structural descendant of the screen that
// opened it.
function getWebPortalRoot(): HTMLElement | null {
  if (Platform.OS !== "web" || typeof document === "undefined") return null;
  const existing = document.getElementById("aurora-bottom-sheet-portal-root");
  if (existing) return existing as HTMLElement;
  const root = document.createElement("div");
  root.id = "aurora-bottom-sheet-portal-root";
  document.body.appendChild(root);
  return root;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webCreatePortal: ((children: React.ReactNode, container: Element) => any) | null = null;
if (Platform.OS === "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    webCreatePortal = require("react-dom").createPortal;
  } catch (error) {
    // Fall back to in-place rendering (the previous, pre-portal behavior)
    // if react-dom is genuinely unavailable for any reason — never crash
    // the sheet over this.
    console.warn(
      "[BottomSheet] react-dom createPortal unavailable, falling back to in-place render:",
      error,
    );
  }
}

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
  const reducedMotion = useReducedMotion();
  // Lazy screen-height read — evaluated on first render, NOT at module load.
  const SCREEN_HEIGHT = getScreenHeight();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacitySV = useSharedValue(0);
  const reducedMotionSV = useSharedValue(reducedMotion);

  useEffect(() => {
    reducedMotionSV.value = reducedMotion;
  }, [reducedMotion, reducedMotionSV]);

  // Animate in/out when `visible` changes.
  useEffect(() => {
    if (visible) {
      translateY.value = reducedMotion ? 0 : withSpring(0, animations.spring.smooth);
      backdropOpacitySV.value = reducedMotion
        ? backdropOpacity
        : withTiming(backdropOpacity, { duration: animations.duration.normal });
    } else {
      translateY.value = reducedMotion
        ? SCREEN_HEIGHT
        : withTiming(SCREEN_HEIGHT, { duration: animations.duration.normal });
      backdropOpacitySV.value = reducedMotion
        ? 0
        : withTiming(0, { duration: animations.duration.normal });
    }
  }, [visible, backdropOpacity, translateY, backdropOpacitySV, reducedMotion, SCREEN_HEIGHT]);

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
          translateY.value = reducedMotionSV.value
            ? SCREEN_HEIGHT
            : withTiming(SCREEN_HEIGHT, { duration: animations.duration.normal });
          runOnJS(handleClose)();
        } else {
          translateY.value = reducedMotionSV.value
            ? 0
            : withSpring(0, animations.spring.smooth);
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

  const sheetBody = (
      <GestureHandlerRootView style={styles.gestureRoot}>
        {/* Animated backdrop. */}
        <Pressable
          onPress={closeOnOverlayPress ? handleClose : undefined}
          style={StyleSheet.absoluteFill}
          accessible={closeOnOverlayPress}
          accessibilityRole={closeOnOverlayPress ? "button" : undefined}
          accessibilityLabel={closeOnOverlayPress ? "Dismiss sheet" : undefined}
        >
          <Animated.View style={[styles.backdrop, backdropAnimatedStyle]} />
        </Pressable>

        {/* Sheet wrapper carries the slide-up/slide-down transform. The drag
            gesture (PanGestureHandler) wraps ONLY the grabber/header handle so
            the sheet content below stays a sibling of the gesture handler —
            otherwise react-native-gesture-handler does not bridge a11y to the
            content descendants on Android (SetLogModal RPE buttons/inputs were
            invisible to uiautomator). */}
        <Animated.View
          style={[
            styles.sheetWrapper,
            {
              maxHeight: SCREEN_HEIGHT * maxHeightFraction,
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
            // BUG FIX: without this, GlassCard/GlassView size their content
            // wrapper to its CONTENT's intrinsic height instead of the
            // definite height this sheetWrapper already provides via
            // maxHeight — so a tall caller (e.g. SetLogModal, whose content
            // wraps everything including its "Save set" footer in a
            // ScrollView) overflowed past the sheet's visible/scrollable
            // area entirely uncapped, making the footer button unreachable
            // by any scroll on web. sheetWrapper (the Animated.View this
            // GlassCard sits inside) DOES provide a definite bounded height
            // here — see its `maxHeight: SCREEN_HEIGHT * maxHeightFraction`
            // inline style above — satisfying fillHeight's documented
            // precondition.
            fillHeight
          >
            {/* Drag handle region — wrapped in PanGestureHandler so the
                grabber + header drive drag-to-dismiss. The content below is a
                sibling, not a descendant, so it bridges to the a11y tree. */}
            <PanGestureHandler
              enabled={dismissOnDrag}
              onGestureEvent={gestureHandler}
            >
              <Animated.View>
                {/* Grabber */}
                <Animated.View style={[styles.grabberRow, grabberAnimatedStyle]}>
                  <View style={styles.grabber} />
                </Animated.View>

                {/* Header */}
                {(title || showCloseButton) && (
                  <View style={styles.header}>
                    {title ? (
                      <Animated.Text style={styles.title} numberOfLines={2}>{title}</Animated.Text>
                    ) : (
                      <View />
                    )}
                    {showCloseButton ? (
                      <Pressable
                        onPress={handleClose}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        style={styles.closeButton}
                      >
                        <Ionicons
                          name="close"
                          size={rf(18)}
                          color={colors.text.secondary}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                )}
              </Animated.View>
            </PanGestureHandler>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={[styles.content, contentStyle]}
            >
              {children}
            </KeyboardAvoidingView>
          </GlassCard>
        </Animated.View>
      </GestureHandlerRootView>
  );

  // Web scrim-layering fix (mirrors CustomDialog.tsx's DialogShell): RN's
  // <Modal> portals into a body-level wrapper with z-index:auto on
  // react-native-web, so other in-app elements with zIndex>0 (RestTimer,
  // achievement toasts, builder chrome) can paint above a plain
  // Modal-based overlay. On web, bypass RNModal in favor of a fixed,
  // zIndex.modal wrapper; native keeps the real Modal (hardware back,
  // accessibility, hidden-until-shown a11y tree).
  if (Platform.OS === "web") {
    if (!visible) return null;
    const scrim = <View style={styles.webScrim}>{sheetBody}</View>;
    const portalRoot = getWebPortalRoot();
    if (webCreatePortal && portalRoot) {
      return webCreatePortal(scrim, portalRoot);
    }
    return scrim; // defensive fallback if portal setup failed
  }

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      testID={testID}
      statusBarTranslucent
    >
      {sheetBody}
    </RNModal>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  // Web-only (see the Platform.OS === "web" branch above). RN's ViewStyle
  // lacks 'fixed' — react-native-web passes it through to CSS untouched.
  webScrim: {
    position: "fixed" as unknown as ViewStyle["position"],
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: zIndex.modal,
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
    // Capped so the sheet reads as a deliberate, centered panel on tablets
    // instead of a phone sheet stretched edge-to-edge across a wide viewport
    // (responsive.ts already clamps font/padding scaling to a 480px design
    // reference — this keeps the container in step with that).
    maxWidth: 560,
    alignSelf: "center",
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
    height: 4,
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
    // Was a bare numeric-weight style ("700") with no `fontFamily` — a no-op
    // on RN (each Manrope weight is a separate font file) that fell back to
    // the system font stack for every BottomSheet title app-wide. Found via
    // a Stage 3 audit trace from the onboarding Medical & safety multiselect
    // sheet.
    fontFamily: "Manrope_700Bold",
    flex: 1,
    minWidth: 0,
    marginRight: rp(spacing.sm),
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
  content: {
    paddingHorizontal: rp(spacing.lg),
    paddingBottom: rp(spacing.lg),
  },
});

export default BottomSheet;
