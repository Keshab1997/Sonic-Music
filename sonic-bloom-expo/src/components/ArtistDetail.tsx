
import { useState, useEffect, useCallback } from "react";
import { X, Play, Loader2, Shuffle, RefreshCw } from "lucide-react-native";
import { Track } from "@/data/playlist";
import { usePlayer } from "@/context/PlayerContext";

interface ArtistDetailProps {
  artistName: string;
  searchQuery: string;
  onClose: () => void;
}

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

// Daily seed for page randomization
const getDailyPage = (maxPages: number) => {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return (seed % maxPages) + 1;
};

// Shuffle array with daily seed
const dailyShuffle = <T,>(arr: T[]): T[] => {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
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
}, i: number): Track => {
  const url96 = s.downloadUrl?.find((d) => d.quality === "96kbps")?.link;
  const url160 = s.downloadUrl?.find((d) => d.quality === "160kbps")?.link;
  const url320 = s.downloadUrl?.find((d) => d.quality === "320kbps")?.link;
  const bestUrl = url160 || url96 || url320 || s.downloadUrl?.[0]?.link || "";
  return {
    id: 7000 + i,
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

export const ArtistDetail = ({ artistName, searchQuery, onClose }: ArtistDetailProps) => {
  const { playTrackList } = usePlayer();
  const [songs, setSongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    try {
      // Use daily page number for variety
      const page = getDailyPage(5);
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}&page=${page}&limit=30`);
      if (!res.ok) return;
      const data = await res.json();
      const results = data.data?.results || [];
      const tracks = results
        .filter((s: { downloadUrl?: unknown[] }) => s.downloadUrl?.length > 0)
        .map((s: {
          name: string;
          primaryArtists: string;
          album: { name: string } | string;
          duration: string | number;
          image: { quality: string; link: string }[];
          downloadUrl: { quality: string; link: string }[];
          id: string;
        }, i: number) => parseSong(s, i));

      // Daily shuffle
      setSongs(dailyShuffle(tracks));
    } catch { /* ignore */ }
    setLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] glass-heavy border border-border sm:rounded-2xl rounded-t-2xl rounded-b-none shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative px-4 pt-3 pb-3 sm:px-5 sm:pt-4 sm:pb-4 border-b border-border flex-shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
          <div className="absolute inset-0 backdrop-blur-sm" />

          <div className="relative z-10">
            {/* Top Row: Name (Left) | Buttons (Right) */}
            <div className="flex items-center justify-between mb-2.5 sm:mb-3">
              <h2 className="text-lg sm:text-2xl font-extrabold text-foreground truncate tracking-tight flex-1 mr-2">{artistName}</h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                {songs.length > 0 && (
                  <button
                    onClick={() => playTrackList(songs, 0)}
                    className="px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-95"
                  >
                    Play All
                  </button>
                )}
                <button
                  onClick={fetchSongs}
                  disabled={loading}
                  className="p-2 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-all active:scale-95"
                  title="Refresh songs"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-all hover:scale-110 active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground">{songs.length} songs</p>
              <span className="text-[10px] text-primary bg-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Shuffle size={10} /> Daily Mix
              </span>
            </div>
          </div>
        </div>

        {/* Song List */}
        <div className="overflow-y-auto flex-1 px-3 sm:px-4 pt-3 pb-28 space-y-1.5 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          <p className="text-[10px] text-muted-foreground/60 px-2 pb-1">Updated: {today}</p>
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          )}
          {!loading && songs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-16">No songs found</p>
          )}
          {songs.map((track, i) => (
            <div
              key={`${track.src}-${i}`}
              onClick={() => playTrackList(songs, i)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 cursor-pointer transition-all group"
            >
              <div className="relative flex-shrink-0 w-8 sm:w-10 text-center">
                <span className="text-xs sm:text-sm text-muted-foreground group-hover:hidden font-medium">{i + 1}</span>
                <Play size={14} className="text-primary hidden group-hover:block mx-auto" fill="currentColor" />
              </div>
              <div className="relative flex-shrink-0">
                <img src={track.cover} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shadow-sm group-hover:ring-1 group-hover:ring-primary/30 transition-all" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">{track.title}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">{track.album}</p>
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground tabular-nums font-medium">
                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

