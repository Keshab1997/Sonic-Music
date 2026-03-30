import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import ReactPlayer from "react-player";
import { Track, playlist } from "@/data/playlist";

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

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trackList, setTrackList] = useState<Track[]>(playlist);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");

  const audioRef = useRef<HTMLAudioElement>(null!);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const reactPlayerRef = useRef<ReactPlayer>(null);
  const ytDurationRef = useRef<number>(0);

  const currentTrack = trackList[currentIndex] || null;
  const isYouTube = currentTrack?.type === "youtube";

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
      // AudioContext may already be created
    }
  }, []);

  const play = useCallback((index?: number) => {
    if (index !== undefined) setCurrentIndex(index);
    const targetTrack = index !== undefined ? trackList[index] : trackList[currentIndex];
    if (targetTrack?.type === "audio") {
      setupAudioContext();
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume();
      }
    }
    setTimeout(() => {
      if (targetTrack?.type === "audio") {
        audioRef.current?.play().catch(() => {});
      }
      setIsPlaying(true);
    }, 50);
  }, [currentIndex, trackList, setupAudioContext]);

  const playTrack = useCallback((track: Track) => {
    setTrackList((prev) => {
      const idx = prev.findIndex((t) => t.src === track.src);
      if (idx !== -1) {
        setCurrentIndex(idx);
        setTimeout(() => setIsPlaying(true), 50);
        return prev;
      }
      const newList = [track, ...prev];
      setCurrentIndex(0);
      setTimeout(() => setIsPlaying(true), 50);
      return newList;
    });
    setProgress(0);
  }, []);

  const playTrackList = useCallback((tracks: Track[], index?: number) => {
    setTrackList(tracks);
    setCurrentIndex(index ?? 0);
    setProgress(0);
    setTimeout(() => setIsPlaying(true), 50);
  }, []);

  const pause = useCallback(() => {
    if (currentTrack?.type === "audio") {
      audioRef.current?.pause();
    }
    setIsPlaying(false);
  }, [currentTrack]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const next = useCallback(() => {
    let nextIdx: number;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * trackList.length);
    } else {
      nextIdx = (currentIndex + 1) % trackList.length;
    }
    setCurrentIndex(nextIdx);
    setProgress(0);
    const nextTrack = trackList[nextIdx];
    setTimeout(() => {
      if (nextTrack?.type === "audio") {
        setupAudioContext();
        if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
        audioRef.current?.play().catch(() => {});
      }
      setIsPlaying(true);
    }, 100);
  }, [currentIndex, shuffle, trackList, setupAudioContext]);

  const prev = useCallback(() => {
    if (currentTrack?.type === "audio" && audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIdx = (currentIndex - 1 + trackList.length) % trackList.length;
    setCurrentIndex(prevIdx);
    setProgress(0);
    const prevTrack = trackList[prevIdx];
    setTimeout(() => {
      if (prevTrack?.type === "audio") {
        audioRef.current?.play().catch(() => {});
      }
      setIsPlaying(true);
    }, 100);
  }, [currentIndex, currentTrack, trackList]);

  const seek = useCallback((time: number) => {
    if (isYouTube) {
      const player = reactPlayerRef.current;
      if (player) {
        try {
          player.seekTo(time, "seconds");
        } catch {
          // ignore
        }
      }
    } else {
      if (audioRef.current) audioRef.current.currentTime = time;
    }
    setProgress(time);
  }, [isYouTube]);

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
    const onTime = () => {
      if (!isYouTube) setProgress(audio.currentTime);
    };
    const onMeta = () => {
      if (!isYouTube) setDuration(audio.duration);
    };
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
  }, [next, repeat, isYouTube]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Reset progress when track changes
  useEffect(() => {
    setProgress(0);
    if (isYouTube && currentTrack) {
      setDuration(currentTrack.duration || 0);
    }
  }, [currentIndex, isYouTube, currentTrack]);

  // YouTube progress tracking via interval
  useEffect(() => {
    if (!isYouTube || !isPlaying) return;
    const interval = setInterval(() => {
      const player = reactPlayerRef.current;
      if (player) {
        try {
          const internal = player.getInternalPlayer() as { getCurrentTime?: () => number } | null;
          if (internal && typeof internal.getCurrentTime === "function") {
            const currentSec = internal.getCurrentTime();
            if (currentSec && !isNaN(currentSec)) {
              setProgress(currentSec);
            }
          }
        } catch {
          // ignore
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isYouTube, isPlaying]);

  const handleYTProgress = useCallback((state: { playedSeconds: number }) => {
    if (state.playedSeconds && !isNaN(state.playedSeconds)) {
      setProgress(state.playedSeconds);
    }
  }, []);

  const handleYTDuration = useCallback((d: number) => {
    if (d && !isNaN(d)) {
      ytDurationRef.current = d;
      setDuration(d);
    }
  }, []);

  const handleYTEnd = useCallback(() => {
    if (repeat === "one") {
      const player = reactPlayerRef.current;
      if (player) {
        try {
          player.seekTo(0, "seconds");
        } catch {
          // ignore
        }
      }
    } else {
      next();
    }
  }, [repeat, next]);

  // Proxy SoundHelix audio to avoid CORS issues
  const getProxiedSrc = (src: string) => {
    if (src.includes("soundhelix.com")) {
      const path = new URL(src).pathname;
      return `/api/proxy-audio?path=${encodeURIComponent(path)}`;
    }
    return src;
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
      <audio
        ref={audioRef}
        src={!isYouTube && currentTrack ? getProxiedSrc(currentTrack.src) : undefined}
        preload="auto"
      />

      {isYouTube && currentTrack && (
        <div style={{
          position: "fixed",
          bottom: 76,
          right: 8,
          width: 220,
          height: 124,
          zIndex: 40,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}>
          <ReactPlayer
            ref={reactPlayerRef}
            url={currentTrack.src}
            playing={isPlaying}
            volume={volume}
            width="100%"
            height="100%"
            onProgress={handleYTProgress}
            onDuration={handleYTDuration}
            onEnded={handleYTEnd}
            progressInterval={500}
          />
        </div>
      )}

      {children}
    </PlayerContext.Provider>
  );
};
