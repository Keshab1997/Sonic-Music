
import { useState, useEffect, useMemo } from "react";
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
  ListPlus,
  Moon,
  Music2,
  Settings,
  X,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sliders,
  Minimize2,
  MoreVertical,
  Heart,
  Plus,
  Save,
  Zap,
  Check,
} from "lucide-react";
import { usePlayer, AudioQuality } from "@/context/PlayerContext";
import { useLocalData } from "@/hooks/useLocalData";
import { usePlaylists } from "@/hooks/usePlaylists";
import { FullScreenPlayer } from "@/components/FullScreenPlayer";
import { Equalizer } from "@/components/Equalizer";
import { SyncedLyrics } from "@/components/SyncedLyrics";
import { parseLyrics } from "@/lib/lyricsParser";
import { fetchLyrics } from "@/lib/lyricsFetcher";

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

interface BottomPlayerProps {
  onShowMiniPlayer?: () => void;
  onShowEqualizer?: () => void;
}

export const BottomPlayer = ({ onShowMiniPlayer, onShowEqualizer }: BottomPlayerProps = {}) => {
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
    tracks,
    currentIndex,
    playTrackList,
    queue,
    addToQueue,
    playNext,
    removeFromQueue,
    clearQueue,
    moveQueueItem,
    shuffleQueue,
    quality,
    setQuality,
    sleepMinutes,
    setSleepTimer,
    cancelSleepTimer,
    playbackSpeed,
    setPlaybackSpeed,
    crossfade,
    setCrossfade,
  } = usePlayer();

  const { isFavorite, toggleFavorite } = useLocalData();
  const { playlists, createPlaylist, addToPlaylist } = usePlaylists();

  const [showQueue, setShowQueue] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [savedPlaylist, setSavedPlaylist] = useState(false);
  const [songMenu, setSongMenu] = useState<number | null>(null);
  const [songMenuPlSubmenu, setSongMenuPlSubmenu] = useState(false);
  const [newPlName, setNewPlName] = useState("");

  const handleSavePlaylist = () => {
    if (tracks.length === 0) return;
    const pl = createPlaylist(`Now Playing - ${new Date().toLocaleDateString()}`);
    tracks.forEach((track) => addToPlaylist(pl.id, track));
    setSavedPlaylist(true);
    setTimeout(() => setSavedPlaylist(false), 2000);
  };

  if (!currentTrack) return null;

  return (
    <>
      {/* Full Playlist Panel */}
      {showPlaylist && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPlaylist(false)} />
          <div className="relative w-full md:max-w-lg md:max-h-[85vh] max-h-[80vh] glass-heavy border border-border md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Now Playing</h2>
                  <p className="text-xs text-muted-foreground">{tracks.length} songs in playlist</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSavePlaylist}
                    disabled={tracks.length === 0 || savedPlaylist}
                    className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all flex items-center gap-1.5 ${
                      savedPlaylist
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                    }`}
                  >
                    {savedPlaylist ? <><Check size={13} /> Saved</> : <><Save size={13} /> Save Playlist</>}
                  </button>
                  <button onClick={() => setShowPlaylist(false)} className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
                    <X size={18} />
                  </button>
                </div>
              </div>
              {/* Current song big display */}
              <div className="flex items-center gap-3 mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                <img src={currentTrack.cover} alt="" className="w-14 h-14 rounded-lg object-cover shadow-md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{currentTrack.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                  {isPlaying && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" />
                      <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
                      <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
                      <span className="text-[10px] text-primary ml-1">Playing</span>
                    </div>
                  )}
                </div>
                <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:scale-105 transition-transform">
                  {isPlaying ? (
                    <Pause size={18} className="text-primary-foreground" />
                  ) : (
                    <Play size={18} className="text-primary-foreground ml-0.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[55vh] p-2 space-y-0.5">
              {tracks.map((track, i) => {
                const isCurrent = i === currentIndex;
                const liked = isFavorite(track.src);
                return (
                  <div
                    key={`${track.src}-${i}`}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors group ${
                      isCurrent ? "bg-primary/10 border border-primary/20" : "hover:bg-accent border border-transparent"
                    }`}
                  >
                    <div className="relative flex-shrink-0 w-8 text-center cursor-pointer" onClick={() => playTrackList(tracks, i)}>
                      {isCurrent && isPlaying ? (
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" />
                          <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
                          <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
                        </div>
                      ) : isCurrent ? (
                        <Pause size={12} className="text-primary mx-auto" />
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground group-hover:hidden">{i + 1}</span>
                          <Play size={12} className="text-primary hidden group-hover:block mx-auto" />
                        </>
                      )}
                    </div>
                    <div className="relative flex-shrink-0 cursor-pointer" onClick={() => playTrackList(tracks, i)}>
                      <img src={track.cover} alt="" className={`w-10 h-10 rounded-md object-cover ${isCurrent ? "ring-2 ring-primary" : ""}`} />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playTrackList(tracks, i)}>
                      <p className={`text-sm font-medium truncate ${isCurrent ? "text-primary" : "text-foreground"}`}>{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums cursor-pointer" onClick={() => playTrackList(tracks, i)}>
                      {track.duration ? formatTime(track.duration) : "--:--"}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(track); }}
                      className={`p-1.5 rounded-full transition-colors ${
                        liked ? "text-red-500" : "text-muted-foreground/0 group-hover:text-muted-foreground hover:text-red-400"
                      }`}
                      title={liked ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Heart size={14} fill={liked ? "currentColor" : "none"} />
                    </button>
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSongMenu(songMenu === i ? null : i); setSongMenuPlSubmenu(false); }}
                        className="p-1.5 rounded-full text-muted-foreground/0 group-hover:text-muted-foreground hover:text-foreground transition-colors"
                        title="More options"
                      >
                        <Plus size={14} />
                      </button>
                      {songMenu === i && (
                        <>
                          <div className="fixed inset-0 z-50" onClick={(e) => { e.stopPropagation(); setSongMenu(null); setSongMenuPlSubmenu(false); }} />
                          <div className="absolute right-0 top-full mt-1 z-[60] w-44 glass-heavy border border-border rounded-lg shadow-2xl overflow-hidden">
                            {/* Queue actions */}
                            <button
                              onClick={(e) => { e.stopPropagation(); playNext(track); setSongMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] text-foreground hover:bg-accent transition-colors"
                            >
                              <ListPlus size={13} /> Play Next
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); addToQueue(track); setSongMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] text-foreground hover:bg-accent transition-colors"
                            >
                              <ListMusic size={13} /> Add to Queue
                            </button>
                            <div className="border-t border-border" />
                            {/* Playlist actions */}
                            {playlists.map((pl) => (
                              <button
                                key={pl.id}
                                onClick={(e) => { e.stopPropagation(); addToPlaylist(pl.id, track); setSongMenu(null); setSongMenuPlSubmenu(false); }}
                                className="w-full text-left px-3 py-2 text-[11px] text-foreground hover:bg-accent transition-colors truncate"
                              >
                                {pl.name}
                              </button>
                            ))}
                            {playlists.length === 0 && <p className="px-3 py-2 text-[10px] text-muted-foreground/50">No playlists</p>}
                            <div className="border-t border-border flex items-center gap-1 px-2 py-1.5">
                              <input
                                type="text"
                                value={newPlName}
                                onChange={(e) => setNewPlName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && newPlName.trim()) {
                                    const pl = createPlaylist(newPlName.trim());
                                    addToPlaylist(pl.id, track);
                                    setNewPlName("");
                                    setSongMenu(null);
                                    setSongMenuPlSubmenu(false);
                                  }
                                }}
                                placeholder="New playlist..."
                                className="flex-1 text-[10px] px-2 py-1 rounded bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Queue Panel */}
      {showQueue && (
        <div className="fixed bottom-20 md:bottom-20 right-2 md:right-4 z-50 w-[calc(100vw-1rem)] max-w-80 max-h-96 glass-heavy border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Queue ({queue.length})</h3>
            <div className="flex items-center gap-1">
              {queue.length > 1 && (
                <button onClick={shuffleQueue} className="p-1 text-muted-foreground hover:text-primary transition-colors" title="Shuffle queue">
                  <Shuffle size={14} />
                </button>
              )}
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
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                    {i > 0 && (
                      <button onClick={() => moveQueueItem(i, i - 1)} className="p-1 text-muted-foreground hover:text-foreground" title="Move up">
                        <ChevronUp size={12} />
                      </button>
                    )}
                    {i < queue.length - 1 && (
                      <button onClick={() => moveQueueItem(i, i + 1)} className="p-1 text-muted-foreground hover:text-foreground" title="Move down">
                        <ChevronDown size={12} />
                      </button>
                    )}
                    <button onClick={() => removeFromQueue(i)} className="p-1 text-muted-foreground hover:text-destructive" title="Remove">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sleep Timer Menu */}
      {showSleepMenu && (
        <div className="fixed bottom-20 md:bottom-20 right-2 md:right-20 z-50 w-48 glass-heavy border border-border rounded-xl shadow-2xl overflow-hidden">
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
        <div className="fixed bottom-20 md:bottom-20 right-2 md:right-36 z-50 w-40 glass-heavy border border-border rounded-xl shadow-2xl overflow-hidden">
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

      {/* Playback Speed Menu */}
      {showSpeedMenu && (
        <div className="fixed bottom-20 md:bottom-20 right-2 md:right-48 z-50 w-36 glass-heavy border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Speed</span>
              <button onClick={() => setShowSpeedMenu(false)} className="p-0.5 text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            </div>
          </div>
          <div className="p-1">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => { setPlaybackSpeed(speed); setShowSpeedMenu(false); }}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                  playbackSpeed === speed ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <span>{speed}x</span>
                {playbackSpeed === speed && <Check size={12} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lyrics Panel */}
      {showLyrics && currentTrack?.songId && (
        <LyricsPanel
          songId={currentTrack.songId}
          title={currentTrack.title}
          artist={currentTrack.artist}
          currentTime={progress}
          duration={duration}
          onSeek={seek}
          isPlaying={isPlaying}
          onClose={() => setShowLyrics(false)}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 glass-heavy border-t border-border">
        <div className="max-w-full mx-auto px-3 md:px-4 py-2 flex items-center gap-2 md:gap-4">
          {/* Track info — clickable to open full screen player */}
          <div
            onClick={() => setShowFullScreen(true)}
            className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 md:flex-none md:w-1/4 cursor-pointer group"
          >
            <div className="relative flex-shrink-0">
              <img
                src={currentTrack.cover}
                alt={currentTrack.title}
                className="w-11 h-11 md:w-14 md:h-14 rounded-md object-cover shadow-md"
              />
              <div className="absolute inset-0 rounded-md bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                <ChevronUp size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{currentTrack.title}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
              <p className="text-[8px] md:text-[9px] text-muted-foreground/50 mt-0.5 hidden md:block">
                Tap to expand
              </p>
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

          {/* Mobile More Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground active:bg-accent transition-colors"
              title="More options"
            >
              <MoreVertical size={20} />
            </button>
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

            {/* Playback Speed */}
            <div className="relative">
              <button
                onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowQualityMenu(false); setShowQueue(false); setShowSleepMenu(false); }}
                className={`p-1.5 rounded-full transition-colors flex items-center gap-0.5 ${
                  playbackSpeed !== 1 ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Playback Speed"
              >
                <span className="text-[10px] font-bold">{playbackSpeed}x</span>
              </button>
            </div>

            {/* Crossfade */}
            <button
              onClick={() => setCrossfade(crossfade === 0 ? 3 : crossfade === 3 ? 5 : crossfade === 5 ? 0 : 0)}
              className={`p-1.5 rounded-full transition-colors ${
                crossfade > 0 ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              title={crossfade > 0 ? `Crossfade: ${crossfade}s` : "Crossfade: Off"}
            >
              <Zap size={15} />
            </button>

            {/* Equalizer */}
            <button
              onClick={() => setShowEqualizer(true)}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              title="Equalizer"
            >
              <Sliders size={16} />
            </button>

            {/* Mini Player */}
            <button
              onClick={() => onShowMiniPlayer?.()}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors hidden lg:block"
              title="Mini Player"
            >
              <Minimize2 size={16} />
            </button>

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

      {/* Mobile Menu Panel */}
      {showMobileMenu && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed bottom-[88px] right-2 z-50 md:hidden w-52 glass-heavy border border-border rounded-xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-2">
              <button
                onClick={() => { setShowLyrics(true); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <Music2 size={16} /> Lyrics
              </button>
              <button
                onClick={() => { setShowPlaylist(true); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <ListMusic size={16} /> Playlist
              </button>
              <button
                onClick={() => { setShowQueue(!showQueue); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <ListMusic size={16} /> Queue
                {queue.length > 0 && <span className="ml-auto text-[10px] text-primary">{queue.length}</span>}
              </button>
              <button
                onClick={() => { setShowSleepMenu(true); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <Moon size={16} /> Sleep Timer
                {sleepMinutes !== null && <span className="ml-auto text-[10px] text-primary">{sleepMinutes}m</span>}
              </button>
              <button
                onClick={() => { setShowQualityMenu(true); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <Settings size={16} /> Quality
                <span className="ml-auto text-[10px] text-primary">{quality.replace("kbps", "")}</span>
              </button>
              <button
                onClick={() => { setShowEqualizer(true); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <Sliders size={16} /> Equalizer
              </button>
              <div className="border-t border-border my-1" />
              <div className="flex items-center gap-3 px-3 py-2">
                {volume === 0 ? <VolumeX size={16} className="text-muted-foreground" /> : <Volume2 size={16} className="text-muted-foreground" />}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="flex-1 h-1 accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--foreground)) ${volume * 100}%, hsl(var(--muted)) ${volume * 100}%)`,
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Full Screen Player */}
      {showFullScreen && (
        <FullScreenPlayer
          onClose={() => setShowFullScreen(false)}
          onShowPlaylist={() => {
            setShowFullScreen(false);
            setShowPlaylist(true);
          }}
          onShowLyrics={() => setShowLyrics(true)}
          onShowEqualizer={() => {
            setShowFullScreen(false);
            setShowEqualizer(true);
          }}
        />
      )}

      {/* Equalizer */}
      {showEqualizer && (
        <Equalizer onClose={() => setShowEqualizer(false)} />
      )}
    </>
  );
};

// Lyrics Panel Component
const LyricsPanel = ({
  songId,
  title,
  artist,
  currentTime,
  duration,
  onSeek,
  isPlaying,
  onClose,
}: {
  songId: string;
  title: string;
  artist: string;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  onClose: () => void;
}) => {
  const [rawLyrics, setRawLyrics] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setRawLyrics(null);
    setIsSynced(false);

    fetchLyrics(songId, title, artist).then((result) => {
      if (cancelled) return;
      if (result) {
        setRawLyrics(result.lyrics);
        setIsSynced(result.synced);
      } else {
        setError(true);
      }
    }).catch(() => {
      if (!cancelled) setError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [songId, title, artist]);

  const lyricLines = useMemo(() => {
    if (!rawLyrics) return [];
    if (isSynced) {
      return parseLyrics(rawLyrics, duration);
    }
    return duration > 0 ? parseLyrics(rawLyrics, duration) : [];
  }, [rawLyrics, isSynced, duration]);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-[400px] h-[60vh] glass-heavy border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-border flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">{title} — Lyrics</h3>
          {isSynced && (
            <span className="text-[10px] text-primary font-medium">Synced</span>
          )}
        </div>
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {loading && <p className="text-xs text-muted-foreground text-center py-6">Loading lyrics...</p>}
        {error && <p className="text-xs text-muted-foreground text-center py-6">Lyrics not available</p>}
        {lyricLines.length > 0 && (
          <SyncedLyrics
            lines={lyricLines}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onSeek={onSeek}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
};

