import React from "react";
import { StyleSheet } from "react-native";
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

describe("HealthConnectDisclosureModal", () => {
  it("uses an opaque surface so Android background content cannot bleed through", () => {
    const view = render(
      <HealthConnectDisclosureModal
        visible
        onAcknowledge={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    const dialogCard = view.UNSAFE_getByType(GlassCard);

    expect(StyleSheet.flatten(dialogCard.props.style)).toMatchObject({
      backgroundColor: colors.backgroundSecondary,
    });
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
