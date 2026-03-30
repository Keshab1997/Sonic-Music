import { useState, useEffect, useRef, useCallback } from "react";
import { X, Play, Loader2, Shuffle, Music2 } from "lucide-react";
import { Track } from "@/data/playlist";
import { usePlayer } from "@/context/PlayerContext";

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
  const { playTrackList } = usePlayer();
  const [songs, setSongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fetchCountRef = useRef(0);

  const todayStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const fetchSongs = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(
        `${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}&page=${pageNum}&limit=20`
      );
      if (!res.ok) return;
      const data = await res.json();
      const results = data.data?.results || [];

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

      // Daily shuffle only for first page
      const tracksToSet = pageNum === 1 ? dailyShuffle(newTracks) : newTracks;

      if (append) {
        setSongs((prev) => [...prev, ...tracksToSet]);
      } else {
        setSongs(tracksToSet);
      }

      if (results.length < 20) {
        setHasMore(false);
      }
    } catch { /* ignore */ }

    setLoading(false);
    setLoadingMore(false);
  }, [searchQuery]);

  // Initial load
  useEffect(() => {
    fetchSongs(1, false);
  }, [fetchSongs]);

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
              <div className="flex items-center gap-3">
                <span className="text-4xl">{emoji}</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{moodName}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/80 flex items-center gap-1">
                      <Shuffle size={10} /> Daily Mix
                    </span>
                    <span className="text-[10px] text-white/60">•</span>
                    <span className="text-[10px] text-white/60">{todayStr}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {songs.length > 0 && (
                  <button
                    onClick={() => playTrackList(songs, 0)}
                    className="px-4 py-2 text-xs rounded-full bg-white/20 backdrop-blur-sm text-white font-medium hover:bg-white/30 transition-all"
                  >
                    Play All
                  </button>
                )}
                <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Song List */}
        <div ref={scrollRef} className="overflow-y-auto flex-1 p-3 space-y-0.5">
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
        <div className="p-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{songs.length} songs loaded</span>
          {songs.length > 0 && (
            <button
              onClick={() => playTrackList(songs, 0)}
              className="px-4 py-1.5 text-xs rounded-full bg-primary text-primary-foreground font-medium hover:brightness-110 transition-all"
            >
              Play All
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
