import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const BottomPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    shuffle,
    repeat,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass-heavy border-t border-border">
      <div className="max-w-full mx-auto px-4 py-2 flex items-center gap-4">
        {/* Track info */}
        <div className="flex items-center gap-3 min-w-0 w-1/4">
          <img
            src={currentTrack.cover}
            alt={currentTrack.title}
            className="w-14 h-14 rounded-md object-cover shadow-md flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Controls center */}
        <div className="flex-1 flex flex-col items-center gap-1 max-w-xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-full transition-colors ${
                shuffle ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shuffle size={16} />
            </button>
            <button
              onClick={prev}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause size={18} className="text-background" />
              ) : (
                <Play size={18} className="text-background ml-0.5" />
              )}
            </button>
            <button
              onClick={next}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipForward size={20} fill="currentColor" />
            </button>
            <button
              onClick={toggleRepeat}
              className={`p-1.5 rounded-full transition-colors ${
                repeat !== "off" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {repeat === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          </div>

          {/* Seek bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-[10px] text-muted-foreground w-10 text-right tabular-nums">
              {formatTime(progress)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={progress}
              onChange={(e) => seek(Number(e.target.value))}
              className="flex-1 h-1 accent-primary cursor-pointer [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted appearance-none"
              style={{
                background: `linear-gradient(to right, hsl(var(--foreground)) ${
                  duration ? (progress / duration) * 100 : 0
                }%, hsl(var(--muted)) ${duration ? (progress / duration) * 100 : 0}%)`,
              }}
            />
            <span className="text-[10px] text-muted-foreground w-10 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-2 w-1/4 justify-end">
          <button
            onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {volume === 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-24 h-1 accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
            style={{
              background: `linear-gradient(to right, hsl(var(--foreground)) ${volume * 100}%, hsl(var(--muted)) ${volume * 100}%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
