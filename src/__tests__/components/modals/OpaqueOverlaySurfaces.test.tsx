import React from "react";
import { Platform, StyleSheet, Text } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { BottomSheet } from "@/components/ui/aurora/BottomSheet";
import { GlassCard } from "@/components/ui/aurora/GlassCard";
import { LogoutConfirmationModal } from "@/components/profile/LogoutConfirmationModal";
import { SettingsSelectionModal } from "@/screens/main/profile/modals/SettingsSelectionModal";
import { ClearCacheConfirmModal } from "@/screens/main/profile/modals/ClearCacheConfirmModal";
import { surface, flatColors } from "@/theme/aurora-tokens";

jest.mock("@/utils/haptics", () => ({
  haptics: { trigger: jest.fn() },
}));

jest.mock("@/utils/crossPlatformAlert", () => ({
  crossPlatformAlert: jest.fn(),
}));

// Walks the rendered tree and returns the first node whose flattened style
// sets `backgroundColor` to `target`. GlassCard does NOT receive a `style`
// prop from any of these modals, so `card.props.style` is always undefined.
// The opaque surface actually lives INSIDE GlassView (rendered by GlassCard):
// on the Android/Web fallback path GlassView layers an absolute-fill <View>
// with backgroundColor: colors.background.secondary (opacity 0.85) over the
// container, which is what stops Android background content from bleeding
// through the modal. We force Platform.OS = 'android' to exercise that
// fallback path, then locate the opaque layer by its background color rather
// than by a non-existent style prop.
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

const expectGlassOpaqueSurface = (view: ReturnType<typeof render>) => {
  // Mount the GlassCard so the tree is populated, then locate the
  // absolute-fill View that carries the opaque background color. Platform.OS
  // is forced to 'android' in the surrounding describe's beforeEach so that
  // GlassView renders its opaque fallback path during render().
  view.UNSAFE_getByType(GlassCard);
  const opaqueLayer = findNodeByBackgroundColor(
    view.toJSON(),
    flatColors.backgroundSecondary,
  );

  expect(opaqueLayer).not.toBeNull();
  const style = StyleSheet.flatten(
    (opaqueLayer as { props: { style?: unknown } }).props.style as never,
  );
  // Opaque = a solid background color layered at <= 1 opacity over the
  // blur container, which is what prevents Android content bleed-through.
  expect(style.backgroundColor).toBe(flatColors.backgroundSecondary);
  expect(style.opacity).toBeGreaterThan(0);
  expect(style.opacity).toBeLessThanOrEqual(1);
};

const expectFlatOpaqueSurface = (view: ReturnType<typeof render>) => {
  // Aurora 2026 flat dialogs (no GlassCard): the dialog container itself is
  // the opaque surface, using the surface[2] token with no transparency.
  const opaqueLayer = findNodeByBackgroundColor(
    view.toJSON(),
    surface[2],
  );

  expect(opaqueLayer).not.toBeNull();
  const style = StyleSheet.flatten(
    (opaqueLayer as { props: { style?: unknown } }).props.style as never,
  );
  expect(style.backgroundColor).toBe(surface[2]);
  expect(style.opacity ?? 1).toBe(1);
};

describe("opaque overlay surfaces", () => {
  // The opaque background-secondary layer is only emitted on GlassView's
  // Android/Web fallback path, so force Android around every render in this
  // block. Restored in afterEach so the interaction describe below runs under
  // the default iOS platform.
  let platformSpy: ReturnType<typeof jest.replaceProperty> | null = null;
  beforeEach(() => {
    platformSpy = jest.replaceProperty(Platform, "OS", "android");
  });
  afterEach(() => {
    platformSpy?.restore();
    platformSpy = null;
  });

  it("makes the shared BottomSheet surface opaque", () => {
    const view = render(
      <BottomSheet visible onClose={jest.fn()} title="Sheet">
        <Text>Sheet content</Text>
      </BottomSheet>,
    );

    expectGlassOpaqueSurface(view);
  });

  it("makes the logout dialog surface opaque", () => {
    const view = render(
      <LogoutConfirmationModal
        visible
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expectGlassOpaqueSurface(view);
  });

  it("makes the settings-selection surface opaque", () => {
    const view = render(
      <SettingsSelectionModal
        visible
        title="Units"
        icon="options-outline"
        iconColor="#00aaff"
        options={[
          {
            value: "metric",
            label: "Metric",
            icon: "speedometer-outline",
          },
        ]}
        selectedValue="metric"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expectFlatOpaqueSurface(view);
  });

  it("makes the clear-cache confirmation surface opaque", () => {
    const view = render(
      <ClearCacheConfirmModal
        visible
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expectFlatOpaqueSurface(view);
  });
});

describe("opaque overlay interactions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("preserves BottomSheet close behavior", () => {
    const onClose = jest.fn();
    const view = render(
      <BottomSheet visible onClose={onClose} title="Sheet">
        <Text>Sheet content</Text>
      </BottomSheet>,
    );

    fireEvent.press(view.getByLabelText("Close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("preserves logout cancellation", () => {
    const onCancel = jest.fn();
    const view = render(
      <LogoutConfirmationModal
        visible
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.press(view.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("preserves logout confirmation", () => {
    const onConfirm = jest.fn();
    const view = render(
      <LogoutConfirmationModal
        visible
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );
    const signOutLabels = view.getAllByText("Sign Out");

    fireEvent.press(signOutLabels[signOutLabels.length - 1]);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("preserves settings selection", () => {
    const onSelect = jest.fn();
    const view = render(
      <SettingsSelectionModal
        visible
        title="Units"
        icon="options-outline"
        iconColor="#00aaff"
        options={[
          {
            value: "metric",
            label: "Metric",
            icon: "speedometer-outline",
          },
          {
            value: "imperial",
            label: "Imperial",
            icon: "speedometer-outline",
          },
        ]}
        selectedValue="metric"
        onSelect={onSelect}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(view.getByText("Imperial"));

    expect(onSelect).toHaveBeenCalledWith("imperial");
  });

  it("preserves settings close behavior", () => {
    const onClose = jest.fn();
    const view = render(
      <SettingsSelectionModal
        visible
        title="Units"
        icon="options-outline"
        iconColor="#00aaff"
        options={[
          {
            value: "metric",
            label: "Metric",
            icon: "speedometer-outline",
          },
        ]}
        selectedValue="metric"
        onSelect={jest.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.press(view.getByLabelText("Close Units"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("preserves clear-cache confirmation", async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const view = render(
      <ClearCacheConfirmModal
        visible
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );
    const clearCacheLabels = view.getAllByText("Clear Cache");

    fireEvent.press(clearCacheLabels[clearCacheLabels.length - 1]);

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it("preserves clear-cache cancellation", () => {
    const onCancel = jest.fn();
    const view = render(
      <ClearCacheConfirmModal
        visible
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.press(view.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
