import { resolveExerciseMedia } from "../../utils/resolveExerciseMedia";

// Real catalog exercise IDs (src/data/exerciseCatalog.generated.ts) chosen to
// cover each branch of the selection policy — not synthetic fixtures, so
// this also guards against the generator/ingest pipeline silently changing
// this data's shape.
const BOTH_GENDERS_ID = "0lQnxMZ"; // "weighted sissy squat" — male + female video
const MALE_ONLY_ID = "10Z2DXU"; // "sled 45° leg press" — video matched for men/ only
const FEMALE_ONLY_ID = "0mB6wHO"; // "runners stretch" — video matched for girl/ only
const GIF_ONLY_ID = "01qpYSe"; // "upward facing dog" — no video, exercisedb_gif only
const NO_MEDIA_ID = "arnold_press"; // standalone curated entry — media: []

describe("resolveExerciseMedia", () => {
  it("returns null for an unresolvable exerciseId", () => {
    expect(resolveExerciseMedia("not-a-real-id-xyz", "male")).toBeNull();
    expect(resolveExerciseMedia(undefined, "male")).toBeNull();
  });

  it("returns null when the catalog entry has no media at all", () => {
    expect(resolveExerciseMedia(NO_MEDIA_ID, "male")).toBeNull();
  });

  describe("gender matching", () => {
    it("picks the male video + its own poster for a male viewer", () => {
      const result = resolveExerciseMedia(BOTH_GENDERS_ID, "male");
      expect(result).not.toBeNull();
      expect(result!.type).toBe("3d_video");
      expect(result!.videoUrl).toContain("-male-video.mp4");
      expect(result!.posterUrl).toContain("-male-poster.jpg");
    });

    it("picks the female video + its own poster for a female viewer", () => {
      const result = resolveExerciseMedia(BOTH_GENDERS_ID, "female");
      expect(result).not.toBeNull();
      expect(result!.type).toBe("3d_video");
      expect(result!.videoUrl).toContain("-female-video.mp4");
      expect(result!.posterUrl).toContain("-female-poster.jpg");
    });

    it("never pairs a chosen video with the OTHER gender's poster", () => {
      const male = resolveExerciseMedia(BOTH_GENDERS_ID, "male");
      const female = resolveExerciseMedia(BOTH_GENDERS_ID, "female");
      expect(male!.posterUrl).not.toContain("-female-");
      expect(female!.posterUrl).not.toContain("-male-");
    });
  });

  describe("fallback when only one gender was matched", () => {
    it("still returns the available video for a female viewer when only a male video exists", () => {
      const result = resolveExerciseMedia(MALE_ONLY_ID, "female");
      expect(result).not.toBeNull();
      expect(result!.type).toBe("3d_video");
      expect(result!.videoUrl).toContain("-male-video.mp4");
    });

    it("still returns the available video for a male viewer when only a female video exists", () => {
      const result = resolveExerciseMedia(FEMALE_ONLY_ID, "male");
      expect(result).not.toBeNull();
      expect(result!.type).toBe("3d_video");
      expect(result!.videoUrl).toContain("-female-video.mp4");
    });
  });

  describe("neutral / unset gender", () => {
    it.each(["other", "prefer_not_to_say", null, undefined] as const)(
      "still resolves to a video (not the GIF) when a video exists at all — gender=%s",
      (gender) => {
        const result = resolveExerciseMedia(BOTH_GENDERS_ID, gender);
        expect(result).not.toBeNull();
        expect(result!.type).toBe("3d_video");
      },
    );
  });

  describe("no video available", () => {
    it("falls back to the exercisedb_gif entry", () => {
      const result = resolveExerciseMedia(GIF_ONLY_ID, "male");
      expect(result).not.toBeNull();
      expect(result!.type).toBe("exercisedb_gif");
      expect(result!.gifUrl).toContain("exercisedb.dev");
      expect(result!.videoUrl).toBeUndefined();
      expect(result!.posterUrl).toBeUndefined();
    });

    it("falls back to the GIF regardless of gender", () => {
      const result = resolveExerciseMedia(GIF_ONLY_ID, "female");
      expect(result!.type).toBe("exercisedb_gif");
    });
  });
});
