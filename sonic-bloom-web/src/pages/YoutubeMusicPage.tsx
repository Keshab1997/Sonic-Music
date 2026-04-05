import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { Search, X, Play, Pause, Plus, Loader2, Music2, MoreVertical, ListPlus, PlaySquare, RefreshCw, TrendingUp, Clock, Flame, Headphones, Radio, Shuffle, Heart, Trash2, Sparkles } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { Track } from "@/data/playlist";
import { toast } from "sonner";

const YT_API = "/api/youtube-search";
const YT_STREAM_API = "/api/yt-stream";
const DEBOUNCE_MS = 450;
const RECENT_SEARCHES_KEY = "yt_recent_searches";
const MAX_RECENT = 8;

// Popular search suggestions for autocomplete
const POPULAR_SEARCHES = [
  "Arijit Singh", "Atif Aslam", "Pritam", "Vishal Mishra",
  "Bangla new song 2026", "Hindi romantic songs", "Lofi remix",
  "Bollywood hits", "Old classics", "Devotional songs"
];

// Quick category chips
const SEARCH_CHIPS = [
  { label: "🎵 Hindi", query: "hindi songs" },
  { label: "🎶 Bangla", query: "bangla songs" },
  { label: "🌙 Lofi", query: "lofi remix" },
  { label: "💕 Romantic", query: "romantic songs" },
  { label: "🔥 Trending", query: "trending songs 2026" },
  { label: "🎸 Rock", query: "rock songs" },
  { label: "🙏 Bhajan", query: "devotional bhajan" },
  { label: "🎤 Pop", query: "pop songs" },
];

// Enhanced cache with LRU-like behavior and size limits
const MAX_CACHE_SIZE = 200;
const streamCache = new Map<string, { url: string; timestamp: number }>();
const searchCache = new Map<string, { tracks: Track[]; timestamp: number }>();
const sectionCache = new Map<string, { tracks: Track[]; timestamp: number }>();

interface CacheEntry {
  timestamp: number;
}

// Cache cleanup helper
const cleanupCache = <T extends CacheEntry>(cache: Map<string, T>, maxSize: number) => {
  if (cache.size > maxSize) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, cache.size - maxSize);
    toDelete.forEach(([key]) => cache.delete(key));
  }
};

// Suffix variants to get different results for same query
const PAGE_SUFFIXES = [
  "", " 2026", " new", " best", " hits", "top", "latest", "popular",
  "official", "full", "hd", "audio", "live", "remix", "unplugged",
];

interface YTVideo {
  videoId: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
}

// Track converter (not a component, so no memo needed)
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

// Fetch direct audio URL from yt-stream API with improved caching
const resolveAudioUrl = async (videoId: string): Promise<string | null> => {
  const cached = streamCache.get(videoId);
  if (cached) {
    // Return cached URL if less than 1 hour old
    if (Date.now() - cached.timestamp < 3600000) {
      return cached.url;
    }
    streamCache.delete(videoId);
  }
  
  // Try backend API
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000); // Reduced timeout
    const res = await fetch(`${YT_STREAM_API}?id=${videoId}`, { signal: ctrl.signal }).catch(() => null);
    clearTimeout(timer);
    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.audioUrl) {
        streamCache.set(videoId, { url: data.audioUrl, timestamp: Date.now() });
        cleanupCache(streamCache, MAX_CACHE_SIZE);
        return data.audioUrl;
      }
    }
  } catch { /* silent */ }

  return null;
};

// Batch-resolve audio URLs with improved concurrency control
const batchResolveAudio = async (
  tracks: Track[],
  onResolved: (videoId: string, audioUrl: string) => void,
  maxConcurrent = 2 // Reduced from 3
) => {
  const pending = tracks.filter((t) => t.type === "youtube" && t.songId && !streamCache.has(t.songId));
  if (pending.length === 0) return;
  
  let idx = 0;
  
  const worker = async () => {
    while (idx < pending.length) {
      const currentIndex = idx++;
      if (currentIndex >= pending.length) break;
      const track = pending[currentIndex];
      const videoId = track.songId!;
      const audioUrl = await resolveAudioUrl(videoId);
      if (audioUrl) {
        onResolved(videoId, audioUrl);
      }
    }
  };
  
  await Promise.all(Array.from({ length: Math.min(maxConcurrent, pending.length) }, () => worker()));
};

// Front page sections - stable reference
interface FrontSection {
  id: string;
  label: string;
  emoji: string;
  icon: typeof Flame;
  query: string;
  color: string;
}

