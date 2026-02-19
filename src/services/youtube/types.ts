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
