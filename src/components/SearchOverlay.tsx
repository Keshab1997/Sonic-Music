import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Play, TrendingUp, Music2, Disc3, User, Loader2, Heart, Clock, MoreHorizontal, ListPlus, PlaySquare, Plus, Check } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useLocalData } from "@/hooks/useLocalData";
import { usePlaylists } from "@/hooks/usePlaylists";
import { Track } from "@/data/playlist";

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";
const DEBOUNCE_MS = 400;

interface SearchResult {
  id: string;
  title: string;
  image: { quality: string; link: string }[];
  type: "song" | "album" | "artist" | "playlist";
  description?: string;
  primaryArtists?: string;
  album?: string;
  duration?: string;
  downloadUrl?: { quality: string; link: string }[];
}

interface SearchData {
  topQuery: { results: SearchResult[] };
  songs: { results: SearchResult[] };
  albums: { results: SearchResult[] };
  artists: { results: SearchResult[] };
  playlists: { results: SearchResult[] };
}

const getImage = (images: { quality: string; link: string }[], prefer = "500x500") =>
  images?.find((img) => img.quality === prefer)?.link ||
  images?.find((img) => img.quality === "150x150")?.link ||
  images?.[images.length - 1]?.link || "";

const toTrack = (s: SearchResult): Track => {
  const url96 = s.downloadUrl?.find((d) => d.quality === "96kbps")?.link;
  const url160 = s.downloadUrl?.find((d) => d.quality === "160kbps")?.link;
  const url320 = s.downloadUrl?.find((d) => d.quality === "320kbps")?.link;
  const bestUrl = url160 || url96 || url320 || s.downloadUrl?.[0]?.link || "";
  return {
    id: parseInt(s.id, 36) || Math.random() * 100000 | 0,
    title: s.title,
    artist: s.primaryArtists || s.description || "Unknown",
    album: s.album || "",
    cover: getImage(s.image),
    src: bestUrl,
    duration: parseInt(String(s.duration)) || 0,
    type: "audio",
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
  const [data, setData] = useState<SearchData | null>(null);
  const [songResults, setSongResults] = useState<Track[]>([]);
  const [trending, setTrending] = useState<Track[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [songMenu, setSongMenu] = useState<string | null>(null);
  const [songMenuPlSubmenu, setSongMenuPlSubmenu] = useState(false);
  const [newPlName, setNewPlName] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Load trending on mount
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch(`${API_BASE}/modules?language=hindi`);
        if (!res.ok) return;
        const mod = await res.json();
        const trendingRaw = mod.data?.trending?.songs || [];
        const ids = trendingRaw.slice(0, 10).map((s: { id: string }) => s.id).filter(Boolean);
        if (ids.length > 0) {
          const songRes = await fetch(`${API_BASE}/songs?id=${ids.join(",")}`);
          if (songRes.ok) {
            const songData = await songRes.json();
            const songs: SearchResult[] = (songData.data || []).map((s: SearchResult) => ({
              ...s,
              downloadUrl: s.downloadUrl || [],
            }));
            setTrending(songs.map((s, i) => ({ ...toTrack(s), id: 7500 + i })));
          }
        }
      } catch { /* ignore */ }
      setTrendingLoading(false);
    };
    fetchTrending();
  }, []);

  // Real-time search with debounce
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setData(null);
      setSongResults([]);
      return;
    }
    setLoading(true);
    try {
      // Fetch categorized results
      const allRes = fetch(`${API_BASE}/search/all?query=${encodeURIComponent(q)}`);
      // Fetch full song list with download URLs
      const songRes = fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(q)}&page=1&limit=20`);

      const [allData, songData] = await Promise.all([allRes, songRes]);

      if (allData.ok) {
        const json = await allData.json();
        setData(json.data || null);
      }

      if (songData.ok) {
        const json = await songData.json();
        const results = json.data?.results || [];
        const tracks: Track[] = results
          .filter((s: { downloadUrl?: unknown[] }) => s.downloadUrl?.length > 0)
          .map((s: {
            name: string;
            primaryArtists: string;
            album: { name: string } | string;
            duration: string | number;
            image: { quality: string; link: string }[];
            downloadUrl: { quality: string; link: string }[];
            id: string;
          }, i: number) => {
            const url96 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "96kbps")?.link;
            const url160 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "160kbps")?.link;
            const url320 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "320kbps")?.link;
            const bestUrl = url160 || url96 || url320 || s.downloadUrl?.[0]?.link || "";
            return {
              id: 8000 + i,
              title: s.name,
              artist: s.primaryArtists || "Unknown",
              album: typeof s.album === "string" ? s.album : s.album?.name || "",
              cover: s.image?.find((img: { quality: string }) => img.quality === "500x500")?.link ||
                     s.image?.find((img: { quality: string }) => img.quality === "150x150")?.link || "",
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
        setSongResults(tracks);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(val);
      if (val.trim()) addToHistory(val.trim());
    }, DEBOUNCE_MS);
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
  const hasResults = data && (data.songs?.results?.length > 0 || data.albums?.results?.length > 0 || data.artists?.results?.length > 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      <div ref={overlayRef} className="relative w-full max-w-2xl mx-auto mt-12 md:mt-20 max-h-[85vh] bg-[#0d0d12] border border-white/10 rounded-2xl overflow-hidden flex flex-col" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}>
        {/* Search Bar */}
        <div className="flex items-center gap-2 p-3 md:p-4 border-b border-border">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Search for songs, artists, albums..."
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setData(null); setSongResults([]); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground flex-shrink-0 md:hidden">
            <X size={20} />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          {/* Default: Trending + History */}
          {!isSearchMode && !loading && (
            <>
              {/* Search History */}
              {searchHistory.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <Clock size={13} />
                      Recent Searches
                    </div>
                    <button onClick={clearHistory} className="text-[10px] text-muted-foreground hover:text-destructive">Clear</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {searchHistory.slice(0, 8).map((h) => (
                      <div key={h} className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-card border border-border hover:bg-accent transition-colors">
                        <button onClick={() => { setQuery(h); doSearch(h); }} className="text-xs text-foreground">{h}</button>
                        <button onClick={() => removeHistoryItem(h)} className="p-0.5 text-muted-foreground hover:text-destructive"><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending */}
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
                {!trendingLoading && trending.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No trending songs</p>
                )}
                {trending.map((track, i) => {
                  const isActive = currentTrack?.src === track.src;
                  return (
                    <div
                      key={track.src}
                      onClick={() => handleSongClick(track, trending)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group ${
                        isActive ? "bg-primary/10" : "hover:bg-accent"
                      }`}
                    >
                      <span className="text-[10px] text-muted-foreground w-5 text-center flex-shrink-0">{i + 1}</span>
                      <div className="relative flex-shrink-0">
                        <img src={track.cover} alt="" className="w-10 h-10 rounded object-cover" />
                        <div className="absolute inset-0 rounded bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                          <Play size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>{track.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Search Results */}
          {isSearchMode && !loading && (
            <>
              {!hasResults && songResults.length === 0 && (
                <div className="text-center py-12">
                  <Search size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No results for "{query}"</p>
                </div>
              )}

              {/* Top Result */}
              {data?.topQuery?.results?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Result</h3>
                  {(() => {
                    const top = data.topQuery.results[0];
                    const isArtist = top.type === "artist";
                    return (
                      <div
                        onClick={() => {
                          if (isArtist) {
                            // Search for artist's songs
                            setQuery(top.title);
                            doSearch(top.title);
                          } else if (songResults.length > 0) {
                            handleSongClick(songResults[0], songResults);
                          }
                        }}
                        className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={getImage(top.image)} alt="" className={`w-16 h-16 object-cover ${isArtist ? "rounded-full" : "rounded-lg"}`} />
                            <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                                <Play size={16} className="text-primary-foreground ml-0.5" />
                              </div>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-bold text-foreground truncate">{top.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">{top.type}</p>
                            {top.description && <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{top.description}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Songs */}
              {songResults.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Songs</h3>
                  <div className="space-y-0.5">
                    {songResults.slice(0, 8).map((track) => {
                      const isActive = currentTrack?.src === track.src;
                      const liked = isFavorite(track.src);
                      return (
                        <div
                          key={track.src}
                          onClick={() => handleSongClick(track, songResults)}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group ${
                            isActive ? "bg-primary/10" : "hover:bg-accent"
                          }`}
                        >
                          <div className="relative flex-shrink-0">
                            <img src={track.cover} alt="" className={`w-10 h-10 rounded object-cover ${isActive ? "ring-1 ring-primary" : ""}`} />
                            <div className="absolute inset-0 rounded bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
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
                            <p className={`text-xs font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>{track.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(track); }}
                            className={`p-1.5 rounded-full transition-colors ${liked ? "text-red-500" : "text-muted-foreground/0 group-hover:text-muted-foreground"}`}
                          >
                            <Heart size={13} fill={liked ? "currentColor" : "none"} />
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSongMenu(songMenu === track.src ? null : track.src); setSongMenuPlSubmenu(false); }}
                              className="p-1.5 text-muted-foreground/0 group-hover:text-muted-foreground hover:text-foreground rounded-full transition-colors"
                            >
                              <MoreHorizontal size={13} />
                            </button>
                            {songMenu === track.src && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setSongMenu(null); setSongMenuPlSubmenu(false); }} />
                                <div className="absolute right-0 top-full mt-1 z-50 w-44 glass-heavy border border-border rounded-lg shadow-2xl overflow-hidden">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); playNext(track); setSongMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-accent"
                                  >
                                    <PlaySquare size={13} /> Play Next
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); addToQueue(track); setSongMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-accent"
                                  >
                                    <ListPlus size={13} /> Add to Queue
                                  </button>
                                  <div className="border-t border-border" />
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSongMenuPlSubmenu(!songMenuPlSubmenu); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-foreground hover:bg-accent"
                                  >
                                    <Plus size={13} /> Add to Playlist
                                  </button>
                                  {songMenuPlSubmenu && (
                                    <div className="border-t border-border max-h-32 overflow-y-auto">
                                      {playlists.map((pl) => (
                                        <button
                                          key={pl.id}
                                          onClick={(e) => { e.stopPropagation(); addToPlaylist(pl.id, track); setSongMenu(null); setSongMenuPlSubmenu(false); }}
                                          className="w-full text-left px-5 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent truncate"
                                        >
                                          {pl.name}
                                        </button>
                                      ))}
                                      {playlists.length === 0 && <p className="px-5 py-1.5 text-[10px] text-muted-foreground/50">No playlists</p>}
                                      <div className="flex items-center gap-1 px-3 py-1.5 border-t border-border">
                                        <input
                                          type="text"
                                          value={newPlName}
                                          onChange={(e) => setNewPlName(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" && newPlName.trim()) {
                                              const pl = createPlaylist(newPlName.trim());
                                              addToPlaylist(pl.id, track);
                                              setNewPlName("");
                                              setSongMenu(null);
                                              setSongMenuPlSubmenu(false);
                                            }
                                          }}
                                          placeholder="New..."
                                          className="flex-1 text-[10px] px-2 py-1 rounded bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none"
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
                    })}
                  </div>
                </div>
              )}

              {/* Albums */}
              {data?.albums?.results?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Albums</h3>
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    {data.albums.results.slice(0, 6).map((album) => (
                      <div
                        key={album.id}
                        onClick={() => { setQuery(album.title); doSearch(album.title); }}
                        className="flex-shrink-0 w-28 md:w-32 group cursor-pointer"
                      >
                        <div className="relative mb-1.5">
                          <img src={getImage(album.image)} alt="" className="w-28 h-28 md:w-32 md:h-32 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                          <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                              <Play size={14} className="text-primary-foreground ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] font-medium text-foreground truncate">{album.title}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{album.description || "Album"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Artists */}
              {data?.artists?.results?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Artists</h3>
                  <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
                    {data.artists.results.slice(0, 6).map((artist) => (
                      <div
                        key={artist.id}
                        onClick={() => { setQuery(artist.title); doSearch(artist.title); }}
                        className="flex-shrink-0 flex flex-col items-center gap-1.5 group cursor-pointer"
                      >
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden">
                          <img src={getImage(artist.image)} alt={artist.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        </div>
                        <p className="text-[10px] md:text-xs text-foreground text-center w-16 md:w-20 truncate">{artist.title}</p>
                        <p className="text-[8px] text-muted-foreground">Artist</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
