
import { useState, useCallback, useRef, useEffect } from "react";
import { Track } from "@/data/playlist";

interface SaavnDownloadUrl {
  quality: string;
  link: string;
}

interface SaavnImage {
  quality: string;
  link: string;
}

interface SaavnSong {
  id: string;
  name: string;
  primaryArtists: string;
  album: { name: string } | string;
  duration: string | number;
  image: SaavnImage[];
  downloadUrl: SaavnDownloadUrl[];
}

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";
const DEBOUNCE_MS = 400;

export const useMusicSearch = () => {
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingMoreRef = useRef(false);

  const executeSearch = useCallback(async (searchQuery: string, page: number = 1, append: boolean = false) => {
    if (!searchQuery.trim()) return;
    
    if (!append) {
      setLoading(true);
    } else {
      loadingMoreRef.current = true;
    }
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}&page=${page}&limit=20`);
      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      const songs: SaavnSong[] = data.data?.results || [];

      const tracks: Track[] = songs
        .filter((s) => s.downloadUrl?.length > 0)
        .map((s, i: number) => {
          const url96 = s.downloadUrl?.find((d) => d.quality === "96kbps")?.link;
          const url160 = s.downloadUrl?.find((d) => d.quality === "160kbps")?.link;
          const url320 = s.downloadUrl?.find((d) => d.quality === "320kbps")?.link;
          const bestUrl = url160 || url96 || url320 || s.downloadUrl?.[0]?.link || "";

          return {
            id: s.id ? `jiosaavn_${s.id}` : 2000 + (page - 1) * 20 + i,
            title: s.name,
            artist: s.primaryArtists || "Unknown",
            album: typeof s.album === "string" ? s.album : s.album?.name || "",
            cover: s.image?.find((img) => img.quality === "500x500")?.link ||
                   s.image?.[s.image.length - 1]?.link ||
                   "",
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
        });

      if (append) {
        setResults(prev => [...prev, ...tracks]);
      } else {
        setResults(tracks);
      }
      
      // Check if there are more results
      setHasMore(songs.length === 20);
      setCurrentPage(page);
    } catch {
      setError("Search failed. Try again.");
    }
    setLoading(false);
    loadingMoreRef.current = false;
  }, []);

  // Load more results
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || !query.trim()) return;
    await executeSearch(query, currentPage + 1, true);
  }, [query, currentPage, hasMore, executeSearch]);

  // Debounced search - automatically triggers when query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      executeSearch(query, 1, false);
    }, DEBOUNCE_MS);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, executeSearch]);

  // Public search function - updates query state (triggers debounce)
  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, []);

  // Immediate search without debounce (for explicit triggers)
  const searchImmediate = useCallback(async (searchQuery: string) => {
    await executeSearch(searchQuery, 1, false);
  }, [executeSearch]);

  return { results, loading, error, search, searchImmediate, query, setQuery, loadMore, hasMore };
};

// Backward compatibility
export const useYouTubeSearch = useMusicSearch;

