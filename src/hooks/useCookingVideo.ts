import { logger } from '../utils/logger';
import { useState, useEffect } from "react";
import {
  youtubeVideoService,
  CookingVideo,
} from "../services/youtubeVideoService";

export function useCookingVideo(mealName: string) {
  const [cookingVideo, setCookingVideo] = useState<CookingVideo | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  const searchForCookingVideo = async () => {
    try {
      setIsLoadingVideo(true);
      setVideoError(null);

      const result = await youtubeVideoService.searchCookingVideo(mealName);

      if (result.success && result.video) {
        setCookingVideo(result.video);
      } else {
        setVideoError(result.error || "No cooking video found");
      }
    } catch (error) {
      logger.error('Error searching cooking video', { error: String(error) });
      setVideoError("Failed to load cooking video");
    } finally {
      setIsLoadingVideo(false);
    }
  };

  useEffect(() => {
    searchForCookingVideo();
  }, [mealName]);

  return {
    cookingVideo,
    isLoadingVideo,
    videoError,
    searchForCookingVideo,
  };
}
