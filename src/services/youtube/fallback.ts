import { VideoSearchResult } from "./types";

export function getFallbackDemoVideo(mealName: string): VideoSearchResult {
  const fallbackVideos = [
    {
      id: "ChVUKq4RXJ0",
      title: `How to Make ${mealName} - Basic Cooking Skills`,
      author: "FitAI Cooking Guide",
      lengthSeconds: 420,
      viewCount: 1250000,
      publishedText: "1 week ago",
      thumbnails: [
        {
          url: "https://img.youtube.com/vi/ChVUKq4RXJ0/mqdefault.jpg",
          width: 320,
          height: 180,
        },
      ],
      description: `Learn fundamental cooking techniques to prepare ${mealName}. This tutorial covers basic cooking skills every home chef should know.`,
    },
    {
      id: "ZJy1ajvMU1k",
      title: `${mealName} - Essential Cooking Techniques`,
      author: "FitAI Kitchen",
      lengthSeconds: 380,
      viewCount: 2100000,
      publishedText: "3 days ago",
      thumbnails: [
        {
          url: "https://img.youtube.com/vi/ZJy1ajvMU1k/mqdefault.jpg",
          width: 320,
          height: 180,
        },
      ],
      description: `Master the essential techniques needed to create ${mealName}. Perfect for beginners and intermediate cooks.`,
    },
  ];

  const randomVideo =
    fallbackVideos[Math.floor(Math.random() * fallbackVideos.length)];

  console.log(`🎬 Using fallback demo video: ${randomVideo.title}`);
  return {
    success: true,
    video: randomVideo,
  };
}
