import { Track } from '../data/playlist';
import { API_BASE, YT_API, YT_STREAM_API } from '../data/constants';

// JioSaavn song parser — use actual song ID for uniqueness
export const parseSong = (s: any, fallbackId: number): Track | null => {
  if (!s.downloadUrl?.length) return null;
  const url160 = s.downloadUrl.find((d: any) => d.quality === "160kbps")?.link;
  const url96 = s.downloadUrl.find((d: any) => d.quality === "96kbps")?.link;
  const url320 = s.downloadUrl.find((d: any) => d.quality === "320kbps")?.link;
  const bestUrl = url160 || url96 || s.downloadUrl[0]?.link || "";
  if (!bestUrl) return null;
  
  // Use JioSaavn's actual song ID if available, otherwise use fallback
  const uniqueId = s.id ? `jiosaavn_${s.id}` : fallbackId;
  
  return {
    id: uniqueId,
    title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown",
    artist: s.primaryArtists || "Unknown",
    album: typeof s.album === "string" ? s.album : s.album?.name || "",
    cover: s.image?.find((img: any) => img.quality === "500x500")?.link || s.image?.[s.image.length - 1]?.link || "",
    src: bestUrl,
    duration: parseInt(String(s.duration)) || 0,
    type: "audio" as const,
    songId: s.id,
    audioUrls: {
      ...(url96 ? { "96kbps": url96 } : {}),
      ...(url160 ? { "160kbps": url160 } : {}),
      ...(url320 ? { "320kbps": url320 } : {}),
    },
  };
};

// Fetch from JioSaavn
export const fetchJioSaavn = async (
  query: string,
  offset: number,
  limit = 15,
  langFilter?: string
): Promise<Track[]> => {
  try {
    const page = Math.floor(Math.random() * 3) + 1;
    const res = await fetch(
      `${API_BASE}/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    let songs = data.data?.results || [];
    if (langFilter) songs = songs.filter((s: any) => s.language === langFilter);
    return songs
      .map((s: any, i: number) => parseSong(s, offset + i))
      .filter((t: Track | null): t is Track => t !== null)
      .slice(0, 12);
  } catch {
    return [];
  }
};

// Fetch from YouTube
export const fetchYouTube = async (query: string, offset: number): Promise<Track[]> => {
  try {
    const res = await fetch(`${YT_API}?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const videos: any[] = await res.json();
    return videos.slice(0, 12).map((v, i) => ({
      id: `youtube_${v.videoId}`, // Use actual video ID for uniqueness
      title: v.title,
      artist: v.author || "YouTube",
      album: "",
      cover: v.thumbnail || "",
      src: `https://www.youtube.com/watch?v=${v.videoId}`,
      duration: v.duration || 0,
      type: "youtube" as const,
      songId: v.videoId,
    }));
  } catch {
    return [];
  }
};

// Resolve YouTube audio URL before playing
export const resolveYtAudio = async (track: Track): Promise<Track> => {
  if (track.type !== "youtube" || !track.songId) return track;
  try {
    const res = await fetch(`${YT_STREAM_API}?id=${track.songId}`);
    if (!res.ok) return track;
    const data = await res.json();
    if (data?.audioUrl) return { ...track, src: data.audioUrl, type: "audio" };
  } catch {}
  return track;
};
