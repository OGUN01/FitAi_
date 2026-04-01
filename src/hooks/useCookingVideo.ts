import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from "react";
import {
  youtubeVideoService,
  CookingVideo,
} from "../services/youtubeVideoService";

export function useCookingVideo(mealName: string) {
  const [cookingVideo, setCookingVideo] = useState<CookingVideo | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  const searchForCookingVideo = useCallback(async () => {
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
  }, [mealName]);

  useEffect(() => {
    if (!mealName) return;
    let isMounted = true;
    const search = async () => {
      try {
        setIsLoadingVideo(true);
        setVideoError(null);
        const result = await youtubeVideoService.searchCookingVideo(mealName);
        if (!isMounted) return;
        if (result.success && result.video) {
          setCookingVideo(result.video);
        } else {
          setVideoError(result.error || "No cooking video found");
        }
      } catch (error) {
        if (!isMounted) return;
        logger.error('Error searching cooking video', { error: String(error) });
        setVideoError("Failed to load cooking video");
      } finally {
        if (isMounted) setIsLoadingVideo(false);
      }
    };
    search();
    return () => { isMounted = false; };
  }, [mealName]);

  return {
    cookingVideo,
    isLoadingVideo,
    videoError,
    searchForCookingVideo,
  };
}
