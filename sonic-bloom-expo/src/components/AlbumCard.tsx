
import { Play, Pause } from "lucide-react-native";
import { usePlayer } from "@/context/PlayerContext";
import { Track } from "@/data/playlist";

interface AlbumCardProps {
  track: Track;
  index: number;
}

export const AlbumCard = ({ track, index }: AlbumCardProps) => {
  const { play, pause, isPlaying, currentIndex } = usePlayer();
  const isActive = currentIndex === index && isPlaying;

  return (
    <div className="group relative p-4 rounded-lg bg-card hover:bg-accent transition-colors duration-300 cursor-pointer">
      <div className="relative mb-4">
        <img
          src={track.cover}
          alt={track.album}
          className="w-full aspect-square object-cover rounded-md shadow-lg"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isActive) {
              pause();
            } else {
              play(index);
            }
          }}
          className={`absolute bottom-2 right-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-xl transition-all duration-300 ${
            isActive
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
          } hover:scale-105 hover:brightness-110`}
        >
          {isActive ? (
            <Pause size={20} className="text-primary-foreground" />
          ) : (
            <Play size={20} className="text-primary-foreground ml-0.5" />
          )}
        </button>
        {isActive && (
          <div className="absolute top-2 left-2 flex items-center gap-1">
            <span className="w-1 h-3 bg-primary rounded-full animate-pulse-glow" />
            <span className="w-1 h-4 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.2s" }} />
            <span className="w-1 h-2 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.4s" }} />
          </div>
        )}
      </div>
      <h3 className="font-semibold text-sm text-foreground truncate">{track.title}</h3>
      <p className="text-xs text-muted-foreground mt-1 truncate">{track.artist} · {track.album}</p>
    </div>
  );
};

