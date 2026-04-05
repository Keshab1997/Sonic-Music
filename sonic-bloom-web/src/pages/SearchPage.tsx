
import { useState, FormEvent, useCallback, useEffect, useRef } from "react";
import { Search, Play, Clock, Loader2, AlertCircle, Heart, X, History, ListPlus, PlaySquare, Plus, ChevronRight, Disc, Users, Music2, Shuffle, List } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useLocalData } from "@/hooks/useLocalData";
import { usePlaylists } from "@/hooks/usePlaylists";
import { Track } from "@/data/playlist";
import { ActressesModal } from "@/components/ActressesModal";
import { ArtistPlaylist } from "@/components/ArtistPlaylist";
import { toast } from "sonner";

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";
const SEARCH_HISTORY_KEY = "sonic_search_history_web";
const SEARCH_HISTORY_MAX = 10;
const SONGS_PER_PAGE = 40;

const TRENDING_SEARCHES = [
  { title: "Arijit Singh Hits", query: "arijit singh top songs", color: "from-red-900/30 to-red-800/20" },
  { title: "Bengali Modern", query: "modern bengali songs 2024", color: "from-green-900/30 to-green-800/20" },
  { title: "Bollywood Romance", query: "bollywood romantic songs", color: "from-amber-900/30 to-amber-800/20" },
  { title: "Lofi Chill", query: "lofi hindi songs chill", color: "from-blue-900/30 to-blue-800/20" },
  { title: "Party Anthems", query: "bollywood party songs", color: "from-pink-900/30 to-pink-800/20" },
  { title: "90s Nostalgia", query: "90s hindi songs hits", color: "from-purple-900/30 to-purple-800/20" },
];

