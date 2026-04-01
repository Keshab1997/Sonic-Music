import { useState, useEffect, useMemo } from "react";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1,
  ChevronDown, Heart, Music2, ListMusic,
  Volume2, Volume1, VolumeX,
  Moon, Sun, Sliders, Settings,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useLocalData } from "@/hooks/useLocalData";
import { useTheme } from "@/hooks/useTheme";
import { SyncedLyrics } from "@/components/SyncedLyrics";
import { parseLyrics } from "@/lib/lyricsParser";
import { fetchLyrics } from "@/lib/lyricsFetcher";

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

interface FullScreenPlayerProps {
  onClose: () => void;
  onShowPlaylist: () => void;
  onShowLyrics: () => void;
  onShowEqualizer?: () => void;
}

export const FullScreenPlayer = ({
  onClose, onShowPlaylist, onShowLyrics, onShowEqualizer,
}: FullScreenPlayerProps) => {
  const {
    currentTrack, isPlaying, progress, duration,
    shuffle, repeat, togglePlay, next, prev, seek,
    toggleShuffle, toggleRepeat, tracks, currentIndex,
    volume, setVolume, quality,
  } = usePlayer();

  const { isFavorite, toggleFavorite } = useLocalData();
  const { theme, toggleTheme } = useTheme();
  const [showLyrics, setShowLyrics] = useState(false);
  const [rawLyrics, setRawLyrics] = useState<string | null>(null);
  const [lyricsSynced, setLyricsSynced] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  useEffect(() => {
    if (!showLyrics || !currentTrack?.songId) return;
    let cancelled = false;
    setLyricsLoading(true);
    setRawLyrics(null);
    setLyricsSynced(false);
    fetchLyrics(currentTrack.songId, currentTrack.title, currentTrack.artist)
      .then((r) => { if (!cancelled && r) { setRawLyrics(r.lyrics); setLyricsSynced(r.synced); } })
      .catch(() => { if (!cancelled) setRawLyrics(null); })
      .finally(() => { if (!cancelled) setLyricsLoading(false); });
    return () => { cancelled = true; };
  }, [showLyrics, currentTrack?.songId, currentTrack?.title, currentTrack?.artist]);

  const lyricLines = useMemo(() => {
    if (!rawLyrics) return [];
    if (lyricsSynced) return parseLyrics(rawLyrics, duration);
    return duration > 0 ? parseLyrics(rawLyrics, duration) : [];
  }, [rawLyrics, lyricsSynced, duration]);

  if (!currentTrack) return null;

  const liked = isFavorite(currentTrack.src);
  const progressPercent = duration ? (progress / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[60] animate-slide-up">
      {/* Blurred background */}
      <div className="absolute inset-0">
        <img src={currentTrack.cover} alt="" className="w-full h-full object-cover scale-110 blur-3xl brightness-[0.3]" />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xl" />
      </div>

      <div className="relative z-10 flex flex-col h-full w-full">

        {/* ===== 1. HEADER ===== */}
        <header className="flex-shrink-0 flex items-center justify-between px-5 py-3">
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <ChevronDown size={22} />
          </button>
          <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-medium">Now Playing</p>
          <button onClick={onShowPlaylist} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <ListMusic size={20} />
          </button>
        </header>

        {/* ===== 2. MAIN CONTENT ===== */}
        <main className="flex-1 min-h-0 overflow-hidden">

          {/* --- Mobile (< md) --- */}
          <div className="md:hidden h-full px-4">
            {showLyrics ? (
              <div className="h-full">
                {lyricsLoading && <p className="text-sm text-white/40 text-center pt-12 animate-pulse">Loading lyrics...</p>}
                {!lyricsLoading && lyricLines.length === 0 && <p className="text-sm text-white/40 text-center pt-12">Lyrics not available</p>}
                {lyricLines.length > 0 && (
                  <SyncedLyrics lines={lyricLines} currentTime={progress} isPlaying={isPlaying} onSeek={seek} className="h-full" variant="dark" synced={lyricsSynced} />
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <img
                  src={currentTrack.cover} alt={currentTrack.title}
                  className={`w-[70%] max-w-[300px] aspect-square object-contain rounded-3xl shadow-2xl transition-transform duration-700 ${isPlaying ? "scale-100" : "scale-95"}`}
                />
              </div>
            )}
          </div>

          {/* --- Desktop (>= md) --- */}
          <div className="hidden md:block h-full px-6">
            {showLyrics ? (
              /* Lyrics ON → two-column split */
              <div className="h-full flex gap-6">
                {/* Left: Album art */}
                <div className="w-[38%] flex items-center justify-center flex-shrink-0">
                  <div className="w-full max-w-[300px] aspect-square relative group">
                    <img
                      src={currentTrack.cover} alt={currentTrack.title}
                      className={`w-full h-full object-contain rounded-3xl shadow-2xl transition-transform duration-700 ${isPlaying ? "scale-100" : "scale-95"}`}
                    />
                    {isPlaying && (
                      <div className="absolute bottom-4 left-4 flex items-end gap-1">
                        <span className="w-1 h-4 bg-white/80 rounded-full animate-pulse-glow" />
                        <span className="w-1 h-6 bg-white/80 rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
                        <span className="w-1 h-3 bg-white/80 rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
                        <span className="w-1 h-5 bg-white/80 rounded-full animate-pulse-glow" style={{ animationDelay: "0.45s" }} />
                      </div>
                    )}
                  </div>
                </div>
                {/* Right: Lyrics */}
                <div className="flex-1 min-h-0">
                  {lyricsLoading && <p className="text-sm text-white/40 text-center pt-12 animate-pulse">Loading lyrics...</p>}
                  {!lyricsLoading && lyricLines.length === 0 && <p className="text-sm text-white/40 text-center pt-12">Lyrics not available</p>}
                  {lyricLines.length > 0 && (
                    <SyncedLyrics lines={lyricLines} currentTime={progress} isPlaying={isPlaying} onSeek={seek} className="h-full" variant="dark" synced={lyricsSynced} />
                  )}
                </div>
              </div>
            ) : (
              /* Lyrics OFF → album art perfectly centered */
              <div className="h-full flex items-center justify-center">
                <div className="w-full max-w-[340px] aspect-square relative group">
                  <img
                    src={currentTrack.cover} alt={currentTrack.title}
                    className={`w-full h-full object-contain rounded-3xl shadow-2xl transition-transform duration-700 ${isPlaying ? "scale-100" : "scale-95"}`}
                  />
                  {isPlaying && (
                    <div className="absolute -inset-1 rounded-3xl bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  {isPlaying && (
                    <div className="absolute bottom-4 left-4 flex items-end gap-1">
                      <span className="w-1 h-4 bg-white/80 rounded-full animate-pulse-glow" />
                      <span className="w-1 h-6 bg-white/80 rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
                      <span className="w-1 h-3 bg-white/80 rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
                      <span className="w-1 h-5 bg-white/80 rounded-full animate-pulse-glow" style={{ animationDelay: "0.45s" }} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ===== 3. PLAYER CONTROLS ===== */}
        <footer className="flex-shrink-0 w-full px-5 md:px-8 pt-3 pb-5 md:pb-4">

          {/* Song info + heart — together on left */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm md:text-base font-bold text-white truncate leading-tight">{currentTrack.title}</h2>
              <p className="text-[11px] md:text-xs text-white/50 truncate">{currentTrack.artist}</p>
            </div>
            <button
              onClick={() => currentTrack && toggleFavorite(currentTrack)}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <Heart size={18} className={liked ? "text-red-500" : "text-white/40"} fill={liked ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <input
              type="range" min={0} max={duration || 0} value={progress}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full h-1 cursor-pointer appearance-none
                [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/20"
              style={{ background: `linear-gradient(to right, white ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)` }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-white/40 tabular-nums">{formatTime(progress)}</span>
              <span className="text-[10px] text-white/40 tabular-nums">{formatTime(duration)}</span>
            </div>
          </div>

          {/* 3-column controls: left=shuffle/repeat | center=prev/play/next | right=tools */}
          <div className="grid grid-cols-3 items-center">
            {/* Left: Shuffle + Repeat */}
            <div className="flex items-center gap-3">
              <button onClick={toggleShuffle} className={`transition-colors ${shuffle ? "text-primary" : "text-white/35 hover:text-white"}`}>
                <Shuffle size={16} />
              </button>
              <button onClick={toggleRepeat} className={`transition-colors ${repeat !== "off" ? "text-primary" : "text-white/35 hover:text-white"}`}>
                {repeat === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
              </button>
            </div>

            {/* Center: Prev / Play / Next */}
            <div className="flex items-center justify-center gap-4">
              <button onClick={prev} className="text-white/70 hover:text-white transition-colors active:scale-90">
                <SkipBack size={26} fill="currentColor" />
              </button>
              <button onClick={togglePlay} className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl">
                {isPlaying ? <Pause size={22} className="text-black" /> : <Play size={22} className="text-black ml-0.5" />}
              </button>
              <button onClick={next} className="text-white/70 hover:text-white transition-colors active:scale-90">
                <SkipForward size={26} fill="currentColor" />
              </button>
            </div>

            {/* Right: Tools */}
            <div className="flex items-center justify-end gap-2 md:gap-3">
              <button onClick={() => onShowEqualizer?.()} className="text-white/35 hover:text-white transition-colors" title="Equalizer">
                <Sliders size={14} />
              </button>
              <button onClick={() => setShowLyrics(!showLyrics)} className={`transition-colors ${showLyrics ? "text-primary" : "text-white/35 hover:text-white"}`} title="Lyrics">
                <Music2 size={14} />
              </button>
              <button onClick={() => setVolume(volume === 0 ? 0.7 : 0)} className="text-white/35 hover:text-white transition-colors">
                {volume === 0 ? <VolumeX size={14} /> : volume < 0.5 ? <Volume1 size={14} /> : <Volume2 size={14} />}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-10 md:w-14 h-0.5 cursor-pointer appearance-none
                  [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/15"
                style={{ background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.15) ${volume * 100}%)` }}
              />
            </div>
          </div>

          {/* Theme + Quality + Queue — small row */}
          <div className="flex items-center justify-center gap-4 mt-2">
            <button onClick={toggleTheme} className="text-white/25 hover:text-white transition-colors" title={theme === "dark" ? "Light mode" : "Dark mode"}>
              {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <button className="text-white/25 hover:text-white transition-colors flex items-center gap-0.5" title="Audio Quality">
              <Settings size={11} /><span className="text-[8px] font-bold">{quality.replace("kbps", "")}</span>
            </button>
            <button onClick={onShowPlaylist} className="text-white/25 hover:text-white transition-colors" title="Queue">
              <ListMusic size={13} />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
