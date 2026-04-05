import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, X, Play, TrendingUp, Music2, Loader2, Heart, Clock, Plus, RefreshCw, User, Disc3, ListMusic, ChevronLeft, ChevronRight, ListPlus, Download, CheckCircle, MoreVertical, Share2, PlaySquare, Youtube } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useLocalData } from "@/hooks/useLocalData";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useDownloads } from "@/hooks/useDownloads";
import { toast } from "@/hooks/use-toast";
import { Track } from "@/data/playlist";

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";
const DEBOUNCE_MS = 500;
const SONGS_PER_PAGE = 40;

type SearchCategory = "all" | "songs" | "albums" | "artists" | "playlists" | "youtube";

// ==========================================
// LOCAL STORAGE CACHING (Saves metadata permanently for ultra-fast loading)
// ==========================================
const CACHE_KEY = "sonic_search_cache_v2";
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

const getInitialCache = () => {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      for (const key in parsed) {
        if (now - parsed[key].timestamp > CACHE_EXPIRY_MS) {
          delete parsed[key];
        }
      }
      return new Map<string, { data: { tracks: Track[], total: number, isYt: boolean }, timestamp: number }>(Object.entries(parsed));
    }
  } catch { /* ignore */ }
  return new Map<string, { data: { tracks: Track[], total: number, isYt: boolean }, timestamp: number }>();
};

const g_pageCache = getInitialCache();

const saveCacheToStorage = () => {
  try {
    const obj = Object.fromEntries(g_pageCache);
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch { /* ignore */ }
};

// ==========================================
// GLOBAL STATE MEMORY
// ==========================================
let g_query = "";
let g_category: SearchCategory = "all";
let g_langFilter = "all";
let g_currentPage = 1;
let g_ytCurrentPage = 1;
let g_totalResults = 0;
let g_songResults: Track[] = [];
let g_youtubeResults: Track[] = [];
let g_albumResults: any[] = [];
let g_artistResults: any[] = [];
let g_playlistResults: any[] = [];
let g_topResult: any = null;
let g_artistSongs: any = null;
let g_albumSongs: any = null;
let g_suggestions: string[] = [];
let g_scrollPos = 0;
let g_trending: Track[] = [];
let g_isYoutubeFallback = false;

const LANGUAGES = [
  { key: "all", label: "All" },
  { key: "bengali", label: "বাংলা" },
  { key: "hindi", label: "Hindi" },
  { key: "english", label: "English" },
  { key: "tamil", label: "Tamil" },
  { key: "telugu", label: "Telugu" },
  { key: "punjabi", label: "Punjabi" },
];

const extractText = (val: any, depth = 0): string => {
  if (depth > 3 || val === null || val === undefined) return "";
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) return val.map(v => extractText(v, depth + 1)).filter(Boolean).join(", ");
  if (typeof val === 'object') {
    const textContent = val.title || val.name || val.text || val.role || val.description || val.primaryArtists;
    if (textContent) return extractText(textContent, depth + 1);
    return "";
  }
  return "";
};

const getImage = (images: any, prefer = "500x500") => {
  if (typeof images === 'string') return images;
  if (!Array.isArray(images)) return "";
  return images.find((img: any) => img.quality === prefer)?.link ||
         images.find((img: any) => img.quality === "150x150")?.link ||
         images[images.length - 1]?.link || "";
};

const parseSongToTrack = (s: any, idOffset: number): Track | null => {
  if (!s || typeof s !== 'object') return null;
  let downloadUrls = Array.isArray(s.downloadUrl) ? s.downloadUrl : [];
  if (downloadUrls.length === 0 && Array.isArray(s.downloadUrls)) downloadUrls = s.downloadUrls;

  const url96 = downloadUrls.find((d: any) => d.quality === "96kbps")?.link;
  const url160 = downloadUrls.find((d: any) => d.quality === "160kbps")?.link;
  const url320 = downloadUrls.find((d: any) => d.quality === "320kbps")?.link;
  const bestUrl = url160 || url96 || url320 || downloadUrls[0]?.link || "";
  
  if (!bestUrl) return null;
  return {
    id: idOffset,
    title: extractText(s.name) || extractText(s.title) || "Unknown",
    artist: extractText(s.primaryArtists) || extractText(s.singers) || "Unknown",
    album: extractText(s.album) || "",
    cover: getImage(s.image),
    src: bestUrl,
    duration: parseInt(String(s.duration)) || 0,
    type: "audio" as const,
    songId: s.id,
    audioUrls: { ...(url96 ? { "96kbps": url96 } : {}), ...(url160 ? { "160kbps": url160 } : {}), ...(url320 ? { "320kbps": url320 } : {}) },
  };
};

interface SearchOverlayProps {
  onClose: () => void;
}