const HINDI_ARTISTS = [
  { name: "Arijit Singh", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", query: "Arijit Singh hits" },
  { name: "Shreya Ghoshal", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop", query: "Shreya Ghoshal songs" },
  { name: "A.R. Rahman", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop", query: "AR Rahman best songs" },
  { name: "Kishore Kumar", image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200&h=200&fit=crop", query: "Kishore Kumar hits" },
];

const BENGALI_ARTISTS = [
  { name: "Anupam Roy", image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200&h=200&fit=crop", query: "Anupam Roy bengali songs" },
  { name: "Rupankar", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", query: "Rupankar bengali songs" },
  { name: "Nachiketa", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop", query: "Nachiketa bengali songs" },
  { name: "Lopamudra Mitra", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop", query: "Lopamudra Mitra bengali songs" },
];

const formatDuration = (seconds: number) => {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const SongRow = ({
  track,
  index,
  isFavorite,
  onToggleFavorite,
}: {
  track: Track;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: (track: Track) => void;
}) => {
  const { playTrack, currentTrack, isPlaying, pause, playNext, addToQueue } = usePlayer();
  const { playlists, addToPlaylist, createPlaylist } = usePlaylists();
  const isActive = currentTrack?.src === track.src;
  const isCurrentlyPlaying = isActive && isPlaying;
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
        isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-accent border border-transparent"
      }`}
    >
      <div
        onClick={() => {
          if (isActive) {
            if (isPlaying) {
              pause();
            } else {
              playTrack(track);
            }
          } else {
            playTrack(track);
          }
        }}
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
      >
        <div className="relative flex-shrink-0">
          {track.cover ? (
            <img src={track.cover} alt={track.title} loading="lazy" className="w-12 h-12 md:w-14 md:h-14 rounded-md object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center">
              <Play size={18} className="text-muted-foreground" />
            </div>
          )}
          {isCurrentlyPlaying && (
            <div className="absolute inset-0 rounded-md bg-black/40 flex items-center justify-center gap-0.5">
              <span className="w-0.5 h-3 bg-white rounded-full animate-pulse" />
              <span className="w-0.5 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.15s" }} />
              <span className="w-0.5 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
              <span className="w-0.5 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.45s" }} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
            {track.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {track.artist} {track.album ? `· ${track.album}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock size={12} />
          <span className="text-xs tabular-nums">{formatDuration(track.duration)}</span>
        </div>
      </div>

      {/* Add to Queue Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          addToQueue(track);
          toast.success("Added to Queue");
        }}
        className="p-2 rounded-full text-muted-foreground hover:text-primary transition-colors"
        title="Add to Queue"
      >
        <ListPlus size={16} />
      </button>

      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(track);
        }}
        className={`p-2 rounded-full transition-colors ${
          isFavorite ? "text-red-500" : "text-muted-foreground hover:text-red-400"
        }`}
      >
        <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
      </button>

      {/* Context menu */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
            setShowPlaylistSubmenu(false);
          }}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <List size={16} />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setShowMenu(false); setShowPlaylistSubmenu(false); }} />
            <div className="absolute right-0 top-full mt-1 z-50 w-48 glass-heavy border border-border rounded-lg shadow-2xl overflow-hidden">
              <button
                onClick={() => { playNext(track); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors"
              >
                <PlaySquare size={14} />
                Play Next
              </button>
              <button
                onClick={() => { addToQueue(track); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors"
              >
                <ListPlus size={14} />
                Add to Queue
              </button>
              <div className="border-t border-border" />
              <button
                onClick={() => setShowPlaylistSubmenu(!showPlaylistSubmenu)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors"
              >
                <Plus size={14} />
                Add to Playlist
              </button>
              {showPlaylistSubmenu && (
                <div className="border-t border-border max-h-40 overflow-y-auto">
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => { addToPlaylist(pl.id, track); setShowMenu(false); setShowPlaylistSubmenu(false); }}
                      className="w-full text-left px-5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors truncate"
                    >
                      {pl.name}
                    </button>
                  ))}
                  {playlists.length === 0 && (
                    <p className="px-5 py-2 text-[10px] text-muted-foreground/50">No playlists</p>
                  )}
                  <div className="flex items-center gap-1 px-3 py-2 border-t border-border">
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newPlaylistName.trim()) {
                          const pl = createPlaylist(newPlaylistName.trim());
                          addToPlaylist(pl.id, track);
                          setNewPlaylistName("");
                          setShowMenu(false);
                          setShowPlaylistSubmenu(false);
                        }
                      }}
                      placeholder="New playlist..."
                      className="flex-1 text-[11px] px-2 py-1 rounded bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<"songs" | "artists" | "albums">("songs");
  const [artistResults, setArtistResults] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [albumSongs, setAlbumSongs] = useState<Track[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<{ id: string; name: string } | null>(null);
  const [loadingAlbum, setLoadingAlbum] = useState(false);
  const [rawAlbums, setRawAlbums] = useState<any[]>([]);
  const [showActressesModal, setShowActressesModal] = useState(false);
  const [actressPlaylist, setActressPlaylist] = useState<{ name: string; query: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { currentTrack, isPlaying, addToQueue, playTrackList } = usePlayer();

  // Load search history on mount
  useEffect(() => {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (stored) {
      try {
        setSearchHistory(JSON.parse(stored));
      } catch {}
    }
  }, []);

  // Save search history
  const saveToHistory = useCallback((q: string) => {
    if (!q.trim()) return;
    setSearchHistory((prev) => {
      const updated = [q, ...prev.filter((h) => h !== q)].slice(0, SEARCH_HISTORY_MAX);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  }, []);

  // Fetch songs with pagination
  const fetchSongs = useCallback(async (searchQuery: string, page: number, append = false) => {
    try {
      const res = await fetch(
        `${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}&page=${page}&limit=${SONGS_PER_PAGE}`
      );
      if (!res.ok) return { tracks: [], hasMore: false, total: 0 };
      
      const data = await res.json();
      const songs = data.data?.results || [];
      const total = data.data?.total || songs.length;

      const offset = append ? results.length : 0;
      const tracks: Track[] = songs
        .map((s: any, i: number) => {
          if (!s.downloadUrl?.length) return null;
          const url160 = s.downloadUrl.find((d: any) => d.quality === "160kbps")?.link;
          const url96 = s.downloadUrl.find((d: any) => d.quality === "96kbps")?.link;
          const url320 = s.downloadUrl.find((d: any) => d.quality === "320kbps")?.link;
          const bestUrl = url160 || url96 || s.downloadUrl[0]?.link || "";
          if (!bestUrl) return null;
          return {
            id: 80000 + offset + i,
            title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown",
            artist: s.primaryArtists || "Unknown",
            album: typeof s.album === "string" ? s.album : s.album?.name || "",
            cover: s.image?.find((img: any) => img.quality === "500x500")?.link || s.image?.[s.image.length - 1]?.link || "",
            src: bestUrl,
            duration: parseInt(String(s.duration)) || 0,
            type: "audio" as const,
            songId: s.id,
          };
        })
        .filter((t: Track | null): t is Track => t !== null);

      return { tracks, hasMore: songs.length >= SONGS_PER_PAGE, total };
    } catch {
      return { tracks: [], hasMore: false, total: 0 };
    }
  }, [results.length]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setArtistResults([]);
      setTotalResults(0);
      setCurrentPage(1);
      setHasMore(true);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setCurrentPage(1);
      if (activeFilter === "songs") {
        const { tracks, hasMore, total } = await fetchSongs(query, 1);
        setResults(tracks);
        setHasMore(hasMore);
        setTotalResults(total);
        setArtistResults([]);
      } else if (activeFilter === "artists") {
        try {
          const res = await fetch(`${API_BASE}/search/artists?query=${encodeURIComponent(query)}&page=1&limit=30`);
          if (res.ok) {
            const data = await res.json();
            setArtistResults(data.data?.results || []);
          }
        } catch {}
        setResults([]);
        setTotalResults(0);
      } else if (activeFilter === "albums") {
        try {
          const res = await fetch(`${API_BASE}/search/albums?query=${encodeURIComponent(query)}&page=1&limit=30`);
          if (res.ok) {
            const data = await res.json();
            const albums = data.data?.results || [];
            setRawAlbums(albums);
            const albumTracks: Track[] = albums.map((a: any, i: number) => {
              const albumName = typeof a.name === 'string' ? a.name : a.name?.name || a.name?.id || "Unknown Album";
              const artistName = typeof a.music === 'string' ? a.music : 
                                 typeof a.primaryArtists === 'string' ? a.primaryArtists :
                                 a.music?.name || a.primaryArtists?.name || a.primaryArtists?.id || "Unknown";
              const coverUrl = Array.isArray(a.image) ? 
                               (a.image[0]?.link || a.image[a.image.length - 1]?.link || "") : 
                               (typeof a.image === 'string' ? a.image : "");
              return {
                id: 90000 + i,
                title: albumName,
                artist: artistName,
                album: albumName,
                cover: coverUrl,
                src: "",
                duration: 0,
                type: "audio" as const,
                songId: a.id,
              };
            });
            setResults(albumTracks);
            setTotalResults(albums.length);
          }
        } catch {}
        setArtistResults([]);
        setHasMore(false);
      }
      setLoading(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, activeFilter, fetchSongs]);

  // Load specific page logic
  const loadPage = useCallback(async (page: number) => {
    setLoading(true);
    const { tracks, hasMore: more, total } = await fetchSongs(query, page, false);
    if (tracks.length > 0) {
      setResults(tracks);
      setHasMore(more);
      setCurrentPage(page);
      setTotalResults(total);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setLoading(false);
  }, [query, fetchSongs]);

  const handleSearch = (q: string) => {
    setQuery(q);
    saveToHistory(q);
  };

  const handleSearchPlay = async (track: Track) => {
    playTrackList([track], 0);
  };

  const handleArtistPress = (artist: any) => {
    const artistName = typeof artist.name === 'string' ? artist.name : artist.name?.id || artist.name?.name || 'Unknown Artist';
    handleSearch(artistName);
    setActiveFilter("songs");
  };

  const fetchAlbumSongs = useCallback(async (albumId: string, albumName: string) => {
    setLoadingAlbum(true);
    setSelectedAlbum({ id: albumId, name: albumName });
    setAlbumSongs([]);
    
    try {
      const res = await fetch(`${API_BASE}/albums?id=${albumId}`);
      if (res.ok) {
        const data = await res.json();
        const songs = data.data?.songs || [];
        if (songs.length > 0) {
          const tracks: Track[] = songs
            .map((s: any, i: number) => {
              if (!s.downloadUrl?.length) return null;
              const url160 = s.downloadUrl.find((d: any) => d.quality === "160kbps")?.link;
              const url96 = s.downloadUrl.find((d: any) => d.quality === "96kbps")?.link;
              const bestUrl = url160 || url96 || s.downloadUrl[0]?.link || "";
              return {
                id: 95000 + i,
                title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown",
                artist: s.primaryArtists || "Unknown",
                album: albumName,
                cover: s.image?.find((img: any) => img.quality === "500x500")?.link || "",
                src: bestUrl,
                duration: parseInt(String(s.duration)) || 0,
                type: "audio" as const,
                songId: s.id,
              };
            })
            .filter((t: Track | null): t is Track => t !== null);
          setAlbumSongs(tracks);
          setLoadingAlbum(false);
          return;
        }
      }
    } catch {}
    
    try {
      const res = await fetch(`${API_BASE}/playlists?id=${albumId}`);
      if (res.ok) {
        const data = await res.json();
        const songs = data.data?.songs || [];
        if (songs.length > 0) {
          const tracks: Track[] = songs
            .map((s: any, i: number) => {
              if (!s.downloadUrl?.length) return null;
              const url160 = s.downloadUrl.find((d: any) => d.quality === "160kbps")?.link;
              const url96 = s.downloadUrl.find((d: any) => d.quality === "96kbps")?.link;
              const bestUrl = url160 || url96 || s.downloadUrl[0]?.link || "";
              return {
                id: 95000 + i,
                title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown",
                artist: s.primaryArtists || "Unknown",
                album: albumName,
                cover: s.image?.find((img: any) => img.quality === "500x500")?.link || "",
                src: bestUrl,
                duration: parseInt(String(s.duration)) || 0,
                type: "audio" as const,
                songId: s.id,
              };
            })
            .filter((t: Track | null): t is Track => t !== null);
          setAlbumSongs(tracks);
          setLoadingAlbum(false);
          return;
        }
      }
    } catch {}
    
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(albumName)}&page=1&limit=50`);
      if (res.ok) {
        const data = await res.json();
        const songs = data.data?.results || [];
        const tracks: Track[] = songs
          .map((s: any, i: number) => {
            if (!s.downloadUrl?.length) return null;
            const url160 = s.downloadUrl.find((d: any) => d.quality === "160kbps")?.link;
            const url96 = s.downloadUrl.find((d: any) => d.quality === "96kbps")?.link;
            const bestUrl = url160 || url96 || s.downloadUrl[0]?.link || "";
            return {
              id: 95000 + i,
              title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown",
              artist: s.primaryArtists || "Unknown",
              album: albumName,
              cover: s.image?.find((img: any) => img.quality === "500x500")?.link || "",
              src: bestUrl,
              duration: parseInt(String(s.duration)) || 0,
              type: "audio" as const,
              songId: s.id,
            };
          })
          .filter((t: Track | null): t is Track => t !== null);
        setAlbumSongs(tracks);
      }
    } catch {}
    setLoadingAlbum(false);
  }, []);

  const handleAlbumPress = (index: number) => {
    const rawAlbum = rawAlbums[index];
    if (rawAlbum && rawAlbum.id) {
      const albumName = typeof rawAlbum.name === 'string' ? rawAlbum.name : rawAlbum.name?.name || rawAlbum.name?.id || "Unknown Album";
      fetchAlbumSongs(rawAlbum.id, albumName);
    }
  };

  const backToAlbums = () => {
    setSelectedAlbum(null);
    setAlbumSongs([]);
  };

  const FILTERS = [
    { key: "songs" as const, label: "Songs", icon: Music2 },
    { key: "artists" as const, label: "Artists", icon: Users },
    { key: "albums" as const, label: "Albums", icon: Disc },
  ];

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden pb-28">
      <div className="px-4 md:px-6 pt-8">
        {/* Search Bar */}
        <form onSubmit={(e) => { e.preventDefault(); }} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs, artists, albums..."
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </form>

        {/* Filter Chips */}
        {query.length > 0 && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {FILTERS.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeFilter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={14} />
                  {f.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Empty State - No Query */}
        {!query ? (
          <>
            {/* Trending Searches */}
            <div className="mt-8">
              <h3 className="text-lg font-bold text-foreground mb-3">🔥 Trending Searches</h3>
              <div className="flex flex-wrap gap-2">
                {TRENDING_SEARCHES.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(t.query)}
                    className={`px-4 py-2.5 rounded-lg bg-gradient-to-r ${t.color} border border-border/50 hover:border-border transition-all`}
                  >
                    <span className="text-sm font-medium text-foreground">{t.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Top Artists Grid */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-foreground">🎤 Top Artists</h3>
                <button
                  onClick={() => setShowActressesModal(true)}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                  View All <ChevronRight size={12} />
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {[...HINDI_ARTISTS, ...BENGALI_ARTISTS].slice(0, 8).map((artist, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(artist.query)}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="w-full aspect-square rounded-full object-cover bg-muted group-hover:opacity-80 transition-opacity"
                    />
                    <span className="text-xs text-muted-foreground text-center line-clamp-1">{artist.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <History size={14} />
                    Recent Searches
                  </div>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 pl-3 pr-1 py-1.5 rounded-full bg-card border border-border hover:bg-accent transition-colors"
                    >
                      <button
                        onClick={() => handleSearch(h)}
                        className="text-sm text-foreground"
                      >
                        {h}
                      </button>
                      <button
                        onClick={() => {
                          const updated = searchHistory.filter((_, idx) => idx !== i);
                          setSearchHistory(updated);
                          localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
                        }}
                        className="p-1 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : results.length === 0 && artistResults.length === 0 ? (
          <div className="text-center py-20">
            <Disc size={48} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No results found for "{query}"</p>
          </div>
        ) : (
          <>
            {/* Songs Results */}
            {activeFilter === "songs" && results.length > 0 && (
              <div className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <p className="text-sm text-muted-foreground">
                    Page <span className="text-foreground font-medium">{currentPage}</span> • <span className="text-foreground font-medium">{totalResults}+</span> Total results
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentPage > 1 && (
                      <button
                        onClick={() => loadPage(currentPage - 1)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-primary hover:bg-muted/80 transition-colors"
                      >
                        <ChevronRight size={12} className="rotate-180" />
                        Prev
                      </button>
                    )}
                    <button
                      onClick={() => loadPage(currentPage + 1)}
                      disabled={!hasMore}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-primary hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      Next
                      <ChevronRight size={12} />
                    </button>
                    <button
                      onClick={() => {
                        results.forEach(track => addToQueue(track));
                        toast.success(`Added ${results.length} songs to queue`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-primary hover:bg-muted/80 transition-colors ml-2"
                    >
                      <List size={12} />
                      Add All to Queue
                    </button>
                    <button
                      onClick={() => {
                        playTrackList(results, 0);
                        toast.success(`Playing ${results.length} songs`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/80 transition-colors"
                    >
                      <Play size={12} />
                      Play All
                    </button>
                  </div>
                </div>

                {loading ? (
                   <div className="flex items-center justify-center py-20">
                     <Loader2 size={32} className="animate-spin text-primary" />
                   </div>
                ) : (
                  <>
                    {results.map((track, i) => (
                      <SongRow
                        key={`${track.src}-${i}`}
                        track={track}
                        index={i}
                        isFavorite={false}
                        onToggleFavorite={() => {}}
                      />
                    ))}

                    {/* Pagination Bottom Buttons */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                      <button
                        onClick={() => loadPage(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="px-4 py-2 rounded-lg bg-muted text-sm font-medium text-primary hover:bg-muted/80 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <ChevronRight size={16} className="rotate-180" />
                        Previous Page
                      </button>
                      <span className="text-sm font-medium text-muted-foreground">Page {currentPage}</span>
                      <button
                        onClick={() => loadPage(currentPage + 1)}
                        disabled={!hasMore || loading}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        Next Page
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Artists Results */}
            {activeFilter === "artists" && artistResults.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-foreground mb-3">Artists ({artistResults.length})</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {artistResults.map((artist: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleArtistPress(artist)}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <img
                        src={artist.image?.[0]?.link || ''}
                        alt={artist.name}
                        className="w-full aspect-square rounded-full object-cover bg-muted group-hover:opacity-80 transition-opacity"
                      />
                      <span className="text-xs text-muted-foreground text-center line-clamp-1">{artist.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Albums Results / Album Songs View */}
            {activeFilter === "albums" && (
              <div>
                {selectedAlbum && albumSongs.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={backToAlbums}
                        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
                      >
                        <ChevronRight size={16} className="rotate-180" />
                        Back to Albums
                      </button>
                      <button
                        onClick={() => playTrackList(albumSongs, 0)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium"
                      >
                        <Play size={12} />
                        Play All
                      </button>
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1">{selectedAlbum.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{albumSongs.length} songs</p>
                    {loadingAlbum ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 size={24} className="animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {albumSongs.map((track, i) => (
                          <SongRow
                            key={`${track.src}-${i}`}
                            track={track}
                            index={i}
                            isFavorite={false}
                            onToggleFavorite={() => {}}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : loadingAlbum ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <h3 className="text-base font-bold text-foreground mb-3">Albums ({results.length})</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {results.map((album, i) => (
                        <button
                          key={i}
                          onClick={() => handleAlbumPress(i)}
                          className="flex flex-col gap-1.5 group"
                        >
                          <img
                            src={album.cover || ''}
                            alt={album.title}
                            className="w-full aspect-square rounded-lg object-cover bg-muted group-hover:opacity-80 transition-opacity"
                          />
                          <span className="text-xs text-muted-foreground line-clamp-1 font-medium">{album.title}</span>
                          <span className="text-[10px] text-muted-foreground/70 line-clamp-1">{album.artist}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showActressesModal && (
        <ActressesModal
          onSelectArtist={(artist) => {
            setShowActressesModal(false);
            setActressPlaylist({ name: artist.name, query: artist.searchQuery });
          }}
          onClose={() => setShowActressesModal(false)}
        />
      )}
      {actressPlaylist && (
        <ArtistPlaylist
          artistName={actressPlaylist.name}
          searchQuery={actressPlaylist.query}
          onClose={() => setActressPlaylist(null)}
        />
      )}
    </main>
  );
};

export default SearchPage;
