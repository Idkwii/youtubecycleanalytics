export interface ChannelDetails {
  id: string;
  title: string;
  description: string;
  customUrl: string;
  thumbnailUrl: string;
  uploadsPlaylistId: string;
  subscriberCount: string;
  videoCount: string;
}

export interface VideoStats {
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  channelTitle: string;
  stats?: VideoStats;
  url: string;
  durationSeconds: number; // Added for Shorts filtering
}

export interface ChannelData {
  details: ChannelDetails;
  videos: Video[];
  groupId?: string; // Optional grouping
}

export interface ChannelGroup {
  id: string;
  name: string;
  isOpen: boolean;
}

export type SortField = 'publishedAt' | 'viewCount' | 'likeCount' | 'commentCount';
export type SortOrder = 'asc' | 'desc';
