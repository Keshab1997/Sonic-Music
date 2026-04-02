import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Play, Pause, Plus, Loader2, Music2, MoreVertical, ListPlus, PlaySquare } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { Track } from "@/data/playlist";

const YT_API = "/api/youtube-search";
const YT_STREAM_API = "/api/yt-stream";
const DEBOUNCE_MS = 450;
const streamCache = new Map<string, string>(); // videoId → audioUrl cache
const categoryCache = new Map<string, Track[]>(); // query → tracks cache

// Suffix variants to get different results for same query
const PAGE_SUFFIXES = [
  "", " 2025", " new", " best", " hits", " top", " latest", " popular",
  " official", " full", " hd", " audio", " live", " remix", " unplugged",
];

interface YTVideo {
  videoId: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
}

// Convert to youtube type first, then resolve to audio on play
const toTrack = (v: YTVideo, offset: number, i: number): Track => ({
  id: 70000 + offset + i,
  title: v.title,
  artist: v.author || "YouTube",
  album: "",
  cover: v.thumbnail || "",
  src: `https://www.youtube.com/watch?v=${v.videoId}`,
  duration: v.duration || 0,
  type: "youtube" as const,
  songId: v.videoId,
});

// Fetch direct audio URL from yt-stream API (silent fail — fallback to ReactPlayer)
const resolveAudioUrl = async (videoId: string): Promise<string | null> => {
  if (streamCache.has(videoId)) return streamCache.get(videoId)!;
  
  // Method 1: Try backend API first
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${YT_STREAM_API}?id=${videoId}`, { signal: ctrl.signal }).catch(() => null);
    clearTimeout(timer);
    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.audioUrl) {
        streamCache.set(videoId, data.audioUrl);
        return data.audioUrl;
      }
    }
  } catch { /* silent */ }

  // Method 2: Client-side YouTube InnerTube API fallback
  try {
    const payload = {
      videoId,
      context: {
        client: {
          hl: "en",
          clientName: "ANDROID",
          clientVersion: "20.42.38",
          androidSdkVersion: 30,
        }
      }
    };
    const ctrl2 = new AbortController();
    const timer2 = setTimeout(() => ctrl2.abort(), 5000);
    const res = await fetch("https://release-youtubei.sandbox.googleapis.com/youtubei/v1/player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl2.signal
    }).catch(() => null);
    clearTimeout(timer2);
    if (res && res.ok) {
      const json = await res.json().catch(() => null);
      if (json?.streamingData?.adaptiveFormats) {
        // Find audio-only format (itag 140 = AAC 128kbps, 139 = AAC 48kbps)
        const audioFormat = json.streamingData.adaptiveFormats.find(
          (f: { itag: number; url?: string }) => f.itag === 140 && f.url
        ) || json.streamingData.adaptiveFormats.find(
          (f: { mimeType?: string; url?: string }) => f.mimeType?.startsWith("audio/") && f.url
        );
        if (audioFormat?.url) {
          streamCache.set(videoId, audioFormat.url);
          return audioFormat.url;
        }
      }
    }
  } catch { /* silent */ }

  return null;
};

const CATEGORIES = [
  { label: "Trending", emoji: "🔥", query: "trending music india 2025" },
  { label: "Bangla Hits", emoji: "🎵", query: "viral bangla song 2025" },
  { label: "Bollywood", emoji: "🎬", query: "bollywood hits 2025" },
  { label: "Arijit Singh", emoji: "🎤", query: "arijit singh best songs" },
  { label: "Lofi", emoji: "🌙", query: "hindi lofi chill music" },
  { label: "Unplugged", emoji: "🎸", query: "bollywood unplugged acoustic" },
  { label: "Indie Bengali", emoji: "🌿", query: "indie bengali songs fossils chandrabindoo" },
  { label: "Romantic", emoji: "💕", query: "hindi romantic songs 2025" },
  { label: "Party", emoji: "🎉", query: "bollywood party songs 2025" },
  { label: "Sad Songs", emoji: "😢", query: "hindi sad songs emotional" },
  { label: "Old Gold", emoji: "🏅", query: "old hindi classic songs 90s" },
  { label: "Devotional", emoji: "🙏", query: "bengali devotional songs kirtan" },
];

const QUICK_PICKS = [
  { label: "Arijit Live", emoji: "🎤", query: "arijit singh live concert" },
  { label: "Bangla Viral", emoji: "🔥", query: "viral bangla song 2024 2025" },
  { label: "Coke Studio", emoji: "🎙️", query: "coke studio india 2024" },
  { label: "MTV Unplugged", emoji: "🎸", query: "mtv unplugged india hindi" },
  { label: "Bengali Indie", emoji: "🌿", query: "fossils chandrabindoo bhoomi bengali band" },
  { label: "Rabindra Sangeet", emoji: "📜", query: "rabindra sangeet best collection" },
];

export default function YoutubeMusicPage() {
  const { playTrackList, currentTrack, isPlaying, addToQueue, playNext } = usePlayer();

  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [currentQuery, setCurrentQuery] = useState(CATEGORIES[0].query);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [resolvingIdx, setResolvingIdx] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());

  const fetchYT = useCallback(async (q: string, pageNum: number): Promise<Track[]> => {
    const suffix = PAGE_SUFFIXES[pageNum % PAGE_SUFFIXES.length];
    const finalQuery = pageNum === 0 ? q : `${q}${suffix}`;
    try {
      const res = await fetch(`${YT_API}?q=${encodeURIComponent(finalQuery)}`);
      if (!res.ok) return [];
      const videos: YTVideo[] = await res.json();
      // Deduplicate by videoId, skip shorts (< 60s)
      const fresh = videos.filter((v) => !seenIds.current.has(v.videoId) && v.duration >= 60);
      fresh.forEach((v) => seenIds.current.add(v.videoId));
      return fresh.map((v, i) => toTrack(v, pageNum * 20, i));
    } catch { return []; }
  }, []);

  const loadInitial = useCallback(async (q: string) => {
    // Check cache first
    if (categoryCache.has(q)) {
      const cached = categoryCache.get(q)!;
      setTracks(cached);
      setPage(1);
      setHasMore(cached.length > 0);
      setLoading(false);
      return;
    }
    seenIds.current = new Set();
    setLoading(true);
    setTracks([]);
    setPage(0);
    setHasMore(true);
    const result = await fetchYT(q, 0);
    categoryCache.set(q, result); // Cache the results
    setTracks(result);
    setPage(1);
    setHasMore(result.length > 0);
    setLoading(false);
  }, [fetchYT]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const result = await fetchYT(currentQuery, page);
    if (result.length === 0) {
      setHasMore(false);
    } else {
      setTracks((prev) => {
        const updated = [...prev, ...result];
        // Update cache with new results
        categoryCache.set(currentQuery, updated);
        return updated;
      });
      setPage((p) => p + 1);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, fetchYT, currentQuery, page]);

  // Load default on mount
  useEffect(() => {
    setCurrentQuery(CATEGORIES[0].query);
    loadInitial(CATEGORIES[0].query);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) return;
    debounceRef.current = setTimeout(() => {
      setCurrentQuery(query.trim());
      loadInitial(query.trim());
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Clear search → restore category (only if not already loaded)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (query === "" && currentQuery !== activeCategory.query) {
      setCurrentQuery(activeCategory.query);
      loadInitial(activeCategory.query);
    }
  }, [query]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    if (bottomRef.current) observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  const handleCategoryClick = (cat: typeof CATEGORIES[0]) => {
    setActiveCategory(cat);
    setQuery("");
    setCurrentQuery(cat.query);
    loadInitial(cat.query);
  };

  const isSearchMode = query.trim().length > 0;
  const isTrackPlaying = (t: Track) => currentTrack?.src === t.src && isPlaying;

  // Resolve YT track to audio URL then play
  const handlePlay = useCallback(async (clickedTrack: Track, allTracks: Track[], idx: number) => {
    setResolvingIdx(idx);
    const videoId = clickedTrack.songId || clickedTrack.src.split("v=")[1]?.split("&")[0];
    
    // Try to resolve audio URL, but always have a fallback
    let audioUrl: string | null = null;
    if (videoId) {
      audioUrl = await resolveAudioUrl(videoId);
    }

    if (audioUrl) {
      // Play as native audio (better for background play)
      const resolvedTrack: Track = {
        ...clickedTrack,
        src: audioUrl,
        type: "audio" as const,
      };
      const playlist = allTracks.map((t, i) => i === idx ? resolvedTrack : t);
      playTrackList(playlist, idx);
    } else {
      // Fallback: play via ReactPlayer (YouTube iframe) - always works
      const youtubeTrack = {
        ...clickedTrack,
        type: "youtube" as const,
      };
      const playlist = allTracks.map((t, i) => i === idx ? youtubeTrack : t);
      playTrackList(playlist, idx);
    }
    setResolvingIdx(null);
  }, [playTrackList]);

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden pb-32 md:pb-28 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 md:px-6 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Play size={16} className="text-white ml-0.5" fill="white" />
          </div>
          <div>
              <h1 className="text-sm md:text-lg font-bold text-foreground leading-tight">YouTube Music</h1>
              <p className="text-[9px] md:text-[10px] text-muted-foreground">Stream from YouTube</p>
          </div>
        </div>
        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
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
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Section Title + Play All */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isSearchMode ? (
              <>
                <Search size={15} className="text-primary" />
                <h2 className="text-xs md:text-sm font-bold text-foreground">"{query}"</h2>
              </>
            ) : (
              <>
                <span className="text-base">{activeCategory.emoji}</span>
                <h2 className="text-xs md:text-sm font-bold text-foreground">{activeCategory.label}</h2>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">YT</span>
              </>
            )}
          </div>
          {tracks.length > 0 && (
            <button
              onClick={() => handlePlay(tracks[0], tracks, 0)}
              className="flex items-center gap-1 md:gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-primary text-white text-[10px] md:text-xs font-medium hover:bg-primary/80 transition-colors"
            >
              <Play size={10} fill="currentColor" /> Play All
            </button>
          )}
        </div>

        {/* Initial Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 md:py-16 gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 size={16} className="text-primary animate-spin md:w-5 md:h-5" />
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Loading from YouTube...</p>
          </div>
        )}

        {/* No results */}
        {!loading && tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 md:py-16 gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted flex items-center justify-center">
              <Search size={18} className="text-muted-foreground md:w-5 md:h-5" />
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">No results found</p>
          </div>
        )}

        {/* Track List */}
        {!loading && tracks.length > 0 && (
          <div className="space-y-1">
            {tracks.map((track, i) => (
              <div
                key={track.src + i}
                onClick={() => handlePlay(track, tracks, i)}
                className={`flex items-center gap-2 md:gap-3 p-2 md:p-2.5 rounded-xl cursor-pointer transition-all group ${
                  isTrackPlaying(track)
                    ? "bg-primary/10 border border-primary/20"
                    : resolvingIdx === i ? "bg-muted/40" : "hover:bg-muted/60"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img src={track.cover} alt="" width={56} height={56} loading="lazy" className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover shadow-md" />
                  <div className={`absolute inset-0 rounded-lg flex items-center justify-center transition-all ${
                    isTrackPlaying(track) ? "bg-black/40" : resolvingIdx === i ? "bg-black/50" : "bg-black/0 group-hover:bg-black/40"
                  }`}>
                    {resolvingIdx === i ? (
                      <Loader2 size={18} className="text-white animate-spin" />
                    ) : isTrackPlaying(track) ? (
                      <Pause size={18} className="text-white" />
                    ) : (
                      <Play size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                    )}
                  </div>
                  <span className="absolute bottom-0.5 right-0.5 text-[7px] font-bold text-white bg-primary px-1 py-0.5 rounded leading-none">YT</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs md:text-sm font-medium truncate ${isTrackPlaying(track) ? "text-primary" : "text-foreground"}`}>
                    {track.title}
                  </p>
                  <p className="text-[10px] md:text-[11px] text-muted-foreground truncate">{track.artist}</p>
                  {track.duration > 0 && (
                    <p className="text-[9px] md:text-[10px] text-muted-foreground/60 mt-0.5">
                      {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, "0")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Desktop: hover visible, Mobile: always visible */}
                  <button
                    onClick={(e) => { e.stopPropagation(); addToQueue(track); }}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-muted hover:bg-primary/20 flex items-center justify-center transition-colors md:opacity-0 md:group-hover:opacity-100"
                    title="Add to queue"
                  >
                    <Plus size={12} className="text-muted-foreground md:w-3.5 md:h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuTrack(track); }}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                    title="More options"
                  >
                    <MoreVertical size={14} className="text-muted-foreground md:w-3.5 md:h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Infinite scroll trigger */}
            <div ref={bottomRef} className="py-2 flex justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs py-3">
                  <Loader2 size={14} className="animate-spin text-primary" />
                  <span>Loading more...</span>
                </div>
              )}
              {!loadingMore && !hasMore && tracks.length > 0 && (
                <p className="text-[11px] text-muted-foreground py-3">No more results</p>
              )}
            </div>
          </div>
        )}

        {/* Quick Picks — shown when no search */}
        {!isSearchMode && !loading && (
          <div className="mt-6 mb-4">
            <h3 className="text-xs md:text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Music2 size={14} className="text-primary" /> Quick Picks
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {QUICK_PICKS.map((pick) => (
                <button
                  key={pick.label}
                  onClick={() => handleCategoryClick({ label: pick.label, emoji: pick.emoji, query: pick.query })}
                  className="flex items-center gap-2 md:gap-2.5 p-2.5 md:p-3 rounded-xl bg-muted hover:bg-muted/70 border border-border hover:border-primary/30 transition-all text-left"
                >
                  <span className="text-lg md:text-xl">{pick.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] md:text-xs font-semibold text-foreground truncate">{pick.label}</p>
                    <p className="text-[8px] md:text-[9px] text-muted-foreground">YouTube</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sheet Menu */}
      {menuTrack && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setMenuTrack(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full bg-card rounded-t-2xl border-t border-border p-4 pb-8 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Track info */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
              <img src={menuTrack.cover} alt="" width={48} height={48} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{menuTrack.title}</p>
                <p className="text-xs text-muted-foreground truncate">{menuTrack.artist}</p>
                <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">YouTube</span>
              </div>
            </div>
            {/* Actions */}
            <div className="space-y-1">
              <button
                onClick={() => { handlePlay(menuTrack, tracks, tracks.findIndex(t => t.src === menuTrack.src)); setMenuTrack(null); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Play size={15} className="text-primary ml-0.5" />
                </div>
                <span className="text-sm font-medium text-foreground">Play Now</span>
              </button>
              <button
                onClick={() => { addToQueue(menuTrack); setMenuTrack(null); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <ListPlus size={15} className="text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Add to Queue</span>
              </button>
              <button
                onClick={() => { playNext(menuTrack); setMenuTrack(null); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center">
                  <PlaySquare size={15} className="text-green-400" />
                </div>
                <span className="text-sm font-medium text-foreground">Play Next</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