export const SearchOverlay = ({ onClose }: SearchOverlayProps) => {
  const { playTrackList, currentTrack, isPlaying, addToQueue, playNext } = usePlayer();
  const { isFavorite, toggleFavorite, searchHistory, addToHistory, clearHistory, removeHistoryItem } = useLocalData();
  const { playlists, createPlaylist, addToPlaylist } = usePlaylists();
  const { downloadTrack, isDownloaded, isDownloading } = useDownloads();

  const [query, setQuery] = useState(g_query);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<SearchCategory>(g_category);
  const [langFilter, setLangFilter] = useState(g_langFilter);
  const [currentPage, setCurrentPage] = useState(g_currentPage);
  const [pageInputValue, setPageInputValue] = useState(g_currentPage.toString());
  const [ytCurrentPage, setYtCurrentPage] = useState(g_ytCurrentPage);
  const [totalResults, setTotalResults] = useState(g_totalResults);
  const [isYoutubeFallback, setIsYoutubeFallback] = useState(g_isYoutubeFallback);

  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const [songResults, setSongResults] = useState<Track[]>(g_songResults);
  const [youtubeResults, setYoutubeResults] = useState<Track[]>(g_youtubeResults);
  const [albumResults, setAlbumResults] = useState<any[]>(g_albumResults);
  const [artistResults, setArtistResults] = useState<any[]>(g_artistResults);
  const [playlistResults, setPlaylistResults] = useState<any[]>(g_playlistResults);
  const [topResult, setTopResult] = useState<any | null>(g_topResult);

  const [artistSongs, setArtistSongs] = useState<{ name: string; songs: Track[] } | null>(g_artistSongs);
  const [artistLoading, setArtistLoading] = useState(false);
  const [albumSongs, setAlbumSongs] = useState<{ name: string; id: string; songs: Track[] } | null>(g_albumSongs);
  const [albumLoading, setAlbumLoading] = useState(false);

  const [suggestions, setSuggestions] = useState<string[]>(g_suggestions);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trending, setTrending] = useState<Track[]>(g_trending);
  const [trendingLoading, setTrendingLoading] = useState(g_trending.length === 0);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    if (!g_query) setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    g_query = query; g_category = category; g_langFilter = langFilter;
    g_currentPage = currentPage; g_ytCurrentPage = ytCurrentPage; g_totalResults = totalResults; 
    g_songResults = songResults; g_youtubeResults = youtubeResults; g_albumResults = albumResults; 
    g_artistResults = artistResults; g_playlistResults = playlistResults; g_topResult = topResult; 
    g_artistSongs = artistSongs; g_albumSongs = albumSongs; g_suggestions = suggestions; 
    g_trending = trending; g_isYoutubeFallback = isYoutubeFallback;
  }, [query, category, langFilter, currentPage, ytCurrentPage, totalResults, songResults, youtubeResults, albumResults, artistResults, playlistResults, topResult, artistSongs, albumSongs, suggestions, trending, isYoutubeFallback]);

  useEffect(() => {
    const container = document.getElementById("search-results-container");
    if (!container) return;
    setTimeout(() => { container.scrollTop = g_scrollPos; }, 10);
    const handleScroll = () => { g_scrollPos = container.scrollTop; };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [loading, artistSongs, albumSongs]);

  useEffect(() => {
    if (g_trending.length > 0) return;
    const fetchTrending = async () => {
      try {
        const res = await fetch(`${API_BASE}/modules?language=hindi,bengali,english`);
        if (!res.ok) return;
        const mod = await res.json();
        const ids = (mod.data?.trending?.songs || []).slice(0, 20).map((s: { id: string }) => s.id).filter(Boolean);
        if (ids.length > 0) {
          const songRes = await fetch(`${API_BASE}/songs?id=${ids.join(",")}`);
          if (songRes.ok) {
            const songData = await songRes.json();
            const tracks: Track[] = [];
            (songData.data || []).forEach((s: any, i: number) => {
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

  const clearResults = () => {
    setSongResults([]); setYoutubeResults([]); setAlbumResults([]); setArtistResults([]); setPlaylistResults([]);
    setTopResult(null); setArtistSongs(null); setAlbumSongs(null);
    setTotalResults(0); setCurrentPage(1); setYtCurrentPage(1); setActiveMenu(null); g_scrollPos = 0;
    setIsYoutubeFallback(false);
  };

  const searchSongs = useCallback(async (q: string, lang: string, page = 1) => {
    const cacheKey = `${q}_${lang}_${page}`;
    
    // Fetch from Cache (Lightning Fast)
    if (g_pageCache.has(cacheKey)) {
      const cachedEntry = g_pageCache.get(cacheKey)!;
      if (Date.now() - cachedEntry.timestamp < CACHE_EXPIRY_MS) {
        return cachedEntry.data;
      }
      g_pageCache.delete(cacheKey); 
    }

    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(q)}&page=${page}&limit=${SONGS_PER_PAGE}`);
      let tracks: Track[] = [];
      let total = 0; let isYt = false;
      if (res.ok) {
        const json = await res.json();
        let results = json.data?.results || [];
        total = json.data?.total || results.length;
        if (lang !== "all") {
          results = results.filter((s: any) => 
            s.language?.toLowerCase() === lang.toLowerCase() || 
            (s.primaryArtists && typeof s.primaryArtists === 'string' && s.primaryArtists.toLowerCase().includes(lang.toLowerCase()))
          );
        }
        results.forEach((s: any, i: number) => {
          const track = parseSongToTrack(s, 8000 + (page - 1) * SONGS_PER_PAGE + i);
          if (track) tracks.push(track);
        });
      }

      if (tracks.length === 0 && page === 1) {
        const ytQuery = lang !== "all" ? `${q} ${lang}` : q;
        const ytRes = await fetch(`/api/youtube-search?q=${encodeURIComponent(ytQuery)}`);
        if (ytRes.ok) {
          const ytVideos = await ytRes.json();
          tracks = ytVideos.map((v: any, i: number) => ({
            id: 90000 + i, title: extractText(v.title), artist: extractText(v.author) || "YouTube", album: "YouTube Search",
            cover: extractText(v.thumbnail) || "", src: `https://www.youtube.com/watch?v=${v.videoId}`,
            duration: parseInt(String(v.duration)) || 0, type: "youtube" as const, songId: v.videoId,
          }));
          total = tracks.length; isYt = true;
        }
      }
      
      const result = { tracks, total, isYt };
      
      // Memory management & Save
      if (g_pageCache.size > 50) {
        let oldestKey = "";
        let oldestTime = Date.now();
        for (const [k, v] of g_pageCache.entries()) {
          if (v.timestamp < oldestTime) { oldestTime = v.timestamp; oldestKey = k; }
        }
        if (oldestKey) g_pageCache.delete(oldestKey);
      }
      g_pageCache.set(cacheKey, { data: result, timestamp: Date.now() });
      saveCacheToStorage(); 

      return result;
    } catch { 
      return { tracks: [], total: 0, isYt: false }; 
    }
  }, []);

  const searchYouTubeOnly = useCallback(async (q: string, page = 1) => {
    try {
      const finalQ = page > 1 ? `${q} part ${page}` : q; 
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(finalQ)}`);
      if (!res.ok) return [];
      const videos = await res.json();
      return videos.map((v: any, i: number) => ({
        id: 95000 + (page - 1) * 20 + i,
        title: extractText(v.title),
        artist: extractText(v.author) || "YouTube",
        album: "YouTube Search",
        cover: extractText(v.thumbnail) || "",
        src: `https://www.youtube.com/watch?v=${v.videoId}`,
        duration: parseInt(String(v.duration)) || 0,
        type: "youtube" as const,
        songId: v.videoId,
      }));
    } catch { return []; }
  }, []);

  const searchAlbums = useCallback(async (q: string) => {
    try {
      const res = await fetch(`${API_BASE}/search/albums?query=${encodeURIComponent(q)}&page=1&limit=50`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data?.results || []).map((a: any) => ({ 
        id: a.id, title: extractText(a.name) || extractText(a.title) || "", 
        image: a.image || [], description: extractText(a.description) || extractText(a.primaryArtists) || extractText(a.year) || "Album", type: "album" 
      }));
    } catch { return []; }
  }, []);

  const searchArtists = useCallback(async (q: string) => {
    try {
      const res = await fetch(`${API_BASE}/search/artists?query=${encodeURIComponent(q)}&page=1&limit=50`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data?.results || []).map((a: any) => ({ 
        id: a.id, title: extractText(a.name) || extractText(a.title) || "", 
        image: a.image || [], description: extractText(a.description) || extractText(a.role) || "Artist", type: "artist" 
      }));
    } catch { return []; }
  }, []);

  const searchPlaylists = useCallback(async (q: string) => {
    try {
      const res = await fetch(`${API_BASE}/search/playlists?query=${encodeURIComponent(q)}&page=1&limit=50`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data?.results || []).map((p: any) => ({ 
        id: p.id, name: extractText(p.name), image: getImage(p.image || []), songCount: p.songCount || "0" 
      }));
    } catch { return []; }
  }, []);

  const doSearch = useCallback(async (q: string, cat?: SearchCategory, lang?: string) => {
    if (!q.trim()) { clearResults(); return; }
    setLoading(true); g_scrollPos = 0;
    const activeCat = cat ?? category;
    const activeLang = lang ?? langFilter;
    setCurrentPage(1); setYtCurrentPage(1); setActiveMenu(null); setIsYoutubeFallback(false);

    try {
      if (activeCat === "all") {
        const [allRes, songsData, albums, ytData] = await Promise.all([
          fetch(`${API_BASE}/search/all?query=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => null),
          searchSongs(q, activeLang, 1),
          searchAlbums(q),
          searchYouTubeOnly(q, 1)
        ]);
        
        let top = allRes?.data?.topQuery?.results?.[0];
        let topResFormatted = null;

        if (top) {
          topResFormatted = { id: top.id, title: extractText(top.title) || extractText(top.name), image: top.image, type: top.type || "song", description: extractText(top.description) || extractText(top.role) || extractText(top.year) };
        } else if (songsData.isYt && songsData.tracks.length > 0) {
          topResFormatted = { id: songsData.tracks[0].songId, title: songsData.tracks[0].title, image: [{ quality: "500x500", link: songsData.tracks[0].cover }], type: "song", description: "YouTube Match" };
        }

        setTopResult(topResFormatted);
        const artists = (allRes?.data?.artists?.results || []).map((a: any) => ({ id: a.id, title: extractText(a.name) || extractText(a.title), image: a.image, description: extractText(a.description) || extractText(a.role), type: "artist" }));
        setArtistResults(artists);
        setSongResults(songsData.tracks); setTotalResults(songsData.total); setAlbumResults(albums);
        setYoutubeResults(ytData);
        setIsYoutubeFallback(songsData.isYt);
      } else if (activeCat === "songs") {
        const songsData = await searchSongs(q, activeLang, 1);
        setSongResults(songsData.tracks); setTotalResults(songsData.total); setIsYoutubeFallback(songsData.isYt);
        setAlbumResults([]); setArtistResults([]); setTopResult(null); setYoutubeResults([]);
      } else if (activeCat === "youtube") {
        const ytData = await searchYouTubeOnly(q, 1);
        setYoutubeResults(ytData);
        setSongResults([]); setTotalResults(0); setIsYoutubeFallback(false);
        setAlbumResults([]); setArtistResults([]); setPlaylistResults([]); setTopResult(null);
      } else if (activeCat === "albums") {
        setAlbumResults(await searchAlbums(q)); setSongResults([]); setArtistResults([]); setTopResult(null); setYoutubeResults([]);
      } else if (activeCat === "artists") {
        setArtistResults(await searchArtists(q)); setSongResults([]); setAlbumResults([]); setTopResult(null); setYoutubeResults([]);
      } else if (activeCat === "playlists") {
        setPlaylistResults(await searchPlaylists(q)); setSongResults([]); setAlbumResults([]); setArtistResults([]); setTopResult(null); setYoutubeResults([]);
      }
    } catch (err) { console.error("Search error:", err); }
    setLoading(false);
  }, [category, langFilter, searchSongs, searchAlbums, searchArtists, searchPlaylists, searchYouTubeOnly]);

  const loadSongPage = useCallback(async (page: number) => {
    setLoading(true); setActiveMenu(null); g_scrollPos = 0;
    const data = await searchSongs(query, langFilter, page);
    setSongResults(data.tracks); setCurrentPage(page); setTotalResults(data.total);
    setLoading(false);
    document.getElementById("search-results-container")?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchSongs, query, langFilter]);

  const loadYoutubePage = useCallback(async (page: number) => {
    setLoading(true); setActiveMenu(null); g_scrollPos = 0;
    const data = await searchYouTubeOnly(query, page);
    setYoutubeResults(data); setYtCurrentPage(page);
    setLoading(false);
    document.getElementById("search-results-container")?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchYouTubeOnly, query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim()) {
        doSearch(val);
        fetch(`${API_BASE}/search/all?query=${encodeURIComponent(val)}`)
          .then(r => r.json())
          .then(j => {
            const top = (j.data?.topQuery?.results || []).map((r: any) => extractText(r.title) || extractText(r.name));
            const albums = (j.data?.albums?.results || []).map((a: any) => extractText(a.title) || extractText(a.name));
            const songs = (j.data?.songs?.results || []).map((s: any) => extractText(s.title) || extractText(s.name));
            const combined = [...top, ...albums, ...songs].filter(Boolean);
            setSuggestions([...new Set(combined)].slice(0, 6) as string[]);
          })
          .catch(() => setSuggestions([]));
      } else { clearResults(); setSuggestions([]); }
    }, DEBOUNCE_MS);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion); setShowSuggestions(false); addToHistory(suggestion); doSearch(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      setShowSuggestions(false); addToHistory(query.trim()); doSearch(query.trim());
    }
  };

  const handleShare = async (track: Track) => {
    const shareText = `${track.title} by ${track.artist} - Sonic Bloom`;
    const url = track.songId ? `https://www.jiosaavn.com/song/${track.songId}` : window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: track.title, text: shareText, url }); } catch {}
    } else {
      navigator.clipboard.writeText(`${shareText}\n${url}`);
      toast({ title: "Link Copied", description: "Song link copied to clipboard" });
    }
  };

  const handleCategoryChange = (cat: SearchCategory) => {
    setCategory(cat); clearResults();
    if (query.trim()) doSearch(query, cat);
  };

  const handlePlayClick = async (track: Track, tracks: Track[], index: number) => {
    const isYoutube = track.type === "youtube" || track.src.includes("youtube.com") || track.src.includes("youtu.be");

    if (isYoutube && track.songId) {
      setResolvingId(track.songId);
      try {
        const res = await fetch(`/api/yt-stream?id=${track.songId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.audioUrl) {
            const resolvedTrack = { ...track, src: data.audioUrl, type: "audio" as const };
            const newTracks = [...tracks];
            newTracks[index] = resolvedTrack;
            playTrackList(newTracks, index);
            setResolvingId(null);
            return;
          }
        }
      } catch (e) {
        console.error("Audio resolve failed:", e);
      }
      setResolvingId(null);
      playTrackList(tracks, index);
    } else {
      playTrackList(tracks, index);
    }
  };

  const handleAddToQueue = async (track: Track) => {
    const isYoutube = track.type === "youtube" || track.src.includes("youtube.com") || track.src.includes("youtu.be");
    if (isYoutube && track.songId) {
      toast({ title: "Resolving track...", description: track.title });
      try {
        const res = await fetch(`/api/yt-stream?id=${track.songId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.audioUrl) {
            addToQueue({ ...track, src: data.audioUrl, type: "audio" as const });
            toast({ title: "Added to Queue", description: track.title });
            return;
          }
        }
      } catch (e) {}
      addToQueue(track);
      toast({ title: "Added to Queue", description: track.title });
    } else {
      addToQueue(track);
      toast({ title: "Added to Queue", description: track.title });
    }
  };

  const handlePlayNext = async (track: Track) => {
    const isYoutube = track.type === "youtube" || track.src.includes("youtube.com") || track.src.includes("youtu.be");
    if (isYoutube && track.songId) {
      toast({ title: "Preparing track...", description: track.title });
      try {
        const res = await fetch(`/api/yt-stream?id=${track.songId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.audioUrl) {
            playNext({ ...track, src: data.audioUrl, type: "audio" as const });
            toast({ title: "Will play next", description: track.title });
            return;
          }
        }
      } catch (e) {}
      playNext(track);
      toast({ title: "Will play next", description: track.title });
    } else {
      playNext(track);
      toast({ title: "Will play next", description: track.title });
    }
  };

  const fetchArtistSongs = async (artistName: string) => {
    setArtistLoading(true); g_scrollPos = 0;
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(artistName)}&page=1&limit=30`);
      const json = await res.json();
      const tracks: Track[] = [];
      (json.data?.results || []).filter((s: any) => (s.downloadUrl?.length ?? 0) > 0).slice(0, 30).forEach((s: any, i: number) => {
        const track = parseSongToTrack(s, 9000 + i);
        if (track) tracks.push(track);
      });
      setArtistSongs({ name: artistName, songs: tracks });
    } catch {}
    setArtistLoading(false);
  };

  const fetchAlbumSongs = async (albumId: string, albumName: string) => {
    setAlbumLoading(true); g_scrollPos = 0;
    try {
      const res = await fetch(`${API_BASE}/albums?id=${albumId}`);
      const json = await res.json();
      const albumImage = json.data?.image?.find((img: any) => img.quality === "500x500")?.link || "";
      const tracks: Track[] = [];
      (json.data?.songs || []).filter((s: any) => (s.downloadUrl?.length ?? 0) > 0).forEach((s: any, i: number) => {
        const track = parseSongToTrack(s, 9500 + i);
        if (track) { track.cover = track.cover || albumImage; track.album = track.album || albumName; tracks.push(track); }
      });
      setAlbumSongs({ name: albumName, id: albumId, songs: tracks });
      if (tracks.length > 0) playTrackList(tracks, 0);
    } catch {}
    setAlbumLoading(false);
  };

  const CATEGORIES: { key: SearchCategory; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <Search size={13} /> },
    { key: "songs", label: "Songs", icon: <Music2 size={13} /> },
    { key: "youtube", label: "YouTube", icon: <Youtube size={13} className="text-red-500" /> },
    { key: "albums", label: "Albums", icon: <Disc3 size={13} /> },
    { key: "artists", label: "Artists", icon: <User size={13} /> },
    { key: "playlists", label: "Playlists", icon: <ListMusic size={13} /> },
  ];

  const isInitialLoading = loading && songResults.length === 0 && youtubeResults.length === 0 && albumResults.length === 0 && artistResults.length === 0 && playlistResults.length === 0 && !topResult && !albumSongs && !artistSongs;
  const hasAnyResults = songResults.length > 0 || youtubeResults.length > 0 || albumResults.length > 0 || artistResults.length > 0 || playlistResults.length > 0 || topResult;

  const SongRow = ({ track, tracks, index, isYt = false }: { track: Track; tracks: Track[]; index: number; isYt?: boolean }) => {
    const isActive = currentTrack?.src === track.src;
    const liked = isFavorite(track.src);
    const menuOpen = activeMenu === index;
    const isYoutubeTrack = isYt || track.type === "youtube";
    const isResolving = resolvingId === track.songId;

    return (
      <div className={`flex items-center gap-3 p-2.5 rounded-xl transition-all group ${isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-accent border border-transparent"}`}>
        <div className="relative flex-shrink-0 cursor-pointer" onClick={() => handlePlayClick(track, tracks, index)}>
          <img src={track.cover} alt="" className={`w-12 h-12 rounded-lg object-cover shadow-sm ${isActive ? "ring-2 ring-primary" : ""}`} />
          <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
            {isResolving ? (
              <Loader2 size={16} className="text-white animate-spin" />
            ) : isActive && isPlaying ? (
              <div className="flex items-end gap-0.5">
                <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" />
                <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
                <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
              </div>
            ) : (
              <Play size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
            )}
          </div>
        </div>
        
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handlePlayClick(track, tracks, index)}>
          <p className={`text-[13px] font-semibold truncate transition-colors flex items-center gap-1 ${isActive ? "text-primary" : "text-foreground group-hover:text-primary"}`}>
            {track.title}
            {isYoutubeTrack && <span className="text-[8px] bg-red-600/20 text-red-500 px-1.5 py-0.5 rounded font-bold ml-1 flex-shrink-0">YT</span>}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">{track.artist}</p>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {!isYoutubeTrack && (
            <button onClick={() => downloadTrack(track)} disabled={isDownloaded(track.songId || track.src) || isDownloading(track.songId || track.src)} className={`p-2 rounded-full transition-all ${isDownloaded(track.songId || track.src) ? "text-green-500" : isDownloading(track.songId || track.src) ? "text-yellow-500" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`} title="Download">
              {isDownloading(track.songId || track.src) ? <Loader2 size={16} className="animate-spin" /> : isDownloaded(track.songId || track.src) ? <CheckCircle size={16} /> : <Download size={16} />}
            </button>
          )}
          <button onClick={() => toggleFavorite(track)} className={`p-2 rounded-full transition-all ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-500 hover:bg-accent"}`} title="Like">
            <Heart size={16} fill={liked ? "currentColor" : "none"} />
          </button>
          <div className="relative">
            <button onClick={() => { setActiveMenu(menuOpen ? null : index); setShowPlaylistSubmenu(false); }} className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setActiveMenu(null); setShowPlaylistSubmenu(false); }} />
                <div className="absolute right-0 top-full mt-1 z-50 w-44 glass-heavy border border-border rounded-lg shadow-2xl overflow-hidden py-1">
                  <button onClick={() => { handlePlayNext(track); setActiveMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"><PlaySquare size={14} /> Play Next</button>
                  <button onClick={() => { handleAddToQueue(track); setActiveMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"><ListPlus size={14} /> Add to Queue</button>
                  <button onClick={() => handleShare(track)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"><Share2 size={14} /> Share</button>
                  <div className="h-px bg-border my-1" />
                  <button onClick={() => setShowPlaylistSubmenu(!showPlaylistSubmenu)} className="w-full flex items-center justify-between px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"><div className="flex items-center gap-2.5"><Plus size={14} /> Add to Playlist</div><ChevronRight size={12} className={showPlaylistSubmenu ? "rotate-90" : ""} /></button>
                  {showPlaylistSubmenu && (
                    <div className="bg-background/50 max-h-32 overflow-y-auto border-t border-border mt-1">
                      {playlists.map((pl) => <button key={pl.id} onClick={() => { addToPlaylist(pl.id, track); setActiveMenu(null); setShowPlaylistSubmenu(false); }} className="w-full text-left px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent truncate">{pl.name}</button>)}
                      <div className="px-2 py-1.5 border-t border-border"><input type="text" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newPlaylistName.trim()) { const pl = createPlaylist(newPlaylistName.trim()); addToPlaylist(pl.id, track); setNewPlaylistName(""); setActiveMenu(null); setShowPlaylistSubmenu(false); } }} placeholder="New playlist..." className="w-full text-[10px] px-2 py-1 rounded border border-border bg-background focus:outline-none focus:border-primary" /></div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-start justify-center">
      <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl mx-auto h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:mt-12 md:mt-16 bg-background border-t sm:border border-border sm:rounded-2xl rounded-none overflow-hidden flex flex-col shadow-2xl">

        <div className="flex items-center gap-2 px-3 pt-3 pb-2 sm:p-4 sm:pb-3 border-b border-border flex-shrink-0 safe-top">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef} type="text" value={query} onChange={handleInputChange} onKeyDown={handleKeyDown} onFocus={() => query.length >= 2 && setShowSuggestions(true)}
              placeholder="Search songs, movies, artists on Saavn & YouTube..."
              className="w-full pl-9 pr-8 py-2.5 sm:py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            {query && <button onClick={() => { setQuery(""); clearResults(); setSuggestions([]); inputRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>}
            
            {showSuggestions && suggestions.length > 0 && !loading && (
              <div className="absolute top-full left-0 right-0 mt-1 z-[100] bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => handleSuggestionClick(s)} className="w-full flex items-center gap-2.5 px-3 py-3 text-sm text-foreground hover:bg-accent transition-colors text-left">
                    <Search size={13} className="text-muted-foreground flex-shrink-0" /><span className="truncate">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground flex-shrink-0"><X size={22} /></button>
        </div>

        <div className="flex-shrink-0 border-b border-border">
          <div className="flex items-center gap-1.5 px-3 sm:px-4 pt-2 pb-1.5 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button key={cat.key} onClick={() => handleCategoryChange(cat.key)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full font-medium whitespace-nowrap transition-all ${category === cat.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 px-3 sm:px-4 pb-2 overflow-x-auto scrollbar-hide">
            {LANGUAGES.map((lang) => (
              <button key={lang.key} onClick={() => { setLangFilter(lang.key); if (query.trim()) doSearch(query, category, lang.key); }} className={`px-3 py-1 text-[11px] rounded-full font-medium whitespace-nowrap transition-colors ${langFilter === lang.key ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted/50 text-muted-foreground hover:text-foreground border border-transparent"}`}>
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div id="search-results-container" className="flex-1 overflow-y-auto px-2 py-3 sm:px-4 sm:py-4 pb-28 sm:pb-6 scroll-smooth" onClick={() => setShowSuggestions(false)}>
          
          {isInitialLoading && (
            <div className="space-y-2 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse p-2"><div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0" /><div className="flex-1 min-w-0"><div className="h-3 bg-muted rounded w-3/4 mb-2" /><div className="h-2 bg-muted/60 rounded w-1/2" /></div></div>
              ))}
            </div>
          )}

          <div className={isInitialLoading ? "hidden" : "block"}>
            {!query.trim() && (
              <>
                {searchHistory.length > 0 && (
                  <div className="mb-6 px-2">
                    <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"><Clock size={13} /> Recent Searches</div><button onClick={clearHistory} className="text-xs text-muted-foreground hover:text-destructive">Clear</button></div>
                    <div className="flex flex-wrap gap-2">
                      {searchHistory.slice(0, 8).map((h) => (
                        <div key={h} className="flex items-center gap-1 pl-3 pr-1 py-1.5 rounded-full bg-card border border-border hover:bg-accent transition-colors">
                          <button onClick={() => { setQuery(h); addToHistory(h); doSearch(h); }} className="text-xs text-foreground font-medium">{h}</button>
                          <button onClick={() => removeHistoryItem(h)} className="p-1 text-muted-foreground hover:text-destructive rounded-full"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="px-1">
                  <div className="flex items-center gap-2 mb-3 px-1"><TrendingUp size={18} className="text-primary" /><h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Trending Now</h3></div>
                  {trendingLoading ? <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div> : trending.map((track, i) => <SongRow key={track.src} track={track} tracks={trending} index={i} />)}
                </div>
              </>
            )}

            {query.trim().length > 0 && (
              <div className={loading ? "opacity-60 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200"}>
                {!hasAnyResults && !loading && (
                  <div className="text-center py-16">
                    <Search size={40} className="mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-base font-medium text-foreground">No results for "{query}"</p>
                    <p className="text-sm text-muted-foreground mt-1">Try searching in the YouTube tab!</p>
                  </div>
                )}

                {category === "all" && topResult && !artistSongs && !albumSongs && (
                  <div className="mb-6 px-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Top Result</h3>
                    <div onClick={() => { if (topResult.type === "artist") fetchArtistSongs(topResult.title); else if (topResult.type === "album") fetchAlbumSongs(topResult.id, topResult.title); else if (songResults.length > 0) handlePlayClick(songResults[0], songResults, 0); }} className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 cursor-pointer transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img src={getImage(topResult.image)} alt="" className={`w-20 h-20 object-cover shadow-md ${topResult.type === "artist" ? "rounded-full" : "rounded-lg"}`} />
                          <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors"><div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 group-hover:scale-100"><Play size={16} className="text-primary-foreground ml-0.5" /></div></div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-foreground truncate">{topResult.title}</p>
                          <p className="text-xs text-muted-foreground capitalize flex items-center gap-1.5 mt-1">
                            {topResult.type === "artist" && <User size={12} />}{topResult.type === "album" && <Disc3 size={12} />}{topResult.type === "song" && <Music2 size={12} />}
                            <span className="bg-muted px-2 py-0.5 rounded font-medium text-foreground">{topResult.type}</span>
                          </p>
                          {topResult.description && <p className="text-[11px] text-muted-foreground/80 truncate mt-1.5">{topResult.description}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {category === "youtube" && youtubeResults.length > 0 && (
                  <div className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-2">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Youtube size={14} className="text-red-500" /> YouTube Results
                        <span className="text-muted-foreground/60 font-medium normal-case ml-1">(Page {ytCurrentPage})</span>
                      </h3>
                      <div className="flex items-center gap-2">
                        <button onClick={() => loadYoutubePage(ytCurrentPage - 1)} disabled={ytCurrentPage === 1 || loading} className="p-1.5 rounded-full bg-muted text-foreground hover:bg-accent disabled:opacity-50"><ChevronLeft size={16} /></button>
                        <button onClick={() => loadYoutubePage(ytCurrentPage + 1)} disabled={youtubeResults.length === 0 || loading} className="p-1.5 rounded-full bg-muted text-foreground hover:bg-accent disabled:opacity-50"><ChevronRight size={16} /></button>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      {youtubeResults.map((track, i) => <SongRow key={`${track.src}-${i}`} track={track} tracks={youtubeResults} index={i} isYt={true} />)}
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border px-2">
                      <button onClick={() => loadYoutubePage(ytCurrentPage - 1)} disabled={ytCurrentPage === 1 || loading} className="px-4 py-2 rounded-xl bg-muted text-sm font-medium hover:bg-accent disabled:opacity-50 flex items-center gap-2"><ChevronLeft size={16} /> Prev</button>
                      <span className="text-sm font-bold text-muted-foreground">Page {ytCurrentPage}</span>
                      <button onClick={() => loadYoutubePage(ytCurrentPage + 1)} disabled={youtubeResults.length === 0 || loading} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 disabled:opacity-50 flex items-center gap-2">Next <ChevronRight size={16} /></button>
                    </div>
                  </div>
                )}

                {category !== "youtube" && songResults.length > 0 && !artistSongs && !albumSongs && (
                  <div className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-2">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Music2 size={14} /> Songs
                        {isYoutubeFallback && <span className="text-[9px] bg-red-600/20 text-red-500 px-1.5 py-0.5 rounded font-bold ml-1">YouTube</span>}
                        {!isYoutubeFallback && category === "songs" ? (
                          <span className="text-muted-foreground/60 font-medium normal-case ml-1 flex items-center gap-1">
                            (Page
                            <input
                              type="number"
                              min={1}
                              max={Math.ceil(totalResults / SONGS_PER_PAGE)}
                              value={pageInputValue}
                              onChange={(e) => setPageInputValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const targetPage = parseInt(e.currentTarget.value, 10);
                                  const maxPage = Math.ceil(totalResults / SONGS_PER_PAGE);
                                  if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= maxPage) {
                                    if (targetPage !== currentPage) {
                                      loadSongPage(targetPage);
                                    }
                                  } else {
                                    setPageInputValue(currentPage.toString());
                                    toast.error(`Valid pages: 1 to ${maxPage}`);
                                  }
                                  e.currentTarget.blur();
                                }
                              }}
                              onBlur={(e) => {
                                setPageInputValue(currentPage.toString());
                              }}
                              className="w-12 sm:w-16 h-7 px-1 py-0 text-center bg-accent/50 border border-border rounded text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            of {Math.ceil(totalResults / SONGS_PER_PAGE)})
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 font-medium ml-1">({songResults.length})</span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2">
                        {category === "songs" && !isYoutubeFallback && (
                          <>
                            <button
                              onClick={() => {
                                songResults.forEach(track => addToQueue(track));
                                toast.success(`Added ${songResults.length} songs to queue`);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium mr-1"
                            >
                              <ListPlus size={14} />
                              <span className="hidden sm:inline">Queue All</span>
                            </button>
                            <button onClick={() => loadSongPage(currentPage - 1)} disabled={currentPage === 1 || loading} className="p-1.5 rounded-full bg-muted text-foreground hover:bg-accent disabled:opacity-50"><ChevronLeft size={16} /></button>
                            <button onClick={() => loadSongPage(currentPage + 1)} disabled={songResults.length < SONGS_PER_PAGE || loading} className="p-1.5 rounded-full bg-muted text-foreground hover:bg-accent disabled:opacity-50"><ChevronRight size={16} /></button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      {songResults.slice(0, category === "all" ? 8 : SONGS_PER_PAGE).map((track, i) => <SongRow key={`${track.src}-${i}`} track={track} tracks={songResults} index={i} isYt={track.type === "youtube"} />)}
                    </div>
                    {category === "all" && songResults.length > 8 && (
                      <button onClick={() => handleCategoryChange("songs")} className="w-full mt-3 py-2.5 rounded-xl bg-muted/50 text-sm text-foreground hover:bg-muted font-medium transition-colors">Show all {totalResults} songs</button>
                    )}
                    {category === "songs" && songResults.length > 0 && !isYoutubeFallback && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border px-2">
                        <button onClick={() => loadSongPage(currentPage - 1)} disabled={currentPage === 1 || loading} className="px-4 py-2 rounded-xl bg-muted text-sm font-medium hover:bg-accent disabled:opacity-50 flex items-center gap-2"><ChevronLeft size={16} /> Prev</button>
                        <span className="text-sm font-bold text-muted-foreground">{currentPage} / {Math.ceil(totalResults/SONGS_PER_PAGE)}</span>
                        <button onClick={() => loadSongPage(currentPage + 1)} disabled={songResults.length < SONGS_PER_PAGE || loading} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 disabled:opacity-50 flex items-center gap-2">Next <ChevronRight size={16} /></button>
                      </div>
                    )}
                  </div>
                )}

                {category === "all" && youtubeResults.length > 0 && !artistSongs && !albumSongs && (
                  <div className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-2">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Youtube size={14} className="text-red-500" /> YouTube Results
                      </h3>
                    </div>
                    <div className="space-y-0.5">
                      {youtubeResults.slice(0, 5).map((track, i) => <SongRow key={`${track.src}-${i}`} track={track} tracks={youtubeResults} index={i} isYt={true} />)}
                    </div>
                    <button onClick={() => handleCategoryChange("youtube")} className="w-full mt-3 py-2.5 rounded-xl bg-muted/50 text-sm text-foreground hover:bg-muted font-medium transition-colors">
                      Show more YouTube videos
                    </button>
                  </div>
                )}

                {albumSongs && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4 px-2"><h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Disc3 size={16} className="text-primary" /> {albumSongs.name}</h3><button onClick={() => { setAlbumSongs(null); g_scrollPos = 0; }} className="p-1.5 rounded-full bg-muted hover:bg-accent"><X size={16} /></button></div>
                    {albumLoading ? <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div> : <div className="space-y-0.5">{albumSongs.songs.map((track, i) => <SongRow key={track.src} track={track} tracks={albumSongs.songs} index={i} />)}</div>}
                  </div>
                )}
                {artistSongs && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4 px-2"><h3 className="text-sm font-bold text-foreground flex items-center gap-2"><User size={16} className="text-primary" /> {artistSongs.name}</h3><button onClick={() => { setArtistSongs(null); g_scrollPos = 0; }} className="p-1.5 rounded-full bg-muted hover:bg-accent"><X size={16} /></button></div>
                    {artistLoading ? <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div> : <div className="space-y-0.5">{artistSongs.songs.map((track, i) => <SongRow key={track.src} track={track} tracks={artistSongs.songs} index={i} />)}</div>}
                  </div>
                )}

                {category !== "youtube" && albumResults.length > 0 && !albumSongs && !artistSongs && (
                  <div className="mb-6 px-2"><h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5"><Disc3 size={14} /> Albums & Movies</h3><div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">{albumResults.slice(0, 20).map((album) => (<div key={album.id} onClick={() => fetchAlbumSongs(album.id, album.title)} className="flex-shrink-0 w-28 group cursor-pointer"><div className="relative mb-2"><img src={getImage(album.image)} alt="" className="w-28 h-28 rounded-xl object-cover shadow-md group-hover:shadow-xl transition-all" /><div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors"><div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-lg"><Play size={16} className="text-primary-foreground ml-0.5" /></div></div></div><p className="text-[11px] font-bold text-foreground truncate">{album.title}</p><p className="text-[9px] text-muted-foreground truncate mt-0.5">{album.description}</p></div>))}</div></div>
                )}
                {category !== "youtube" && artistResults.length > 0 && !artistSongs && !albumSongs && (
                  <div className="mb-6 px-2"><h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5"><User size={14} /> Artists</h3><div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">{artistResults.slice(0, 20).map((artist) => (<div key={artist.id} onClick={() => fetchArtistSongs(artist.title)} className="flex-shrink-0 flex flex-col items-center gap-2 group cursor-pointer w-20"><div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary/50 transition-all shadow-md"><img src={getImage(artist.image)} alt={artist.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /></div><p className="text-[10px] md:text-xs text-foreground text-center w-full truncate font-bold">{artist.title}</p></div>))}</div></div>
                )}
                {category !== "youtube" && category === "playlists" && playlistResults.length > 0 && (
                  <div className="mb-6 px-2"><h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5"><ListMusic size={14} /> Playlists</h3><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{playlistResults.map((pl) => (<div key={pl.id} onClick={() => { fetch(`${API_BASE}/playlists?id=${pl.id}`).then(r => r.json()).then(json => { const songs = (json.data?.songs || []).filter((s: any) => (s.downloadUrl?.length ?? 0) > 0).map((s: any, i: number) => parseSongToTrack(s, 30000 + i)).filter(Boolean) as Track[]; if (songs.length > 0) { playTrackList(songs, 0); onClose(); } }).catch(() => {}); }} className="flex flex-col gap-2 p-2 rounded-xl bg-card border border-transparent hover:border-border hover:bg-accent transition-colors group cursor-pointer"><div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">{pl.image ? <img src={pl.image} alt={pl.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><ListMusic size={24} className="text-muted-foreground/30" /></div>}<div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors"><div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-lg"><Play size={16} className="text-primary-foreground ml-0.5" /></div></div></div><div className="min-w-0"><p className="text-[11px] font-bold text-foreground truncate">{pl.name}</p><p className="text-[9px] text-muted-foreground">{pl.songCount} songs</p></div></div>))}</div></div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};