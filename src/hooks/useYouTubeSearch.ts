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
      const res = await fetch(`/api/youtube-audio?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");

      const data: SaavnSong[] = await res.json();

      const tracks: Track[] = data
        .filter((s) => s.audioUrl)
        .map((s, i) => ({
          id: 2000 + i,
          title: s.title,
          artist: s.artist || "Unknown",
          album: s.album || "",
          cover: s.cover || "",
          src: s.audioUrl,
          duration: s.duration || 0,
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

// Keep backward compatibility
export const useYouTubeSearch = useMusicSearch;
