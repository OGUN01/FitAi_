import { Share } from "react-native";

jest.mock("../../services/workoutTemplateService", () => ({
  workoutTemplateService: { forkTemplate: jest.fn() },
}));

jest.mock("../../services/authUtils", () => ({
  requireUserId: jest.fn(),
}));

import {
  openShareSheet,
  shareTemplate,
} from "../../services/templateShareService";

describe("templateShareService system handoff", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shares a recipient-safe HTTPS template link through the native share sheet", async () => {
    const share = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: Share.sharedAction });

    const link = await shareTemplate("template-42", "Leg Day");

    expect(link).toBe("https://fitai.app/template/template-42");
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Share FitAI workout",
        url: link,
        message: expect.stringContaining(link),
      }),
    );
  });

  it("treats dismissing the native share sheet as cancellation", async () => {
    jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: Share.dismissedAction });

    await expect(
      openShareSheet("Try this workout", "https://fitai.app/template/1"),
    ).resolves.toBe(false);

    await expect(shareTemplate("1", "Quick Workout")).resolves.toBeNull();
  });

  it("propagates a native handoff failure so the caller can show recovery UI", async () => {
    const error = new Error("Share service unavailable");
    jest.spyOn(Share, "share").mockRejectedValue(error);
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      openShareSheet("Try this workout", "https://fitai.app/template/1"),
    ).rejects.toBe(error);
  });
});
