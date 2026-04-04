import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1 } from "lucide-react-native";
import { usePlayer } from "@/context/PlayerContext";

interface PlayerControlsProps {
  showLyrics?: boolean;
  onToggleLyrics?: () => void;
  onShowPlaylist?: () => void;
  onShowEqualizer?: () => void;
  onShowMiniPlayer?: () => void;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const PlayerControls = ({
  showLyrics,
  onToggleLyrics,
  onShowPlaylist,
  onShowEqualizer,
  onShowMiniPlayer,
}: PlayerControlsProps) => {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    shuffle,
    repeat,
    togglePlay,
    next,
    prev,
    seek,
  } = usePlayer();

  if (!currentTrack) return null;

  return (
    <div className="flex items-center gap-2.5 md:gap-4 w-full">
      {/* Track info */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <img
          src={currentTrack.cover}
          alt=""
          width={40}
          height={40}
          className="w-10 h-10 rounded-lg object-cover shadow-sm flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {currentTrack.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {currentTrack.artist}
          </p>
        </div>
      </div>

      {/* Center controls */}
      <div className="flex flex-col items-center gap-1.5 flex-1 max-w-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => prev()}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Previous"
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={18} className="text-primary-foreground" />
            ) : (
              <Play size={18} className="text-primary-foreground ml-0.5" />
            )}
          </button>

          <button
            onClick={() => next()}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Next"
          >
            <SkipForward size={16} />
          </button>

          <button
            onClick={() => {}}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Shuffle"
          >
            <Shuffle size={16} className={shuffle ? "text-primary" : ""} />
          </button>

          <button
            onClick={() => {}}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Repeat"
          >
            {repeat === "off" ? (
              <Repeat size={16} />
            ) : repeat === "all" ? (
              <Repeat size={16} className="text-primary" />
            ) : (
              <Repeat1 size={16} className="text-primary" />
            )}
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 w-full">
          <span className="text-[10px] text-muted-foreground tabular-nums font-medium">
            {formatTime(progress)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={progress}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 h-1 accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
            style={{
              background: `linear-gradient(to right, hsl(var(--foreground)) ${
                (progress / (duration || 100)) * 100
              }%, hsl(var(--muted)) ${(progress / (duration || 100)) * 100}%)`,
            }}
          />
          <span className="text-[10px] text-muted-foreground tabular-nums font-medium">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right section placeholder */}
      <div className="hidden md:flex items-center gap-1.5 lg:gap-2 w-1/4 justify-end">
        {/* This will be filled by other components */}
      </div>
    </div>
  );
};