const FRONT_SECTIONS: FrontSection[] = [
  { id: "trending", label: "Trending Now", emoji: "🔥", icon: Flame, query: "top trending songs 2026 hindi", color: "from-orange-500 to-red-500" },
  { id: "bangla", label: "Bangla Hits", emoji: "🎵", icon: Music2, query: "viral bangla song 2026", color: "from-green-500 to-emerald-500" },
  { id: "bollywood", label: "Bollywood Party", emoji: "🎬", icon: Play, query: "bollywood party songs 2026", color: "from-pink-500 to-rose-500" },
  { id: "lofi", label: "Lofi & Chill", emoji: "🌙", icon: Headphones, query: "hindi lofi chill remix", color: "from-purple-500 to-indigo-500" },
  { id: "romantic", label: "Romantic Melodies", emoji: "💕", icon: Heart, query: "hindi bengali romantic songs", color: "from-red-500 to-pink-500" },
  { id: "oldclassics", label: "Old Classics", emoji: "📻", icon: Radio, query: "old hindi classic songs 70s 80s", color: "from-amber-500 to-yellow-500" },
  { id: "indie", label: "Indie Bengali", emoji: "🌿", icon: Music2, query: "indie bengali band fossils chandrabindoo", color: "from-teal-500 to-cyan-500" },
  { id: "devotional", label: "Devotional", emoji: "🙏", icon: Music2, query: "bengali devotional songs kirtan bhajan", color: "from-orange-400 to-amber-500" },
];

// Helper to get random suffix for variety
const getRandomSuffix = () => ""; // Disabled: random suffix breaks server-side cache

