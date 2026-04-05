
import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Track, playlist } from "@/data/playlist";
import ReactPlayer from "react-player";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useListeningHistory } from "@/hooks/useSupabaseListeningHistory";
import { useLikedSongs } from "@/hooks/useSupabaseLikedSongs";
import {
  DEFAULT_VOLUME,
  DEFAULT_AUDIO_QUALITY,
  STORAGE_KEY_QUALITY,
  STORAGE_KEY_EQ,
  STORAGE_KEY_QUEUE,
  EQ_BASS_FREQUENCY,
  EQ_MID_FREQUENCY,
  EQ_TREBLE_FREQUENCY,
  EQ_MID_Q_VALUE,
  ANALYSER_FFT_SIZE,
  TIME_UPDATE_INTERVAL_MS,
  CROSSFADE_INTERVAL_MS,
  CROSSFADE_STEPS_PER_SECOND,
  PLAYBACK_START_DELAY_MS,
  PLAYBACK_SHORT_DELAY_MS,
  PLAYBACK_MEDIUM_DELAY_MS,
  YOUTUBE_PLAY_CHECK_INTERVAL_MS,
  YOUTUBE_RESUME_DELAY_MS,
  YOUTUBE_UNSTARTED_DELAY_MS,
  YOUTUBE_REPEAT_RESUME_DELAY_MS,
  YOUTUBE_PLAYER_STATE,
  SILENT_AUDIO_VOLUME,
  PRELOAD_NEXT_TRACK_DELAY_MS,
} from "@/lib/constants";

// Silent audio data URI to keep audio session alive on mobile
const SILENT_AUDIO = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

// Detect mobile device - important for YouTube playback handling
const isMobile = () => {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
};

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
  // Supabase integration
  isCurrentTrackLiked: boolean;
  likeCurrentTrack: () => Promise<boolean>;
  unlikeCurrentTrack: () => Promise<boolean>;
  addToListeningHistory: (trackId: string, durationPlayed: number, completed: boolean) => Promise<boolean>;
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

