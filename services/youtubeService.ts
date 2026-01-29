import { ChannelDetails, Video, VideoStats } from '../types';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Helper to parse ISO 8601 duration (PT1H2M10S) to seconds
const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;

  const hours = (parseInt(match[1] || '0'));
  const minutes = (parseInt(match[2] || '0'));
  const seconds = (parseInt(match[3] || '0'));

  return hours * 3600 + minutes * 60 + seconds;
};

export const fetchChannelByHandle = async (handle: string, apiKey: string): Promise<ChannelDetails | null> => {
  try {
    // 1. Get Channel Details
    const searchParams = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      forHandle: handle,
      key: apiKey,
    });

    const response = await fetch(`${BASE_URL}/channels?${searchParams.toString()}`);
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      throw new Error('Channel not found');
    }

    const item = data.items[0];
    return {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      customUrl: item.snippet.customUrl,
      thumbnailUrl: item.snippet.thumbnails.default.url,
      uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
      subscriberCount: item.statistics.subscriberCount,
      videoCount: item.statistics.videoCount,
    };
  } catch (error) {
    console.error("Error fetching channel:", error);
    return null;
  }
};

export const fetchLatestVideos = async (playlistId: string, apiKey: string, maxResults: number = 50): Promise<Video[]> => {
  try {
    // 2. Get Playlist Items (Uploads)
    const plParams = new URLSearchParams({
      part: 'snippet',
      playlistId: playlistId,
      maxResults: maxResults.toString(),
      key: apiKey,
    });

    const plResponse = await fetch(`${BASE_URL}/playlistItems?${plParams.toString()}`);
    const plData = await plResponse.json();

    if (!plData.items) return [];

    const videoIds = plData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');
    
    // 3. Get Video Statistics AND ContentDetails (for duration)
    const vParams = new URLSearchParams({
      part: 'statistics,snippet,contentDetails',
      id: videoIds,
      key: apiKey,
    });

    const vResponse = await fetch(`${BASE_URL}/videos?${vParams.toString()}`);
    const vData = await vResponse.json();

    if (!vData.items) return [];

    return vData.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      channelTitle: item.snippet.channelTitle,
      url: `https://www.youtube.com/watch?v=${item.id}`,
      durationSeconds: parseDuration(item.contentDetails?.duration || ''),
      stats: {
        viewCount: item.statistics.viewCount || '0',
        likeCount: item.statistics.likeCount || '0',
        commentCount: item.statistics.commentCount || '0',
      } as VideoStats,
    }));

  } catch (error) {
    console.error("Error fetching videos:", error);
    return [];
  }
};
