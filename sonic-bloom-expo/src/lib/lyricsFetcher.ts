
const LRCLIB_BASE = "https://lrclib.net/api";
const JIOSAAVN_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

export interface LyricsResult {
  lyrics: string;
  synced: boolean;
}

/**
 * Fetch lyrics — tries LRCLIB first (synced LRC), falls back to JioSaavn (plain text).
 */
export async function fetchLyrics(
  songId: string,
  trackName: string,
  artistName: string
): Promise<LyricsResult | null> {
  // 1. Try LRCLIB for synced lyrics
  try {
    const searchParams = new URLSearchParams({
      track_name: cleanTrackName(trackName),
      artist_name: cleanArtistName(artistName),
    });
    const res = await fetch(
      `${LRCLIB_BASE}/search?${searchParams}`
    );
    if (res.ok) {
      const results = await res.json();
      // Pick the best result with synced lyrics
      const synced = results.find(
        (r: LRCLIBResult) => r.syncedLyrics && r.syncedLyrics.trim().length > 0
      );
      if (synced?.syncedLyrics) {
        return { lyrics: synced.syncedLyrics, synced: true };
      }
      // Fallback to plain lyrics from LRCLIB
      const plain = results.find(
        (r: LRCLIBResult) => r.plainLyrics && r.plainLyrics.trim().length > 0
      );
      if (plain?.plainLyrics) {
        return { lyrics: plain.plainLyrics, synced: false };
      }
    }
  } catch {
    // LRCLIB failed, try JioSaavn
  }

  // 2. Fall back to JioSaavn
  try {
    const res = await fetch(`${JIOSAAVN_BASE}/lyrics?id=${songId}`);
    if (res.ok) {
      const data = await res.json();
      const text = data.data?.lyrics;
      if (text && text.trim()) {
        return { lyrics: text, synced: false };
      }
    }
  } catch {
    // Both failed
  }

  return null;
}

interface LRCLIBResult {
  id: number;
  trackName: string;
  artistName: string;
  syncedLyrics?: string;
  plainLyrics?: string;
  duration?: number;
}

/**
 * Clean track name for LRCLIB search.
 * Removes featuring artists, "From ..." suffixes, etc.
 */
function cleanTrackName(name: string): string {
  return name
    .replace(/\s*\(.*?\)\s*/g, "") // Remove parenthetical
    .replace(/\s*\[.*?\]\s*/g, "") // Remove brackets
    .replace(/\s*ft\.?\s*.+$/i, "") // Remove featuring
    .replace(/\s*feat\.?\s*.+$/i, "") // Remove feat.
    .trim();
}

/**
 * Clean artist name for LRCLIB search.
 * Takes only the first artist if multiple.
 */
function cleanArtistName(name: string): string {
  return name
    .split(/[,&]/)[0]
    .replace(/\s*ft\.?\s*.+$/i, "")
    .replace(/\s*feat\.?\s*.+$/i, "")
    .trim();
}

