import { Track } from '../data/playlist';
import { API_BASE } from '../data/constants';

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

// Fetch from JioSaavn with pagination support
export const fetchJioSaavn = async (
  query: string,
  offset: number,
  limit = 20,
  langFilter?: string
): Promise<Track[]> => {
  try {
    // Use offset as page number for pagination
    const page = Math.floor(offset / 20) + 1;
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
      .slice(0, limit);
  } catch {
    return [];
  }
};

// Fetch multiple pages for more results
export const fetchJioSaavnMultiPage = async (
  query: string,
  pages: number = 3,
  langFilter?: string
): Promise<Track[]> => {
  const allTracks: Track[] = [];
  try {
    for (let page = 1; page <= pages; page++) {
      const res = await fetch(
        `${API_BASE}/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=20`
      );
      if (!res.ok) break;
      const data = await res.json();
      let songs = data.data?.results || [];
      if (langFilter) songs = songs.filter((s: any) => s.language === langFilter);
      const tracks = songs
        .map((s: any, i: number) => parseSong(s, (page - 1) * 20 + i))
        .filter((t: Track | null): t is Track => t !== null);
      allTracks.push(...tracks);
      if (songs.length < 20) break; // No more results
    }
  } catch {
    // Return whatever we got
  }
  return allTracks;
};

