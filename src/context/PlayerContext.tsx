
import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Track, playlist } from "@/data/playlist";
import ReactPlayer from "react-player";

// Silent audio data URI to keep audio session alive on mobile
const SILENT_AUDIO = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

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
  // Equalizer
  eqBass: number;
  eqMid: number;
  eqTreble: number;
  setEqBass: (v: number) => void;
  setEqMid: (v: number) => void;
  setEqTreble: (v: number) => void;
  applyEqPreset: (preset: string) => void;
  // Playback speed
  playbackSpeed: number;
  setPlaybackSpeed: (v: number) => void;
  // Crossfade
  crossfade: number; // seconds, 0 = off
  setCrossfade: (v: number) => void;
  // Queue
  queue: Track[];
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  moveQueueItem: (from: number, to: number) => void;
  shuffleQueue: () => void;
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
const EQ_KEY = "sonic_eq";

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trackList, setTrackList] = useState<Track[]>(playlist);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");

  // Queue state — persisted in localStorage
  const [queue, setQueue] = useState<Track[]>(() => {
    try {
      const stored = localStorage.getItem("sonic_queue");
      if (stored) return JSON.parse(stored);
    } catch { /* */ }
    return [];
  });

  // Save queue to localStorage on change
  useEffect(() => {
    try { localStorage.setItem("sonic_queue", JSON.stringify(queue)); } catch { /* */ }
  }, [queue]);

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
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<ReactPlayer>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);

  // EQ state with localStorage persistence
  const [eqBass, setEqBassState] = useState(() => {
    try {
      const stored = localStorage.getItem(EQ_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.bass === "number") return parsed.bass;
      }
    } catch { /* */ }
    return 0;
  });
  const [eqMid, setEqMidState] = useState(() => {
    try {
      const stored = localStorage.getItem(EQ_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.mid === "number") return parsed.mid;
      }
    } catch { /* */ }
    return 0;
  });
  const [eqTreble, setEqTrebleState] = useState(() => {
    try {
      const stored = localStorage.getItem(EQ_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.treble === "number") return parsed.treble;
      }
    } catch { /* */ }
    return 0;
  });

  // Playback speed (0.5 - 2.0)
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
  // Crossfade duration in seconds (0 = off)
  const [crossfade, setCrossfadeState] = useState(0);
  const crossfadeRef = useRef(0);

  const currentTrack = trackList[currentIndex] || null;

  const setupAudioContext = useCallback(() => {
    if (audioCtxRef.current || !audioRef.current) return;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audioRef.current);

      // EQ filters: lowshelf @ 320Hz, peaking @ 1kHz, highshelf @ 3.2kHz
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = "lowshelf";
      bassFilter.frequency.value = 320;
      bassFilter.gain.value = eqBass;

      const midFilter = ctx.createBiquadFilter();
      midFilter.type = "peaking";
      midFilter.frequency.value = 1000;
      midFilter.Q.value = 1;
      midFilter.gain.value = eqMid;

      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = "highshelf";
      trebleFilter.frequency.value = 3200;
      trebleFilter.gain.value = eqTreble;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      // Chain: source -> bass -> mid -> treble -> analyser -> destination
      source.connect(bassFilter);
      bassFilter.connect(midFilter);
      midFilter.connect(trebleFilter);
      trebleFilter.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      sourceRef.current = source;
      bassFilterRef.current = bassFilter;
      midFilterRef.current = midFilter;
      trebleFilterRef.current = trebleFilter;
      analyserRef.current = analyser;
    } catch {
      // ignore
    }
  }, [eqBass, eqMid, eqTreble]);

  const playAudio = useCallback(() => {
    setupAudioContext();
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    setTimeout(() => {
      if (currentTrack?.type === "youtube") {
        // YouTube tracks are handled by ReactPlayer
        setIsPlaying(true);
      } else {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      }
    }, 50);
  }, [setupAudioContext, currentTrack?.type]);

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

  // Move queue item from one position to another
  const moveQueueItem = useCallback((from: number, to: number) => {
    setQueue((prev) => {
      const updated = [...prev];
      const [item] = updated.splice(from, 1);
      updated.splice(to, 0, item);
      return updated;
    });
  }, []);

  // Shuffle the queue
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

  // Playback speed
  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed);
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, []);

  // Crossfade
  const setCrossfade = useCallback((seconds: number) => {
    setCrossfadeState(seconds);
    crossfadeRef.current = seconds;
  }, []);

  // EQ Presets
  const applyEqPreset = useCallback((preset: string) => {
    const presets: Record<string, [number, number, number]> = {
      flat: [0, 0, 0],
      rock: [4, -1, 3],
      pop: [-1, 3, 1],
      bass: [6, 0, -2],
      vocal: [-2, 4, 2],
      treble: [-3, 0, 5],
      electronic: [3, -1, 4],
    };
    const [b, m, t] = presets[preset] || presets.flat;
    setEqBassState(b);
    setEqMidState(m);
    setEqTrebleState(t);
    if (bassFilterRef.current) bassFilterRef.current.gain.value = b;
    if (midFilterRef.current) midFilterRef.current.gain.value = m;
    if (trebleFilterRef.current) trebleFilterRef.current.gain.value = t;
    localStorage.setItem(EQ_KEY, JSON.stringify({ bass: b, mid: m, treble: t }));
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

  // EQ setters that update filter nodes + persist
  const setEqBass = useCallback((v: number) => {
    setEqBassState(v);
    if (bassFilterRef.current) bassFilterRef.current.gain.value = v;
    try {
      const stored = localStorage.getItem(EQ_KEY);
      const prev = stored ? JSON.parse(stored) : {};
      localStorage.setItem(EQ_KEY, JSON.stringify({ ...prev, bass: v }));
    } catch { /* ignore */ }
  }, []);

  const setEqMid = useCallback((v: number) => {
    setEqMidState(v);
    if (midFilterRef.current) midFilterRef.current.gain.value = v;
    try {
      const stored = localStorage.getItem(EQ_KEY);
      const prev = stored ? JSON.parse(stored) : {};
      localStorage.setItem(EQ_KEY, JSON.stringify({ ...prev, mid: v }));
    } catch { /* ignore */ }
  }, []);

  const setEqTreble = useCallback((v: number) => {
    setEqTrebleState(v);
    if (trebleFilterRef.current) trebleFilterRef.current.gain.value = v;
    try {
      const stored = localStorage.getItem(EQ_KEY);
      const prev = stored ? JSON.parse(stored) : {};
      localStorage.setItem(EQ_KEY, JSON.stringify({ ...prev, treble: v }));
    } catch { /* ignore */ }
  }, []);

  const play = useCallback((index?: number) => {
    if (index !== undefined) setCurrentIndex(index);
    playAudio();
  }, [playAudio]);

  const playTrack = useCallback((track: Track) => {
    if (track.type === "youtube") {
      audioRef.current?.pause();
      const existingIdx = trackList.findIndex((t) => t.src === track.src);
      if (existingIdx !== -1) {
        setCurrentIndex(existingIdx);
      } else {
        setTrackList((prev) => [track, ...prev]);
        setCurrentIndex(0);
      }
      setProgress(0);
      setDuration(0);
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 300);
    } else {
      // Switching to audio — stop YouTube first
      setIsPlaying(false);
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
      setTimeout(() => playAudio(), 200);
    }
  }, [playAudio, trackList]);

  const playTrackList = useCallback((tracks: Track[], index?: number) => {
    setTrackList(tracks);
    setCurrentIndex(index ?? 0);
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);
    const track = tracks[index ?? 0];
    if (track?.type === "youtube") {
      audioRef.current?.pause();
      setTimeout(() => setIsPlaying(true), 300);
    } else {
      setTimeout(() => playAudio(), 200);
    }
  }, [playAudio]);

  const pause = useCallback(() => {
    if (currentTrack?.type === "youtube") {
      // ReactPlayer handles pause via playing prop
      setIsPlaying(false);
    } else {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [currentTrack?.type]);

  const togglePlay = useCallback(() => {
    if (currentTrack?.type === "youtube") {
      // ReactPlayer handles via playing prop
      setIsPlaying((prev) => !prev);
    } else if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause, currentTrack?.type]);

  // Track played indices for shuffle (avoid repeats)
  const playedIndicesRef = useRef<Set<number>>(new Set());

  // Reset played tracking when shuffle toggles or trackList changes
  useEffect(() => {
    playedIndicesRef.current = new Set([currentIndex]);
  }, [shuffle, trackList.length]);

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
      // Shuffle without repeat: pick from unplayed songs
      const played = playedIndicesRef.current;
      const unplayed: number[] = [];
      for (let i = 0; i < trackList.length; i++) {
        if (!played.has(i)) unplayed.push(i);
      }
      if (unplayed.length === 0) {
        // All songs played — reset and start fresh
        playedIndicesRef.current = new Set([currentIndex]);
        const fresh: number[] = [];
        for (let i = 0; i < trackList.length; i++) {
          if (i !== currentIndex) fresh.push(i);
        }
        nextIdx = fresh.length > 0 ? fresh[Math.floor(Math.random() * fresh.length)] : currentIndex;
      } else {
        nextIdx = unplayed[Math.floor(Math.random() * unplayed.length)];
      }
      playedIndicesRef.current.add(nextIdx);
    } else {
      nextIdx = (currentIndex + 1) % trackList.length;
    }
    setCurrentIndex(nextIdx);
    setProgress(0);
    const nextTrack = trackList[nextIdx];
    if (nextTrack?.type === "youtube") {
      setDuration(0);
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 300);
    } else {
      setIsPlaying(false);
      setupAudioContext();
      if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      }, 100);
    }
  }, [currentIndex, shuffle, trackList, setupAudioContext, queue, playAudio]);

  const prev = useCallback(() => {
    if (currentTrack?.type !== "youtube" && audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIdx = (currentIndex - 1 + trackList.length) % trackList.length;
    setCurrentIndex(prevIdx);
    setProgress(0);
    const prevTrack = trackList[prevIdx];
    if (prevTrack?.type === "youtube") {
      setDuration(0);
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 300);
    } else {
      setIsPlaying(false);
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      }, 100);
    }
  }, [currentIndex, trackList, currentTrack?.type]);

  const seek = useCallback((time: number) => {
    if (currentTrack?.type === "youtube") {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
        ytPlayerRef.current.seekTo(time, "seconds");
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setProgress(time);
  }, [currentTrack?.type]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
    // ReactPlayer uses volume prop, no need to set manually
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const toggleRepeat = useCallback(() => {
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);

  // Audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Debounce timeupdate to reduce re-renders
    let lastUpdate = 0;
    let crossfading = false;
    const onTime = () => {
      const now = Date.now();
      if (now - lastUpdate > 800) {
        lastUpdate = now;
        setProgress(audio.currentTime);
      }
      // Crossfade: fade out volume in last N seconds, then auto-advance
      const cf = crossfadeRef.current;
      if (cf > 0 && audio.duration && !crossfading) {
        const remaining = audio.duration - audio.currentTime;
        if (remaining <= cf && remaining > 0.5) {
          crossfading = true;
          const originalVolume = audio.volume;
          const fadeStep = originalVolume / (cf * 4); // fade over cf seconds
          const fadeInterval = setInterval(() => {
            if (audio.volume > fadeStep) {
              audio.volume -= fadeStep;
            } else {
              clearInterval(fadeInterval);
              audio.volume = originalVolume; // restore for next track
              crossfading = false;
              next();
            }
          }, 250);
        }
      }
    };
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => {
      crossfading = false;
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

  // Silent audio loop to keep audio session alive on mobile (for YouTube background play)
  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.001; // Nearly silent
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 0; // Inaudible frequency
    oscillator.start();
    
    const silent = new Audio(SILENT_AUDIO);
    silent.loop = true;
    silent.volume = 0.001;
    silentAudioRef.current = silent;
    
    return () => { 
      silent.pause();
      oscillator.stop();
      ctx.close();
    };
  }, []);

  // Start/stop silent audio based on YouTube playback
  useEffect(() => {
    const silent = silentAudioRef.current;
    if (!silent) return;
    if (currentTrack?.type === "youtube" && isPlaying) {
      silent.play().catch(() => {});
    } else {
      silent.pause();
    }
  }, [currentTrack?.type, isPlaying]);

  // Visibility change — handle YouTube background playback
  const wasPlayingBeforeHidden = useRef(false);
  useEffect(() => {
    const handleVisibility = () => {
      if (currentTrack?.type !== "youtube") return;
      
      if (document.visibilityState === "hidden") {
        // Save current playing state before hiding
        wasPlayingBeforeHidden.current = isPlaying;
        // Keep playing in background
        if (isPlaying && ytPlayerRef.current) {
          ytPlayerRef.current.getInternalPlayer()?.playVideo?.();
        }
      } else if (document.visibilityState === "visible") {
        // Resume playback when tab becomes visible again
        if (wasPlayingBeforeHidden.current && ytPlayerRef.current) {
          setTimeout(() => {
            ytPlayerRef.current?.getInternalPlayer()?.playVideo?.();
            setIsPlaying(true);
          }, 100);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [currentTrack?.type, isPlaying]);

  // Keep YouTube player alive on route changes
  useEffect(() => {
    if (currentTrack?.type === "youtube" && isPlaying && ytPlayerRef.current) {
      // Periodically check if player is still playing
      const interval = setInterval(() => {
        const player = ytPlayerRef.current?.getInternalPlayer();
        if (player && typeof player.getPlayerState === "function") {
          const state = player.getPlayerState();
          // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
          if (isPlaying && state !== 1 && state !== 3) {
            // If should be playing but isn't, restart
            player.playVideo?.();
          }
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [currentTrack?.type, isPlaying]);

  // When switching FROM youtube TO audio — force audio element to play
  useEffect(() => {
    if (!currentTrack) return;
    if (currentTrack.type !== "youtube" && isPlaying) {
      // Small delay to let audio src update
      const t = setTimeout(() => {
        if (audioRef.current && audioRef.current.paused) {
          setupAudioContext();
          if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
          audioRef.current.play().catch(() => {});
        }
      }, 150);
      return () => clearTimeout(t);
    }
    // When switching TO youtube — pause audio element
    if (currentTrack.type === "youtube") {
      audioRef.current?.pause();
    }
  }, [currentTrack?.src, currentTrack?.type]);

  // Reset when track changes
  useEffect(() => {
    setProgress(0);
    if (currentTrack) {
      setDuration(currentTrack.duration || 0);
    }
  }, [currentIndex, currentTrack]);

  // Preload next track audio for gapless-like playback
  // Preload next track using fetch (browser cache)
  useEffect(() => {
    if (!currentTrack) return;
    const nextIdx = (currentIndex + 1) % trackList.length;
    const nextTrack = trackList[nextIdx];
    if (nextTrack?.src) {
      fetch(nextTrack.src, { mode: "no-cors" }).catch(() => {});
    }
  }, [currentIndex, currentTrack, trackList]);

  // Dynamic browser tab title and favicon
  useEffect(() => {
    if (currentTrack) {
      document.title = `${currentTrack.title} • ${currentTrack.artist}`;
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = currentTrack.cover;
    } else {
      document.title = "Sonic Bloom Player";
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (link) link.href = "/favicon.ico";
    }
  }, [currentTrack, isPlaying]);

  // Get audio src based on quality preference
  const getAudioSrc = (): string | undefined => {
    if (!currentTrack) return undefined;

    // YouTube tracks: return undefined — handled by ReactPlayer separately
    if (currentTrack.type === "youtube") {
      return undefined;
    }

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

  const contextValue = useMemo(() => ({
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
    // Equalizer
    eqBass,
    eqMid,
    eqTreble,
    setEqBass,
    setEqMid,
    setEqTreble,
    applyEqPreset,
    playbackSpeed,
    setPlaybackSpeed,
    crossfade,
    setCrossfade,
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
  }), [
    trackList, currentTrack, currentIndex, isPlaying, progress, duration,
    volume, shuffle, repeat, eqBass, eqMid, eqTreble, playbackSpeed,
    crossfade, queue, quality, sleepMinutes, play, playTrack, playTrackList,
    pause, togglePlay, next, prev, seek, setVolume, toggleShuffle, toggleRepeat,
    addToQueue, playNext, removeFromQueue, clearQueue, moveQueueItem, shuffleQueue,
    setEqBass, setEqMid, setEqTreble, applyEqPreset, setPlaybackSpeed,
    setCrossfade, setQuality, setSleepTimer, cancelSleepTimer,
  ]);

  return (
    <PlayerContext.Provider value={contextValue}>
      <audio ref={audioRef} src={getAudioSrc()} crossOrigin="anonymous" preload="auto" />
      {currentTrack?.type === "youtube" && (
        <div style={{ position: "fixed", top: -9999, left: -9999, width: 1, height: 1, pointerEvents: "none", zIndex: -1 }}>
          <ReactPlayer
            ref={ytPlayerRef}
            url={currentTrack.src}
            playing={isPlaying}
            volume={volume}
            width="1px"
            height="1px"
            playsinline
            muted={false}
            loop={repeat === "one"}
            config={{ 
              youtube: { 
                playerVars: { 
                  playsinline: 1, 
                  origin: window.location.origin, 
                  enablejsapi: 1, 
                  autoplay: 1,
                  controls: 0,
                  modestbranding: 1,
                  rel: 0,
                  fs: 0,
                  iv_load_policy: 3,
                  disablekb: 1,
                  widget_referrer: window.location.origin
                },
                embedOptions: {
                  playsinline: 1,
                  host: "https://www.youtube.com"
                },
                onUnstarted: () => {
                  // Auto-play if unstarted
                  if (isPlaying) {
                    setTimeout(() => setIsPlaying(true), 500);
                  }
                }
              } 
            }}
            onProgress={({ playedSeconds }) => setProgress(playedSeconds)}
            onDuration={(d) => setDuration(d)}
            onReady={() => {
              // Ensure playback starts when ready
              if (isPlaying && ytPlayerRef.current) {
                setTimeout(() => {
                  ytPlayerRef.current?.getInternalPlayer()?.playVideo?.();
                }, 100);
              }
            }}
            onPlay={() => {
              // Keep playing state in sync
              if (!isPlaying) setIsPlaying(true);
            }}
            onPause={() => {
              // Sync state only — don't auto-resume to avoid infinite loop
              if (isPlaying) setIsPlaying(false);
            }}
            onEnded={() => {
              if (repeat === "one") {
                ytPlayerRef.current?.seekTo(0, "seconds");
                setIsPlaying(false);
                setTimeout(() => setIsPlaying(true), 200);
              } else {
                next();
              }
            }}
            onError={(error) => {
              console.error("YouTube player error:", error);
              // Only skip to next after a retry fails — don't retry forever
              const retryOnce = setTimeout(() => {
                if (isPlaying && ytPlayerRef.current) {
                  ytPlayerRef.current.getInternalPlayer()?.playVideo?.();
                }
              }, 1500);
              // If still failing after 5s, skip track
              setTimeout(() => {
                clearTimeout(retryOnce);
                if (isPlaying) {
                  setIsPlaying(false);
                  next();
                }
              }, 5000);
            }}
          />
        </div>
      )}
      {children}
    </PlayerContext.Provider>
  );
};

