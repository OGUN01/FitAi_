jest.mock("expo-file-system", () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: {
    Base64: "base64",
  },
}));

import * as FileSystem from "expo-file-system";
import {
  buildImageDataUrl,
  imageAssetToDataUrl,
  imageUriToDataUrl,
  resolveImageMimeType,
} from "../../utils/imageDataUrl";

const mockedReadAsStringAsync = jest.mocked(FileSystem.readAsStringAsync);

describe("imageDataUrl", () => {
  beforeEach(() => {
    mockedReadAsStringAsync.mockReset();
  });

  it("infers mime types from picker assets and file paths", () => {
    expect(
      resolveImageMimeType({
        uri: "file:///cache/label-scan.png",
        mimeType: null,
        fileName: "label-scan.png",
      }),
    ).toBe("image/png");
    expect(resolveImageMimeType("file:///cache/meal.jpeg")).toBe("image/jpeg");
  });

  it("reuses existing data URLs without reading from disk", async () => {
    const dataUrl = "data:image/jpeg;base64,abc123";

    await expect(imageUriToDataUrl(dataUrl)).resolves.toBe(dataUrl);
    expect(mockedReadAsStringAsync).not.toHaveBeenCalled();
  });

  it("reads image URIs from disk and builds a data URL", async () => {
    mockedReadAsStringAsync.mockResolvedValueOnce("encoded-image");

    await expect(
      imageUriToDataUrl("file:///cache/label.webp", null),
    ).resolves.toBe(buildImageDataUrl("encoded-image", "image/webp"));

    expect(mockedReadAsStringAsync).toHaveBeenCalledWith(
      "file:///cache/label.webp",
      { encoding: "base64" },
    );
  });

  it("falls back to the asset URI when the picker does not provide base64", async () => {
    mockedReadAsStringAsync.mockResolvedValueOnce("from-file");

    await expect(
      imageAssetToDataUrl({
        uri: "file:///cache/captured-label.jpg",
        mimeType: "image/jpeg",
        base64: undefined,
      }),
    ).resolves.toBe(buildImageDataUrl("from-file", "image/jpeg"));
  });

  it("rejects assets that do not contain image data", async () => {
    await expect(
      imageAssetToDataUrl({
        uri: null,
        mimeType: null,
        base64: "",
      }),
    ).rejects.toThrow("No image was captured. Please try again.");
  });
});
