
import { Play, Pause, SkipForward, X, Maximize2, ListPlus } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import { toast } from "sonner";

interface MiniPlayerProps {
  onExpand: () => void;
  onClose: () => void;
}

export const MiniPlayer = ({ onExpand, onClose }: MiniPlayerProps) => {
  const { currentTrack, isPlaying, togglePlay, next, progress, duration, tracks, playTrackList } = usePlayer();
  const { createPlaylist, addToPlaylist } = usePlaylists();

  const handleNewPlaylist = () => {
    if (tracks.length === 0) {
      toast.info("No tracks to save", { description: "Play some songs first" });
      return;
    }

    // Save current playlist with timestamp
    const playlistName = `Playlist - ${new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
    const newPl = createPlaylist(playlistName);
    
    // Add all current tracks to the new playlist
    tracks.forEach((track) => addToPlaylist(newPl.id, track));
    
    toast.success("Playlist saved", {
      description: `${tracks.length} songs saved to "${playlistName}"`,
    });

    // Clear current playlist and start fresh
    playTrackList([], 0);
  };

  if (!currentTrack) return null;

  const progressPercent = duration ? (progress / duration) * 100 : 0;

  return (
    <div className="fixed bottom-[140px] md:bottom-24 right-2 md:right-4 z-[101] md:z-50 w-[calc(100vw-1rem)] max-w-72 glass-heavy border border-border rounded-xl shadow-2xl overflow-hidden animate-slide-up">
      {/* Progress bar at top */}
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="p-3 flex items-center gap-3">
        {/* Cover */}
        <div className="relative flex-shrink-0 cursor-pointer" onClick={onExpand}>
          <img
            src={currentTrack.cover}
            alt=""
            className="w-11 h-11 rounded-lg object-cover shadow-md"
          />
          {isPlaying && (
            <div className="absolute bottom-0.5 left-0.5 flex items-end gap-0.5">
              <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" />
              <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
              <span className="w-0.5 h-1.5 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onExpand}>
          <p className="text-xs font-medium text-foreground truncate">{currentTrack.title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{currentTrack.artist}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            {isPlaying ? (
              <Pause size={16} className="text-primary-foreground" />
            ) : (
              <Play size={16} className="text-primary-foreground ml-0.5" />
            )}
          </button>
          <button
            onClick={next}
            className="p-2 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
          >
            <SkipForward size={16} />
          </button>
          <button
            onClick={handleNewPlaylist}
            className="p-2 text-muted-foreground hover:text-green-400 active:scale-90 transition-all"
            title="Save playlist & start new"
          >
            <ListPlus size={14} />
          </button>
          <button
            onClick={onExpand}
            className="p-2 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
          >
            <Maximize2 size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground/50 hover:text-muted-foreground active:scale-90 transition-all"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