const QUALITY_KEY = STORAGE_KEY_QUALITY;
const EQ_KEY = STORAGE_KEY_EQ;

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trackList, setTrackList] = useState<Track[]>(playlist);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");

  // Supabase hooks
  const { addToHistory } = useListeningHistory();
  const { likeSong: likeSongHook, unlikeSong: unlikeSongHook, isLiked: isLikedHook } = useLikedSongs();

  // Wake lock to prevent device from sleeping while playing
  useWakeLock(isPlaying);

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
    return DEFAULT_AUDIO_QUALITY;
  });

  // Sleep timer state
  const [sleepMinutes, setSleepMinutesState] = useState<number | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepEndTimeRef = useRef<number | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null!);
  const crossfadeAudioRef = useRef<HTMLAudioElement | null>(null);
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
      bassFilter.frequency.value = EQ_BASS_FREQUENCY;
      bassFilter.gain.value = eqBass;

      const midFilter = ctx.createBiquadFilter();
      midFilter.type = "peaking";
      midFilter.frequency.value = EQ_MID_FREQUENCY;
      midFilter.Q.value = EQ_MID_Q_VALUE;
      midFilter.gain.value = eqMid;

      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = "highshelf";
      trebleFilter.frequency.value = EQ_TREBLE_FREQUENCY;
      trebleFilter.gain.value = eqTreble;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = ANALYSER_FFT_SIZE;

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

  // Helper to resume audio context - critical for background playback on mobile
  const resumeAudioContext = useCallback(() => {
    setupAudioContext();
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    // Also resume silent audio to keep media session alive on mobile
    if (silentAudioRef.current) {
      silentAudioRef.current.play().catch(() => {});
    }
  }, [setupAudioContext]);

  const playAudio = useCallback(() => {
    resumeAudioContext();
    setTimeout(() => {
      if (currentTrack?.type === "youtube") {
        // YouTube tracks are handled by ReactPlayer
        setIsPlaying(true);
      } else {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      }
    }, PLAYBACK_SHORT_DELAY_MS);
  }, [resumeAudioContext, currentTrack?.type]);

  // Helper: Resolve YouTube track to direct audio URL to avoid Error 150
  const resolveYouTubeTrack = useCallback(async (track: Track): Promise<Track> => {
    if (track.type !== "youtube" && !track.src.includes("youtube.com") && !track.src.includes("youtu.be")) {
      return track;
    }
    const videoId = track.songId || track.src.split("v=").pop()?.split("&")[0];
    if (!videoId) return track;
    
    try {
      const res = await fetch(`/api/yt-stream?id=${videoId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.audioUrl) {
          return { ...track, src: data.audioUrl, type: "audio" as const };
        }
      }
    } catch (e) {
      console.error("Failed to resolve YouTube audio:", e);
    }
    return track;
  }, []);

  // Queue operations - auto-resolve YouTube tracks
  const addToQueue = useCallback(async (track: Track) => {
    let resolvedTrack = track;
    if (track.type === "youtube" || track.src.includes("youtube.com") || track.src.includes("youtu.be")) {
      resolvedTrack = await resolveYouTubeTrack(track);
    }
    setQueue((prev) => [...prev, resolvedTrack]);
  }, [resolveYouTubeTrack]);

  const playNext = useCallback(async (track: Track) => {
    let resolvedTrack = track;
    if (track.type === "youtube" || track.src.includes("youtube.com") || track.src.includes("youtu.be")) {
      resolvedTrack = await resolveYouTubeTrack(track);
    }
    setQueue((prev) => [resolvedTrack, ...prev]);
  }, [resolveYouTubeTrack]);

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

  const playTrack = useCallback(async (track: Track) => {
    // Auto-resolve YouTube tracks to direct audio URLs
    let resolvedTrack = track;
    if (track.type === "youtube" || track.src.includes("youtube.com") || track.src.includes("youtu.be")) {
      resolvedTrack = await resolveYouTubeTrack(track);
    }
    
    if (resolvedTrack.type === "youtube") {
      audioRef.current?.pause();
      const existingIdx = trackList.findIndex((t) => t.src === resolvedTrack.src);
      if (existingIdx !== -1) {
        setCurrentIndex(existingIdx);
      } else {
        setTrackList((prev) => [resolvedTrack, ...prev]);
        setCurrentIndex(0);
      }
      setProgress(0);
      setDuration(0);
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), PLAYBACK_START_DELAY_MS);
    } else {
      // Switching to audio — stop YouTube first
      setIsPlaying(false);
      setProgress(0);
      setTrackList((prev) => {
        const idx = prev.findIndex((t) => t.src === resolvedTrack.src);
        if (idx !== -1) {
          setCurrentIndex(idx);
          return prev;
        }
        const newList = [resolvedTrack, ...prev];
        setCurrentIndex(0);
        return newList;
      });
      // Directly play audio after a delay — resume audio context for background playback
      setTimeout(() => {
        resumeAudioContext();
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      }, PLAYBACK_START_DELAY_MS);
    }
  }, [resumeAudioContext, trackList, resolveYouTubeTrack]);

  const playTrackList = useCallback(async (tracks: Track[], index?: number) => {
    const idx = index ?? 0;
    const track = tracks[idx];
    
    // Auto-resolve YouTube tracks to direct audio URLs
    let resolvedTracks = tracks;
    if (track?.type === "youtube" || (track?.src.includes("youtube.com") || track?.src.includes("youtu.be"))) {
      const resolved = await resolveYouTubeTrack(track);
      if (resolved.src !== track.src) {
        resolvedTracks = [...tracks];
        resolvedTracks[idx] = resolved;
      }
    }
    
    setTrackList(resolvedTracks);
    setCurrentIndex(idx);
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);
    
    const finalTrack = resolvedTracks[idx];
    if (finalTrack?.type === "youtube") {
      audioRef.current?.pause();
      setTimeout(() => setIsPlaying(true), PLAYBACK_START_DELAY_MS);
    } else {
      setTimeout(() => {
        resumeAudioContext();
        playAudio();
      }, PRELOAD_NEXT_TRACK_DELAY_MS);
    }
  }, [playAudio, resumeAudioContext, resolveYouTubeTrack]);

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

  const next = useCallback(async () => {
    // Check queue first
    if (queue.length > 0) {
      let nextTrack = queue[0];
      // Auto-resolve YouTube tracks to direct audio URLs
      if (nextTrack.type === "youtube" || nextTrack.src.includes("youtube.com") || nextTrack.src.includes("youtu.be")) {
        nextTrack = await resolveYouTubeTrack(nextTrack);
      }
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
      // Resume audio context before playing next track - critical for background playback
      resumeAudioContext();
      setTimeout(() => playAudio(), PLAYBACK_SHORT_DELAY_MS);
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
    let nextTrack = trackList[nextIdx];
    
    // Auto-resolve YouTube tracks to direct audio URLs
    if (nextTrack?.type === "youtube" || nextTrack?.src.includes("youtube.com") || nextTrack?.src.includes("youtu.be")) {
      nextTrack = await resolveYouTubeTrack(nextTrack);
      // Update the track in the trackList with the resolved version
      if (nextTrack.src !== trackList[nextIdx]?.src) {
        setTrackList((prev) => {
          const updated = [...prev];
          updated[nextIdx] = nextTrack;
          return updated;
        });
      }
    }
    
    if (nextTrack?.type === "youtube") {
      setDuration(0);
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), PLAYBACK_START_DELAY_MS);
    } else {
      setIsPlaying(false);
      // Resume audio context before playing next track - critical for background playback
      resumeAudioContext();
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      }, PLAYBACK_SHORT_DELAY_MS);
    }
  }, [currentIndex, shuffle, trackList, resumeAudioContext, queue, playAudio, resolveYouTubeTrack]);

  const prev = useCallback(async () => {
    if (currentTrack?.type !== "youtube" && audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIdx = (currentIndex - 1 + trackList.length) % trackList.length;
    setCurrentIndex(prevIdx);
    setProgress(0);
    let prevTrack = trackList[prevIdx];
    
    // Auto-resolve YouTube tracks to direct audio URLs
    if (prevTrack?.type === "youtube" || prevTrack?.src.includes("youtube.com") || prevTrack?.src.includes("youtu.be")) {
      prevTrack = await resolveYouTubeTrack(prevTrack);
      // Update the track in the trackList with the resolved version
      if (prevTrack.src !== trackList[prevIdx]?.src) {
        setTrackList((prev) => {
          const updated = [...prev];
          updated[prevIdx] = prevTrack;
          return updated;
        });
      }
    }
    
    if (prevTrack?.type === "youtube") {
      setDuration(0);
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), PLAYBACK_START_DELAY_MS);
    } else {
      setIsPlaying(false);
      // Resume audio context - critical for background playback
      resumeAudioContext();
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      }, PLAYBACK_SHORT_DELAY_MS);
    }
  }, [currentIndex, trackList, currentTrack?.type, resumeAudioContext, resolveYouTubeTrack]);

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

  // Audio element event listeners with proper crossfade
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Debounce timeupdate to reduce re-renders
    let lastUpdate = 0;
    let crossfading = false;
    let crossfadeInterval: ReturnType<typeof setInterval> | null = null;
    
    const onTime = () => {
      const now = Date.now();
      if (now - lastUpdate > TIME_UPDATE_INTERVAL_MS) {
        lastUpdate = now;
        setProgress(audio.currentTime);
      }
      // Crossfade: fade out current while fading in next
      const cf = crossfadeRef.current;
      if (cf > 0 && audio.duration && !crossfading) {
        const remaining = audio.duration - audio.currentTime;
        if (remaining <= cf && remaining > 0.5) {
          crossfading = true;
          
          // Calculate next track index
          const nextIdx = (currentIndex + 1) % trackList.length;
          const nextTrack = trackList[nextIdx];
          
          if (nextTrack && nextTrack.type !== "youtube") {
            // Get next track src based on quality
            let nextSrc = nextTrack.src;
            if (nextTrack.audioUrls) {
              nextSrc = nextTrack.audioUrls[quality] ||
                        nextTrack.audioUrls["160kbps"] ||
                        nextTrack.audioUrls["96kbps"] ||
                        nextTrack.audioUrls["320kbps"] ||
                        nextTrack.src;
            }
            if (nextSrc.includes("soundhelix.com")) {
              const path = new URL(nextSrc).pathname;
              nextSrc = `/api/proxy-audio?path=${encodeURIComponent(path)}`;
            }
            
            // Create crossfade audio element if not exists
            if (!crossfadeAudioRef.current) {
              crossfadeAudioRef.current = new Audio();
              crossfadeAudioRef.current.volume = 0;
              crossfadeAudioRef.current.preload = "auto";
            }
            
            const crossfadeAudio = crossfadeAudioRef.current;
            const originalVolume = audio.volume;
            const fadeSteps = cf * 4; // 4 steps per second for smooth fade
            const fadeStepSize = originalVolume / fadeSteps;
            let fadeCount = 0;
            
            // Start playing next track at 0 volume
            crossfadeAudio.src = nextSrc;
            crossfadeAudio.currentTime = 0;
            crossfadeAudio.volume = 0;
            
            crossfadeAudio.play().then(() => {
              // Start crossfade: fade out current, fade in next
              crossfadeInterval = setInterval(() => {
                fadeCount++;
                const currentVol = Math.max(0, originalVolume - (fadeStepSize * fadeCount));
                const nextVol = Math.min(originalVolume, fadeStepSize * fadeCount);
                
                audio.volume = currentVol;
                crossfadeAudio.volume = nextVol;
                
                if (fadeCount >= fadeSteps) {
                  // Crossfade complete
                  clearInterval(crossfadeInterval!);
                  crossfadeInterval = null;
                  crossfading = false;
                  
                  // Stop current track
                  audio.pause();
                  audio.src = "";
                  
                  // Move crossfade audio to main audio element
                  audio.src = crossfadeAudio.src;
                  audio.volume = originalVolume;
                  audio.currentTime = crossfadeAudio.currentTime;
                  audio.play().catch(() => {});
                  
                  // Clean up crossfade audio
                  crossfadeAudio.src = "";
                  crossfadeAudio.volume = 0;
                  
                  // Update state
                  setCurrentIndex(nextIdx);
                  setProgress(audio.currentTime);
                }
              }, 250);
            }).catch(() => {
              // Failed to play next track, skip crossfade
              crossfading = false;
              if (crossfadeInterval) {
                clearInterval(crossfadeInterval);
                crossfadeInterval = null;
              }
              audio.volume = originalVolume;
              next();
            });
          } else {
            // No crossfade possible (YouTube track or no next track), just advance
            crossfading = false;
            next();
          }
        }
      }
    };
    
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => {
      crossfading = false;
      if (crossfadeInterval) {
        clearInterval(crossfadeInterval);
        crossfadeInterval = null;
      }
      // Track completed song in Supabase
      if (currentTrack) {
        addToHistory(String(currentTrack.id), audio.duration || 0, true).catch(() => {});
      }
      if (repeat === "one") {
        audio.currentTime = 0;
        audio.play();
      } else {
        next();
      }
    };
    
    const onError = (e: Event) => {
      console.error("Audio playback error:", e);
      crossfading = false;
      if (crossfadeInterval) {
        clearInterval(crossfadeInterval);
        crossfadeInterval = null;
      }
      // Auto-skip to next track on error
      setIsPlaying(false);
      next();
    };
    
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onError);
      if (crossfadeInterval) {
        clearInterval(crossfadeInterval);
      }
    };
  }, [next, repeat, currentIndex, trackList, quality, currentTrack, addToHistory]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Silent audio loop to keep audio session + notification controls alive on mobile
  useEffect(() => {
    const silent = new Audio(SILENT_AUDIO);
    silent.loop = true;
    silent.volume = 0.001;
    silentAudioRef.current = silent;
    return () => { silent.pause(); };
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

  // Control YouTube playback when isPlaying changes
  useEffect(() => {
    if (currentTrack?.type === "youtube" && ytPlayerRef.current) {
      const player = ytPlayerRef.current.getInternalPlayer();
      if (!player || typeof player.getPlayerState !== "function") return;

      const state = player.getPlayerState();
      
      if (isPlaying) {
        // If we should be playing but aren't, start playing
        if (state !== 1 && state !== 3) {
          const startPlayback = () => {
            player.playVideo?.();
            player.unMute?.();
            // On mobile, retry to handle autoplay restrictions
            if (isMobile()) {
              setTimeout(() => {
                player.playVideo?.();
                player.unMute?.();
              }, 300);
            }
          };
          startPlayback();
        }
      } else {
        // If we should be paused but aren't, pause
        if (state === 1 || state === 3) {
          player.pauseVideo?.();
        }
      }
    }
  }, [isPlaying, currentTrack?.type]);

  // Keep YouTube player alive on route changes - more aggressive on mobile
  useEffect(() => {
    if (currentTrack?.type === "youtube" && isPlaying && ytPlayerRef.current) {
      // Periodically check if player is still playing
      const interval = setInterval(() => {
        const player = ytPlayerRef.current?.getInternalPlayer();
        if (player && typeof player.getPlayerState === "function") {
          const state = player.getPlayerState();
          // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
          if (isPlaying && state !== 1 && state !== 3) {
            // If should be playing but isn't, restart - more aggressive on mobile
            player.playVideo?.();
            player.unMute?.();
            // On mobile, also try resuming after a short delay
            if (isMobile()) {
              setTimeout(() => {
                player.playVideo?.();
              }, 200);
            }
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
          resumeAudioContext();
          audioRef.current.play().catch(() => {});
        }
      }, 150);
      return () => clearTimeout(t);
    }
    // When switching TO youtube — pause audio element
    if (currentTrack.type === "youtube") {
      audioRef.current?.pause();
    }
  }, [currentTrack?.src, currentTrack?.type, isPlaying, resumeAudioContext]);

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
      document.title = "Sonic Bloom";
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
    // Supabase
    isCurrentTrackLiked: currentTrack ? isLikedHook(String(currentTrack.id)) : false,
    likeCurrentTrack: () => (currentTrack ? likeSongHook({
      id: String(currentTrack.id),
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      duration: currentTrack.duration,
      youtube_id: currentTrack.songId,
      cover_url: currentTrack.cover,
      audio_url: currentTrack.src
    }) : Promise.resolve(false)),
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
                  host: "https://www.youtube.com",
                  // On mobile, use the youtube-nocookie.com domain for better compatibility
                  playerVars: {
                    playsinline: 1,
                    origin: window.location.origin,
                  }
                },
                onUnstarted: () => {
                  // Auto-play if unstarted - critical for mobile
                  if (isPlaying) {
                    setTimeout(() => {
                      ytPlayerRef.current?.getInternalPlayer()?.playVideo?.();
                    }, 500);
                  }
                }
              }
            }}
            onProgress={({ playedSeconds }) => setProgress(playedSeconds)}
            onDuration={(d) => setDuration(d)}
            onReady={() => {
              // Ensure playback starts when ready - critical for mobile
              if (isPlaying && ytPlayerRef.current) {
                const startPlayback = () => {
                  const player = ytPlayerRef.current?.getInternalPlayer();
                  if (player) {
                    player.playVideo?.();
                    player.unMute?.();
                    // On mobile, retry after a short delay to handle autoplay restrictions
                    if (isMobile()) {
                      setTimeout(() => {
                        player.playVideo?.();
                        player.unMute?.();
                      }, 500);
                    }
                  }
                };
                setTimeout(startPlayback, 100);
              }
            }}
            onPlay={() => {
              // Keep playing state in sync
              if (!isPlaying) setIsPlaying(true);
            }}
            onPause={() => {
              // Don't sync pause state automatically - YouTube pauses for many reasons
              // Only sync if we explicitly want to pause
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
              // Immediately skip to next track on error
              setIsPlaying(false);
              next();
            }}
          />
        </div>
      )}
      {children}
    </PlayerContext.Provider>
  );
};

