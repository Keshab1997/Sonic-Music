import { useState, useEffect, useRef, useCallback } from "react";
import { X, Play, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePlayer } from "@/context/PlayerContext";
import { Track } from "@/data/playlist";

interface PlaylistsModalProps {
  onSelectPlaylist: (playlist: { id: string; title: string }) => void;
  onClose: () => void;
}

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

const getImage = (images: { quality: string; link: string }[], prefer = "500x500") =>
  images?.find((img) => img.quality === prefer)?.link ||
  images?.find((img) => img.quality === "150x150")?.link ||
  images?.[images.length - 1]?.link || "";

interface ApiPlaylist {
  id: string;
  title: string;
  subtitle: string;
  image: { quality: string; link: string }[];
}

export const PlaylistsModal = ({ onSelectPlaylist, onClose }: PlaylistsModalProps) => {
  const { playTrackList } = usePlayer();
  const [search, setSearch] = useState("");
  const [allPlaylists, setAllPlaylists] = useState<ApiPlaylist[]>([]);
  const [displayedPlaylists, setDisplayedPlaylists] = useState<ApiPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const INITIAL_LOAD = 12;
  const LOAD_MORE_COUNT = 12;

  // Popular playlist searches
  const popularSearches = [
    "Bollywood Hits",
    "Bengali Songs",
    "Romantic Songs",
    "Party Songs",
    "Workout Mix",
    "Chill Vibes",
    "Latest Releases",
    "Top Charts",
    "Love Songs",
    "Sad Songs",
    "Happy Songs",
    "Trending Now",
  ];

  const fetchPlaylists = useCallback(async (query: string, page: number = 1) => {
    if (!query.trim()) {
      setAllPlaylists([]);
      setDisplayedPlaylists([]);
      setSearchSuggestions([]);
      setHasMore(true);
      setCurrentPage(1);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch multiple pages at once to get more results
      const pagesToFetch = page === 1 ? [1, 2, 3] : [page];
      const responses = await Promise.all(
        pagesToFetch.map(p =>
          fetch(`${API_BASE}/search/playlists?query=${encodeURIComponent(query)}&page=${p}&limit=50`)
            .then(r => r.json())
            .catch(() => null)
        )
      );

      const allResults: ApiPlaylist[] = [];
      for (const json of responses) {
        const results: ApiPlaylist[] = json?.data?.results ?? [];
        allResults.push(...results);
      }

      // Deduplicate by id
      const seen = new Set<string>();
      const unique = allResults.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      if (page > 1) {
        setAllPlaylists(prev => {
          const merged = [...prev, ...unique];
          setDisplayedPlaylists(merged);
          return merged;
        });
      } else {
        setAllPlaylists(unique);
        setDisplayedPlaylists(unique);
      }

      const lastPageResults: ApiPlaylist[] = responses[responses.length - 1]?.data?.results ?? [];
      setHasMore(lastPageResults.length === 50);
      setShowSuggestions(false);
    } catch {
      if (page === 1) {
        setAllPlaylists([]);
        setDisplayedPlaylists([]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!search.trim()) {
      setSearchSuggestions(popularSearches);
      setAllPlaylists([]);
      setDisplayedPlaylists([]);
      setShowSuggestions(true);
      setCurrentPage(1);
      return;
    }

    // Show suggestions immediately for 2+ word searches
    const words = search.trim().split(/\s+/);
    if (words.length >= 2) {
      const filtered = popularSearches.filter(s => 
        s.toLowerCase().includes(search.toLowerCase())
      );
      setSearchSuggestions(filtered);
      setShowSuggestions(true);
    }

    setCurrentPage(1);
    debounceRef.current = setTimeout(() => {
      fetchPlaylists(search, 1, false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchPlaylists]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && search.trim()) {
          const nextPage = currentPage + 3; // skip pages 1,2,3 already fetched
          setCurrentPage(nextPage);
          fetchPlaylists(search, nextPage);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [allPlaylists, displayedPlaylists.length, hasMore, loading, search, currentPage, fetchPlaylists]);

  const handleSuggestionClick = (suggestion: string) => {
    setSearch(suggestion);
    setShowSuggestions(false);
  };

  const handlePlayPlaylist = async (playlist: ApiPlaylist) => {
    toast.loading(`Loading ${playlist.title}...`, { id: "playlist-load" });
    try {
      const res = await fetch(`${API_BASE}/playlists?id=${playlist.id}`);
      if (!res.ok) {
        toast.error("Failed to load playlist", { id: "playlist-load" });
        return;
      }
      const data = await res.json();
      const songs = data.data?.songs || [];
      const tracks: Track[] = songs
        .filter((s: { downloadUrl?: unknown[] }) => s.downloadUrl?.length > 0)
        .map((s: { downloadUrl: { quality: string; link: string }[]; name: string; primaryArtists: string; album?: { name?: string } | string; image: { quality: string; link: string }[]; duration: string | number; id: string }, i: number) => {
          const url96 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "96kbps")?.link;
          const url160 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "160kbps")?.link;
          const bestUrl = url160 || url96 || s.downloadUrl?.[0]?.link || "";
          return {
            id: 8000 + i,
            title: s.name?.replace(/&quot;/g, '"').replace(/&amp;/g, "&") || "Unknown",
            artist: s.primaryArtists || "Unknown",
            album: typeof s.album === "string" ? s.album : s.album?.name || "",
            cover: s.image?.find((img: { quality: string }) => img.quality === "500x500")?.link || s.image?.[s.image.length - 1]?.link || "",
            src: bestUrl,
            duration: parseInt(String(s.duration)) || 0,
            type: "audio" as const,
            songId: s.id,
          } as Track;
        });
      if (tracks.length > 0) {
        toast.success(`Playing ${playlist.title} (${tracks.length} songs)`, { id: "playlist-load" });
        playTrackList(tracks, 0);
      } else {
        toast.error("No songs found in playlist", { id: "playlist-load" });
      }
    } catch {
      toast.error("Failed to load playlist", { id: "playlist-load" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-4 pb-24 md:pb-28">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl h-full max-h-[calc(100vh-140px)] md:max-h-[calc(100vh-120px)] glass-heavy border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">Featured Playlists</h2>
              <p className="text-xs text-muted-foreground">Search and explore all playlists</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search playlists... (type 2-3 words for suggestions)"
              className="w-full pl-9 pr-9 py-2 text-xs rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" />}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Show suggestions when typing 2+ words */}
          {showSuggestions && searchSuggestions.length > 0 && !loading && displayedPlaylists.length === 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Quick Suggestions</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {searchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-2 text-xs font-medium rounded-lg bg-muted hover:bg-accent border border-border transition-colors text-left truncate"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!search.trim() ? (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Popular Searches</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {popularSearches.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-2 text-xs font-medium rounded-lg bg-muted hover:bg-accent border border-border transition-colors text-left truncate"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : loading && displayedPlaylists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={24} className="text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Searching playlists...</p>
            </div>
          ) : displayedPlaylists.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No playlists found</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {displayedPlaylists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className="flex flex-col gap-2 p-2 rounded-xl bg-card hover:bg-accent transition-colors group text-center cursor-pointer"
                  >
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={getImage(playlist.image)}
                        alt={playlist.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayPlaylist(playlist);
                          }}
                          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-lg"
                        >
                          <Play size={16} className="text-primary-foreground ml-0.5" fill="currentColor" />
                        </button>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate line-clamp-2">
                        {playlist.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {playlist.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Trigger */}
              {hasMore && search.trim() && (
                <div ref={loadMoreRef} className="flex justify-center py-4">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <p className="text-xs text-muted-foreground">Scroll to load more...</p>
                  )}
                </div>
              )}

              {!hasMore && displayedPlaylists.length > 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Showing all {displayedPlaylists.length} playlists
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
