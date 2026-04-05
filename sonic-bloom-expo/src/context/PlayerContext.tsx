import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { View, InteractionManager } from "react-native";
import { Track, playlist } from "@/data/playlist";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import YoutubeIframe, { YoutubeIframeRef } from "react-native-youtube-iframe";
import {
  DEFAULT_VOLUME,
  DEFAULT_AUDIO_QUALITY,
  STORAGE_KEY_QUALITY,
  STORAGE_KEY_QUEUE,
} from "@/lib/constants";
import { useMediaSession } from "@/hooks/useMediaSession";
import { useLikedSongs } from "@/hooks/useLikedSongs";

export type AudioQuality = "96kbps" | "160kbps" | "320kbps";

interface PlayerContextType {
  tracks: Track[];
  currentTrack: Track | null;
  currentIndex: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  eqBass: number; eqMid: number; eqTreble: number;
  setEqBass: (v: number) => void;
  setEqMid: (v: number) => void;
  setEqTreble: (v: number) => void;
  applyEqPreset: (preset: string) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (v: number) => void;
  crossfade: number;
  setCrossfade: (v: number) => void;
  queue: Track[];
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  moveQueueItem: (from: number, to: number) => void;
  shuffleQueue: () => void;
  quality: AudioQuality;
  setQuality: (q: AudioQuality) => void;
  sleepMinutes: number | null;
  setSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
  isCurrentTrackLiked: boolean;
  likeCurrentTrack: () => Promise<boolean>;
  unlikeCurrentTrack: () => Promise<boolean>;
  addToListeningHistory: (trackId: string, durationPlayed: number, completed: boolean) => Promise<boolean>;
  play: (index?: number) => void;
  playTrack: (track: Track) => void;
  playTrackList: (tracks: Track[], index?: number) => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};

