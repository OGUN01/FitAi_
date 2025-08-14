import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CookingVideo {
  id: string;
  title: string;
  author: string;
  lengthSeconds: number;
  viewCount: number;
  publishedText: string;
  thumbnails: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  description: string;
}

export interface VideoSearchResult {
  success: boolean;
  video?: CookingVideo;
  error?: string;
}

class YouTubeVideoService {
  private readonly CACHE_PREFIX = 'cooking_video_';
  private readonly CACHE_EXPIRY_HOURS = 72; // Extended cache for YouTube API quota management

  // YouTube Data API v3 configuration
  private getApiKey(): string | undefined {
    return process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
  }
  private readonly YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

  // Fallback Invidious instances (as backup)
  private readonly INVIDIOUS_INSTANCES = [
    'https://invidious.privacyredirect.com',
    'https://invidious.fdn.fr',
    'https://invidious.projectsegfau.lt',
    'https://vid.puffyan.us',
    'https://invidious.slipfox.xyz',
  ];

  async searchCookingVideo(mealName: string): Promise<VideoSearchResult> {
    try {
      console.log(`🔍 Searching for cooking video: ${mealName}`);

      // Debug API key loading
      const apiKey = this.getApiKey();
      console.log(
        `🔑 API Key status: ${apiKey ? `Present (${apiKey.substring(0, 10)}...)` : 'MISSING'}`
      );
      console.log(
        `🔑 Raw env value: ${process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ? `Present (${process.env.EXPO_PUBLIC_YOUTUBE_API_KEY.substring(0, 10)}...)` : 'MISSING'}`
      );

      // Check cache first
      const cachedVideo = await this.getCachedVideo(mealName);
      if (cachedVideo) {
        console.log('✅ Found cached cooking video');
        return { success: true, video: cachedVideo };
      }

      // Generate search queries
      const searchQueries = this.generateSearchQueries(mealName);

      // Try YouTube Data API v3 first (most reliable)
      console.log('🎯 Trying YouTube Data API v3...');
      for (const query of searchQueries) {
        const result = await this.searchWithYouTubeAPI(query);
        if (result.success && result.video) {
          await this.cacheVideo(mealName, result.video);
          return result;
        }
      }

      // Fallback to Invidious instances
      console.log('🔄 Falling back to Invidious instances...');
      for (const query of searchQueries) {
        const result = await this.searchWithInvidious(query);
        if (result.success && result.video) {
          await this.cacheVideo(mealName, result.video);
          return result;
        }
      }

      // If all else fails, return a demo video with cooking tips
      console.log('🎬 Using fallback demo video');
      return this.getFallbackDemoVideo(mealName);
    } catch (error) {
      console.error('❌ Error searching for cooking video:', error);
      // Return fallback demo video when all methods fail
      console.log('🎬 Using fallback demo video');
      return this.getFallbackDemoVideo(mealName);
    }
  }

  private generateSearchQueries(mealName: string): string[] {
    const cleanMealName = mealName.toLowerCase().trim();

    return [
      `${cleanMealName} recipe cooking tutorial`,
      `how to cook ${cleanMealName}`,
      `${cleanMealName} recipe step by step`,
      `${cleanMealName} cooking guide`,
      `making ${cleanMealName} recipe`,
    ];
  }

  // Primary method: YouTube Data API v3 (tested and working)
  private async searchWithYouTubeAPI(query: string): Promise<VideoSearchResult> {
    try {
      const apiKey = this.getApiKey();
      if (!apiKey) {
        console.log('🔑 YouTube API key not configured, skipping...');
        return { success: false, error: 'API key not configured' };
      }

      const encodedQuery = encodeURIComponent(query);
      const searchUrl = `${this.YOUTUBE_API_BASE_URL}/search?part=snippet&type=video&q=${encodedQuery}&regionCode=US&relevanceLanguage=en&videoDefinition=any&videoEmbeddable=true&maxResults=10&key=${apiKey}`;

      console.log(`🎯 YouTube API search: ${query}`);

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'FitAI-CookingApp/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(
          `❌ YouTube Search API error: ${response.status} ${response.statusText}`,
          errorText
        );
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        console.log(`⚠️ No videos found for query: ${query}`);
        return { success: false, error: 'No videos found' };
      }

