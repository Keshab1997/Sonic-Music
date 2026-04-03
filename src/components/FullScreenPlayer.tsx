
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { ShareButton } from "@/components/ShareButton";

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

  // Swipe-to-dismiss gesture
  const touchStart = useRef<{ y: number; x: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { y: e.touches[0].clientY, x: e.touches[0].clientX };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dy = e.touches[0].clientY - touchStart.current.y;
    const dx = e.touches[0].clientX - touchStart.current.x;
    if (dy > 10 && Math.abs(dy) > Math.abs(dx)) {
      setSwipeOffset(dy);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (swipeOffset > 100) {
      onClose();
    } else {
      setSwipeOffset(0);
    }
    touchStart.current = null;
  }, [swipeOffset, onClose]);

  if (!currentTrack) return null;

  const liked = isFavorite(currentTrack.src);
  const progressPercent = duration ? (progress / duration) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-[110] animate-slide-up bg-background"
      style={swipeOffset > 0 ? { transform: `translateY(${swipeOffset}px)` } : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Blurred background */}
      <div className="absolute inset-0">
        <img src={currentTrack.cover} alt="" className="w-full h-full object-cover scale-110 blur-3xl brightness-[0.3]" />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xl" />
      </div>

      <div className="relative z-10 flex flex-col h-full w-full">

        {/* ===== 1. HEADER ===== */}
        <header className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-2 safe-top">
          <button onClick={onClose} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <ChevronDown size={24} />
          </button>
          <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-medium">Now Playing</p>
          <button onClick={onShowPlaylist} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <ListMusic size={20} />
          </button>
        </header>

        {/* ===== 2. MAIN CONTENT ===== */}
        <main className="flex-1 min-h-0 overflow-hidden">

          {/* --- Mobile (< md) --- */}
          <div className="md:hidden h-full px-6">
            {showLyrics ? (
              <div className="h-full">
                {lyricsLoading && <p className="text-sm text-white/40 text-center pt-12 animate-pulse">Loading lyrics...</p>}
                {!lyricsLoading && lyricLines.length === 0 && <p className="text-sm text-white/40 text-center pt-12">Lyrics not available</p>}
                {lyricLines.length > 0 && (
                  <SyncedLyrics lines={lyricLines} currentTime={progress} isPlaying={isPlaying} onSeek={seek} className="h-full" variant="dark" synced={lyricsSynced} />
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center px-4">
                <img
                  src={currentTrack.cover} alt={currentTrack.title}
                  className={`w-full max-w-[300px] aspect-square object-cover rounded-2xl shadow-2xl transition-transform duration-700 ${isPlaying ? "scale-100" : "scale-[0.97]"}`}
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
        <footer className="flex-shrink-0 w-full px-6 md:px-8 pt-3 pb-8 md:pb-5 safe-bottom">

          {/* Song info + heart */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-lg font-bold text-white truncate leading-tight">{currentTrack.title}</h2>
              <p className="text-xs text-white/50 truncate">{currentTrack.artist}</p>
            </div>
            <button
              onClick={() => currentTrack && toggleFavorite(currentTrack)}
              className="p-2.5 rounded-full hover:bg-white/10 active:scale-90 transition-all flex-shrink-0"
            >
              <Heart size={22} className={liked ? "text-red-500" : "text-white/40"} fill={liked ? "currentColor" : "none"} />
            </button>
            <ShareButton track={currentTrack} className="text-white/40 hover:text-white flex-shrink-0" iconSize={20} />
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <input
              type="range" min={0} max={duration || 0} value={progress}
              onChange={(e) => seek(Number(e.target.value))}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -5 : 5;
                const newProgress = Math.max(0, Math.min(duration || 0, progress + delta));
                seek(newProgress);
              }}
              className="w-full h-1.5 cursor-pointer appearance-none
                [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/20"
              style={{ background: `linear-gradient(to right, white ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)` }}
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-white/40 tabular-nums">{formatTime(progress)}</span>
              <span className="text-[11px] text-white/40 tabular-nums">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls: shuffle | prev/play/next | repeat */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <button onClick={toggleShuffle} className={`p-2 transition-colors active:scale-90 ${shuffle ? "text-primary" : "text-white/35 hover:text-white"}`}>
              <Shuffle size={20} />
            </button>
            <button onClick={prev} className="text-white/70 hover:text-white transition-colors active:scale-90 p-2">
              <SkipBack size={30} fill="currentColor" />
            </button>
            <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl">
              {isPlaying ? <Pause size={28} className="text-black" /> : <Play size={28} className="text-black ml-0.5" />}
            </button>
            <button onClick={next} className="text-white/70 hover:text-white transition-colors active:scale-90 p-2">
              <SkipForward size={30} fill="currentColor" />
            </button>
            <button onClick={toggleRepeat} className={`p-2 transition-colors active:scale-90 ${repeat !== "off" ? "text-primary" : "text-white/35 hover:text-white"}`}>
              {repeat === "one" ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </button>
          </div>

          {/* Bottom row: tools + volume */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => onShowEqualizer?.()} className="text-white/35 hover:text-white transition-colors p-2 active:scale-90" title="Equalizer">
                <Sliders size={18} />
              </button>
              <button onClick={() => setShowLyrics(!showLyrics)} className={`transition-colors p-2 active:scale-90 ${showLyrics ? "text-primary" : "text-white/35 hover:text-white"}`} title="Lyrics">
                <Music2 size={18} />
              </button>
              <button onClick={toggleTheme} className="text-white/25 hover:text-white transition-colors p-2 active:scale-90" title={theme === "dark" ? "Light mode" : "Dark mode"}>
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setVolume(volume === 0 ? 0.7 : 0)} className="text-white/35 hover:text-white transition-colors active:scale-90">
                {volume === 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? -0.05 : 0.05;
                  setVolume(Math.max(0, Math.min(1, volume + delta)));
                }}
                className="w-20 h-1.5 cursor-pointer appearance-none
                  [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/15"
                style={{ background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.15) ${volume * 100}%)` }}
              />
              <div className="flex items-center gap-0.5 text-white/25">
                <Settings size={12} /><span className="text-[9px] font-bold">{quality.replace("kbps", "")}</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

