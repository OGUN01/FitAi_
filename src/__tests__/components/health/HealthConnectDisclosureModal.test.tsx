import React from "react";
import { Platform, StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { HealthConnectDisclosureModal } from "@/components/health/HealthConnectDisclosureModal";
import { GlassCard } from "@/components/ui/aurora/GlassCard";
import { flatColors as colors } from "@/theme/aurora-tokens";

jest.mock("@/utils/haptics", () => ({
  haptics: {
    light: jest.fn(),
    medium: jest.fn(),
  },
}));

// Walks the rendered tree and returns the first node whose flattened style
// sets `backgroundColor` to `target`. GlassCard does NOT receive a `style`
// prop from HealthConnectDisclosureModal, so `dialogCard.props.style` is
// always undefined. The opaque surface actually lives INSIDE GlassView
// (rendered by GlassCard): on the Android/Web fallback path GlassView layers
// an absolute-fill <View> with backgroundColor: colors.background.secondary
// (opacity 0.85) over the container, which is what stops Android background
// content from bleeding through the modal. We force Platform.OS = 'android'
// to exercise that fallback path, then locate the opaque layer by its
// background color rather than by a non-existent style prop.
const findNodeByBackgroundColor = (
  node: unknown,
  target: string,
): Record<string, unknown> | null => {
  if (!node || typeof node !== "object") return null;
  const n = node as { props?: { style?: unknown }; children?: unknown[] };
  const style = StyleSheet.flatten(n.props?.style as never);
  if (style && style.backgroundColor === target) {
    return n as Record<string, unknown>;
  }
  for (const child of n.children ?? []) {
    const found = findNodeByBackgroundColor(child, target);
    if (found) return found;
  }
  return null;
};

describe("HealthConnectDisclosureModal", () => {
  it("uses an opaque surface so Android background content cannot bleed through", () => {
    // The opaque background-secondary layer is only emitted on GlassView's
    // Android/Web fallback path, so force Android here.
    const platformSpy = jest.replaceProperty(Platform, "OS", "android");
    try {
      const view = render(
        <HealthConnectDisclosureModal
          visible
          onAcknowledge={jest.fn()}
          onDismiss={jest.fn()}
        />,
      );

      // Mount the GlassCard so the tree is populated, then locate the
      // absolute-fill View that carries the opaque background color.
      view.UNSAFE_getByType(GlassCard);
      const opaqueLayer = findNodeByBackgroundColor(
        view.toJSON(),
        colors.backgroundSecondary,
      );

      expect(opaqueLayer).not.toBeNull();
      const style = StyleSheet.flatten(
        (opaqueLayer as { props: { style?: unknown } }).props.style as never,
      );
      // Opaque = a solid background color layered at < 1 opacity over the
      // blur container, which is what prevents Android content bleed-through.
      expect(style.backgroundColor).toBe(colors.backgroundSecondary);
      expect(style.opacity).toBeGreaterThan(0);
      expect(style.opacity).toBeLessThanOrEqual(1);
    } finally {
      platformSpy.restore();
    }
  });

  it("dismisses from the secondary action", () => {
    const onDismiss = jest.fn();
    const view = render(
      <HealthConnectDisclosureModal
        visible
        onAcknowledge={jest.fn()}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(view.getByText("Not now"));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("acknowledges from the primary action", () => {
    const onAcknowledge = jest.fn();
    const view = render(
      <HealthConnectDisclosureModal
        visible
        onAcknowledge={onAcknowledge}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent.press(view.getByText("Acknowledge & continue"));

    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });
});