function getAudioSrcForTrack(track: Track, quality: AudioQuality): string {
  if (!track) return "";
  if (track.audioUrls) {
    return track.audioUrls[quality] || track.audioUrls["160kbps"] || track.audioUrls["96kbps"] || track.audioUrls["320kbps"] || track.src;
  }
  return track.src;
}

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trackList, setTrackList] = useState<Track[]>(playlist);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const [queue, setQueue] = useState<Track[]>([]);
  const [quality, setQualityState] = useState<AudioQuality>(DEFAULT_AUDIO_QUALITY);
  const [sleepMinutes, setSleepMinutesState] = useState<number | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [eqBass, setEqBassState] = useState(0);
  const [eqMid, setEqMidState] = useState(0);
  const [eqTreble, setEqTrebleState] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
  const [crossfade, setCrossfadeState] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ytPlayerRef = useRef<YoutubeIframeRef>(null);
  const [ytVideoId, setYtVideoId] = useState<string | null>(null);
  const [ytPlaying, setYtPlaying] = useState(false);
  const isYoutubeRef = useRef(false);
  const ytProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [ytProgress, setYtProgress] = useState(0);
  const [ytDuration, setYtDuration] = useState(0);

  // Use refs for frequently updated values to avoid unnecessary re-renders
  const progressRef = useRef(0);
  const durationRef = useRef(0);
  const ytProgressValueRef = useRef(0);
  const ytDurationValueRef = useRef(0);
  const isPlayingRef = useRef(false);
  const ytPlayingRef = useRef(false);

  // Sync refs with state
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { ytProgressValueRef.current = ytProgress; }, [ytProgress]);
  useEffect(() => { ytDurationValueRef.current = ytDuration; }, [ytDuration]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { ytPlayingRef.current = ytPlaying; }, [ytPlaying]);

  const displayProgress = isYoutubeRef.current ? ytProgress : progress;
  const displayDuration = isYoutubeRef.current ? ytDuration : duration;
  const displayIsPlaying = isYoutubeRef.current ? ytPlaying : isPlaying;

  // Use the unified useLikedSongs hook instead of duplicating logic
  const { isLiked: isLikedHook, toggleLike: toggleLikeHook, clearAll: clearLikedSongs } = useLikedSongs();

  // Wrapper to match the expected interface
  const likeSongHook = useCallback(async (track: Track): Promise<boolean> => {
    await toggleLikeHook(track);
    return true;
  }, [toggleLikeHook]);

  const unlikeSongHook = useCallback(async (trackId: string): Promise<boolean> => {
    // Find the track and toggle to remove
    const track = trackList.find(t => String(t.id) === trackId);
    if (track) await toggleLikeHook(track);
    return true;
  }, [toggleLikeHook, trackList]);

  const addToHistory = useCallback(async (trackId: string, durationPlayed: number, completed: boolean): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("listening_history").insert({ track_id: trackId, user_id: user.id, duration_played: durationPlayed, completed });
    } catch { }
    return true;
  }, []);

  const trackListRef = useRef(trackList);
  const currentIndexRef = useRef(currentIndex);
  const queueRef = useRef(queue);
  const shuffleRef = useRef(shuffle);
  const repeatRef = useRef(repeat);
  const qualityRef = useRef(quality);
  const volumeRef = useRef(volume);
  const playbackSpeedRef = useRef(playbackSpeed);
  useEffect(() => { trackListRef.current = trackList; }, [trackList]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => { qualityRef.current = quality; }, [quality]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);

  useEffect(() => {
    let mounted = true;
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        if (mounted) console.error('Failed to set audio mode:', e);
      }
    };
    setupAudio();
    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (ytProgressRef.current) {
        clearInterval(ytProgressRef.current);
        ytProgressRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_QUEUE).then(s => { if (s) setQueue(JSON.parse(s)); }).catch(() => {});
    AsyncStorage.getItem(STORAGE_KEY_QUALITY).then(s => {
      if (s && ["96kbps", "160kbps", "320kbps"].includes(s)) setQualityState(s as AudioQuality);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue)).catch(() => {});
  }, [queue]);

  const playSoundRef = useRef<(src: string) => Promise<void>>(async () => {});
  const playYoutubeRef = useRef<(videoId: string) => void>(() => {});
  const stopYoutubeRef = useRef<() => void>(() => {});

  const stopYoutube = useCallback(() => {
    setYtPlaying(false);
    setYtVideoId(null);
    isYoutubeRef.current = false;
    setYtProgress(0);
    setYtDuration(0);
    if (ytProgressRef.current) {
      clearInterval(ytProgressRef.current);
      ytProgressRef.current = null;
    }
  }, []);
  stopYoutubeRef.current = stopYoutube;

  const playYoutube = useCallback((videoId: string) => {
    // Clean up existing audio before starting new
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (ytProgressRef.current) {
      clearInterval(ytProgressRef.current);
      ytProgressRef.current = null;
    }
    isYoutubeRef.current = true;
    setYtVideoId(videoId);
    setYtPlaying(true);
    setYtProgress(0);
    setYtDuration(0);
    setIsPlaying(true);
    // Use a ref to track if component is still mounted
    ytProgressRef.current = setInterval(() => {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.getCurrentTime().then(cur => {
          setYtProgress(cur);
        }).catch(() => {});
        ytPlayerRef.current.getDuration().then(dur => {
          if (dur > 0) setYtDuration(dur);
        }).catch(() => {});
      }
    }, 500);
  }, []);
  playYoutubeRef.current = playYoutube;

  const playSound = useCallback(async (src: string) => {
    try {
      // Reset YouTube flag first
      isYoutubeRef.current = false;
      
      // Clean up any existing audio first
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      // Also stop YouTube progress if running
      if (ytProgressRef.current) {
        clearInterval(ytProgressRef.current);
        ytProgressRef.current = null;
      }
      
      // Reset progress and duration
      setProgress(0);
      setDuration(0);

      const { sound } = await Audio.Sound.createAsync(
        { uri: src },
        { shouldPlay: true, volume: volumeRef.current, rate: playbackSpeedRef.current, progressUpdateIntervalMillis: 500 },
        (status) => {
          if (!status.isLoaded) return;
          if (status.durationMillis) setDuration(status.durationMillis / 1000);
          setProgress(status.positionMillis / 1000);
          if (status.didJustFinish) {
            if (repeatRef.current === "one") {
              playSoundRef.current(src);
            } else {
              const q = queueRef.current;
              if (q.length > 0) {
                const nt = q[0];
                setQueue(prev => prev.slice(1));
                const ei = trackListRef.current.findIndex(t => t.id === nt.id);
                if (ei !== -1) setCurrentIndex(ei);
                else { setTrackList(prev => [nt, ...prev]); setCurrentIndex(0); }
                if (nt.type === "youtube" && nt.songId) playYoutubeRef.current(nt.songId);
                else playSoundRef.current(getAudioSrcForTrack(nt, qualityRef.current));
                return;
              }
              const nextIdx = shuffleRef.current
                ? Math.floor(Math.random() * trackListRef.current.length)
                : (currentIndexRef.current + 1) % trackListRef.current.length;
              setCurrentIndex(nextIdx);
              setProgress(0);
              const nt = trackListRef.current[nextIdx];
              if (nt) {
                if (nt.type === "youtube" && nt.songId) playYoutubeRef.current(nt.songId);
                else playSoundRef.current(getAudioSrcForTrack(nt, qualityRef.current));
              }
            }
          }
        }
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (err) {
      console.error('Playback error:', err);
      const nextIdx = (currentIndexRef.current + 1) % trackListRef.current.length;
      setCurrentIndex(nextIdx);
      const nt = trackListRef.current[nextIdx];
      if (nt) playSoundRef.current(getAudioSrcForTrack(nt, qualityRef.current));
    }
  }, []);
  playSoundRef.current = playSound;

  const playTrackList = useCallback((tracks: Track[], index?: number) => {
    const idx = index ?? 0;
    const track = tracks[idx];
    if (!track) return;
    
    // Update state immediately
    setTrackList(tracks);
    setCurrentIndex(idx);
    setProgress(0);
    setDuration(0);
    
    // Then play
    if (track.type === "youtube" && track.songId) {
      stopYoutubeRef.current();
      playYoutubeRef.current(track.songId);
    } else {
      stopYoutubeRef.current();
      playSoundRef.current(getAudioSrcForTrack(track, qualityRef.current));
    }
  }, []);

  const playTrack = useCallback((track: Track) => {
    // Find if track exists in current list
    const ei = trackListRef.current.findIndex(t => t.id === track.id);
    let newList = trackListRef.current;
    let idx = ei;
    
    if (ei === -1) {
      // Track not in list, add it
      newList = [track, ...trackListRef.current];
      idx = 0;
    }
    
    // Update state immediately
    setTrackList(newList);
    setCurrentIndex(idx);
    setProgress(0);
    setDuration(0);
    
    // Then play
    if (track.type === "youtube" && track.songId) {
      stopYoutubeRef.current();
      playYoutubeRef.current(track.songId);
    } else {
      stopYoutubeRef.current();
      playSoundRef.current(getAudioSrcForTrack(track, qualityRef.current));
    }
  }, []);

  const play = useCallback((index?: number) => {
    const idx = index ?? currentIndexRef.current;
    const track = trackListRef.current[idx];
    if (!track) return;
    
    // Update index if provided
    if (index !== undefined) {
      setCurrentIndex(index);
    }
    
    setProgress(0);
    setDuration(0);
    
    // Then play
    if (track.type === "youtube" && track.songId) {
      stopYoutubeRef.current();
      playYoutubeRef.current(track.songId);
    } else {
      stopYoutubeRef.current();
      playSoundRef.current(getAudioSrcForTrack(track, qualityRef.current));
    }
  }, []);

  const pause = useCallback(async () => {
    if (isYoutubeRef.current) setYtPlaying(false);
    else if (soundRef.current) await soundRef.current.pauseAsync();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    requestAnimationFrame(() => {
      if (isYoutubeRef.current) {
        const newState = !ytPlayingRef.current;
        setYtPlaying(newState);
        setIsPlaying(newState);
      } else {
        const wasPlaying = isPlayingRef.current;
        setIsPlaying(!wasPlaying);
        if (wasPlaying) {
          if (soundRef.current) soundRef.current.pauseAsync().catch(() => {});
        } else {
          if (soundRef.current) soundRef.current.playAsync().catch(() => {});
          else play();
        }
      }
    });
  }, [play]);

  const next = useCallback(() => {
    requestAnimationFrame(() => {
      const q = queueRef.current;
      const advance = (track: Track, idx: number) => {
        setCurrentIndex(idx);
        setProgress(0);
        if (track.type === "youtube" && track.songId) { stopYoutubeRef.current(); playYoutubeRef.current(track.songId); }
        else { stopYoutubeRef.current(); playSoundRef.current(getAudioSrcForTrack(track, qualityRef.current)); }
      };
      if (q.length > 0) {
        const nt = q[0];
        setQueue(prev => prev.slice(1));
        const ei = trackListRef.current.findIndex(t => t.id === nt.id);
        if (ei !== -1) advance(nt, ei);
        else { setTrackList(prev => [nt, ...prev]); advance(nt, 0); }
        return;
      }
      const nextIdx = shuffleRef.current
        ? Math.floor(Math.random() * trackListRef.current.length)
        : (currentIndexRef.current + 1) % trackListRef.current.length;
      const nt = trackListRef.current[nextIdx];
      if (nt) advance(nt, nextIdx);
    });
  }, []);

  const prev = useCallback(() => {
    requestAnimationFrame(async () => {
      let pos = 0;
      if (isYoutubeRef.current) {
        pos = ytProgressValueRef.current;
      } else if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync().catch(() => null);
        if (status && status.isLoaded) {
          pos = status.positionMillis / 1000;
        }
      }
      if (pos > 3) {
        if (isYoutubeRef.current) { ytPlayerRef.current?.seekTo(0, true); setYtProgress(0); }
        else if (soundRef.current) { await soundRef.current.setPositionAsync(0); setProgress(0); }
        return;
      }
      const prevIdx = (currentIndexRef.current - 1 + trackListRef.current.length) % trackListRef.current.length;
      const pt = trackListRef.current[prevIdx];
      if (!pt) return;
      setCurrentIndex(prevIdx);
      setProgress(0);
      if (pt.type === "youtube" && pt.songId) { stopYoutubeRef.current(); playYoutubeRef.current(pt.songId); }
      else { stopYoutubeRef.current(); playSoundRef.current(getAudioSrcForTrack(pt, qualityRef.current)); }
    });
  }, []);

  const seek = useCallback((time: number) => {
    if (isYoutubeRef.current) {
      ytPlayerRef.current?.seekTo(time, true);
      setYtProgress(time);
    } else if (soundRef.current) {
      soundRef.current.setPositionAsync(time * 1000).catch(() => {});
      setProgress(time);
    }
  }, []);

  const seekForward = useCallback((seconds: number = 10) => {
    const currentPos = isYoutubeRef.current ? ytProgressValueRef.current : progressRef.current;
    const maxDuration = isYoutubeRef.current ? ytDurationValueRef.current : durationRef.current;
    const newPos = Math.min(currentPos + seconds, maxDuration);
    if (isYoutubeRef.current) {
      ytPlayerRef.current?.seekTo(newPos, true);
      setYtProgress(newPos);
    } else if (soundRef.current) {
      soundRef.current.setPositionAsync(newPos * 1000).catch(() => {});
      setProgress(newPos);
    }
  }, []);

  const seekBackward = useCallback((seconds: number = 10) => {
    const currentPos = isYoutubeRef.current ? ytProgressValueRef.current : progressRef.current;
    const newPos = Math.max(currentPos - seconds, 0);
    if (isYoutubeRef.current) {
      ytPlayerRef.current?.seekTo(newPos, true);
      setYtProgress(newPos);
    } else if (soundRef.current) {
      soundRef.current.setPositionAsync(newPos * 1000).catch(() => {});
      setProgress(newPos);
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    requestAnimationFrame(() => {
      setVolumeState(v);
      if (soundRef.current) soundRef.current.setVolumeAsync(v).catch(() => {});
    });
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed);
    if (soundRef.current) soundRef.current.setRateAsync(speed, true).catch(() => {});
  }, []);

  const setQuality = useCallback((q: AudioQuality) => {
    setQualityState(q);
    AsyncStorage.setItem(STORAGE_KEY_QUALITY, q).catch(() => {});
  }, []);

  const toggleShuffle = useCallback(() => {
    requestAnimationFrame(() => setShuffle(s => !s));
  }, []);
  const toggleRepeat = useCallback(() => {
    requestAnimationFrame(() => setRepeat(r => r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);

  const addToQueue = useCallback((track: Track) => setQueue(prev => [...prev, track]), []);
  const playNext = useCallback((track: Track) => setQueue(prev => [track, ...prev]), []);
  const removeFromQueue = useCallback((index: number) => setQueue(prev => prev.filter((_, i) => i !== index)), []);
  const clearQueue = useCallback(() => setQueue([]), []);
  const moveQueueItem = useCallback((from: number, to: number) => {
    setQueue(prev => { const a = [...prev]; const [item] = a.splice(from, 1); a.splice(to, 0, item); return a; });
  }, []);
  const shuffleQueue = useCallback(() => setQueue(prev => [...prev].sort(() => Math.random() - 0.5)), []);

  const setEqBass = useCallback((v: number) => setEqBassState(v), []);
  const setEqMid = useCallback((v: number) => setEqMidState(v), []);
  const setEqTreble = useCallback((v: number) => setEqTrebleState(v), []);
  const applyEqPreset = useCallback((preset: string) => {
    const presets: Record<string, [number, number, number]> = {
      flat: [0,0,0], rock: [4,-1,3], pop: [-1,3,1], bass: [6,0,-2], vocal: [-2,4,2], treble: [-3,0,5], electronic: [3,-1,4],
    };
    const [b, m, t] = presets[preset] || presets.flat;
    setEqBassState(b); setEqMidState(m); setEqTrebleState(t);
  }, []);
  const setCrossfade = useCallback((v: number) => setCrossfadeState(v), []);

  const setSleepTimer = useCallback((minutes: number) => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    setSleepMinutesState(minutes);
    sleepTimerRef.current = setTimeout(async () => {
      if (isYoutubeRef.current) setYtPlaying(false);
      else if (soundRef.current) await soundRef.current.pauseAsync();
      setIsPlaying(false);
      setSleepMinutesState(null);
    }, minutes * 60 * 1000);
  }, []);

  const cancelSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = null;
    setSleepMinutesState(null);
  }, []);

  useEffect(() => () => { if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current); }, []);

  const currentTrack = trackList[currentIndex] || null;

  // Optimized contextValue with minimal re-renders
  // Use refs for callbacks to prevent recreation
  const contextValue = useMemo(() => {
    const throttledProgress = Math.floor(displayProgress);
    const throttledDuration = Math.floor(displayDuration);
    
    return {
      tracks: trackList, 
      currentTrack, 
      currentIndex,
      isPlaying: displayIsPlaying,
      progress: throttledProgress,
      duration: throttledDuration,
      volume, shuffle, repeat, eqBass, eqMid, eqTreble,
      setEqBass, setEqMid, setEqTreble, applyEqPreset,
      playbackSpeed, setPlaybackSpeed, crossfade, setCrossfade,
      queue, addToQueue, playNext, removeFromQueue, clearQueue, moveQueueItem, shuffleQueue,
      quality, setQuality, sleepMinutes, setSleepTimer, cancelSleepTimer,
      play, playTrack, playTrackList, pause, togglePlay, next, prev, seek, seekForward, seekBackward, setVolume,
      toggleShuffle, toggleRepeat,
      isCurrentTrackLiked: currentTrack?.id ? isLikedHook(String(currentTrack.id)) : false,
      likeCurrentTrack: () => currentTrack?.id ? likeSongHook(currentTrack) : Promise.resolve(false),
      unlikeCurrentTrack: () => currentTrack?.id ? unlikeSongHook(String(currentTrack.id)) : Promise.resolve(false),
      addToListeningHistory: addToHistory,
    };
  }, [
    trackList, currentTrack, currentIndex, displayIsPlaying,
    Math.floor(displayProgress), Math.floor(displayDuration),
    volume, shuffle, repeat, eqBass, eqMid, eqTreble, playbackSpeed, crossfade,
    queue.length, quality, sleepMinutes,
    play, playTrack, playTrackList, pause, togglePlay, next, prev, seek, seekForward, seekBackward, setVolume,
    toggleShuffle, toggleRepeat, addToQueue, playNext, removeFromQueue, clearQueue,
    moveQueueItem, shuffleQueue, setEqBass, setEqMid, setEqTreble, applyEqPreset,
    setPlaybackSpeed, setCrossfade, setQuality, setSleepTimer, cancelSleepTimer,
    isLikedHook, likeSongHook, unlikeSongHook, addToHistory,
  ]);

  return (
    <PlayerContext.Provider value={contextValue}>
      {ytVideoId && (
        <View style={{ width: 0, height: 0, overflow: "hidden", position: "absolute" }}>
          <YoutubeIframe
            ref={ytPlayerRef}
            videoId={ytVideoId}
            play={ytPlaying}
            height={1}
            width={1}
            volume={Math.round(volume * 100)}
            onChangeState={(state: string) => {
              if (state === "ended") {
                if (repeatRef.current === "one") { ytPlayerRef.current?.seekTo(0, true); setYtPlaying(true); }
                else next();
              }
              if (state === "playing") { setYtPlaying(true); setIsPlaying(true); }
              if (state === "paused") { setYtPlaying(false); }
            }}
          />
        </View>
      )}

      <MediaSessionWrapper
        track={currentTrack}
        isPlaying={displayIsPlaying}
        onPlay={play}
        onPause={pause}
        onNext={next}
        onPrev={prev}
        onSeek={seek}
      />

      {children}
    </PlayerContext.Provider>
  );
};

const MediaSessionWrapper: React.FC<{
  track: Track | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
}> = ({ track, isPlaying, onPlay, onPause, onNext, onPrev, onSeek }) => {
  useMediaSession({ track, isPlaying, onPlay, onPause, onNext, onPrev, onSeek });
  return null;
};
