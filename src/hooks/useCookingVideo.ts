import { logger } from '../utils/logger';
import { useState, useEffect, useCallback, useRef } from "react";
import {
  youtubeVideoService,
  CookingVideo,
} from "../services/youtubeVideoService";

export function useCookingVideo(mealName: string) {
  const [cookingVideo, setCookingVideo] = useState<CookingVideo | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const inFlightMealRef = useRef<string | null>(null);

  const searchForCookingVideo = useCallback(async () => {
    const normalizedMealName = mealName.trim();

    if (!normalizedMealName) {
      if (mountedRef.current) {
        setCookingVideo(null);
        setVideoError(null);
        setIsLoadingVideo(false);
      }
      return;
    }

    if (inFlightMealRef.current === normalizedMealName) return;

    const requestId = ++requestIdRef.current;
    inFlightMealRef.current = normalizedMealName;

    try {
      if (mountedRef.current) {
        setIsLoadingVideo(true);
        setVideoError(null);
      }

      const result =
        await youtubeVideoService.searchCookingVideo(normalizedMealName);

      if (!mountedRef.current || requestId !== requestIdRef.current) return;

      if (result.success && result.video) {
        setCookingVideo(result.video);
      } else {
        setCookingVideo(null);
        setVideoError(result.error || "No cooking video found");
      }
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      logger.error("Error searching cooking video", { error: String(error) });
      setCookingVideo(null);
      setVideoError("Failed to load cooking video");
    } finally {
      if (requestId === requestIdRef.current) {
        inFlightMealRef.current = null;
        if (mountedRef.current) setIsLoadingVideo(false);
      }
    }
  }, [mealName]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      inFlightMealRef.current = null;
    };
  }, []);

  useEffect(() => {
    requestIdRef.current += 1;
    inFlightMealRef.current = null;
    setCookingVideo(null);
    void searchForCookingVideo();

    return () => {
      requestIdRef.current += 1;
      inFlightMealRef.current = null;
    };
  }, [searchForCookingVideo]);

  return {
    cookingVideo,
    isLoadingVideo,
    videoError,
    searchForCookingVideo,
  };
}
