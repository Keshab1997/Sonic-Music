
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
  Download,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { usePlayer, AudioQuality } from "@/context/PlayerContext";
import { useLocalData } from "@/hooks/useLocalData";
import { useDownloads } from "@/hooks/useDownloads";
import { usePlaylists } from "@/hooks/usePlaylists";
import { FullScreenPlayer } from "@/components/FullScreenPlayer";
import { Equalizer } from "@/components/Equalizer";
import { SyncedLyrics } from "@/components/SyncedLyrics";
import { parseLyrics } from "@/lib/lyricsParser";
import { fetchLyrics } from "@/lib/lyricsFetcher";
import { toast } from "sonner";

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
  showPlaylist?: boolean;
  setShowPlaylist?: (show: boolean) => void;
}

export const BottomPlayer = ({ onShowMiniPlayer, onShowEqualizer: _onShowEqualizer, showPlaylist: externalShowPlaylist, setShowPlaylist: externalSetShowPlaylist }: BottomPlayerProps = {}) => {
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
    playTrack,
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
  const { downloadTrack, isDownloaded, isDownloading } = useDownloads();

  const [openPanel, setOpenPanel] = useState<"queue" | "sleep" | "quality" | "speed" | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [internalShowPlaylist, setInternalShowPlaylist] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [savedPlaylist, setSavedPlaylist] = useState(false);
  const [songMenu, setSongMenu] = useState<number | null>(null);
  const [_songMenuPlSubmenu, setSongMenuPlSubmenu] = useState(false);
  const [newPlName, setNewPlName] = useState("");

  const togglePanel = (panel: "queue" | "sleep" | "quality" | "speed") => {
    setShowMobileMenu(false);
    setOpenPanel(prev => prev === panel ? null : panel);
  };

  // closeAllPanels removed - not needed

  // Use external state if provided, otherwise use internal state
  const showPlaylist = externalShowPlaylist !== undefined ? externalShowPlaylist : internalShowPlaylist;
  const setShowPlaylist = externalSetShowPlaylist || setInternalShowPlaylist;

  const handleSavePlaylist = () => {
    if (tracks.length === 0) return;
    const pl = createPlaylist(`Now Playing - ${new Date().toLocaleDateString()}`);
    tracks.forEach((track) => addToPlaylist(pl.id, track));
    setSavedPlaylist(true);
    toast.success("Playlist Saved", {
      description: `${tracks.length} songs saved to new playlist`,
    });
    setTimeout(() => setSavedPlaylist(false), 2000);
  };

  const handleAddAllToQueue = () => {
    if (tracks.length === 0) return;
    tracks.forEach(track => addToQueue(track));
    toast.success("Added to Queue", {
      description: `${tracks.length} ${tracks.length === 1 ? 'song' : 'songs'} added to your queue`,
    });
  };

  if (!currentTrack) return null;

  return (
    <>
      {/* Full Playlist Panel */}
      {showPlaylist && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPlaylist(false)} />
          <div className="relative w-full h-full md:h-auto md:max-w-lg md:max-h-[85vh] glass-heavy border-t md:border border-border md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Now Playing</h2>
                  <p className="text-xs text-muted-foreground">{tracks.length} songs in playlist</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddAllToQueue}
                    disabled={tracks.length === 0}
                    className="px-3 py-1.5 text-xs rounded-full font-medium transition-all flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add all to queue"
                  >
                    <ListPlus size={13} /> Add to Queue
                  </button>
                  <button
                    onClick={() => {
                      tracks.forEach((track, i) => {
                        setTimeout(() => downloadTrack(track), i * 200);
                      });
                      toast.info("Downloading Playlist", {
                        description: `${tracks.length} songs will be downloaded for offline playback`,
                      });
                    }}
                    disabled={tracks.length === 0}
                    className="px-3 py-1.5 text-xs rounded-full font-medium transition-all flex items-center gap-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download all for offline"
                  >
                    <Download size={13} /> Download All
                  </button>
                  <button
                    onClick={handleSavePlaylist}
                    disabled={tracks.length === 0 || savedPlaylist}
                    className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all flex items-center gap-1.5 ${
                      savedPlaylist
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {savedPlaylist ? <><Check size={13} /> Saved</> : <><Save size={13} /> Save</>}
                  </button>
                  <button onClick={() => setShowPlaylist(false)} className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
              {/* Current song big display */}
              <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20 shadow-sm">
                <img src={currentTrack.cover} alt="" width={56} height={56} className="w-14 h-14 rounded-lg object-cover shadow-md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{currentTrack.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                  {isPlaying && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" />
                      <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
                      <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
                      <span className="text-[10px] text-primary ml-1 font-medium">Playing</span>
                    </div>
                  )}
                </div>
                <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md">
                  {isPlaying ? (
                    <Pause size={18} className="text-primary-foreground" />
                  ) : (
                    <Play size={18} className="text-primary-foreground ml-0.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-32 md:pb-6 p-3 space-y-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              {tracks.map((track, i) => {
                const isCurrent = i === currentIndex;
                const liked = isFavorite(track.src);
                return (
                  <div
                    key={`${track.src}-${i}`}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-all group ${
                      isCurrent ? "bg-primary/10 border border-primary/20 shadow-sm" : "hover:bg-accent/50 border border-transparent"
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
                        <Pause size={13} className="text-primary mx-auto" />
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground group-hover:hidden font-medium">{i + 1}</span>
                          <Play size={13} className="text-primary hidden group-hover:block mx-auto" />
                        </>
                      )}
                    </div>
                    <div className="relative flex-shrink-0 cursor-pointer" onClick={() => playTrackList(tracks, i)}>
                      <img src={track.cover} alt="" width={40} height={40} loading="lazy" className={`w-10 h-10 rounded-md object-cover shadow-sm transition-all ${isCurrent ? "ring-2 ring-primary" : "group-hover:ring-1 group-hover:ring-primary/30"}`} />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playTrackList(tracks, i)}>
                      <p className={`text-sm font-medium truncate transition-colors ${isCurrent ? "text-primary" : "text-foreground group-hover:text-primary"}`}>{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums cursor-pointer font-medium" onClick={() => playTrackList(tracks, i)}>
                      {track.duration ? formatTime(track.duration) : "--:--"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(track);
                        toast.success(liked ? "Removed from Liked" : "Added to Liked", {
                          description: track.title,
                          duration: 2000,
                        });
                      }}
                      className={`p-1.5 rounded-full transition-all ${
                        liked ? "text-red-500 hover:text-red-600 hover:scale-110" : "text-muted-foreground hover:text-red-500 hover:scale-110"
                      }`}
                      title={liked ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Heart size={15} fill={liked ? "currentColor" : "none"} strokeWidth={2} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDownloaded(track.songId || track.src) && !isDownloading(track.songId || track.src)) {
                          downloadTrack(track);
                          toast.info("Download Started", {
                            description: track.title,
                            duration: 2000,
                          });
                        }
                      }}
                      disabled={isDownloading(track.songId || track.src)}
                      className={`p-1.5 rounded-full transition-all ${
                        isDownloaded(track.songId || track.src)
                          ? "text-green-500 hover:text-green-600 hover:scale-110"
                          : isDownloading(track.songId || track.src)
                          ? "text-yellow-500"
                          : "text-muted-foreground hover:text-blue-500 hover:scale-110"
                      }`}
                      title={isDownloaded(track.songId || track.src) ? "Downloaded" : isDownloading(track.songId || track.src) ? "Downloading..." : "Download for offline"}
                    >
                      {isDownloading(track.songId || track.src) ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : isDownloaded(track.songId || track.src) ? (
                        <CheckCircle size={15} />
                      ) : (
                        <Download size={15} />
                      )}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                playNext(track);
                                setSongMenu(null);
                                toast.success("Playing Next", {
                                  description: track.title,
                                });
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] text-foreground hover:bg-accent transition-colors"
                            >
                              <ListPlus size={13} /> Play Next
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToQueue(track);
                                setSongMenu(null);
                                toast.success("Added to Queue", {
                                  description: track.title,
                                });
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] text-foreground hover:bg-accent transition-colors"
                            >
                              <ListMusic size={13} /> Add to Queue
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadTrack(track);
                                setSongMenu(null);
                                toast.info(isDownloaded(track.songId || track.src) ? "Already Downloaded" : "Download Started", {
                                  description: track.title,
                                });
                              }}
                              disabled={isDownloading(track.songId || track.src)}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                            >
                              {isDownloading(track.songId || track.src) ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : isDownloaded(track.songId || track.src) ? (
                                <CheckCircle size={13} />
                              ) : (
                                <Download size={13} />
                              )}
                              {isDownloaded(track.songId || track.src) ? "Downloaded" : "Download"}
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
      {openPanel === "queue" && (
        <div className="fixed bottom-[124px] md:bottom-20 left-1/2 -translate-x-1/2 z-[102] md:z-50 w-[calc(100vw-1.5rem)] max-w-80 max-h-[60vh] glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <h3 className="text-sm font-bold text-foreground">Queue</h3>
            <div className="flex items-center gap-1.5">
              {queue.length > 1 && (
                <button onClick={shuffleQueue} className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Shuffle queue">
                  <Shuffle size={14} />
                </button>
              )}
              {queue.length > 0 && (
                <button onClick={clearQueue} className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Clear queue">
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={() => setOpenPanel(null)} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <ListMusic size={24} className="text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Queue is empty</p>
              </div>
            ) : (
              queue.map((track, i) => (
                <div key={`${track.src}-${i}`} onClick={() => { removeFromQueue(i); playTrack(track); }} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-accent group cursor-pointer transition-colors">
                  <img src={track.cover} alt="" width={36} height={36} loading="lazy" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{track.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                    {i > 0 && (
                      <button onClick={(e) => { e.stopPropagation(); moveQueueItem(i, i - 1); }} className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted" title="Move up">
                        <ChevronUp size={12} />
                      </button>
                    )}
                    {i < queue.length - 1 && (
                      <button onClick={(e) => { e.stopPropagation(); moveQueueItem(i, i + 1); }} className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted" title="Move down">
                        <ChevronDown size={12} />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); removeFromQueue(i); }} className="p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Remove">
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
      {openPanel === "sleep" && (
        <div className="fixed bottom-[124px] md:bottom-20 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-20 z-[102] md:z-50 w-52 glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-bold text-foreground">Sleep Timer</span>
            <button onClick={() => setOpenPanel(null)} className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X size={14} />
            </button>
          </div>
          {sleepMinutes !== null && (
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-primary/5">
              <span className="text-xs text-primary font-medium flex items-center gap-1.5">
                <Moon size={12} /> {sleepMinutes}m remaining
              </span>
              <button onClick={cancelSleepTimer} className="text-[10px] text-destructive font-medium hover:underline">Cancel</button>
            </div>
          )}
          <div className="p-1.5">
            {SLEEP_OPTIONS.map((min) => (
              <button
                key={min}
                onClick={() => { setSleepTimer(min); setOpenPanel(null); }}
                className={`w-full text-left px-3 py-2.5 text-xs rounded-xl transition-colors ${
                  sleepMinutes === min ? "text-primary bg-primary/10 font-medium" : "text-foreground hover:bg-accent"
                }`}
              >
                {min} minutes
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quality Menu */}
      {openPanel === "quality" && (
        <div className="fixed bottom-[124px] md:bottom-20 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-36 z-[102] md:z-50 w-48 glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-bold text-foreground">Audio Quality</span>
            <button onClick={() => setOpenPanel(null)} className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="p-1.5">
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setQuality(opt.value); setOpenPanel(null); }}
                className={`w-full text-left px-3 py-2.5 text-xs rounded-xl transition-colors flex items-center justify-between ${
                  quality === opt.value ? "text-primary bg-primary/10 font-medium" : "text-foreground hover:bg-accent"
                }`}
              >
                <span>{opt.label}</span>
                {quality === opt.value && <Check size={14} className="text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Playback Speed Menu */}
      {openPanel === "speed" && (
        <div className="fixed bottom-[124px] md:bottom-20 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-48 z-[102] md:z-50 w-44 glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-bold text-foreground">Playback Speed</span>
            <button onClick={() => setOpenPanel(null)} className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="p-1.5">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => { setPlaybackSpeed(speed); setOpenPanel(null); }}
                className={`w-full text-left px-3 py-2.5 text-xs rounded-xl transition-colors flex items-center justify-between ${
                  playbackSpeed === speed ? "text-primary bg-primary/10 font-medium" : "text-foreground hover:bg-accent"
                }`}
              >
                <span>{speed}x</span>
                {playbackSpeed === speed && <Check size={14} className="text-primary" />}
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

      {/* Bottom Player - Hidden when fullscreen is active */}
      {!showFullScreen && (
        <div className="fixed bottom-[60px] md:bottom-0 left-0 right-0 z-[90] glass-heavy border-t border-border safe-bottom">
        <div className="max-w-full mx-auto px-3 md:px-4 py-2 md:py-2.5 flex items-center gap-2 md:gap-4">
          {/* Track info — clickable to open full screen player */}
          <div
            onClick={() => setShowFullScreen(true)}
            className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 md:flex-none md:w-1/4 cursor-pointer group"
          >
            <div className="relative flex-shrink-0">
              <img
                src={currentTrack.cover}
                alt={currentTrack.title}
                width={56}
                height={56}
                className="w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-md object-cover shadow-md"
              />
              <div className="absolute inset-0 rounded-lg md:rounded-md bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                <ChevronUp size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{currentTrack.title}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
              <p className="text-[8px] md:text-[9px] text-muted-foreground/50 mt-0.5 hidden md:block">
                Tap to expand
              </p>
            </div>
          </div>
          {/* Download button in bottom player */}
          {currentTrack.type !== "youtube" && (
            <button
              onClick={(e) => { e.stopPropagation(); downloadTrack(currentTrack); }}
              disabled={isDownloaded(currentTrack.songId || currentTrack.src) || isDownloading(currentTrack.songId || currentTrack.src)}
              className={`hidden md:flex p-2 rounded-full transition-all flex-shrink-0 ${
                isDownloaded(currentTrack.songId || currentTrack.src)
                  ? "text-green-500 bg-green-500/10"
                  : isDownloading(currentTrack.songId || currentTrack.src)
                  ? "text-yellow-500 bg-yellow-500/10"
                  : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
              }`}
              title={isDownloaded(currentTrack.songId || currentTrack.src) ? "Downloaded" : isDownloading(currentTrack.songId || currentTrack.src) ? "Downloading..." : "Download for offline"}
            >
              {isDownloading(currentTrack.songId || currentTrack.src) ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isDownloaded(currentTrack.songId || currentTrack.src) ? (
                <CheckCircle size={16} />
              ) : (
                <Download size={16} />
              )}
            </button>
          )}

          {/* Controls center */}
          <div className="flex flex-col items-center gap-0.5 max-w-xl mx-auto">
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={toggleShuffle}
                className={`p-1.5 rounded-full transition-colors hidden sm:block ${
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
                className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
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
                className={`p-1.5 rounded-full transition-colors hidden sm:block ${
                  repeat !== "off" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {repeat === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
              </button>
            </div>

            {/* Seek bar - desktop only */}
            <div className="hidden md:flex items-center gap-2 w-full group">
                <span className="text-[10px] text-muted-foreground w-10 text-right tabular-nums">
                  {formatTime(progress)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={progress}
                  onChange={(e) => seek(Number(e.target.value))}
                  onWheel={(e) => {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -5 : 5;
                    const newProgress = Math.max(0, Math.min(duration || 0, progress + delta));
                    seek(newProgress);
                  }}
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
              onClick={() => { setShowPlaylist(false); setOpenPanel(null); setShowMobileMenu(!showMobileMenu); }}
              className="p-2.5 rounded-full text-muted-foreground hover:text-foreground active:bg-accent transition-colors"
              title="More options"
            >
              <MoreVertical size={22} />
            </button>
          </div>

          {/* Right section: volume + action buttons */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2 w-1/4 justify-end">
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
            <div className="relative hidden lg:block">
              <button
                onClick={() => togglePanel("sleep")}
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
                onClick={() => togglePanel("queue")}
                className={`p-1.5 rounded-full transition-colors relative ${
                  openPanel === "queue" ? "text-primary" : "text-muted-foreground hover:text-foreground"
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
            <div className="relative hidden lg:block">
              <button
                onClick={() => togglePanel("quality")}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                title="Audio Quality"
              >
                <Settings size={14} />
                <span className="text-[9px] font-medium">{quality.replace("kbps", "")}</span>
              </button>
            </div>

            {/* Playback Speed */}
            <div className="relative hidden lg:block">
              <button
                onClick={() => togglePanel("speed")}
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
              className={`p-1.5 rounded-full transition-colors hidden lg:block ${
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
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors hidden xl:block"
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
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.05 : 0.05;
                setVolume(Math.max(0, Math.min(1, volume + delta)));
              }}
              className="w-16 lg:w-20 h-1 accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
              style={{
                background: `linear-gradient(to right, hsl(var(--foreground)) ${volume * 100}%, hsl(var(--muted)) ${volume * 100}%)`,
              }}
            />
          </div>
        </div>
        </div>
      )}

      {/* Mobile Menu Panel */}
      {showMobileMenu && (
        <>
          <div className="fixed inset-0 z-[100] md:hidden" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed bottom-[124px] right-3 z-[102] md:hidden w-56 max-h-[70vh] glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col">
            {/* Main Actions */}
            <div className="p-1 overflow-y-auto flex-1">
              <button
                onClick={() => { setShowLyrics(true); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] rounded-lg transition-colors text-foreground hover:bg-accent"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Music2 size={14} className="text-primary" />
                </div>
                <span className="font-medium">Lyrics</span>
              </button>
              <button
                onClick={() => { setShowPlaylist(true); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] rounded-lg transition-colors text-foreground hover:bg-accent"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ListMusic size={14} className="text-primary" />
                </div>
                <span className="font-medium">Playlist</span>
              </button>
              <button
                onClick={() => togglePanel("queue")}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] rounded-lg transition-colors text-foreground hover:bg-accent"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 relative">
                  <ListMusic size={14} className="text-primary" />
                  {queue.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary text-primary-foreground text-[7px] font-bold rounded-full flex items-center justify-center">
                      {queue.length}
                    </span>
                  )}
                </div>
                <span className="font-medium">Queue</span>
                {queue.length > 0 && <span className="ml-auto text-[10px] text-muted-foreground">{queue.length}</span>}
              </button>

              <div className="h-px bg-border my-1 mx-1" />

              <button
                onClick={() => togglePanel("sleep")}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] rounded-lg transition-colors text-foreground hover:bg-accent"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${sleepMinutes !== null ? "bg-primary/10" : "bg-muted"}`}>
                  <Moon size={14} className={sleepMinutes !== null ? "text-primary" : "text-muted-foreground"} />
                </div>
                <span className="font-medium">Sleep Timer</span>
                {sleepMinutes !== null && <span className="ml-auto text-[10px] text-primary font-medium">{sleepMinutes}m</span>}
              </button>
              <button
                onClick={() => togglePanel("quality")}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] rounded-lg transition-colors text-foreground hover:bg-accent"
              >
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Settings size={14} className="text-muted-foreground" />
                </div>
                <span className="font-medium">Quality</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-medium">{quality.replace("kbps", "")}</span>
              </button>
              <button
                onClick={() => togglePanel("speed")}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] rounded-lg transition-colors text-foreground hover:bg-accent"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${playbackSpeed !== 1 ? "bg-primary/10" : "bg-muted"}`}>
                  <span className={`text-[10px] font-bold ${playbackSpeed !== 1 ? "text-primary" : "text-muted-foreground"}`}>{playbackSpeed}x</span>
                </div>
                <span className="font-medium">Speed</span>
                {playbackSpeed !== 1 && <span className="ml-auto text-[10px] text-primary font-medium">{playbackSpeed}x</span>}
              </button>
              <button
                onClick={() => { setCrossfade(crossfade === 0 ? 3 : crossfade === 3 ? 5 : crossfade === 5 ? 0 : 0); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] rounded-lg transition-colors text-foreground hover:bg-accent"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${crossfade > 0 ? "bg-primary/10" : "bg-muted"}`}>
                  <Zap size={14} className={crossfade > 0 ? "text-primary" : "text-muted-foreground"} />
                </div>
                <span className="font-medium">Crossfade</span>
                {crossfade > 0 && <span className="ml-auto text-[10px] text-primary font-medium">{crossfade}s</span>}
              </button>
              <button
                onClick={() => { setShowEqualizer(true); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] rounded-lg transition-colors text-foreground hover:bg-accent"
              >
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Sliders size={14} className="text-muted-foreground" />
                </div>
                <span className="font-medium">Equalizer</span>
              </button>
            </div>

            {/* Volume Control - Fixed at bottom */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-t border-border flex-shrink-0">
              <button onClick={() => setVolume(volume === 0 ? 0.7 : 0)} className="flex-shrink-0">
                {volume === 0
                  ? <VolumeX size={15} className="text-muted-foreground" />
                  : <Volume2 size={15} className="text-muted-foreground" />
                }
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 h-1 accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted"
                style={{
                  background: `linear-gradient(to right, hsl(var(--foreground)) ${volume * 100}%, hsl(var(--muted)) ${volume * 100}%)`,
                }}
              />
              <span className="text-[9px] text-muted-foreground w-6 text-right tabular-nums font-medium">{Math.round(volume * 100)}</span>
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
    <div className="fixed bottom-[124px] md:bottom-20 left-1/2 -translate-x-1/2 z-[102] md:z-50 w-[calc(100vw-2rem)] max-w-[400px] h-[50vh] md:h-[60vh] glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
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