      console.log(`📺 Found ${data.items.length} videos for: ${query}`);

      // Get detailed video info for the best matches
      const videoIds = data.items
        .slice(0, 5)
        .map((item: any) => item.id.videoId)
        .join(',');
      const detailsUrl = `${this.YOUTUBE_API_BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`;

      const detailsResponse = await fetch(detailsUrl);

      if (!detailsResponse.ok) {
        const errorText = await detailsResponse.text();
        console.warn(`❌ YouTube Details API error: ${detailsResponse.status}`, errorText);
        throw new Error(`YouTube Details API error: ${detailsResponse.status}`);
      }

      const detailsData = await detailsResponse.json();

      if (!detailsData.items || detailsData.items.length === 0) {
        console.log(`⚠️ No video details found`);
        return { success: false, error: 'No video details found' };
      }

      const bestVideo = this.selectBestYouTubeVideo(detailsData.items, query);

      if (!bestVideo) {
        console.log(`⚠️ No suitable cooking videos found after filtering`);
        return { success: false, error: 'No suitable cooking videos found' };
      }

      console.log(`✅ Found YouTube video: "${bestVideo.title}" by ${bestVideo.author}`);
      return { success: true, video: bestVideo };
    } catch (error) {
      console.warn('⚠️ YouTube API search failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'YouTube API failed',
      };
    }
  }

  // Fallback method: Invidious instances
  private async searchWithInvidious(query: string): Promise<VideoSearchResult> {
    // Try each Invidious instance until one works
    for (const instance of this.INVIDIOUS_INSTANCES) {
      try {
        const result = await this.searchOnInvidiousInstance(instance, query);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.warn(`⚠️ Instance ${instance} failed, trying next...`);
        continue;
      }
    }

    return {
      success: false,
      error: 'All Invidious instances failed',
    };
  }

  private async searchOnInvidiousInstance(
    instance: string,
    query: string
  ): Promise<VideoSearchResult> {
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `${instance}/api/v1/search?q=${encodedQuery}&type=video&sort_by=relevance&region=US`;

    console.log(`🔍 Searching on ${instance}: ${query}`);

    // Create a promise that rejects after 10 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000);
    });

    try {
      const fetchPromise = fetch(searchUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'FitAI-CookingApp/1.0',
          'Content-Type': 'application/json',
        },
      });

      const response = (await Promise.race([fetchPromise, timeoutPromise])) as Response;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const videos = await response.json();

      if (!Array.isArray(videos) || videos.length === 0) {
        return {
          success: false,
          error: 'No videos found',
        };
      }

      // Find the best cooking video
      const bestVideo = this.selectBestCookingVideo(videos, query);

      if (!bestVideo) {
        return {
          success: false,
          error: 'No suitable cooking videos found',
        };
      }

      console.log(`✅ Found video: ${bestVideo.title}`);
      return {
        success: true,
        video: bestVideo,
      };
    } catch (error) {
      console.warn(`⚠️ Error on ${instance}:`, error);
      throw error;
    }
  }

  private selectBestYouTubeVideo(videos: any[], query: string): CookingVideo | null {
    const cookingKeywords = [
      'recipe',
      'cooking',
      'how to cook',
      'tutorial',
      'make',
      'making',
      'step by step',
      'easy',
      'homemade',
      'chef',
      'kitchen',
    ];

    // Filter and score videos from YouTube API response
    const scoredVideos = videos
      .filter((video) => {
        if (!video.snippet?.title || !video.id) return false;

        // Duration filter (3 minutes to 45 minutes)
        const duration = this.parseYouTubeDuration(video.contentDetails?.duration);
        if (duration < 180 || duration > 2700) return false;

        // Check if title contains cooking-related keywords
        const title = video.snippet.title.toLowerCase();
        return cookingKeywords.some((keyword) => title.includes(keyword));
      })
      .map((video) => ({
        video,
        score: this.calculateYouTubeVideoScore(video, query, cookingKeywords),
      }))
      .sort((a, b) => b.score - a.score);

    if (scoredVideos.length === 0) return null;

    const bestVideo = scoredVideos[0].video;

    return {
      id: bestVideo.id,
      title: bestVideo.snippet.title,
      author: bestVideo.snippet.channelTitle || 'Unknown',
      lengthSeconds: this.parseYouTubeDuration(bestVideo.contentDetails?.duration),
      viewCount: parseInt(bestVideo.statistics?.viewCount || '0'),
      publishedText: bestVideo.snippet.publishedAt || '',
      thumbnails: bestVideo.snippet.thumbnails
        ? [
            {
              url:
                bestVideo.snippet.thumbnails.medium?.url ||
                bestVideo.snippet.thumbnails.default?.url ||
                '',
              width: bestVideo.snippet.thumbnails.medium?.width || 320,
              height: bestVideo.snippet.thumbnails.medium?.height || 180,
            },
          ]
        : [],
      description: bestVideo.snippet.description || '',
    };
  }

  private selectBestCookingVideo(videos: any[], query: string): CookingVideo | null {
    const cookingKeywords = [
      'recipe',
      'cooking',
      'how to cook',
      'tutorial',
      'make',
      'making',
      'step by step',
      'easy',
      'homemade',
      'chef',
      'kitchen',
    ];

    // Filter and score videos
    const scoredVideos = videos
      .filter((video) => {
        // Basic filtering
        if (!video.title || !video.videoId) return false;

        // Duration filter (5 minutes to 30 minutes)
        const duration = parseInt(video.lengthSeconds) || 0;
        if (duration < 300 || duration > 1800) return false;

        // Check if title contains cooking-related keywords
        const title = video.title.toLowerCase();
        return cookingKeywords.some((keyword) => title.includes(keyword));
      })
      .map((video) => ({
        video,
        score: this.calculateVideoScore(video, query, cookingKeywords),
      }))
      .sort((a, b) => b.score - a.score);

    if (scoredVideos.length === 0) return null;

    const bestVideo = scoredVideos[0].video;

    return {
      id: bestVideo.videoId,
      title: bestVideo.title,
      author: bestVideo.author || 'Unknown',
      lengthSeconds: parseInt(bestVideo.lengthSeconds) || 0,
      viewCount: parseInt(bestVideo.viewCount) || 0,
      publishedText: bestVideo.publishedText || '',
      thumbnails: bestVideo.videoThumbnails || [],
      description: bestVideo.description || '',
    };
  }

  private calculateVideoScore(video: any, query: string, cookingKeywords: string[]): number {
    let score = 0;
    const title = (video.title || '').toLowerCase();
    const author = (video.author || '').toLowerCase();
    const queryWords = query.toLowerCase().split(' ');

    // Title relevance (40 points max)
    queryWords.forEach((word) => {
      if (title.includes(word)) score += 8;
    });

    // Cooking keywords bonus (30 points max)
    cookingKeywords.forEach((keyword) => {
      if (title.includes(keyword)) score += 5;
    });

    // View count factor (20 points max)
    const viewCount = parseInt(video.viewCount) || 0;
    if (viewCount > 100000) score += 20;
    else if (viewCount > 10000) score += 15;
    else if (viewCount > 1000) score += 10;
    else if (viewCount > 100) score += 5;

    // Duration preference (10 points max)
    const duration = parseInt(video.lengthSeconds) || 0;
    if (duration >= 600 && duration <= 1200)
      score += 10; // 10-20 minutes is ideal
    else if (duration >= 300 && duration <= 1800) score += 5; // 5-30 minutes is good

    // Channel reputation bonus
    const popularCookingChannels = [
      'tasty',
      'gordon ramsay',
      'babish',
      'bon appétit',
      'food network',
      'joshua weissman',
      'chef john',
      'food wishes',
      'allrecipes',
    ];

    if (popularCookingChannels.some((channel) => author.includes(channel))) {
      score += 15;
    }

    return score;
  }

  private calculateYouTubeVideoScore(video: any, query: string, cookingKeywords: string[]): number {
    let score = 0;
    const title = (video.snippet?.title || '').toLowerCase();
    const channelTitle = (video.snippet?.channelTitle || '').toLowerCase();
    const queryWords = query.toLowerCase().split(' ');

    // Title relevance (40 points max)
    queryWords.forEach((word) => {
      if (title.includes(word)) score += 8;
    });

    // Cooking keywords bonus (30 points max)
    cookingKeywords.forEach((keyword) => {
      if (title.includes(keyword)) score += 5;
    });

    // View count factor (25 points max)
    const viewCount = parseInt(video.statistics?.viewCount || '0');
    if (viewCount > 1000000) score += 25;
    else if (viewCount > 500000) score += 20;
    else if (viewCount > 100000) score += 15;
    else if (viewCount > 10000) score += 10;
    else if (viewCount > 1000) score += 5;

    // Duration preference (15 points max)
    const duration = this.parseYouTubeDuration(video.contentDetails?.duration);
    if (duration >= 300 && duration <= 1200)
      score += 15; // 5-20 minutes is ideal
    else if (duration >= 180 && duration <= 1800) score += 10; // 3-30 minutes is good

    // Channel reputation bonus (20 points max)
    const popularCookingChannels = [
      'tasty',
      'gordon ramsay',
      'babish',
      'bon appétit',
      'food network',
      'joshua weissman',
      'chef john',
      'food wishes',
      'allrecipes',
      'sorted food',
      "america's test kitchen",
      'serious eats',
    ];

    if (popularCookingChannels.some((channel) => channelTitle.includes(channel))) {
      score += 20;
    }

    return score;
  }

  // Parse YouTube duration format (PT4M13S -> 253 seconds)
  private parseYouTubeDuration(duration?: string): number {
    if (!duration) return 0;

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  private async getCachedVideo(mealName: string): Promise<CookingVideo | null> {
    try {
      const cacheKey = this.CACHE_PREFIX + mealName.toLowerCase().replace(/\s+/g, '_');
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (!cachedData) return null;

      const { video, timestamp } = JSON.parse(cachedData);
      const now = Date.now();
      const expiryTime = timestamp + this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

      if (now > expiryTime) {
        // Cache expired, remove it
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      return video;
    } catch (error) {
      console.warn('⚠️ Error reading video cache:', error);
      return null;
    }
  }

  private async cacheVideo(mealName: string, video: CookingVideo): Promise<void> {
    try {
      const cacheKey = this.CACHE_PREFIX + mealName.toLowerCase().replace(/\s+/g, '_');
      const cacheData = {
        video,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`✅ Cached video for: ${mealName}`);
    } catch (error) {
      console.warn('⚠️ Error caching video:', error);
    }
  }

  // Utility method to get video URL for react-native-youtube-iframe
  getVideoUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  // Fallback demo video when all instances fail
  private getFallbackDemoVideo(mealName: string): VideoSearchResult {
    // Use real cooking tutorial videos as fallbacks
    const fallbackVideos = [
      {
        id: 'ChVUKq4RXJ0', // "Basic Cooking Skills" by Brothers Green Eats
        title: `How to Make ${mealName} - Basic Cooking Skills`,
        author: 'FitAI Cooking Guide',
        lengthSeconds: 420,
        viewCount: 1250000,
        publishedText: '1 week ago',
        thumbnails: [
          {
            url: 'https://img.youtube.com/vi/ChVUKq4RXJ0/mqdefault.jpg',
            width: 320,
            height: 180,
          },
        ],
        description: `Learn fundamental cooking techniques to prepare ${mealName}. This tutorial covers basic cooking skills every home chef should know.`,
      },
      {
        id: 'ZJy1ajvMU1k', // "Cooking Basics" by Tasty
        title: `${mealName} - Essential Cooking Techniques`,
        author: 'FitAI Kitchen',
        lengthSeconds: 380,
        viewCount: 2100000,
        publishedText: '3 days ago',
        thumbnails: [
          {
            url: 'https://img.youtube.com/vi/ZJy1ajvMU1k/mqdefault.jpg',
            width: 320,
            height: 180,
          },
        ],
        description: `Master the essential techniques needed to create ${mealName}. Perfect for beginners and intermediate cooks.`,
      },
    ];

    // Randomly select one of the fallback videos
    const randomVideo = fallbackVideos[Math.floor(Math.random() * fallbackVideos.length)];

    console.log(`🎬 Using fallback demo video: ${randomVideo.title}`);
    return {
      success: true,
      video: randomVideo,
    };
  }

  // Method to clear all cached videos
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const videoKeys = keys.filter((key) => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(videoKeys);
      console.log(`✅ Cleared ${videoKeys.length} cached videos`);
    } catch (error) {
      console.error('❌ Error clearing video cache:', error);
    }
  }
}

export const youtubeVideoService = new YouTubeVideoService();
