
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, X, Play, TrendingUp, Music2, Loader2, Heart, Clock, Plus, RefreshCw, User, Disc3, ListMusic } from "lucide-react-native";
import { usePlayer } from "@/context/PlayerContext";
import { useLocalData } from "@/hooks/useLocalData";
import { usePlaylists } from "@/hooks/usePlaylists";
import { toast } from "@/hooks/use-toast";
import { Track } from "@/data/playlist";

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";
const DEBOUNCE_MS = 500;

type SearchCategory = "all" | "songs" | "albums" | "artists" | "playlists";

type SearchResult = {
  name: string;
  primaryArtists?: string;
  album?: { name: string } | string;
  duration?: string | number;
  image?: { quality: string; link: string }[];
  downloadUrl?: { quality: string; link: string }[];
  id: string;
  language?: string;
};

const LANGUAGES = [
  { key: "all", label: "All" },
  { key: "bengali", label: "বাংলা" },
  { key: "hindi", label: "Hindi" },
  { key: "english", label: "English" },
  { key: "tamil", label: "Tamil" },
  { key: "telugu", label: "Telugu" },
  { key: "punjabi", label: "Punjabi" },
];

const getImage = (images: { quality: string; link: string }[], prefer = "500x500") =>
  images?.find((img) => img.quality === prefer)?.link ||
  images?.find((img) => img.quality === "150x150")?.link ||
  images?.[images.length - 1]?.link || "";

