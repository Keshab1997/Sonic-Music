import { useState, useCallback } from "react";
import { Track } from "@/data/playlist";

interface YouTubeResult {
  videoId: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
}

export const useYouTubeSearch = () => {
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");

      const data: YouTubeResult[] = await res.json();

      const tracks: Track[] = data.map((v, i) => ({
        id: 1000 + i,
        title: v.title,
        artist: v.author || "Unknown",
        album: "YouTube",
        cover: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
        src: `https://www.youtube.com/watch?v=${v.videoId}`,
        duration: v.duration || 0,
        type: "youtube" as const,
      }));

      setResults(tracks);
    } catch {
      setError("YouTube search failed. Try again.");
    }
    setLoading(false);
  }, []);

  return { results, loading, error, search };
};
