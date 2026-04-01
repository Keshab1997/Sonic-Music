
import { useState, useEffect } from "react";
import { X, Play, Loader2, Shuffle, RefreshCw } from "lucide-react";
import { Track } from "@/data/playlist";
import { usePlayer } from "@/context/PlayerContext";

interface TimeMachinePlaylistProps {
  eraName: string;
  subtitle: string;
  searchQuery: string;
  onClose: () => void;
}

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

const getDailyPage = (maxPages: number) => {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return (seed % maxPages) + 1;
};

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

export const TimeMachinePlaylist = ({ eraName, subtitle, searchQuery, onClose }: TimeMachinePlaylistProps) => {
  const { playTrackList } = usePlayer();
  const [songs, setSongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSongs = async () => {
    setLoading(true);
    try {
      const page = getDailyPage(5);
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}&page=${page}&limit=25`);
      if (!res.ok) return;
      const data = await res.json();
      const results = data.data?.results || [];
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
        });
      setSongs(dailyShuffle(tracks));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchSongs();
  }, [searchQuery]);

  const todayStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-3 md:p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <h2 className="text-base md:text-xl font-bold text-foreground truncate">{eraName} — {subtitle}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">{songs.length} songs</p>
                <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Shuffle size={9} /> Daily Mix
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchSongs}
                disabled={loading}
                className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              {songs.length > 0 && (
                <button
                  onClick={() => playTrackList(songs, 0)}
                  className="px-3 py-1.5 text-xs rounded-full bg-primary text-primary-foreground font-medium hover:brightness-110 transition-all"
                >
                  Play All
                </button>
              )}
              <button onClick={onClose} className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-2">Playlist updated: {todayStr}</p>
        </div>

        <div className="overflow-y-auto max-h-[65vh] p-3 space-y-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          )}
          {!loading && songs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No songs found for this era</p>
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
                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

