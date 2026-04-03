
export interface AudioUrls {
  "96kbps"?: string;
  "160kbps"?: string;
  "320kbps"?: string;
}

export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  src: string;
  duration: number;
  type: "audio" | "youtube";
  songId?: string;
  audioUrls?: AudioUrls;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
}

// Empty playlist - user adds songs via YouTube Music search or downloads
export const playlist: Track[] = [];

