import { useState, useEffect, useRef } from "react";
import { X, Play, Loader2, Music2, TrendingUp, Clock } from "lucide-react";
import { Track } from "@/data/playlist";
import { usePlayer } from "@/context/PlayerContext";

interface FullPlaylistProps {
  title: string;
  icon: "trending" | "new" | "history";
  initialSongs: Track[];
  loadMore?: (page: number) => Promise<Track[]>;
  onClose: () => void;
}

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const FullPlaylist = ({ title, icon, initialSongs, loadMore, onClose }: FullPlaylistProps) => {
  const { playTrackList, currentTrack, isPlaying } = usePlayer();
  const [songs, setSongs] = useState<Track[]>(initialSongs);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(!!loadMore);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !loadMore) return;

    const handleScroll = () => {
      if (loadingMore || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        setLoadingMore(true);
        const nextPage = page + 1;
        loadMore(nextPage)
          .then((newSongs) => {
            if (newSongs.length === 0) {
              setHasMore(false);
            } else {
              setSongs((prev) => [...prev, ...newSongs]);
              setPage(nextPage);
            }
          })
          .finally(() => setLoadingMore(false));
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [loadingMore, hasMore, loadMore, page]);

  const iconMap = {
    trending: <TrendingUp size={16} className="text-primary" />,
    new: <Music2 size={16} className="text-primary" />,
    history: <Clock size={16} className="text-primary" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <h2 className="text-base md:text-lg font-bold text-foreground truncate">{title}</h2>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
              {songs.length}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {songs.length > 0 && (
              <button
                onClick={() => playTrackList(songs, 0)}
                className="px-3 py-1.5 text-[10px] md:text-xs rounded-full bg-primary text-primary-foreground font-medium hover:brightness-110 transition-all"
              >
                Play All
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Song List */}
        <div ref={scrollRef} className="overflow-y-auto flex-1 p-2 md:p-3 space-y-0.5">
          {songs.length === 0 && (
            <div className="text-center py-12">
              <Music2 size={32} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No songs</p>
            </div>
          )}

          {songs.map((track, i) => {
            const isActive = currentTrack?.src === track.src;
            return (
              <div
                key={`${track.src}-${i}`}
                onClick={() => playTrackList(songs, i)}
                className={`flex items-center gap-3 p-2 md:p-2.5 rounded-lg cursor-pointer transition-colors group ${
                  isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-accent border border-transparent"
                }`}
              >
                <div className="relative flex-shrink-0 w-7 md:w-8 text-center">
                  {isActive && isPlaying ? (
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" />
                      <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
                      <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
                    </div>
                  ) : (
                    <>
                      <span className="text-[10px] md:text-xs text-muted-foreground group-hover:hidden">{i + 1}</span>
                      <Play size={12} className="text-primary hidden group-hover:block mx-auto" />
                    </>
                  )}
                </div>
                <div className="relative flex-shrink-0">
                  <img src={track.cover} alt="" className={`w-10 h-10 md:w-11 md:h-11 rounded-md object-cover ${isActive ? "ring-2 ring-primary" : ""}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs md:text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>{track.title}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground truncate">{track.artist}</p>
                </div>
                <span className="text-[9px] md:text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                  {track.duration ? formatDuration(track.duration) : "--:--"}
                </span>
              </div>
            );
          })}

          {loadingMore && (
            <div className="flex items-center justify-center py-4 gap-2">
              <Loader2 size={16} className="animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          )}

          {!hasMore && loadMore && songs.length > 0 && !loadingMore && (
            <div className="text-center py-4">
              <p className="text-[10px] text-muted-foreground/50">All songs loaded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


