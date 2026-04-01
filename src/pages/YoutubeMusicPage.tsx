import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Play, Pause, TrendingUp, RefreshCw, Plus, Loader2, Music2, Mic2, Film, Radio } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { Track } from "@/data/playlist";

const YT_API = "/api/youtube-search";
const DEBOUNCE_MS = 450;

interface YTVideo {
  videoId: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
}

const toTrack = (v: YTVideo, i: number): Track => ({
  id: 70000 + i,
  title: v.title,
  artist: v.author || "YouTube",
  album: "",
  cover: v.thumbnail || "",
  src: `https://www.youtube.com/watch?v=${v.videoId}`,
  duration: v.duration || 0,
  type: "youtube" as const,
  songId: v.videoId,
});

const CATEGORIES = [
  { label: "Trending", emoji: "🔥", query: "trending music india 2025" },
  { label: "Bangla Hits", emoji: "🎵", query: "viral bangla song 2025" },
  { label: "Bollywood", emoji: "🎬", query: "bollywood hits 2025" },
  { label: "Arijit Singh", emoji: "🎤", query: "arijit singh best songs 2024 2025" },
  { label: "Lofi", emoji: "🌙", query: "hindi lofi chill music" },
  { label: "Unplugged", emoji: "🎸", query: "bollywood unplugged acoustic" },
  { label: "Indie Bengali", emoji: "🌿", query: "indie bengali songs fossils chandrabindoo" },
  { label: "Romantic", emoji: "💕", query: "hindi romantic songs 2025" },
  { label: "Party", emoji: "🎉", query: "bollywood party songs 2025" },
  { label: "Sad Songs", emoji: "😢", query: "hindi sad songs emotional 2024" },
  { label: "Old Gold", emoji: "🏅", query: "old hindi classic songs 90s" },
  { label: "Devotional", emoji: "🙏", query: "bengali devotional songs kirtan" },
];

export default function YoutubeMusicPage() {
  const { playTrackList, playTrack, currentTrack, isPlaying, addToQueue } = usePlayer();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [featuredTracks, setFeaturedTracks] = useState<Track[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchYT = useCallback(async (q: string): Promise<Track[]> => {
    const res = await fetch(`${YT_API}?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const videos: YTVideo[] = await res.json();
    return videos.map(toTrack);
  }, []);

  // Load default trending on mount
  useEffect(() => {
    setFeaturedLoading(true);
    fetchYT(CATEGORIES[0].query)
      .then(setFeaturedTracks)
      .finally(() => setFeaturedLoading(false));
  }, [fetchYT]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const tracks = await fetchYT(query);
      setResults(tracks);
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchYT]);

  const handleCategoryClick = async (cat: typeof CATEGORIES[0]) => {
    setActiveCategory(cat);
    setQuery("");
    setResults([]);
    setCategoryLoading(true);
    const tracks = await fetchYT(cat.query);
    setFeaturedTracks(tracks);
    setCategoryLoading(false);
  };

  const isSearchMode = query.trim().length > 0;
  const displayTracks = isSearchMode ? results : featuredTracks;
  const isTrackPlaying = (t: Track) => currentTrack?.src === t.src && isPlaying;

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden pb-32 md:pb-28 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 md:px-6 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
            <Play size={16} className="text-white ml-0.5" fill="white" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-foreground leading-tight">YouTube Music</h1>
            <p className="text-[10px] text-muted-foreground">Stream from YouTube</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 md:px-6 pt-4">
        {/* Category Pills */}
        {!isSearchMode && (
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => handleCategoryClick(cat)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeCategory.label === cat.label
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Section Title */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isSearchMode ? (
              <>
                <Search size={15} className="text-red-400" />
                <h2 className="text-sm font-bold text-foreground">Results for "{query}"</h2>
              </>
            ) : (
              <>
                <span className="text-base">{activeCategory.emoji}</span>
                <h2 className="text-sm font-bold text-foreground">{activeCategory.label}</h2>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 font-bold">YT</span>
              </>
            )}
          </div>
          {!isSearchMode && displayTracks.length > 0 && (
            <button
              onClick={() => playTrackList(displayTracks, 0)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
            >
              <Play size={11} fill="currentColor" /> Play All
            </button>
          )}
        </div>

        {/* Loading */}
        {(loading || categoryLoading || featuredLoading) && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
              <Loader2 size={20} className="text-red-400 animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">Loading from YouTube...</p>
          </div>
        )}

        {/* No results */}
        {isSearchMode && !loading && results.length === 0 && query.trim() && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Search size={22} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No results for "{query}"</p>
          </div>
        )}

        {/* Track List */}
        {!loading && !categoryLoading && !featuredLoading && displayTracks.length > 0 && (
          <div className="space-y-1">
            {displayTracks.map((track, i) => (
              <div
                key={track.src + i}
                onClick={() => playTrackList(displayTracks, i)}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all group ${
                  isTrackPlaying(track)
                    ? "bg-red-600/10 border border-red-600/20"
                    : "hover:bg-muted/60"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative flex-shrink-0">
                  <img
                    src={track.cover}
                    alt=""
                    width={56}
                    height={56}
                    loading="lazy"
                    className="w-14 h-14 rounded-lg object-cover shadow-md"
                  />
                  <div className={`absolute inset-0 rounded-lg flex items-center justify-center transition-all ${
                    isTrackPlaying(track) ? "bg-black/40" : "bg-black/0 group-hover:bg-black/40"
                  }`}>
                    {isTrackPlaying(track) ? (
                      <Pause size={18} className="text-white" />
                    ) : (
                      <Play size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                    )}
                  </div>
                  {/* YT badge */}
                  <span className="absolute bottom-0.5 right-0.5 text-[7px] font-bold text-white bg-red-600 px-1 py-0.5 rounded leading-none">YT</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isTrackPlaying(track) ? "text-red-400" : "text-foreground"}`}>
                    {track.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{track.artist}</p>
                  {track.duration > 0 && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, "0")}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
                    className="w-7 h-7 rounded-full bg-muted hover:bg-red-600/20 flex items-center justify-center transition-colors"
                    title="Add to queue"
                  >
                    <Plus size={13} className="text-muted-foreground hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Picks Grid — shown when no search */}
        {!isSearchMode && !featuredLoading && (
          <div className="mt-8 mb-4">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Music2 size={15} className="text-red-400" /> Quick Picks
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Arijit Live", emoji: "🎤", query: "arijit singh live concert 2024" },
                { label: "Bangla Viral", emoji: "🔥", query: "viral bangla song 2024 2025" },
                { label: "Coke Studio", emoji: "🎙️", query: "coke studio india 2024" },
                { label: "MTV Unplugged", emoji: "🎸", query: "mtv unplugged india hindi" },
                { label: "Bengali Indie", emoji: "🌿", query: "fossils chandrabindoo bhoomi bengali band" },
                { label: "Rabindra Sangeet", emoji: "📜", query: "rabindra sangeet best collection" },
              ].map((pick) => (
                <button
                  key={pick.label}
                  onClick={() => handleCategoryClick({ label: pick.label, emoji: pick.emoji, query: pick.query })}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-muted hover:bg-muted/70 border border-border hover:border-red-500/30 transition-all text-left group"
                >
                  <span className="text-xl">{pick.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{pick.label}</p>
                    <p className="text-[9px] text-muted-foreground">YouTube</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
