
import { useState, useEffect, useRef, useCallback } from "react";
import { X, Play, Loader2, Shuffle, Music2, RefreshCw, ListPlus } from "lucide-react-native";
import { Track } from "@/data/playlist";
import { usePlayer } from "@/context/PlayerContext";
import { toast } from "@/hooks/use-toast";

interface MoodPlaylistProps {
  moodName: string;
  emoji: string;
  searchQuery: string;
  gradient: string;
  onClose: () => void;
}

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

const getDailySeed = () => {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
};

const dailyShuffle = <T,>(arr: T[]): T[] => {
  const seed = getDailySeed();
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed * (i + 1)) % shuffled.length;
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const parseSong = (s: {
  name: string;
  primaryArtists: string;
  album: { name: string } | string;
  duration: string | number;
  image: { quality: string; link: string }[];
  downloadUrl: { quality: string; link: string }[];
  id: string;
}, offset: number): Track | null => {
  if (!s.downloadUrl?.length) return null;
  const url96 = s.downloadUrl?.find((d) => d.quality === "96kbps")?.link;
  const url160 = s.downloadUrl?.find((d) => d.quality === "160kbps")?.link;
  const url320 = s.downloadUrl?.find((d) => d.quality === "320kbps")?.link;
  const bestUrl = url160 || url96 || url320 || s.downloadUrl?.[0]?.link || "";
  if (!bestUrl) return null;
  return {
    id: 9000 + offset,
    title: s.name,
    artist: s.primaryArtists || "Unknown",
    album: typeof s.album === "string" ? s.album : s.album?.name || "",
    cover: s.image?.find((img) => img.quality === "500x500")?.link ||
           s.image?.[s.image.length - 1]?.link || "",
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

export const MoodPlaylist = ({ moodName, emoji, searchQuery, gradient, onClose }: MoodPlaylistProps) => {
  const { playTrackList, addToQueue } = usePlayer();
  const [songs, setSongs] = useState<Track[]>([]);
  const [allFetchedSongs, setAllFetchedSongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fetchCountRef = useRef(0);

  const todayStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const fetchSongs = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    console.log(`[MoodPlaylist] 🎵 Fetching songs for mood: "${moodName}" | Query: "${searchQuery}" | Page: ${pageNum}`);

    try {
      const res = await fetch(
        `${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}&page=${pageNum}&limit=20`
      );
      if (!res.ok) {
        console.error(`[MoodPlaylist] ❌ API request failed with status: ${res.status}`);
        return;
      }
      const data = await res.json();
      const results = data.data?.results || [];

      console.log(`[MoodPlaylist] ✅ Mood: "${moodName}" | Page ${pageNum} returned ${results.length} songs`);

      if (results.length === 0) {
        setHasMore(false);
        return;
      }

      const newTracks: Track[] = [];
      results.forEach((s: {
        name: string;
        primaryArtists: string;
        album: { name: string } | string;
        duration: string | number;
        image: { quality: string; link: string }[];
        downloadUrl: { quality: string; link: string }[];
        id: string;
      }) => {
        fetchCountRef.current += 1;
        const track = parseSong(s, fetchCountRef.current);
        if (track) newTracks.push(track);
      });

      // Store all fetched songs for refresh functionality
      if (append) {
        setAllFetchedSongs((prev) => [...prev, ...newTracks]);
      } else {
        setAllFetchedSongs(newTracks);
      }

      // Daily shuffle only for first page
      const tracksToSet = pageNum === 1 ? dailyShuffle(newTracks) : newTracks;

      if (append) {
        setSongs((prev) => {
          const updated = [...prev, ...tracksToSet];
          console.log(`[MoodPlaylist] 📋 Mood: "${moodName}" | Total displayed songs: ${updated.length}`);
          return updated;
        });
      } else {
        setSongs(tracksToSet);
        console.log(`[MoodPlaylist] 📋 Mood: "${moodName}" | Displayed songs reset to: ${tracksToSet.length}`);
      }

      if (results.length < 20) {
        console.log(`[MoodPlaylist] 🏁 Mood: "${moodName}" | No more pages available (got ${results.length} < 20)`);
        setHasMore(false);
      }
    } catch { /* ignore */ }

    setLoading(false);
    setLoadingMore(false);
  }, [searchQuery, moodName]);

  // Initial load
  useEffect(() => {
    console.log(`[MoodPlaylist] 🚀 MoodPlaylist opened | Mood: "${moodName}" | Search Query: "${searchQuery}"`);
    fetchSongs(1, false);
  }, [fetchSongs]);

  // Refresh with new shuffled songs (infinite shuffle)
  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    if (allFetchedSongs.length === 0) {
      setRefreshing(false);
      return;
    }

    // Create a truly random shuffle using current timestamp as seed
    const randomShuffle = <T,>(arr: T[]): T[] => {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Shuffle all fetched songs and take up to 20
    const shuffled = randomShuffle(allFetchedSongs);
    const newSongs = shuffled.slice(0, Math.min(20, shuffled.length));

    // Update displayed songs
    setSongs(newSongs);

    setRefreshing(false);

    // Scroll to top
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [allFetchedSongs]);

  // Add all current songs to queue
  const handleAddToQueue = useCallback(() => {
    songs.forEach(track => addToQueue(track));
    toast({
      title: "Added to Queue",
      description: `${songs.length} ${songs.length === 1 ? 'song' : 'songs'} added to your queue`,
      duration: 3000,
    });
  }, [songs, addToQueue]);

  // Infinite scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (loadingMore || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        setPage((prev) => {
          const next = prev + 1;
          fetchSongs(next, true);
          return next;
        });
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [loadingMore, hasMore, fetchSongs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`p-4 bg-gradient-to-r ${gradient} relative`}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 mr-2">
                <span className="text-3xl md:text-4xl flex-shrink-0">{emoji}</span>
                <div className="min-w-0">
                  <h2 className="text-base md:text-xl font-bold text-white truncate">{moodName}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/80 flex items-center gap-1">
                      <Shuffle size={10} /> Daily Mix
                    </span>
                    <span className="text-[10px] text-white/60">•</span>
                    <span className="text-[10px] text-white/60">{todayStr}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                {songs.length > 0 && (
                  <>
                    <button
                      onClick={handleAddToQueue}
                      className="px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs rounded-full bg-white/20 backdrop-blur-sm text-white font-medium hover:bg-white/30 transition-all flex items-center gap-1"
                      title="Add to Queue"
                    >
                      <ListPlus size={14} />
                      <span className="hidden md:inline">Queue</span>
                    </button>
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing || allFetchedSongs.length === 0}
                      className="px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs rounded-full bg-white/20 backdrop-blur-sm text-white font-medium hover:bg-white/30 transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh songs"
                    >
                      <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                      <span className="hidden md:inline">Refresh</span>
                    </button>
                    <button
                      onClick={() => playTrackList(songs, 0)}
                      className="px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs rounded-full bg-white/20 backdrop-blur-sm text-white font-medium hover:bg-white/30 transition-all"
                    >
                      Play All
                    </button>
                  </>
                )}
                <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Song List */}
        <div ref={scrollRef} className="overflow-y-auto flex-1 p-3 pb-6 space-y-0.5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          )}

          {!loading && songs.length === 0 && (
            <div className="text-center py-12">
              <Music2 size={32} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No songs found</p>
            </div>
          )}

          {songs.map((track, i) => (
            <div
              key={`${track.src}-${i}`}
              onClick={() => playTrackList(songs, i)}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent cursor-pointer transition-colors group"
            >
              <div className="relative flex-shrink-0 w-8 text-center">
                <span className="text-xs text-muted-foreground group-hover:hidden">{i + 1}</span>
                <Play size={14} className="text-primary hidden group-hover:block mx-auto" />
              </div>
              <div className="relative flex-shrink-0">
                <img src={track.cover} alt="" className="w-11 h-11 rounded-md object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, "0")}` : "--:--"}
              </span>
            </div>
          ))}

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="flex items-center justify-center py-4 gap-2">
              <Loader2 size={16} className="animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading more songs...</span>
            </div>
          )}

          {/* No more songs message */}
          {!hasMore && songs.length > 0 && !loadingMore && (
            <div className="text-center py-6">
              <p className="text-xs text-muted-foreground/60">No more songs available</p>
              <p className="text-[10px] text-muted-foreground/40 mt-1">Check back tomorrow for fresh songs!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-muted-foreground">{songs.length} songs</span>
          <div className="flex items-center gap-2">
            {songs.length > 0 && (
              <>
                <button
                  onClick={handleAddToQueue}
                  className="px-3 py-1.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20 font-medium hover:bg-primary/20 transition-all flex items-center gap-1.5"
                >
                  <ListPlus size={14} />
                  Add to Queue
                </button>
                <button
                  onClick={() => playTrackList(songs, 0)}
                  className="px-4 py-1.5 text-xs rounded-full bg-primary text-primary-foreground font-medium hover:brightness-110 transition-all"
                >
                  Play All
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
