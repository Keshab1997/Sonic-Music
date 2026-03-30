import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { Track, playlist } from "@/data/playlist";

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
  audioRef: React.RefObject<HTMLAudioElement>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  // Queue
  queue: Track[];
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  // Quality
  quality: AudioQuality;
  setQuality: (q: AudioQuality) => void;
  // Sleep timer
  sleepMinutes: number | null;
  setSleepTimer: (minutes: number) => void;
  cancelSleepTimer: () => void;
  // Playback
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

const QUALITY_KEY = "sonic_quality";

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trackList, setTrackList] = useState<Track[]>(playlist);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");

  // Queue state
  const [queue, setQueue] = useState<Track[]>([]);

  // Quality state
  const [quality, setQualityState] = useState<AudioQuality>(() => {
    try {
      const stored = localStorage.getItem(QUALITY_KEY);
      if (stored === "96kbps" || stored === "160kbps" || stored === "320kbps") return stored;
    } catch { /* ignore */ }
    return "160kbps";
  });

  // Sleep timer state
  const [sleepMinutes, setSleepMinutesState] = useState<number | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepEndTimeRef = useRef<number | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null!);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const currentTrack = trackList[currentIndex] || null;

  const setupAudioContext = useCallback(() => {
    if (audioCtxRef.current || !audioRef.current) return;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      sourceRef.current = source;
      analyserRef.current = analyser;
    } catch {
      // ignore
    }
  }, []);

  const playAudio = useCallback(() => {
    setupAudioContext();
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    setTimeout(() => {
      audioRef.current?.play().catch(() => {});
      setIsPlaying(true);
    }, 50);
  }, [setupAudioContext]);

  // Queue operations
  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const playNext = useCallback((track: Track) => {
    setQueue((prev) => [track, ...prev]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  // Quality
  const setQuality = useCallback((q: AudioQuality) => {
    setQualityState(q);
    localStorage.setItem(QUALITY_KEY, q);
  }, []);

  // Sleep timer
  const setSleepTimer = useCallback((minutes: number) => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    const ms = minutes * 60 * 1000;
    sleepEndTimeRef.current = Date.now() + ms;
    setSleepMinutesState(minutes);
    sleepTimerRef.current = setTimeout(() => {
      audioRef.current?.pause();
      setIsPlaying(false);
      setSleepMinutesState(null);
      sleepEndTimeRef.current = null;
    }, ms);
  }, []);

  const cancelSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = null;
    sleepEndTimeRef.current = null;
    setSleepMinutesState(null);
  }, []);

  // Cleanup sleep timer on unmount
  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, []);

  const play = useCallback((index?: number) => {
    if (index !== undefined) setCurrentIndex(index);
    playAudio();
  }, [playAudio]);

  const playTrack = useCallback((track: Track) => {
    setTrackList((prev) => {
      const idx = prev.findIndex((t) => t.src === track.src);
      if (idx !== -1) {
        setCurrentIndex(idx);
        return prev;
      }
      const newList = [track, ...prev];
      setCurrentIndex(0);
      return newList;
    });
    setProgress(0);
    setTimeout(() => playAudio(), 100);
  }, [playAudio]);

  const playTrackList = useCallback((tracks: Track[], index?: number) => {
    setTrackList(tracks);
    setCurrentIndex(index ?? 0);
    setProgress(0);
    setTimeout(() => playAudio(), 100);
  }, [playAudio]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const next = useCallback(() => {
    // Check queue first
    if (queue.length > 0) {
      const nextTrack = queue[0];
      setQueue((prev) => prev.slice(1));
      setTrackList((prev) => {
        const idx = prev.findIndex((t) => t.src === nextTrack.src);
        if (idx !== -1) {
          setCurrentIndex(idx);
          return prev;
        }
        const newList = [...prev, nextTrack];
        setCurrentIndex(newList.length - 1);
        return newList;
      });
      setProgress(0);
      setTimeout(() => playAudio(), 100);
      return;
    }

    let nextIdx: number;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * trackList.length);
    } else {
      nextIdx = (currentIndex + 1) % trackList.length;
    }
    setCurrentIndex(nextIdx);
    setProgress(0);
    setupAudioContext();
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    setTimeout(() => {
      audioRef.current?.play().catch(() => {});
      setIsPlaying(true);
    }, 100);
  }, [currentIndex, shuffle, trackList, setupAudioContext, queue, playAudio]);

  const prev = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIdx = (currentIndex - 1 + trackList.length) % trackList.length;
    setCurrentIndex(prevIdx);
    setProgress(0);
    setTimeout(() => {
      audioRef.current?.play().catch(() => {});
      setIsPlaying(true);
    }, 100);
  }, [currentIndex, trackList]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
    setProgress(time);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const toggleRepeat = useCallback(() => {
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);

  // Audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => {
      if (repeat === "one") {
        audio.currentTime = 0;
        audio.play();
      } else {
        next();
      }
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [next, repeat]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Reset when track changes
  useEffect(() => {
    setProgress(0);
    if (currentTrack) {
      setDuration(currentTrack.duration || 0);
    }
  }, [currentIndex, currentTrack]);

  // Get audio src based on quality preference
  const getAudioSrc = (): string | undefined => {
    if (!currentTrack) return undefined;

    // If track has quality variants, use the selected quality
    if (currentTrack.audioUrls) {
      const url = currentTrack.audioUrls[quality];
      if (url) return url;
      // Fallback to any available quality
      return currentTrack.audioUrls["160kbps"] || currentTrack.audioUrls["96kbps"] || currentTrack.audioUrls["320kbps"] || currentTrack.src;
    }

    // Proxy SoundHelix URLs
    if (currentTrack.src.includes("soundhelix.com")) {
      const path = new URL(currentTrack.src).pathname;
      return `/api/proxy-audio?path=${encodeURIComponent(path)}`;
    }
    return currentTrack.src;
  };

  return (
    <PlayerContext.Provider
      value={{
        tracks: trackList,
        currentTrack,
        currentIndex,
        isPlaying,
        progress,
        duration,
        volume,
        shuffle,
        repeat,
        audioRef,
        analyserRef,
        queue,
        addToQueue,
        playNext,
        removeFromQueue,
        clearQueue,
        quality,
        setQuality,
        sleepMinutes,
        setSleepTimer,
        cancelSleepTimer,
        play,
        playTrack,
        playTrackList,
        pause,
        togglePlay,
        next,
        prev,
        seek,
        setVolume,
        toggleShuffle,
        toggleRepeat,
      }}
    >
      <audio ref={audioRef} src={getAudioSrc()} crossOrigin="anonymous" preload="auto" />
      {children}
    </PlayerContext.Provider>
  );
};
