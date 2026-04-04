import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Track, playlist } from "@/data/playlist";
import { Audio } from "expo-av";
import { useListeningHistory } from "@/hooks/useSupabaseListeningHistory";
import { useLikedSongs } from "@/hooks/useSupabaseLikedSongs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_VOLUME,
  DEFAULT_AUDIO_QUALITY,
  STORAGE_KEY_QUALITY,
  STORAGE_KEY_QUEUE,
} from "@/lib/constants";

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
  eqBass: number;
  eqMid: number;
  eqTreble: number;
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

// Helper to get audio src based on quality
function getAudioSrcForTrack(track: Track, quality: AudioQuality): string {
  if (!track) return "";
  if (track.audioUrls) {
    return track.audioUrls[quality] ||
           track.audioUrls["160kbps"] ||
           track.audioUrls["96kbps"] ||
           track.audioUrls["320kbps"] ||
           track.src;
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

  const { addToHistory } = useListeningHistory();
  const { likeSong: likeSongHook, unlikeSong: unlikeSongHook, isLiked: isLikedHook } = useLikedSongs();

  const [queue, setQueue] = useState<Track[]>([]);
  const [quality, setQualityState] = useState<AudioQuality>(DEFAULT_AUDIO_QUALITY);
  const [sleepMinutes, setSleepMinutesState] = useState<number | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [eqBass, setEqBassState] = useState(0);
  const [eqMid, setEqMidState] = useState(0);
  const [eqTreble, setEqTrebleState] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
  const [crossfade, setCrossfadeState] = useState(0);

  const currentTrack = trackList[currentIndex] || null;

  // Use refs to avoid circular dependencies
  const trackListRef = useRef(trackList);
  const currentIndexRef = useRef(currentIndex);
  const queueRef = useRef(queue);
  const shuffleRef = useRef(shuffle);
  const repeatRef = useRef(repeat);
  const qualityRef = useRef(quality);
  const volumeRef = useRef(volume);

  useEffect(() => { trackListRef.current = trackList; }, [trackList]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => { qualityRef.current = quality; }, [quality]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // Initialize audio
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.warn("Failed to set audio mode:", error);
      }
    };
    setupAudio();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Load persisted state
  useEffect(() => {
    const loadPersisted = async () => {
      try {
        const storedQueue = await AsyncStorage.getItem(STORAGE_KEY_QUEUE);
        if (storedQueue) setQueue(JSON.parse(storedQueue));
        const storedQuality = await AsyncStorage.getItem(STORAGE_KEY_QUALITY);
        if (storedQuality && ["96kbps", "160kbps", "320kbps"].includes(storedQuality)) {
          setQualityState(storedQuality as AudioQuality);
        }
      } catch { /* ignore */ }
    };
    loadPersisted();
  }, []);

  // Save queue
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue)).catch(() => {});
  }, [queue]);

  // Core play function
  const playSound = useCallback(async (src: string, fromPositionMillis: number = 0) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: src },
        {
          shouldPlay: true,
          volume: volumeRef.current,
          rate: 1.0,
          positionMillis: fromPositionMillis,
        },
        (status) => {
          if (status.isLoaded) {
            setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
            setProgress(status.positionMillis / 1000);

            if (status.didJustFinish) {
              const ct = trackListRef.current[currentIndexRef.current];
              if (ct) {
                addToHistory(String(ct.id), status.durationMillis ? status.durationMillis / 1000 : 0, true).catch(() => {});
              }
              if (repeatRef.current === "one") {
                playSound(src, 0);
              } else {
                // Inline next logic to avoid circular ref
                const q = queueRef.current;
                if (q.length > 0) {
                  const nextTrack = q[0];
                  setQueue((prev) => prev.slice(1));
                  const nextSrc = getAudioSrcForTrack(nextTrack, qualityRef.current);
                  if (nextSrc) {
                    const existingIdx = trackListRef.current.findIndex((t) => t.src === nextTrack.src);
                    if (existingIdx !== -1) {
                      setCurrentIndex(existingIdx);
                    } else {
                      setTrackList((prev) => [nextTrack, ...prev]);
                      setCurrentIndex(0);
                    }
                    playSound(nextSrc);
                  }
                  return;
                }
                let nextIdx: number;
                if (shuffleRef.current) {
                  nextIdx = Math.floor(Math.random() * trackListRef.current.length);
                } else {
                  nextIdx = (currentIndexRef.current + 1) % trackListRef.current.length;
                }
                setCurrentIndex(nextIdx);
                setProgress(0);
                const nextTrack = trackListRef.current[nextIdx];
                if (nextTrack) {
                  const nextSrc = getAudioSrcForTrack(nextTrack, qualityRef.current);
                  if (nextSrc) playSound(nextSrc);
                }
              }
            }
          }
        }
      );

      soundRef.current = sound;
      progressIntervalRef.current = setInterval(async () => {
        if (soundRef.current) {
          const s = await soundRef.current.getStatusAsync();
          if (s.isLoaded) setProgress(s.positionMillis / 1000);
        }
      }, 500);
      setIsPlaying(true);
    } catch (error) {
      console.warn("Failed to play sound:", error);
      // Skip to next on error
      const q = queueRef.current;
      if (q.length > 0) {
        const nextTrack = q[0];
        setQueue((prev) => prev.slice(1));
        const nextSrc = getAudioSrcForTrack(nextTrack, qualityRef.current);
        if (nextSrc) {
          const existingIdx = trackListRef.current.findIndex((t) => t.src === nextTrack.src);
          if (existingIdx !== -1) setCurrentIndex(existingIdx);
          else {
            setTrackList((prev) => [nextTrack, ...prev]);
            setCurrentIndex(0);
          }
          playSound(nextSrc);
        }
      }
    }
  }, [addToHistory]);

  // Queue operations
  const addToQueue = useCallback((track: Track) => setQueue((prev) => [...prev, track]), []);
  const playNext = useCallback((track: Track) => setQueue((prev) => [track, ...prev]), []);
  const removeFromQueue = useCallback((index: number) => setQueue((prev) => prev.filter((_, i) => i !== index)), []);
  const clearQueue = useCallback(() => setQueue([]), []);
  const moveQueueItem = useCallback((from: number, to: number) => {
    setQueue((prev) => {
      const updated = [...prev];
      const [item] = updated.splice(from, 1);
      updated.splice(to, 0, item);
      return updated;
    });
  }, []);
  const shuffleQueue = useCallback(() => {
    setQueue((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);

  const setPlaybackSpeed = useCallback(async (speed: number) => {
    setPlaybackSpeedState(speed);
    if (soundRef.current) {
      await soundRef.current.setRateAsync(speed, true);
    }
  }, []);

  const setCrossfade = useCallback((seconds: number) => setCrossfadeState(seconds), []);

  const applyEqPreset = useCallback((preset: string) => {
    const presets: Record<string, [number, number, number]> = {
      flat: [0, 0, 0], rock: [4, -1, 3], pop: [-1, 3, 1],
      bass: [6, 0, -2], vocal: [-2, 4, 2], treble: [-3, 0, 5], electronic: [3, -1, 4],
    };
    const [b, m, t] = presets[preset] || presets.flat;
    setEqBassState(b); setEqMidState(m); setEqTrebleState(t);
  }, []);

  const setQuality = useCallback(async (q: AudioQuality) => {
    setQualityState(q);
    AsyncStorage.setItem(STORAGE_KEY_QUALITY, q).catch(() => {});
  }, []);

  const setSleepTimer = useCallback((minutes: number) => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    setSleepMinutesState(minutes);
    sleepTimerRef.current = setTimeout(() => {
      if (soundRef.current) soundRef.current.pauseAsync();
      setIsPlaying(false);
      setSleepMinutesState(null);
    }, minutes * 60 * 1000);
  }, []);

  const cancelSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = null;
    setSleepMinutesState(null);
  }, []);

  useEffect(() => {
    return () => { if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current); };
  }, []);

  const setEqBass = useCallback((v: number) => setEqBassState(v), []);
  const setEqMid = useCallback((v: number) => setEqMidState(v), []);
  const setEqTreble = useCallback((v: number) => setEqTrebleState(v), []);

  const play = useCallback((index?: number) => {
    const idx = index ?? currentIndexRef.current;
    const track = trackListRef.current[idx];
    if (track) {
      if (index !== undefined) setCurrentIndex(index);
      const src = getAudioSrcForTrack(track, qualityRef.current);
      if (src) playSound(src);
    }
  }, [playSound]);

  const playTrack = useCallback((track: Track) => {
    const existingIdx = trackListRef.current.findIndex((t) => t.src === track.src);
    if (existingIdx !== -1) setCurrentIndex(existingIdx);
    else {
      setTrackList((prev) => [track, ...prev]);
      setCurrentIndex(0);
    }
    setProgress(0);
    setDuration(0);
    const src = getAudioSrcForTrack(track, qualityRef.current);
    if (src) playSound(src);
  }, [playSound]);

  const playTrackList = useCallback((tracks: Track[], index?: number) => {
    setTrackList(tracks);
    setCurrentIndex(index ?? 0);
    setProgress(0);
    setDuration(0);
    const track = tracks[index ?? 0];
    if (track) {
      const src = getAudioSrcForTrack(track, qualityRef.current);
      if (src) playSound(src);
    }
  }, [playSound]);

  const pause = useCallback(async () => {
    if (soundRef.current) await soundRef.current.pauseAsync();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      } else {
        play();
      }
    }
  }, [isPlaying, pause, play]);

  const next = useCallback(() => {
    const q = queueRef.current;
    if (q.length > 0) {
      const nextTrack = q[0];
      setQueue((prev) => prev.slice(1));
      const nextSrc = getAudioSrcForTrack(nextTrack, qualityRef.current);
      if (nextSrc) {
        const existingIdx = trackListRef.current.findIndex((t) => t.src === nextTrack.src);
        if (existingIdx !== -1) setCurrentIndex(existingIdx);
        else {
          setTrackList((prev) => [nextTrack, ...prev]);
          setCurrentIndex(0);
        }
        playSound(nextSrc);
      }
      return;
    }
    let nextIdx: number;
    if (shuffleRef.current) {
      nextIdx = Math.floor(Math.random() * trackListRef.current.length);
    } else {
      nextIdx = (currentIndexRef.current + 1) % trackListRef.current.length;
    }
    setCurrentIndex(nextIdx);
    setProgress(0);
    const nextTrack = trackListRef.current[nextIdx];
    if (nextTrack) {
      const src = getAudioSrcForTrack(nextTrack, qualityRef.current);
      if (src) playSound(src);
    }
  }, [playSound]);

  const prev = useCallback(() => {
    if (progress > 3) {
      setProgress(0);
      if (soundRef.current) soundRef.current.setPositionAsync(0);
      return;
    }
    const prevIdx = (currentIndexRef.current - 1 + trackListRef.current.length) % trackListRef.current.length;
    setCurrentIndex(prevIdx);
    setProgress(0);
    const prevTrack = trackListRef.current[prevIdx];
    if (prevTrack) {
      const src = getAudioSrcForTrack(prevTrack, qualityRef.current);
      if (src) playSound(src);
    }
  }, [progress, playSound]);

  const seek = useCallback(async (time: number) => {
    if (soundRef.current) await soundRef.current.setPositionAsync(time * 1000);
    setProgress(time);
  }, []);

  const setVolume = useCallback(async (v: number) => {
    setVolumeState(v);
    if (soundRef.current) await soundRef.current.setVolumeAsync(v);
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const toggleRepeat = useCallback(() => {
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);

  useEffect(() => {
    if (soundRef.current) soundRef.current.setVolumeAsync(volume).catch(() => {});
  }, [volume]);

  useEffect(() => {
    setProgress(0);
    if (currentTrack) setDuration(currentTrack.duration || 0);
  }, [currentIndex, currentTrack]);

  const contextValue = useMemo(() => ({
    tracks: trackList, currentTrack, currentIndex, isPlaying, progress, duration,
    volume, shuffle, repeat, eqBass, eqMid, eqTreble, setEqBass, setEqMid, setEqTreble,
    applyEqPreset, playbackSpeed, setPlaybackSpeed, crossfade, setCrossfade, queue,
    addToQueue, playNext, removeFromQueue, clearQueue, moveQueueItem, shuffleQueue,
    quality, setQuality, sleepMinutes, setSleepTimer, cancelSleepTimer,
    play, playTrack, playTrackList, pause, togglePlay, next, prev, seek, setVolume,
    toggleShuffle, toggleRepeat,
    isCurrentTrackLiked: currentTrack ? isLikedHook(String(currentTrack.id)) : false,
    likeCurrentTrack: () => (currentTrack ? likeSongHook(currentTrack) : Promise.resolve(false)),
    unlikeCurrentTrack: () => (currentTrack ? unlikeSongHook(String(currentTrack.id)) : Promise.resolve(false)),
    addToListeningHistory: addToHistory,
  }), [
    trackList, currentTrack, currentIndex, isPlaying, progress, duration,
    volume, shuffle, repeat, eqBass, eqMid, eqTreble, playbackSpeed,
    crossfade, queue, quality, sleepMinutes, play, playTrack, playTrackList,
    pause, togglePlay, next, prev, seek, setVolume, toggleShuffle, toggleRepeat,
    addToQueue, playNext, removeFromQueue, clearQueue, moveQueueItem, shuffleQueue,
    setEqBass, setEqMid, setEqTreble, applyEqPreset, setPlaybackSpeed,
    setCrossfade, setQuality, setSleepTimer, cancelSleepTimer,
    isLikedHook, likeSongHook, unlikeSongHook, addToHistory,
  ]);

  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  );
};