const parseSongToTrack = (s: {
  name: string;
  primaryArtists?: string;
  album?: { name: string } | string;
  duration?: string | number;
  image?: { quality: string; link: string }[];
  downloadUrl?: { quality: string; link: string }[];
  id: string;
  language?: string;
}, idOffset: number): Track | null => {
  const url96 = s.downloadUrl?.find((d) => d.quality === "96kbps")?.link;
  const url160 = s.downloadUrl?.find((d) => d.quality === "160kbps")?.link;
  const url320 = s.downloadUrl?.find((d) => d.quality === "320kbps")?.link;
  const bestUrl = url160 || url96 || url320 || s.downloadUrl?.[0]?.link || "";
  if (!bestUrl) return null;
  return {
    id: idOffset,
    title: s.name,
    artist: s.primaryArtists || "Unknown",
    album: typeof s.album === "string" ? s.album : s.album?.name || "",
    cover: s.image?.find((img) => img.quality === "500x500")?.link ||
           s.image?.find((img) => img.quality === "150x150")?.link || "",
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
};

interface SearchOverlayProps {
  onClose: () => void;
}

export const SearchOverlay = ({ onClose }: SearchOverlayProps) => {
  const { playTrack, playTrackList, currentTrack, isPlaying, addToQueue, playNext } = usePlayer();
  const { isFavorite, toggleFavorite, searchHistory, addToHistory, clearHistory, removeHistoryItem } = useLocalData();
  const { playlists, createPlaylist, addToPlaylist } = usePlaylists();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<SearchCategory>("all");
  const [langFilter, setLangFilter] = useState("all");

  // Results
  const [songResults, setSongResults] = useState<Track[]>([]);
  const [albumResults, setAlbumResults] = useState<{ id: string; title: string; image: { quality: string; link: string }[]; description?: string; type: string }[]>([]);
  const [artistResults, setArtistResults] = useState<{ id: string; title: string; image: { quality: string; link: string }[]; description?: string; type: string }[]>([]);
  const [playlistResults, setPlaylistResults] = useState<{ id: string; name: string; image: string; songCount: string }[]>([]);
  const [topResult, setTopResult] = useState<{ id: string; title: string; image: { quality: string; link: string }[]; type: string; description?: string } | null>(null);

  // Expanded views
  const [artistSongs, setArtistSongs] = useState<{ name: string; songs: Track[] } | null>(null);
  const [artistLoading, setArtistLoading] = useState(false);
  const [albumSongs, setAlbumSongs] = useState<{ name: string; id: string; songs: Track[] } | null>(null);
  const [albumLoading, setAlbumLoading] = useState(false);

  // Suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Trending
  const [trending, setTrending] = useState<Track[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Load trending
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch(`${API_BASE}/modules?language=hindi,bengali,english`);
        if (!res.ok) return;
        const mod = await res.json();
        const trendingRaw = mod.data?.trending?.songs || [];
        const ids = trendingRaw.slice(0, 20).map((s: { id: string }) => s.id).filter(Boolean);
        if (ids.length > 0) {
          const songRes = await fetch(`${API_BASE}/songs?id=${ids.join(",")}`);
          if (songRes.ok) {
            const songData = await songRes.json();
            const rawSongs = songData.data || [];
            const tracks: Track[] = [];
            rawSongs.forEach((s: {
              name: string;
              primaryArtists?: string;
              album?: { name: string } | string;
              duration?: string | number;
              image?: { quality: string; link: string }[];
              downloadUrl?: { quality: string; link: string }[];
              id: string;
            }, i: number) => {
              const track = parseSongToTrack(s, 7500 + i);
              if (track) tracks.push(track);
            });
            setTrending(tracks);
          }
        }
      } catch { /* ignore */ }
      setTrendingLoading(false);
    };
    fetchTrending();
  }, []);

  // Clear all results
  const clearResults = () => {
    setSongResults([]);
    setAlbumResults([]);
    setArtistResults([]);
    setPlaylistResults([]);
    setTopResult(null);
    setArtistSongs(null);
    setAlbumSongs(null);
  };

  // Search functions
  const searchSongs = useCallback(async (q: string, lang: string) => {
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(q)}&page=1&limit=50`);
      if (!res.ok) return [];
      const json = await res.json();
      let results = json.data?.results || [];
      if (lang !== "all") {
        results = results.filter((s: { language?: string }) => s.language === lang);
      }
      const tracks: Track[] = [];
      results.slice(0, 50).forEach((s: {
        name: string;
        primaryArtists?: string;
        album?: { name: string } | string;
        duration?: string | number;
        image?: { quality: string; link: string }[];
        downloadUrl?: { quality: string; link: string }[];
        id: string;
      }, i: number) => {
        const track = parseSongToTrack(s, 8000 + i);
        if (track) tracks.push(track);
      });
      return tracks;
    } catch { return []; }
  }, []);

  const searchAlbums = useCallback(async (q: string) => {
    try {
      const res = await fetch(`${API_BASE}/search/albums?query=${encodeURIComponent(q)}&page=1&limit=50`);
      if (!res.ok) return [];
      const json = await res.json();
      const results = json.data?.results || [];
      return results.map((a: {
        id: string;
        name?: string;
        title?: string;
        image?: { quality: string; link: string }[];
        description?: string | { text?: string };
        primaryArtists?: string;
      }) => {
        const desc = a.description;
        const descStr = typeof desc === 'string' ? desc : (typeof desc === 'object' && desc !== null && 'text' in desc ? String((desc as { text?: string }).text || "") : "");
        return {
          id: a.id,
          title: a.name || a.title || "",
          image: a.image || [],
          description: descStr || a.primaryArtists || "",
          type: "album" as const,
        };
      });
    } catch { return []; }
  }, []);

  const searchArtists = useCallback(async (q: string) => {
    try {
      const res = await fetch(`${API_BASE}/search/artists?query=${encodeURIComponent(q)}&page=1&limit=50`);
      if (!res.ok) return [];
      const json = await res.json();
      const results = json.data?.results || [];
      return results.map((a: {
        id: string;
        name?: string;
        title?: string;
        image?: { quality: string; link: string }[];
        description?: string | { text?: string };
        role?: string;
      }) => ({
        id: a.id,
        title: a.name || a.title || "",
        image: a.image || [],
        description: typeof a.description === 'string' ? a.description : (typeof a.role === 'string' ? a.role : ""),
        type: "artist" as const,
      }));
    } catch { return []; }
  }, []);

  const searchPlaylists = useCallback(async (q: string) => {
    try {
      const res = await fetch(`${API_BASE}/search/playlists?query=${encodeURIComponent(q)}&page=1&limit=50`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data?.results || []).map((p: {
        id: string;
        name: string;
        image?: { quality: string; link: string }[];
        songCount?: string;
      }) => ({
        id: p.id,
        name: p.name,
        image: getImage(p.image || []),
        songCount: p.songCount || "0",
      }));
    } catch { return []; }
  }, []);

  const searchAll = useCallback(async (q: string) => {
    try {
      const res = await fetch(`${API_BASE}/search/all?query=${encodeURIComponent(q)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch { return null; }
  }, []);

  // Main search dispatcher
  const doSearch = useCallback(async (q: string, cat?: SearchCategory, lang?: string) => {
    if (!q.trim()) {
      clearResults();
      return;
    }
    setLoading(true);
    const activeCat = cat ?? category;
    const activeLang = lang ?? langFilter;

    try {
      if (activeCat === "all") {
        const [allData, songs, albums] = await Promise.all([
          searchAll(q),
          searchSongs(q, activeLang),
          searchAlbums(q),
        ]);
        const top = allData?.topQuery?.results?.[0];
        const topDesc = top?.description;
        setTopResult(top ? {
          id: top.id || "",
          title: top.title || top.name || "",
          image: top.image || [],
          type: top.type || "song",
          description: typeof topDesc === 'string' ? topDesc : (typeof topDesc === 'object' && topDesc !== null && 'text' in topDesc ? String((topDesc as { text?: string }).text || "") : ""),
        } : null);
        const artists = (allData?.artists?.results || []).map((a: {
          id: string;
          name?: string;
          title?: string;
          image?: { quality: string; link: string }[];
          description?: string | { text?: string };
          role?: string;
        }) => ({
          id: a.id,
          title: a.name || a.title || "",
          image: a.image || [],
          description: typeof a.description === 'string' ? a.description : (typeof a.role === 'string' ? a.role : ""),
          type: "artist" as const,
        }));
        setArtistResults(artists);
        setSongResults(songs);
        setAlbumResults(albums);
      } else if (activeCat === "songs") {
        const songs = await searchSongs(q, activeLang);
        setSongResults(songs);
        setAlbumResults([]);
        setArtistResults([]);
        setTopResult(null);
      } else if (activeCat === "albums") {
        const albums = await searchAlbums(q);
        setAlbumResults(albums);
        setSongResults([]);
        setArtistResults([]);
        setTopResult(null);
      } else if (activeCat === "artists") {
        const artists = await searchArtists(q);
        setArtistResults(artists);
        setSongResults([]);
        setAlbumResults([]);
        setTopResult(null);
      } else if (activeCat === "playlists") {
        const pls = await searchPlaylists(q);
        setPlaylistResults(pls);
        setSongResults([]);
        setAlbumResults([]);
        setArtistResults([]);
        setTopResult(null);
      }
    } catch (err) { console.error("Search error:", err); }
    setLoading(false);
  }, [category, langFilter, searchAll, searchSongs, searchAlbums, searchArtists, searchPlaylists]);

  // Auto-suggestions
  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(q)}&page=1&limit=5`);
      if (!res.ok) return;
      const json = await res.json();
      const results = json.data?.results || [];
      const names = results.map((s: { name: string }) => s.name).filter(Boolean);
      setSuggestions([...new Set(names)].slice(0, 5) as string[]);
    } catch { setSuggestions([]); }
  }, []);

  // Input handler with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim()) {
        doSearch(val);
        fetchSuggestions(val);
      } else {
        clearResults();
        setSuggestions([]);
      }
    }, DEBOUNCE_MS);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    addToHistory(suggestion);
    doSearch(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      setShowSuggestions(false);
      addToHistory(query.trim());
      doSearch(query.trim());
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Category change
  const handleCategoryChange = (cat: SearchCategory) => {
    setCategory(cat);
    clearResults();
    setArtistSongs(null);
    setAlbumSongs(null);
    if (query.trim()) {
      doSearch(query, cat);
    }
  };

  // Fetch artist songs
  const fetchArtistSongs = async (artistName: string) => {
    setArtistLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(artistName)}&page=1&limit=20`);
      if (!res.ok) { setArtistLoading(false); return; }
      const json = await res.json();
      const results = (json.data?.results || []).filter((s: { downloadUrl?: unknown[] }) => s.downloadUrl?.length > 0);
      const tracks: Track[] = [];
      results.slice(0, 15).forEach((s: {
        name: string;
        primaryArtists?: string;
        album?: { name: string } | string;
        duration?: string | number;
        image?: { quality: string; link: string }[];
        downloadUrl?: { quality: string; link: string }[];
        id: string;
      }, i: number) => {
        const track = parseSongToTrack(s, 9000 + i);
        if (track) tracks.push(track);
      });
      setArtistSongs({ name: artistName, songs: tracks });
    } catch { /* ignore */ }
    setArtistLoading(false);
  };

  // Fetch album songs
  const fetchAlbumSongs = async (albumId: string, albumName: string) => {
    setAlbumLoading(true);
    try {
      const res = await fetch(`${API_BASE}/albums?id=${albumId}`);
      if (!res.ok) { setAlbumLoading(false); return; }
      const json = await res.json();
      const songs = json.data?.songs || [];
      const albumImage = json.data?.image?.find((img: { quality: string }) => img.quality === "500x500")?.link ||
                         json.data?.image?.find((img: { quality: string }) => img.quality === "150x150")?.link || "";
      const tracks: Track[] = [];
      songs
        .filter((s: { downloadUrl?: unknown[] }) => s.downloadUrl?.length > 0)
        .forEach((s: {
          name: string;
          primaryArtists?: string;
          album?: { name: string } | string;
          duration?: string | number;
          image?: { quality: string; link: string }[];
          downloadUrl?: { quality: string; link: string }[];
          id: string;
        }, i: number) => {
          const track = parseSongToTrack(s, 9500 + i);
          if (track) {
            if (!track.cover) track.cover = albumImage;
            if (!track.album) track.album = albumName;
            tracks.push(track);
          }
        });
      setAlbumSongs({ name: albumName, id: albumId, songs: tracks });
      if (tracks.length > 0) playTrackList(tracks, 0);
    } catch { /* ignore */ }
    setAlbumLoading(false);
  };

  // Add to queue with toast
  const handleAddToQueue = (track: Track) => {
    addToQueue(track);
    toast({
      title: "Added to Queue",
      description: track.title,
      duration: 2000,
    });
  };

  const handleSongClick = (track: Track, allTracks?: Track[]) => {
    if (allTracks && allTracks.length > 0) {
      const idx = allTracks.findIndex((t) => t.src === track.src);
      playTrackList(allTracks, idx >= 0 ? idx : 0);
    } else {
      playTrack(track);
    }
  };

  const isSearchMode = query.trim().length > 0;
  const hasAnyResults = songResults.length > 0 || albumResults.length > 0 || artistResults.length > 0 || playlistResults.length > 0;

  const CATEGORIES: { key: SearchCategory; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <Search size={13} /> },
    { key: "songs", label: "Songs", icon: <Music2 size={13} /> },
    { key: "albums", label: "Albums", icon: <Disc3 size={13} /> },
    { key: "artists", label: "Artists", icon: <User size={13} /> },
    { key: "playlists", label: "Playlists", icon: <ListMusic size={13} /> },
  ];

  // Song row component for reuse
  const SongRow = ({ track, tracks, index }: { track: Track; tracks: Track[]; index?: number }) => {
    const isActive = currentTrack?.src === track.src;
    const liked = isFavorite(track.src);
    return (
      <div
        key={`${track.src}-${index ?? 0}`}
        onClick={() => handleSongClick(track, tracks)}
        className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all group ${
          isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-accent border border-transparent"
        }`}
      >
        {index !== undefined && (
          <span className="text-[10px] text-muted-foreground w-5 text-center flex-shrink-0 group-hover:hidden">{index + 1}</span>
        )}
        <div className="relative flex-shrink-0">
          <img src={track.cover} alt="" className={`w-11 h-11 rounded-lg object-cover shadow-sm ${isActive ? "ring-2 ring-primary" : ""}`} />
          <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
            {isActive && isPlaying ? (
              <div className="flex items-end gap-0.5">
                <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" />
                <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
                <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
              </div>
            ) : (
              <Play size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-semibold truncate transition-colors ${isActive ? "text-primary" : "text-foreground group-hover:text-primary"}`}>{track.title}</p>
          <p className="text-[11px] text-muted-foreground truncate">{track.artist}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleAddToQueue(track); }}
          className="p-1.5 rounded-full text-muted-foreground/0 group-hover:text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all flex-shrink-0"
          title="Add to Queue"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(track); }}
          className={`p-1.5 rounded-full transition-all flex-shrink-0 ${liked ? "text-red-500" : "text-muted-foreground/0 group-hover:text-muted-foreground hover:text-red-500"}`}
        >
          <Heart size={14} fill={liked ? "currentColor" : "none"} />
        </button>
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-start justify-center">
      <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-auto h-[92vh] sm:h-auto sm:max-h-[85vh] sm:mt-12 md:mt-16 bg-background border border-border sm:rounded-2xl rounded-t-2xl rounded-b-none overflow-hidden flex flex-col shadow-2xl">

        {/* Search Bar */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2 sm:p-4 sm:pb-3 border-b border-border flex-shrink-0">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => query.length >= 2 && setShowSuggestions(true)}
              placeholder="Search songs, artists, albums..."
              className="w-full pl-9 pr-8 py-2 sm:py-2.5 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); clearResults(); setSuggestions([]); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}

            {/* Auto-suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && !loading && (
              <div className="absolute top-full left-0 right-0 mt-1 z-[100] bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors text-left"
                  >
                    <Search size={13} className="text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex-shrink-0 border-b border-border">
          <div className="flex items-center gap-1.5 px-3 sm:px-4 pt-2 pb-1.5 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategoryChange(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full font-medium whitespace-nowrap transition-all ${
                  category === cat.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Language filter - separate row */}
          <div className="flex items-center gap-1 px-3 sm:px-4 pb-2 overflow-x-auto scrollbar-hide">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.key}
                onClick={() => {
                  setLangFilter(lang.key);
                  if (query.trim()) doSearch(query, category, lang.key);
                }}
                className={`px-2.5 py-1 text-[10px] rounded-full font-medium whitespace-nowrap transition-colors ${
                  langFilter === lang.key
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-11 h-11 rounded-lg bg-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-3 bg-muted rounded w-3/4 mb-1.5" />
                  <div className="h-2 bg-muted/60 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {!loading && (
          <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 pb-28 sm:pb-6" onClick={() => setShowSuggestions(false)}>
            {/* Default: Trending + History */}
            {!isSearchMode && (
              <>
                {searchHistory.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <Clock size={13} /> Recent
                      </div>
                      <button onClick={clearHistory} className="text-[10px] text-muted-foreground hover:text-destructive">Clear</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {searchHistory.slice(0, 8).map((h) => (
                        <div key={h} className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-card border border-border hover:bg-accent transition-colors">
                          <button onClick={() => { setQuery(h); addToHistory(h); doSearch(h); }} className="text-xs text-foreground">{h}</button>
                          <button onClick={() => removeHistoryItem(h)} className="p-0.5 text-muted-foreground hover:text-destructive"><X size={10} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={16} className="text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Trending Now</h3>
                  </div>
                  {trendingLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-primary" />
                    </div>
                  )}
                  {trending.map((track, i) => (
                    <SongRow key={track.src} track={track} tracks={trending} index={i} />
                  ))}
                </div>
              </>
            )}

            {/* Search Results */}
            {isSearchMode && (
              <>
                {!hasAnyResults && (
                  <div className="text-center py-12">
                    <Search size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No results for "{query}"</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term</p>
                  </div>
                )}

                {/* Top Result (All category) */}
                {category === "all" && topResult && !artistSongs && (
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Result</h3>
                    <div
                      onClick={() => {
                        if (topResult.type === "artist") {
                          fetchArtistSongs(topResult.title);
                        } else if (topResult.type === "album") {
                          fetchAlbumSongs(topResult.id, topResult.title);
                        } else if (songResults.length > 0) {
                          handleSongClick(songResults[0], songResults);
                        }
                      }}
                      className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={getImage(topResult.image)} alt="" className={`w-16 h-16 object-cover ${topResult.type === "artist" ? "rounded-full" : "rounded-lg"}`} />
                          <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                            <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                              <Play size={16} className="text-primary-foreground ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-bold text-foreground truncate">{topResult.title}</p>
                          <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                            {topResult.type === "artist" && <User size={11} />}
                            {topResult.type === "album" && <Disc3 size={11} />}
                            {topResult.type === "song" && <Music2 size={11} />}
                            {topResult.type}
                          </p>
                          {topResult.description && typeof topResult.description === 'string' && <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{topResult.description}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Artist Songs expanded */}
                {artistSongs && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <User size={12} /> {artistSongs.name}
                      </h3>
                      <button onClick={() => setArtistSongs(null)} className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent">
                        <X size={14} />
                      </button>
                    </div>
                    {artistLoading ? (
                      <div className="flex items-center justify-center py-6"><Loader2 size={20} className="animate-spin text-primary" /></div>
                    ) : (
                      <>
                        {artistSongs.songs.map((track, i) => <SongRow key={track.src} track={track} tracks={artistSongs.songs} />)}
                        {artistSongs.songs.length > 0 && (
                          <button
                            onClick={() => fetchArtistSongs(artistSongs.name)}
                            className="w-full mt-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                          >
                            <RefreshCw size={13} /> Refresh
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Album Songs expanded */}
                {albumSongs && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Disc3 size={12} /> {albumSongs.name}
                      </h3>
                      <button onClick={() => setAlbumSongs(null)} className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent">
                        <X size={14} />
                      </button>
                    </div>
                    {albumLoading ? (
                      <div className="flex items-center justify-center py-6"><Loader2 size={20} className="animate-spin text-primary" /></div>
                    ) : (
                      albumSongs.songs.map((track, i) => <SongRow key={track.src} track={track} tracks={albumSongs.songs} />)
                    )}
                  </div>
                )}

                {/* Songs */}
                {songResults.length > 0 && !artistSongs && (
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Music2 size={12} /> Songs
                      <span className="text-muted-foreground/50 font-normal">({songResults.length})</span>
                    </h3>
                    <div className="space-y-0.5">
                      {songResults.slice(0, category === "all" ? 10 : 50).map((track, i) => (
                        <SongRow key={track.src} track={track} tracks={songResults} />
                      ))}
                    </div>
                    {category === "all" && songResults.length > 10 && (
                      <button
                        onClick={() => handleCategoryChange("songs")}
                        className="w-full mt-2 py-2 text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        Show all {songResults.length} songs
                      </button>
                    )}
                  </div>
                )}

                {/* Albums */}
                {albumResults.length > 0 && !albumSongs && (
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Disc3 size={12} /> Albums
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {albumResults.slice(0, 20).map((album) => (
                        <div
                          key={album.id}
                          onClick={() => fetchAlbumSongs(album.id, album.title)}
                          className="flex-shrink-0 w-28 group cursor-pointer"
                        >
                          <div className="relative mb-1.5">
                            <img src={getImage(album.image)} alt="" className="w-28 h-28 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                            <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                                <Play size={14} className="text-primary-foreground ml-0.5" />
                              </div>
                            </div>
                          </div>
                          <p className="text-[11px] font-medium text-foreground truncate">{album.title}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{typeof album.description === 'string' ? album.description : "Album"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Artists */}
                {artistResults.length > 0 && !artistSongs && (
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <User size={12} /> Artists
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                      {artistResults.slice(0, 20).map((artist) => (
                        <div
                          key={artist.id}
                          onClick={() => fetchArtistSongs(artist.title)}
                          className="flex-shrink-0 flex flex-col items-center gap-1.5 group cursor-pointer"
                        >
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                            <img src={getImage(artist.image)} alt={artist.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          </div>
                          <p className="text-[10px] md:text-xs text-foreground text-center w-16 md:w-20 truncate font-medium">{artist.title}</p>
                          <p className="text-[8px] text-muted-foreground">Artist</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Playlists */}
                {category === "playlists" && playlistResults.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ListMusic size={12} /> Playlists
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {playlistResults.map((pl) => (
                        <div
                          key={pl.id}
                          onClick={() => {
                            fetch(`${API_BASE}/playlists?id=${pl.id}`)
                              .then(r => r.json())
                              .then(json => {
                                const songs = (json.data?.songs || [])
                                  .filter((s: { downloadUrl?: unknown[] }) => s.downloadUrl?.length > 0)
                                  .map((s: SearchResult, i: number) => parseSongToTrack(s, 30000 + i))
                                  .filter(Boolean) as Track[];
                                if (songs.length > 0) {
                                  playTrackList(songs, 0);
                                  onClose();
                                }
                              })
                              .catch(() => {});
                          }}
                          className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card hover:bg-accent transition-colors group cursor-pointer"
                        >
                          <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
                            {pl.image ? (
                              <img src={pl.image} alt={pl.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ListMusic size={24} className="text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                              <Play size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <div className="min-w-0 w-full">
                            <p className="text-xs font-semibold text-foreground truncate">{pl.name}</p>
                            <p className="text-[10px] text-muted-foreground">{pl.songCount} songs</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