// Shuffle array helper - optimized
const shuffleArray = <T,>(array: T[]): T[] => {
  const len = array.length;
  if (len <= 1) return [...array];
  const shuffled = array.slice();
  for (let i = len - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function YoutubeMusicPage() {
  const { playTrackList, currentTrack, isPlaying, addToQueue, playNext } = usePlayer();

  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState<typeof FRONT_SECTIONS[0] | null>(null);
  const [currentQuery, setCurrentQuery] = useState("");
  const [page, setPage] = useState(0);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [resolvingIdx, setResolvingIdx] = useState<number | null>(null);
  // Track which videoIds have resolved native audio
  const [resolvedAudio, setResolvedAudio] = useState<Map<string, string>>(new Map());
  
  // Front page sections state
  const [sectionTracks, setSectionTracks] = useState<Map<string, Track[]>>(new Map());
  const [sectionsLoading, setSectionsLoading] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"home" | "category">("home");
  
  // Lazy loading state for sections
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [loadedSections, setLoadedSections] = useState<Set<string>>(new Set());
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Search suggestions & recent searches
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const searchInputRef = useRef<HTMLInputElement>(null!);
  const suggestionsRef = useRef<HTMLDivElement>(null!);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const loadMoreRef = useRef<(() => void) | null>(null);

  // Memoized track playing check
  const isTrackPlaying = useCallback((t: Track) => currentTrack?.src === t.src && isPlaying, [currentTrack?.src, isPlaying]);

  // Fetch YT search results with caching and request cancellation
  const fetchYT = useCallback(async (q: string, pageNum: number, useRandomSuffix = false): Promise<Track[]> => {
    const suffix = PAGE_SUFFIXES[pageNum % PAGE_SUFFIXES.length];
    const finalQuery = pageNum === 0 ? q : `${q}${suffix}`;
    const cacheKey = `${finalQuery}_${pageNum}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.tracks;
    }

    try {
      const res = await fetch(`${YT_API}?q=${encodeURIComponent(finalQuery)}&page=${pageNum}`);
      if (!res.ok) return [];
      const videos: YTVideo[] = await res.json();
      const resultTracks = videos.map((v, i) => ({
        id: 70000 + pageNum * 20 + i,
        title: v.title,
        artist: v.author || "YouTube",
        album: "",
        cover: v.thumbnail || "",
        src: `https://www.youtube.com/watch?v=${v.videoId}`,
        duration: v.duration || 0,
        type: "youtube" as const,
        songId: v.videoId,
      }));
      searchCache.set(cacheKey, { tracks: resultTracks, timestamp: Date.now() });
      cleanupCache(searchCache, MAX_CACHE_SIZE);
      return resultTracks;
    } catch {
      return [];
    }
  }, []);

  // Fetch tracks for a single section - optimized
  const fetchSectionTracks = useCallback(async (sectionId: string, query: string) => {
    // Check cache first
    const cached = sectionCache.get(sectionId);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
      setSectionTracks(prev => new Map(prev).set(sectionId, cached.tracks));
      setLoadedSections(prev => new Set(prev).add(sectionId));
      return;
    }

    setSectionsLoading(prev => ({ ...prev, [sectionId]: true }));
    const sectionSeenIds = new Set<string>();
    
    try {
      const suffix = getRandomSuffix();
      const res = await fetch(`${YT_API}?q=${encodeURIComponent(query + suffix)}`);
      if (!res.ok) {
        setSectionsLoading(prev => ({ ...prev, [sectionId]: false }));
        return;
      }
      const videos: YTVideo[] = await res.json();
      const fresh = videos.filter((v) => !sectionSeenIds.has(v.videoId));
      fresh.forEach((v) => sectionSeenIds.add(v.videoId));
      const resultTracks = fresh.slice(0, 15).map((v, i) => ({
        id: 70000 + i,
        title: v.title,
        artist: v.author || "YouTube",
        album: "",
        cover: v.thumbnail || "",
        src: `https://www.youtube.com/watch?v=${v.videoId}`,
        duration: v.duration || 0,
        type: "youtube" as const,
        songId: v.videoId,
      }));
      
      // Cache the results
      sectionCache.set(sectionId, { tracks: resultTracks, timestamp: Date.now() });
      
      // Use requestIdleCallback if available for non-critical update
      const updateState = () => {
        setSectionTracks(prev => new Map(prev).set(sectionId, resultTracks));
        setLoadedSections(prev => new Set(prev).add(sectionId));
      };
      
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).requestIdleCallback(updateState, { timeout: 2000 });
      } else {
        updateState();
      }
      
      // Batch resolve audio in background (low priority)
      setTimeout(() => {
        batchResolveAudio(resultTracks, (videoId, audioUrl) => {
          setResolvedAudio((prev) => new Map(prev).set(videoId, audioUrl));
        });
      }, 100);
    } catch {
      // Silent fail
    }
    setSectionsLoading(prev => ({ ...prev, [sectionId]: false }));
  }, []);

  // Load all front page sections - optimized with better batching
  const loadFrontPage = useCallback(async (shuffle = true) => {
    setRefreshing(true);
    seenIds.current = new Set();
    setSectionTracks(new Map());
    setLoadedSections(new Set());
    // Only clear cache on manual refresh, not on every load
    
    // Shuffle sections order for variety
    const sections = shuffle ? shuffleArray(FRONT_SECTIONS) : FRONT_SECTIONS;
    
    // Fetch all sections in parallel (limit concurrency to 2)
    const batchSize = 2;
    for (let i = 0; i < sections.length; i += batchSize) {
      const batch = sections.slice(i, i + batchSize);
      await Promise.all(batch.map(section => fetchSectionTracks(section.id, section.query)));
    }
    
    setRefreshing(false);
    setInitialLoadComplete(true);
  }, [fetchSectionTracks]);

  // Lazy load sections using IntersectionObserver - optimized
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section-id');
            if (sectionId && !loadedSections.has(sectionId)) {
              setVisibleSections(prev => new Set(prev).add(sectionId));
              const section = FRONT_SECTIONS.find(s => s.id === sectionId);
              if (section) {
                fetchSectionTracks(sectionId, section.query);
              }
            }
          }
        });
      },
      { rootMargin: '300px', threshold: 0.01 }
    );

    // Observe all section containers
    sectionRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [loadedSections, fetchSectionTracks]);

  // Initial load - load sections progressively
  useEffect(() => {
    let cancelled = false;
    const loadAllSections = async () => {
      // Load sections in batches of 2 for better performance
      const batchSize = 2;
      for (let i = 0; i < FRONT_SECTIONS.length; i += batchSize) {
        if (cancelled) return;
        const batch = FRONT_SECTIONS.slice(i, i + batchSize);
        await Promise.all(
          batch.map(section => {
            setVisibleSections(prev => new Set(prev).add(section.id));
            return fetchSectionTracks(section.id, section.query);
          })
        );
      }
      if (!cancelled) setInitialLoadComplete(true);
    };
    loadAllSections();
    return () => { cancelled = true; };
  }, [fetchSectionTracks]);

  // Load category view - fast single page load
  const loadInitial = useCallback(async (q: string) => {
    seenIds.current = new Set();
    setLoading(true);
    setTracks([]);
    setPage(0);
    const result = await fetchYT(q, 0);
    setTracks(result);
    setPage(1);
    setLoading(false);
    batchResolveAudio(result, (videoId, audioUrl) => {
      setResolvedAudio((prev) => new Map(prev).set(videoId, audioUrl));
    });
  }, [fetchYT]);

  // Load next 20 songs on button click
  const loadMore = useCallback(async () => {
    if (loadingMore || viewMode !== "category") return;
    setLoadingMore(true);
    const result = await fetchYT(currentQuery, page);
    if (result.length > 0) {
      setTracks((prev) => {
        const existingIds = new Set(prev.map(t => t.songId));
        const fresh = result.filter(t => !existingIds.has(t.songId));
        return [...prev, ...fresh];
      });
      setPage((p) => p + 1);
      batchResolveAudio(result, (videoId, audioUrl) => {
        setResolvedAudio((prev) => new Map(prev).set(videoId, audioUrl));
      });
    } else {
      setPage((p) => p + 1);
    }
    setLoadingMore(false);
  }, [loadingMore, fetchYT, currentQuery, page, viewMode]);

  // Keep loadMore ref updated
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  // Debounced search - optimized
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (!query.trim()) {
      // Clear search → go back to home view
      setViewMode("home");
      setActiveCategory(null);
      setTracks([]);
      return;
    }
    
    debounceRef.current = setTimeout(() => {
      const trimmedQuery = query.trim();
      setCurrentQuery(trimmedQuery);
      setViewMode("category");
      setActiveCategory({
        id: "search",
        label: `Search: ${trimmedQuery}`,
        emoji: "🔍",
        icon: Music2,
        query: trimmedQuery,
        color: "from-blue-500 to-cyan-500"
      } as typeof FRONT_SECTIONS[0]);
      loadInitial(trimmedQuery);
    }, DEBOUNCE_MS);
    
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, loadInitial]);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== searchQuery.toLowerCase());
      const updated = [searchQuery, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    toast.info("Search history cleared");
  }, []);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    saveRecentSearch(suggestion);
    searchInputRef.current?.focus();
  }, [saveRecentSearch]);

  // Handle chip click
  const handleChipClick = useCallback((chipQuery: string) => {
    setQuery(chipQuery);
    setShowSuggestions(false);
    saveRecentSearch(chipQuery);
  }, [saveRecentSearch]);

  // Memoized handlers
  const handleCategoryClick = useCallback((cat: typeof FRONT_SECTIONS[0]) => {
    setActiveCategory(cat);
    setViewMode("category");
    setQuery("");
    setCurrentQuery(cat.query);
    setShowSuggestions(false);
    loadInitial(cat.query);
  }, [loadInitial]);

  const handleBackToHome = useCallback(() => {
    setViewMode("home");
    setActiveCategory(null);
    setQuery("");
    setTracks([]);
    setShowSuggestions(false);
  }, []);

  const handleRefresh = useCallback(() => {
    if (viewMode === "home") {
      loadFrontPage(true);
      toast.success("Refreshing with new songs!");
    } else {
      loadInitial(currentQuery);
      toast.success("Showing new songs!");
    }
  }, [viewMode, loadFrontPage, loadInitial, currentQuery]);

  // Handle search input change with suggestions
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(value.length > 0 && viewMode === "home");
  }, [viewMode]);

  // Handle search submit
  const handleSearchSubmit = useCallback(() => {
    if (query.trim()) {
      saveRecentSearch(query.trim());
      setShowSuggestions(false);
    }
  }, [query, saveRecentSearch]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return POPULAR_SEARCHES.filter(s => s.toLowerCase().includes(q)).slice(0, 5);
  }, [query]);

  // Resolve YT track to audio URL then play - fixed duplicate setResolvingIdx
  const handlePlay = useCallback(async (clickedTrack: Track, allTracks: Track[], idx: number) => {
    const videoId = clickedTrack.songId;
    
    // Check if we already have a resolved audio URL
    if (videoId && resolvedAudio.has(videoId)) {
      const audioUrl = resolvedAudio.get(videoId)!;
      const resolvedTrack: Track = { ...clickedTrack, src: audioUrl, type: "audio" as const };
      const playlist = allTracks.map((t, i) => i === idx ? resolvedTrack : t);
      playTrackList(playlist, idx);
      return;
    }

    // Try to resolve on-the-fly
    setResolvingIdx(idx);
    let audioUrl: string | null = null;
    if (videoId) {
      audioUrl = await resolveAudioUrl(videoId);
    }

    if (audioUrl) {
      // Play as native audio (works in background)
      const resolvedTrack: Track = { ...clickedTrack, src: audioUrl, type: "audio" as const };
      setResolvedAudio((prev) => new Map(prev).set(videoId!, audioUrl));
      const playlist = allTracks.map((t, i) => i === idx ? resolvedTrack : t);
      playTrackList(playlist, idx);
    } else {
      // Fallback: play via ReactPlayer (YouTube iframe) - background won't work
      const youtubeTrack = { ...clickedTrack, type: "youtube" as const };
      const playlist = allTracks.map((t, i) => i === idx ? youtubeTrack : t);
      playTrackList(playlist, idx);
    }
    setResolvingIdx(null); // Fixed: removed duplicate call
  }, [playTrackList, resolvedAudio]);

  // Memoized section data to prevent recalculation
  const sectionDataMap = useMemo(() => {
    const map = new Map<string, { tracks: Track[]; isLoading: boolean; isVisible: boolean; isLoaded: boolean }>();
    FRONT_SECTIONS.forEach(section => {
      map.set(section.id, {
        tracks: sectionTracks.get(section.id) || [],
        isLoading: sectionsLoading[section.id] || false,
        isVisible: visibleSections.has(section.id),
        isLoaded: loadedSections.has(section.id),
      });
    });
    return map;
  }, [sectionTracks, sectionsLoading, visibleSections, loadedSections]);

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden pb-32 md:pb-28 bg-background">
      {/* Header */}
      <Header
        query={query}
        setQuery={setQuery}
        onQueryChange={handleQueryChange}
        onSearchSubmit={handleSearchSubmit}
        handleRefresh={handleRefresh}
        refreshing={refreshing}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        filteredSuggestions={filteredSuggestions}
        onSuggestionClick={handleSuggestionClick}
        recentSearches={recentSearches}
        onRecentClick={handleSuggestionClick}
        onClearRecent={clearRecentSearches}
        searchInputRef={searchInputRef}
        suggestionsRef={suggestionsRef}
      />

      {/* Category View */}
      {viewMode === "category" && activeCategory && (
        <CategoryView
          activeCategory={activeCategory}
          tracks={tracks}
          loading={loading}
          loadingMore={loadingMore}
          resolvingIdx={resolvingIdx}
          isTrackPlaying={isTrackPlaying}
          handlePlay={handlePlay}
          handleBackToHome={handleBackToHome}
          handleRefresh={handleRefresh}
          addToQueue={addToQueue}
          setMenuTrack={setMenuTrack}
          onLoadMore={loadMore}
        />
      )}

      {/* Home View - Beautiful Sections */}
      {viewMode === "home" && (
        <HomeView
          sectionDataMap={sectionDataMap}
          sectionRefs={sectionRefs}
          handleCategoryClick={handleCategoryClick}
          handlePlay={handlePlay}
          isTrackPlaying={isTrackPlaying}
          handleRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}

      {/* Bottom Sheet Menu */}
      {menuTrack && (
        <BottomSheetMenu
          menuTrack={menuTrack}
          setMenuTrack={setMenuTrack}
          handlePlay={handlePlay}
          tracks={tracks}
          addToQueue={addToQueue}
          playNext={playNext}
        />
      )}
    </main>
  );
}

