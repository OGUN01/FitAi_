import React from "react";
import { StyleSheet, Text } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { BottomSheet } from "@/components/ui/aurora/BottomSheet";
import { LogoutConfirmationModal } from "@/components/profile/LogoutConfirmationModal";
import { SettingsSelectionModal } from "@/screens/main/profile/modals/SettingsSelectionModal";
import { ClearCacheConfirmModal } from "@/screens/main/profile/modals/ClearCacheConfirmModal";
import { surface } from "@/theme/aurora-tokens";

jest.mock("@/utils/haptics", () => ({
  haptics: { trigger: jest.fn() },
}));

jest.mock("@/utils/crossPlatformAlert", () => ({
  crossPlatformAlert: jest.fn(),
}));

// Walks the rendered tree and returns the first node whose flattened style
// sets `backgroundColor` to `target`. GlassCard (used by BottomSheet) and the
// other dialogs here all render a flat, always-opaque surface View directly —
// no blur, no platform-specific fallback layer to force Platform.OS for.
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
  it("makes the shared BottomSheet surface opaque", () => {
    // GlassCard (which BottomSheet renders at elevation={6}) is now itself a
    // flat, always-opaque surface[2] View on every platform — no more
    // Android/Web-only blur fallback to force Platform.OS for.
    const view = render(
      <BottomSheet visible onClose={jest.fn()} title="Sheet">
        <Text>Sheet content</Text>
      </BottomSheet>,
    );

    expectFlatOpaqueSurface(view);
  });

  it("makes the logout dialog surface opaque", () => {
    const view = render(
      <LogoutConfirmationModal
        visible
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    // LogoutConfirmationModal migrated to a flat surface[2] dialog (matching
    // the ClearCacheConfirmModal/SettingsSelectionModal pattern) — no GlassCard.
    expectFlatOpaqueSurface(view);
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

  it("ignores repeated clear-cache confirmation while the first request is pending", async () => {
    let resolveConfirm: (() => void) | undefined;
    const onConfirm = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    const view = render(
      <ClearCacheConfirmModal
        visible
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );
    const clearCacheLabels = view.getAllByText("Clear Cache");
    const confirmButton = clearCacheLabels[clearCacheLabels.length - 1];

    fireEvent.press(confirmButton);
    fireEvent.press(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await act(async () => resolveConfirm?.());
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
