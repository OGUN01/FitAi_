import { act, renderHook, waitFor } from "@testing-library/react-native";

const mockSearchCookingVideo = jest.fn();

jest.mock("@/services/youtubeVideoService", () => ({
  youtubeVideoService: {
    searchCookingVideo: (...args: unknown[]) => mockSearchCookingVideo(...args),
  },
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

import { useCookingVideo } from "@/hooks/useCookingVideo";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

const firstVideo = {
  id: "first",
  title: "First recipe",
  author: "FitAI",
  lengthSeconds: 120,
  viewCount: 10,
  publishedText: "Today",
  thumbnails: [],
  description: "First",
};

const secondVideo = {
  ...firstVideo,
  id: "second",
  title: "Second recipe",
  description: "Second",
};

describe("useCookingVideo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ignores a stale result after the meal changes", async () => {
    const firstRequest = deferred<any>();
    const secondRequest = deferred<any>();
    mockSearchCookingVideo.mockImplementation((mealName: string) =>
      mealName === "First meal" ? firstRequest.promise : secondRequest.promise,
    );

    const { result, rerender } = renderHook(
      ({ mealName }) => useCookingVideo(mealName),
      { initialProps: { mealName: "First meal" } },
    );

    rerender({ mealName: "Second meal" });

    await act(async () => {
      secondRequest.resolve({ success: true, video: secondVideo });
      await secondRequest.promise;
    });

    await waitFor(() =>
      expect(result.current.cookingVideo).toEqual(secondVideo),
    );

    await act(async () => {
      firstRequest.resolve({ success: true, video: firstVideo });
      await firstRequest.promise;
    });

    expect(result.current.cookingVideo).toEqual(secondVideo);
    expect(result.current.isLoadingVideo).toBe(false);
  });

  it("coalesces repeated retry taps while the same search is in flight", async () => {
    const request = deferred<any>();
    mockSearchCookingVideo.mockReturnValue(request.promise);

    const { result } = renderHook(() => useCookingVideo("One meal"));

    act(() => {
      void result.current.searchForCookingVideo();
      void result.current.searchForCookingVideo();
    });

    expect(mockSearchCookingVideo).toHaveBeenCalledTimes(1);

    await act(async () => {
      request.resolve({ success: true, video: firstVideo });
      await request.promise;
    });
  });
});
