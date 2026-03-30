import { useState, useEffect } from "react";
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
  ListMusic,
  Moon,
  Music2,
  Settings,
  X,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { usePlayer, AudioQuality } from "@/context/PlayerContext";

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const QUALITY_OPTIONS: { label: string; value: AudioQuality }[] = [
  { label: "96 kbps", value: "96kbps" },
  { label: "160 kbps", value: "160kbps" },
  { label: "320 kbps", value: "320kbps" },
];

const SLEEP_OPTIONS = [15, 30, 45, 60, 90, 120];

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
    queue,
    removeFromQueue,
    clearQueue,
    quality,
    setQuality,
    sleepMinutes,
    setSleepTimer,
    cancelSleepTimer,
  } = usePlayer();

  const [showQueue, setShowQueue] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  if (!currentTrack) return null;

  return (
    <>
      {/* Queue Panel */}
      {showQueue && (
        <div className="fixed bottom-20 right-4 z-50 w-80 max-h-96 glass-heavy border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Queue ({queue.length})</h3>
            <div className="flex items-center gap-1">
              {queue.length > 0 && (
                <button onClick={clearQueue} className="p-1 text-muted-foreground hover:text-destructive transition-colors" title="Clear queue">
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={() => setShowQueue(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-72 p-2 space-y-1">
            {queue.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Queue is empty</p>
            ) : (
              queue.map((track, i) => (
                <div key={`${track.src}-${i}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent group">
                  <img src={track.cover} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{track.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  <button
                    onClick={() => removeFromQueue(i)}
                    className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sleep Timer Menu */}
      {showSleepMenu && (
        <div className="fixed bottom-20 right-20 z-50 w-48 glass-heavy border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Sleep Timer</span>
              <button onClick={() => setShowSleepMenu(false)} className="p-0.5 text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            </div>
          </div>
          {sleepMinutes !== null && (
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-xs text-primary">Timer active</span>
              <button onClick={cancelSleepTimer} className="text-[10px] text-destructive hover:underline">Cancel</button>
            </div>
          )}
          <div className="p-1">
            {SLEEP_OPTIONS.map((min) => (
              <button
                key={min}
                onClick={() => { setSleepTimer(min); setShowSleepMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                {min} minutes
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quality Menu */}
      {showQualityMenu && (
        <div className="fixed bottom-20 right-36 z-50 w-40 glass-heavy border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Audio Quality</span>
              <button onClick={() => setShowQualityMenu(false)} className="p-0.5 text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            </div>
          </div>
          <div className="p-1">
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setQuality(opt.value); setShowQualityMenu(false); }}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${
                  quality === opt.value ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {opt.label} {quality === opt.value && "✓"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lyrics Panel */}
      {showLyrics && currentTrack?.songId && (
        <LyricsPanel songId={currentTrack.songId} title={currentTrack.title} onClose={() => setShowLyrics(false)} />
      )}

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
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-foreground truncate">{currentTrack.title}</p>
              </div>
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

          {/* Right section: volume + action buttons */}
          <div className="hidden md:flex items-center gap-2 w-1/4 justify-end">
            {/* Lyrics */}
            <button
              onClick={() => setShowLyrics(!showLyrics)}
              className={`p-1.5 rounded-full transition-colors ${
                showLyrics ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Lyrics"
            >
              <Music2 size={16} />
            </button>

            {/* Sleep Timer */}
            <div className="relative">
              <button
                onClick={() => { setShowSleepMenu(!showSleepMenu); setShowQueue(false); setShowQualityMenu(false); }}
                className={`p-1.5 rounded-full transition-colors ${
                  sleepMinutes !== null ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Sleep Timer"
              >
                <Moon size={16} />
              </button>
            </div>

            {/* Queue */}
            <div className="relative">
              <button
                onClick={() => { setShowQueue(!showQueue); setShowSleepMenu(false); setShowQualityMenu(false); }}
                className={`p-1.5 rounded-full transition-colors relative ${
                  showQueue ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Queue"
              >
                <ListMusic size={16} />
                {queue.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                    {queue.length}
                  </span>
                )}
              </button>
            </div>

            {/* Quality */}
            <div className="relative">
              <button
                onClick={() => { setShowQualityMenu(!showQualityMenu); setShowQueue(false); setShowSleepMenu(false); }}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                title="Audio Quality"
              >
                <Settings size={14} />
                <span className="text-[9px] font-medium">{quality.replace("kbps", "")}</span>
              </button>
            </div>

            {/* Volume */}
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
              className="w-20 h-1 accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
              style={{
                background: `linear-gradient(to right, hsl(var(--foreground)) ${volume * 100}%, hsl(var(--muted)) ${volume * 100}%)`,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

// Lyrics Panel Component
const LyricsPanel = ({ songId, title, onClose }: { songId: string; title: string; onClose: () => void }) => {
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

  useEffect(() => {
    setLoading(true);
    setError(false);
    setLyrics(null);
    fetch(`${API_BASE}/api/songs/${songId}/lyrics`)
      .then((res) => res.json())
      .then((data) => {
        if (data.lyrics) {
          setLyrics(data.lyrics);
        } else if (data.data?.lyrics) {
          setLyrics(data.data.lyrics);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [songId]);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[400px] max-h-[60vh] glass-heavy border border-border rounded-xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground truncate">{title} — Lyrics</h3>
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-[50vh] p-4">
        {loading && <p className="text-xs text-muted-foreground text-center py-6">Loading lyrics...</p>}
        {error && <p className="text-xs text-muted-foreground text-center py-6">Lyrics not available</p>}
        {lyrics && (
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {lyrics}
          </div>
        )}
      </div>
    </div>
  );
};
