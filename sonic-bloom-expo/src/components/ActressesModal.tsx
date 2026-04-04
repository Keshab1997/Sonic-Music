import { useState, useEffect, useRef, useCallback } from "react";
import { X, Play, Search, Loader2 } from "lucide-react-native";
import { Artist } from "@/data/homeData";

interface ActressesModalProps {
  onSelectArtist: (artist: Artist & { artistId?: string }) => void;
  onClose: () => void;
}

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

const getImage = (images: { quality: string; link: string }[], prefer = "500x500") =>
  images?.find((img) => img.quality === prefer)?.link ||
  images?.find((img) => img.quality === "150x150")?.link ||
  images?.[images.length - 1]?.link || "";

interface ApiArtist {
  id: string;
  name: string;
  image: { quality: string; link: string }[];
}

// Popular artists for quick suggestions
const popularArtists = [
  "Arijit Singh",
  "Shreya Ghoshal",
  "Neha Kakkar",
  "Sunidhi Chauhan",
  "Atif Aslam",
  "Darshan Raval",
  "Anupam Roy",
  "Diljit Dosanjh",
  "Badshah",
  "Jubin Nautiyal",
  "Armaan Malik",
  "Yo Yo Honey Singh",
];

export const ActressesModal = ({ onSelectArtist, onClose }: ActressesModalProps) => {
  const [search, setSearch] = useState("");
  const [artists, setArtists] = useState<(Artist & { artistId: string })[]>([]);
  const [displayedArtists, setDisplayedArtists] = useState<(Artist & { artistId: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const INITIAL_LOAD = 10;
  const LOAD_MORE_COUNT = 10;


  const fetchArtists = useCallback(async (query: string) => {
    if (!query.trim()) {
      setArtists([]);
      setDisplayedArtists([]);
      setSearchSuggestions([]);
      setHasMore(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/search/artists?query=${encodeURIComponent(query)}&page=1&limit=100`
      );
      const json = await res.json();
      const results: ApiArtist[] = json?.data?.results ?? [];
      const mapped = results.map((a) => ({
        name: a.name,
        image: getImage(a.image),
        searchQuery: a.name,
        language: "hindi" as const,
        artistId: a.id,
      }));
      setArtists(mapped);
      setDisplayedArtists(mapped.slice(0, INITIAL_LOAD));
      setHasMore(mapped.length > INITIAL_LOAD);
      setShowSuggestions(false);
    } catch {
      setArtists([]);
      setDisplayedArtists([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (!search.trim()) {
      setSearchSuggestions(popularArtists);
      setArtists([]);
      setDisplayedArtists([]);
      setShowSuggestions(true);
      return;
    }

    // Show suggestions immediately for 2+ word searches
    const words = search.trim().split(/\s+/);
    if (words.length >= 2) {
      const filtered = popularArtists.filter(s =>
        s.toLowerCase().includes(search.toLowerCase())
      );
      setSearchSuggestions(filtered);
      setShowSuggestions(true);
    }

    debounceRef.current = setTimeout(() => {
      fetchArtists(search);
    }, 300);
    
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchArtists]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const newCount = displayedArtists.length + LOAD_MORE_COUNT;
          setDisplayedArtists(artists.slice(0, newCount));
          setHasMore(newCount < artists.length);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [artists, displayedArtists.length, hasMore, loading]);

  const handleSuggestionClick = (suggestion: string) => {
    setSearch(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-4 pb-24 md:pb-28">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full max-h-[calc(100vh-140px)] md:max-h-[calc(100vh-120px)] glass-heavy border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">Actress & Singers</h2>
              <p className="text-xs text-muted-foreground">Search and explore all artists</p>
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
              placeholder="Search actress or singer... (type 2-3 words for suggestions)"
              className="w-full pl-9 pr-9 py-2 text-xs rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" />}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Show suggestions when typing 2+ words */}
          {showSuggestions && searchSuggestions.length > 0 && !loading && displayedArtists.length === 0 && (
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
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Popular Artists</p>
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
          ) : loading && displayedArtists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={24} className="text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Searching artists...</p>
            </div>
          ) : displayedArtists.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No artist found</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {displayedArtists.map((artist) => (
                  <div
                    key={artist.artistId}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card hover:bg-accent transition-colors group text-center cursor-pointer"
                    onClick={() => onSelectArtist(artist)}
                  >
                    <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-muted ring-2 ring-transparent group-hover:ring-primary transition-all">
                      {artist.image && (
                        <img
                          src={artist.image}
                          alt={artist.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          loading="lazy"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                        <Play size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate w-full">
                      {artist.name}
                    </p>
                  </div>
                ))}
              </div>

              {/* Load More Trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-4">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <p className="text-xs text-muted-foreground">Scroll to load more...</p>
                  )}
                </div>
              )}

              {!hasMore && displayedArtists.length > 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Showing {displayedArtists.length} artists
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
