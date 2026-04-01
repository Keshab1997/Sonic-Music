import { useState, useEffect, useMemo } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ChevronDown,
  Heart,
  Music2,
  ListMusic,
  Volume2,
  Volume1,
  VolumeX,
  Moon,
  Sun,
  Sliders,
  Settings,
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

export const FullScreenPlayer = ({ onClose, onShowPlaylist, onShowLyrics, onShowEqualizer }: FullScreenPlayerProps) => {
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
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setRawLyrics(result.lyrics);
          setLyricsSynced(result.synced);
        }
      })
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

  // --- Album Art block (reusable) ---
  const albumArt = (
    <div className="flex items-center justify-center w-full h-full">
      <div className="w-full max-w-[280px] lg:max-w-[320px] aspect-square relative group">
        <img
          src={currentTrack.cover}
          alt={currentTrack.title}
          className={`w-full h-full object-contain rounded-3xl shadow-2xl transition-transform duration-700 ${
            isPlaying ? "scale-100" : "scale-95"
          }`}
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
  );

  // --- Lyrics panel block (reusable) ---
  const lyricsPanel = (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <span className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
          {lyricsSynced ? "Synced Lyrics" : "Lyrics"}
        </span>
      </div>
      {/* Lyrics content */}
      <div className="flex-1 min-h-0">
        {lyricsLoading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-white/40 animate-pulse">Loading lyrics...</p>
          </div>
        )}
        {!lyricsLoading && lyricLines.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-white/40">Lyrics not available</p>
          </div>
        )}
        {lyricLines.length > 0 && (
          <SyncedLyrics
            lines={lyricLines}
            currentTime={progress}
            isPlaying={isPlaying}
            onSeek={seek}
            className="h-full"
            variant="dark"
          />
        )}
      </div>
    </div>
  );

  // --- Controls block (reusable) ---
  const playerControls = (
    <>
      {/* Song info */}
      <div className="px-5 md:px-6 pb-1 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="text-lg md:text-xl font-bold text-white truncate">{currentTrack.title}</h2>
            <p className="text-sm text-white/60 truncate">{currentTrack.artist}</p>
          </div>
          <button
            onClick={() => currentTrack && toggleFavorite(currentTrack)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <Heart size={22} className={liked ? "text-red-500" : "text-white/60"} fill={liked ? "currentColor" : "none"} />
          </button>
        </div>
        <p className="text-[10px] text-white/30 mt-1">{currentIndex + 1} of {tracks.length} songs</p>
      </div>

      {/* Progress bar */}
      <div className="px-5 md:px-6 py-2 flex-shrink-0">
        <input
          type="range" min={0} max={duration || 0} value={progress}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full h-1.5 accent-primary cursor-pointer appearance-none
            [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/20"
          style={{ background: `linear-gradient(to right, white ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)` }}
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-white/50 tabular-nums">{formatTime(progress)}</span>
          <span className="text-[11px] text-white/50 tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback controls */}
      <div className="px-5 md:px-6 py-2 flex-shrink-0">
        <div className="flex items-center justify-center gap-5 md:gap-8">
          <button onClick={toggleShuffle} className={`p-2 rounded-full transition-colors ${shuffle ? "text-primary" : "text-white/50 hover:text-white"}`}>
            <Shuffle size={18} />
          </button>
          <button onClick={prev} className="p-2 text-white/80 hover:text-white transition-colors active:scale-90">
            <SkipBack size={30} fill="currentColor" />
          </button>
          <button onClick={togglePlay} className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl">
            {isPlaying ? <Pause size={26} className="text-black" /> : <Play size={26} className="text-black ml-0.5" />}
          </button>
          <button onClick={next} className="p-2 text-white/80 hover:text-white transition-colors active:scale-90">
            <SkipForward size={30} fill="currentColor" />
          </button>
          <button onClick={toggleRepeat} className={`p-2 rounded-full transition-colors ${repeat !== "off" ? "text-primary" : "text-white/50 hover:text-white"}`}>
            {repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="px-5 md:px-6 pb-6 md:pb-4 flex-shrink-0">
        <div className="flex items-center justify-center gap-4 md:gap-5">
          <button onClick={toggleTheme} className="p-2 rounded-full text-white/40 hover:text-white transition-colors" title={theme === "dark" ? "Light mode" : "Dark mode"}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="p-2 rounded-full text-white/40 hover:text-white transition-colors flex items-center gap-1" title="Audio Quality">
            <Settings size={13} /><span className="text-[9px] font-medium">{quality.replace("kbps", "")}</span>
          </button>
          <button onClick={() => onShowEqualizer?.()} className="p-2 rounded-full text-white/40 hover:text-white transition-colors" title="Equalizer">
            <Sliders size={16} />
          </button>
          <button onClick={() => setShowLyrics(!showLyrics)} className={`p-2 rounded-full transition-colors ${showLyrics ? "text-primary bg-primary/10" : "text-white/40 hover:text-white"}`} title="Lyrics">
            <Music2 size={16} />
          </button>
          <button onClick={onShowPlaylist} className="p-2 rounded-full text-white/40 hover:text-white transition-colors" title="Queue">
            <ListMusic size={16} />
          </button>
          <button onClick={() => setVolume(volume === 0 ? 0.7 : 0)} className="text-white/40 hover:text-white transition-colors" title="Volume">
            {volume === 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
          </button>
          <input type="range" min={0} max={1} step={0.01} value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-14 md:w-16 h-1 cursor-pointer appearance-none
              [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/20"
            style={{ background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)` }}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col h-[100dvh] overflow-hidden animate-slide-up">
      {/* Blurred cover background */}
      <div className="absolute inset-0 overflow-hidden">
        <img src={currentTrack.cover} alt="" className="w-full h-full object-cover scale-110 blur-3xl brightness-30" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col flex-1 min-h-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 z-10">
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <ChevronDown size={22} />
          </button>
          <div className="text-center">
            <p className="text-[10px] text-white/60 uppercase tracking-widest">Now Playing</p>
          </div>
          <button onClick={onShowPlaylist} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <ListMusic size={20} />
          </button>
        </div>

        {/* ===== MOBILE LAYOUT (< md) ===== */}
        <div className="flex-1 min-h-0 flex flex-col md:hidden">
          {showLyrics ? (
            /* Mobile: Lyrics mode — album art hidden, lyrics take full space */
            <div className="flex-1 min-h-0 px-2">
              {lyricsPanel}
            </div>
          ) : (
            /* Mobile: Art mode — album art centered */
            <div className="flex-1 min-h-0 px-6 py-2">
              {albumArt}
            </div>
          )}
          {/* Controls always visible at bottom */}
          <div className="flex-shrink-0">
            {playerControls}
          </div>
        </div>

        {/* ===== DESKTOP LAYOUT (>= md) ===== */}
        <div className="hidden md:flex flex-1 min-h-0">
          {/* Left: Album Art */}
          <div className="w-[40%] lg:w-[38%] flex-shrink-0 px-6 lg:px-10 py-4">
            {albumArt}
          </div>

          {/* Right: Lyrics + Controls */}
          <div className="flex-1 min-h-0 flex flex-col">
            {showLyrics ? (
              /* Desktop: Lyrics visible */
              <div className="flex-1 min-h-0 pr-4">
                {lyricsPanel}
              </div>
            ) : (
              /* Desktop: No lyrics — empty space with song info hint */
              <div className="flex-1 min-h-0 flex items-center justify-center pr-4">
                <div className="text-center">
                  <Music2 size={40} className="text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/20">Click the music note to show lyrics</p>
                </div>
              </div>
            )}
            {/* Controls pinned at bottom-right */}
            <div className="flex-shrink-0">
              {playerControls}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
