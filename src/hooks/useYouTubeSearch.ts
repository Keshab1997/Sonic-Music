import { useState, useCallback } from "react";
import { Track } from "@/data/playlist";

interface SaavnSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  cover: string;
  audioUrl: string;
}

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

export const useMusicSearch = () => {
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(query)}&page=1&limit=20`);
      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      const songs = data.data?.results || [];

      const tracks: Track[] = songs
        .filter((s: SaavnSong & { downloadUrl: { quality: string; link: string }[] }) =>
          s.downloadUrl?.length > 0
        )
        .map((s: SaavnSong & {
          downloadUrl: { quality: string; link: string }[];
          image: { quality: string; link: string }[];
        }, i: number) => ({
          id: 2000 + i,
          title: s.name,
          artist: s.primaryArtists || "Unknown",
          album: s.album?.name || "",
          cover: s.image?.find((img) => img.quality === "500x500")?.link ||
                 s.image?.[s.image.length - 1]?.link ||
                 "",
          src: s.downloadUrl?.find((d) => d.quality === "160kbps")?.link ||
               s.downloadUrl?.find((d) => d.quality === "96kbps")?.link ||
               s.downloadUrl?.[0]?.link ||
               "",
          duration: parseInt(String(s.duration)) || 0,
          type: "audio" as const,
        }));

      setResults(tracks);
    } catch {
      setError("Search failed. Try again.");
    }
    setLoading(false);
  }, []);

  return { results, loading, error, search };
};

// Backward compatibility
export const useYouTubeSearch = useMusicSearch;