// Memoized Header component with search suggestions
const Header = memo(({
  query,
  setQuery,
  onQueryChange,
  onSearchSubmit,
  handleRefresh,
  refreshing,
  showSuggestions,
  setShowSuggestions,
  filteredSuggestions,
  onSuggestionClick,
  recentSearches,
  onRecentClick,
  onClearRecent,
  searchInputRef,
  suggestionsRef,
}: {
  query: string;
  setQuery: (q: string) => void;
  onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchSubmit: () => void;
  handleRefresh: () => void;
  refreshing: boolean;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  filteredSuggestions: string[];
  onSuggestionClick: (s: string) => void;
  recentSearches: string[];
  onRecentClick: (s: string) => void;
  onClearRecent: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  suggestionsRef: React.RefObject<HTMLDivElement | null>;
}) => (
  <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3">
    <div className="flex items-center justify-between mb-2 sm:mb-3">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg">
          <Play size={14} className="text-white ml-0.5" fill="white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent leading-tight">YouTube Music</h1>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground">Discover • Stream • Enjoy</p>
        </div>
      </div>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-all touch-manipulation flex-shrink-0"
        title="Refresh songs"
      >
        <RefreshCw size={16} className={`text-muted-foreground ${refreshing ? "animate-spin text-primary" : ""}`} />
      </button>
    </div>
    {/* Search Bar with Suggestions */}
    <div className="relative" ref={suggestionsRef}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
      <input
        ref={searchInputRef}
        value={query}
        onChange={onQueryChange}
        onFocus={() => query.length > 0 && setShowSuggestions(true)}
        onKeyDown={(e) => e.key === "Enter" && onSearchSubmit()}
        placeholder="Search songs, artists, albums..."
        className="w-full pl-9 pr-9 py-2.5 sm:py-3 rounded-xl bg-muted border border-border text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all min-h-[44px]"
      />
      {query ? (
        <button onClick={() => { setQuery(""); setShowSuggestions(false); }} className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center">
          <X size={16} />
        </button>
      ) : (
        <button onClick={() => searchInputRef.current?.focus()} className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center">
          <Sparkles size={16} />
        </button>
      )}
      
      {/* Suggestions Dropdown */}
      {showSuggestions && (query.length > 0 || recentSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Recent Searches */}
          {query.length === 0 && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs text-muted-foreground font-medium">Recent Searches</span>
                <button
                  onClick={onClearRecent}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
                >
                  <Trash2 size={10} /> Clear
                </button>
              </div>
              {recentSearches.slice(0, 5).map((search, i) => (
                <button
                  key={i}
                  onClick={() => onRecentClick(search)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 active:bg-zinc-700 rounded-lg transition-colors text-left"
                >
                  <Clock size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground truncate">{search}</span>
                </button>
              ))}
              <div className="h-px bg-zinc-700/50 my-1" />
            </div>
          )}
          
          {/* Search Suggestions */}
          {query.length > 0 && filteredSuggestions.length > 0 && (
            <div className="p-2">
              <span className="text-xs text-muted-foreground font-medium px-2 py-1.5 block">Suggestions</span>
              {filteredSuggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => onSuggestionClick(suggestion)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 active:bg-zinc-700 rounded-lg transition-colors text-left"
                >
                  <Search size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground truncate">{suggestion}</span>
                </button>
              ))}
            </div>
          )}
          
          {/* Quick Chips */}
          {query.length === 0 && (
            <div className="p-3">
              <span className="text-xs text-muted-foreground font-medium block mb-2">Quick Search</span>
              <div className="flex flex-wrap gap-1.5">
                {SEARCH_CHIPS.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => onRecentClick(chip.query)}
                    className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs text-foreground transition-colors touch-manipulation"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
));

// Memoized Category View component - unlimited results
const CategoryView = memo(({
  activeCategory,
  tracks,
  loading,
  loadingMore,
  resolvingIdx,
  isTrackPlaying,
  handlePlay,
  handleBackToHome,
  handleRefresh,
  addToQueue,
  setMenuTrack,
  onLoadMore,
}: {
  activeCategory: typeof FRONT_SECTIONS[0];
  tracks: Track[];
  loading: boolean;
  loadingMore: boolean;
  resolvingIdx: number | null;
  isTrackPlaying: (t: Track) => boolean;
  handlePlay: (track: Track, allTracks: Track[], idx: number) => void;
  handleBackToHome: () => void;
  handleRefresh: () => void;
  addToQueue: (track: Track) => void;
  setMenuTrack: (track: Track | null) => void;
  onLoadMore: () => void;
}) => (
  <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4">
    {/* Back Button + Section Header */}
    <div className="flex items-center gap-2 sm:gap-3 mb-4">
      <button
        onClick={handleBackToHome}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-all touch-manipulation flex-shrink-0"
      >
        <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className={`flex-1 min-w-0 p-3 sm:p-4 rounded-xl bg-gradient-to-r ${activeCategory.color} text-white`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">{activeCategory.emoji}</span>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold truncate">{activeCategory.label}</h2>
            <p className="text-[10px] sm:text-xs opacity-80">Fresh from YouTube</p>
          </div>
        </div>
      </div>
      {tracks.length > 0 && (
        <button
          onClick={() => handlePlay(tracks[0], tracks, 0)}
          className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-white text-gray-900 text-xs sm:text-sm font-bold hover:bg-white/90 transition-colors flex-shrink-0 min-h-[36px] touch-manipulation"
        >
          <Play size={12} fill="currentColor" /> <span className="hidden sm:inline">Play All</span>
        </button>
      )}
    </div>

    {/* Loading State */}
    {loading && (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 gap-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <Loader2 size={20} className="text-primary animate-spin" />
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">Loading songs...</p>
      </div>
    )}

    {/* Track List */}
    {!loading && tracks.length > 0 && (
      <div className="space-y-1.5 sm:space-y-2">
        {tracks.map((track, idx) => (
          <TrackListItem
            key={track.songId || track.src}
            track={track}
            index={idx}
            isPlaying={isTrackPlaying(track)}
            isResolving={resolvingIdx === idx}
            onPlay={() => handlePlay(track, tracks, idx)}
            onAddToQueue={() => addToQueue(track)}
            onMoreOptions={() => setMenuTrack(track)}
          />
        ))}
        {/* Load More Button */}
        <div className="py-4 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-all disabled:opacity-60 touch-manipulation min-h-[44px]"
          >
            {loadingMore ? (
              <><Loader2 size={16} className="animate-spin text-primary" /> Loading...</>
            ) : (
              <><RefreshCw size={16} className="text-primary" /> Load 20 More Songs</>
            )}
          </button>
        </div>
      </div>
    )}

    {/* Improved Empty State */}
    {!loading && tracks.length === 0 && (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 gap-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
          <Music2 size={28} className="text-muted-foreground/70" />
        </div>
        <div className="text-center">
          <p className="text-base sm:text-lg font-medium text-foreground mb-1">No songs found</p>
          <p className="text-sm text-muted-foreground">Try searching for something else or browse categories</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {SEARCH_CHIPS.slice(0, 4).map((chip, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
              {chip.label}
            </span>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors touch-manipulation mt-2"
        >
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    )}
  </div>
));

// Memoized Home View component
const HomeView = memo(({
  sectionDataMap,
  sectionRefs,
  handleCategoryClick,
  handlePlay,
  isTrackPlaying,
  handleRefresh,
  refreshing,
}: {
  sectionDataMap: Map<string, { tracks: Track[]; isLoading: boolean; isVisible: boolean; isLoaded: boolean }>;
  sectionRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  handleCategoryClick: (section: typeof FRONT_SECTIONS[0]) => void;
  handlePlay: (track: Track, allTracks: Track[], idx: number) => void;
  isTrackPlaying: (t: Track) => boolean;
  handleRefresh: () => void;
  refreshing: boolean;
}) => (
  <div className="px-0 sm:px-3 md:px-6 pt-3 sm:pt-4">
    {/* Hero Banner */}
    <div className="mx-3 sm:mx-0 mb-4 sm:mb-6 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full blur-3xl translate-y-6 -translate-x-6" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={18} />
          <span className="text-xs sm:text-sm font-medium opacity-90">Updated Daily</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">Discover New Music</h2>
        <p className="text-xs sm:text-sm opacity-90 mb-3 sm:mb-4">Fresh songs from YouTube • New tracks every visit</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white text-gray-900 text-xs sm:text-sm font-bold hover:bg-white/90 transition-colors touch-manipulation"
        >
          <Shuffle size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Shuffle & Refresh"}
        </button>
      </div>
    </div>

    {/* Section Tracks - Lazy Loaded */}
    {FRONT_SECTIONS.map((section) => {
      const sectionData = sectionDataMap.get(section.id);
      if (!sectionData) return null;
      
      const { tracks: sectionTracks, isLoading, isVisible, isLoaded } = sectionData;
      const Icon = section.icon;
      
      return (
        <div
          key={section.id}
          className="mb-4 sm:mb-6"
          ref={(el) => {
            if (el) sectionRefs.current.set(section.id, el);
          }}
          data-section-id={section.id}
        >
          {/* Section Header */}
          <div className="flex items-center justify-between px-3 sm:px-0 mb-2 sm:mb-3">
            <button
              onClick={() => handleCategoryClick(section)}
              className="flex items-center gap-2 sm:gap-3 group"
            >
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${section.color} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                <Icon size={14} className="text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">{section.label}</h3>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                  {isLoaded ? `${sectionTracks.length} songs` : 'Loading...'}
                </p>
              </div>
            </button>
            {sectionTracks.length > 0 && (
              <button
                onClick={() => handlePlay(sectionTracks[0], sectionTracks, 0)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors touch-manipulation"
              >
                <Play size={10} fill="currentColor" /> <span className="hidden sm:inline">Play</span>
              </button>
            )}
          </div>

          {/* Horizontal Scroll Tracks */}
          {!isVisible || isLoading ? (
            <SectionSkeleton />
          ) : sectionTracks.length > 0 ? (
            <div className="flex gap-2 sm:gap-3 overflow-x-auto px-3 sm:px-0 pb-2 scrollbar-hide -mx-3 sm:mx-0">
              {sectionTracks.map((track, i) => (
                <TrackCard
                  key={track.songId || i}
                  track={track}
                  index={i}
                  isPlaying={isTrackPlaying(track)}
                  onPlay={() => handlePlay(track, sectionTracks, i)}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-28 sm:h-32 rounded-xl bg-muted/50 mx-3 sm:mx-0">
              <p className="text-xs text-muted-foreground">No songs available</p>
            </div>
          )}
        </div>
      );
    })}
  </div>
));

// Memoized Bottom Sheet Menu component
const BottomSheetMenu = memo(({
  menuTrack,
  setMenuTrack,
  handlePlay,
  tracks,
  addToQueue,
  playNext,
}: {
  menuTrack: Track;
  setMenuTrack: (track: Track | null) => void;
  handlePlay: (track: Track, allTracks: Track[], idx: number) => void;
  tracks: Track[];
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
}) => {
  const trackIndex = tracks.findIndex(t => t.src === menuTrack.src);
  
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={() => setMenuTrack(null)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full pb-[128px]">
        <div
          className="w-full bg-zinc-900 rounded-t-2xl border-t border-zinc-700/50 p-4 pb-6 sm:pb-8 animate-in slide-in-from-bottom duration-300 max-h-[55vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Handle bar */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-1.5 rounded-full bg-zinc-600" />
        </div>
        {/* Track info */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-zinc-700/50">
          <img src={menuTrack.cover} alt="" width={56} height={56} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 shadow-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{menuTrack.title}</p>
            <p className="text-xs text-zinc-400 truncate mt-0.5">{menuTrack.artist}</p>
          </div>
        </div>
        {/* Actions */}
        <div className="space-y-1">
          <button
            onClick={() => { handlePlay(menuTrack, tracks, trackIndex >= 0 ? trackIndex : 0); setMenuTrack(null); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-zinc-800 active:bg-zinc-700 transition-colors text-left min-h-[52px] touch-manipulation"
          >
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Play size={18} className="text-green-400 ml-0.5" />
            </div>
            <span className="text-sm font-medium text-white">Play Now</span>
          </button>
          <button
            onClick={() => { addToQueue(menuTrack); setMenuTrack(null); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-zinc-800 active:bg-zinc-700 transition-colors text-left min-h-[52px] touch-manipulation"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <ListPlus size={18} className="text-blue-400" />
            </div>
            <span className="text-sm font-medium text-white">Add to Queue</span>
          </button>
          <button
            onClick={() => { playNext(menuTrack); setMenuTrack(null); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-zinc-800 active:bg-zinc-700 transition-colors text-left min-h-[52px] touch-manipulation"
          >
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <PlaySquare size={18} className="text-purple-400" />
            </div>
            <span className="text-sm font-medium text-white">Play Next</span>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
});

// Memoized Track List Item for category view
interface TrackListItemProps {
  track: Track;
  index: number;
  isPlaying: boolean;
  isResolving: boolean;
  onPlay: () => void;
  onAddToQueue: () => void;
  onMoreOptions: () => void;
}

const TrackListItem = memo(({
  track,
  isPlaying,
  isResolving,
  onPlay,
  onAddToQueue,
  onMoreOptions
}: TrackListItemProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const formatDuration = useMemo(() => {
    if (track.duration <= 0) return null;
    const mins = Math.floor(track.duration / 60);
    const secs = String(track.duration % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }, [track.duration]);

  return (
    <div
      onClick={onPlay}
      className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl cursor-pointer transition-all group min-h-[64px] touch-manipulation ${
        isPlaying
          ? "bg-primary/10 border border-primary/20"
          : isResolving ? "bg-muted/40" : "hover:bg-muted/60"
      }`}
    >
      <div className="relative flex-shrink-0">
        {!imageLoaded && !imageError && (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted animate-pulse" />
        )}
        {imageError && (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted flex items-center justify-center">
            <Music2 size={20} className="text-muted-foreground/50" />
          </div>
        )}
        <img
          src={track.cover}
          alt=""
          width={56}
          height={56}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover shadow-md ${
            imageLoaded ? "opacity-100" : "opacity-0 absolute inset-0"
          }`}
        />
        <div className={`absolute inset-0 rounded-lg flex items-center justify-center transition-all ${
          isPlaying ? "bg-black/40" : isResolving ? "bg-black/50" : "bg-black/0 group-hover:bg-black/40"
        }`}>
          {isResolving ? (
            <Loader2 size={20} className="text-white animate-spin" />
          ) : isPlaying ? (
            <Pause size={20} className="text-white" />
          ) : (
            <Play size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm sm:text-base font-medium truncate leading-tight ${isPlaying ? "text-primary" : "text-foreground"}`}>
          {track.title}
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">{track.artist}</p>
        {formatDuration && (
          <p className="text-[10px] sm:text-xs text-muted-foreground/60 mt-1">
            {formatDuration}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onAddToQueue(); }}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted hover:bg-primary/20 flex items-center justify-center transition-colors touch-manipulation"
          title="Add to queue"
        >
          <Plus size={16} className="text-muted-foreground" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoreOptions(); }}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors touch-manipulation"
          title="More options"
        >
          <MoreVertical size={16} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
});

// Memoized Section Skeleton for better performance
const SectionSkeleton = memo(() => (
  <div className="flex gap-2 sm:gap-3 overflow-x-auto px-3 sm:px-0 pb-2 scrollbar-hide -mx-3 sm:mx-0">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex-shrink-0 w-28 sm:w-32 animate-pulse">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </div>
        <div className="h-3 w-24 rounded-full bg-muted/60 mt-2" />
        <div className="h-2 w-16 rounded-full bg-muted/40 mt-1.5" />
      </div>
    ))}
  </div>
));

// Memoized Track Card component for performance
interface TrackCardProps {
  track: Track;
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
}

const TrackCard = memo(({ track, index, isPlaying, onPlay }: TrackCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onPlay}
      className={`flex-shrink-0 w-28 sm:w-32 group touch-manipulation ${
        isPlaying ? "scale-95" : "hover:scale-105"
      } transition-transform`}
    >
      <div className="relative">
        {/* Image placeholder */}
        {!imageLoaded && !imageError && (
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
        )}
        {imageError && (
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-muted flex items-center justify-center">
            <Music2 size={24} className="text-muted-foreground/50" />
          </div>
        )}
        <img
          src={track.cover}
          alt=""
          width={128}
          height={128}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          className={`w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover shadow-md transition-opacity duration-300 ${
            imageLoaded ? "opacity-100" : "opacity-0 absolute inset-0"
          }`}
        />
        <div className={`absolute inset-0 rounded-xl flex items-center justify-center transition-all ${
          isPlaying ? "bg-black/40" : "bg-black/0 group-hover:bg-black/40"
        }`}>
          {isPlaying ? (
            <Pause size={20} className="text-white" />
          ) : (
            <Play size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="white" />
          )}
        </div>
        {isPlaying && (
          <div className="absolute bottom-1 left-1 right-1 flex items-end justify-center gap-0.5">
            <div className="w-0.5 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
            <div className="w-0.5 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
            <div className="w-0.5 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>
      <div className="mt-1.5 sm:mt-2 px-0.5">
        <p className={`text-xs font-medium truncate leading-tight ${isPlaying ? "text-primary" : "text-foreground"}`}>
          {track.title}
        </p>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate mt-0.5">{track.artist}</p>
      </div>
    </button>
  );
});
