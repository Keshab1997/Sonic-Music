import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { Track, playlist } from "@/data/playlist";

interface PlayerContextType {
  tracks: Track[];
  currentTrack: Track | null;
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const [youtubeAudioUrl, setYoutubeAudioUrl] = useState<string | null>(null);

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

  const fetchYoutubeAudio = useCallback(async (track: Track): Promise<string | null> => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/youtube-audio?url=${encodeURIComponent(track.src)}`);
      if (!res.ok) throw new Error("Failed to fetch audio");
      const data = await res.json();
      setIsLoading(false);
      return data.audioUrl;
    } catch {
      setIsLoading(false);
      return null;
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

  const play = useCallback((index?: number) => {
    if (index !== undefined) setCurrentIndex(index);
    const targetTrack = index !== undefined ? trackList[index] : trackList[currentIndex];
    if (targetTrack?.type === "youtube") {
      fetchYoutubeAudio(targetTrack).then((url) => {
        if (url) {
          setYoutubeAudioUrl(url);
          playAudio();
        }
      });
    } else {
      playAudio();
    }
  }, [currentIndex, trackList, fetchYoutubeAudio, playAudio]);

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
    setDuration(track.duration || 0);

    if (track.type === "youtube") {
      fetchYoutubeAudio(track).then((url) => {
        if (url) {
          setYoutubeAudioUrl(url);
          setTimeout(() => playAudio(), 100);
        }
      });
    } else {
      setYoutubeAudioUrl(null);
      setTimeout(() => playAudio(), 100);
    }
  }, [fetchYoutubeAudio, playAudio]);

  const playTrackList = useCallback((tracks: Track[], index?: number) => {
    setTrackList(tracks);
    setCurrentIndex(index ?? 0);
    setProgress(0);
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

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

    if (nextTrack?.type === "youtube") {
      fetchYoutubeAudio(nextTrack).then((url) => {
        if (url) {
          setYoutubeAudioUrl(url);
          setupAudioContext();
          if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
          setTimeout(() => {
            audioRef.current?.play().catch(() => {});
            setIsPlaying(true);
          }, 200);
        }
      });
    } else {
      setYoutubeAudioUrl(null);
      setupAudioContext();
      if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      }, 100);
    }
  }, [currentIndex, shuffle, trackList, fetchYoutubeAudio, setupAudioContext]);

  const prev = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIdx = (currentIndex - 1 + trackList.length) % trackList.length;
    setCurrentIndex(prevIdx);
    setProgress(0);
    const prevTrack = trackList[prevIdx];

    if (prevTrack?.type === "youtube") {
      fetchYoutubeAudio(prevTrack).then((url) => {
        if (url) {
          setYoutubeAudioUrl(url);
          setTimeout(() => {
            audioRef.current?.play().catch(() => {});
            setIsPlaying(true);
          }, 200);
        }
      });
    } else {
      setYoutubeAudioUrl(null);
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      }, 100);
    }
  }, [currentIndex, trackList, fetchYoutubeAudio]);

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

  // Determine audio src
  const getAudioSrc = (): string | undefined => {
    if (!currentTrack) return undefined;
    if (currentTrack.type === "youtube" && youtubeAudioUrl) {
      return youtubeAudioUrl;
    }
    if (currentTrack.type === "audio") {
      if (currentTrack.src.includes("soundhelix.com")) {
        const path = new URL(currentTrack.src).pathname;
        return `/api/proxy-audio?path=${encodeURIComponent(path)}`;
      }
      return currentTrack.src;
    }
    return undefined;
  };

  return (
    <PlayerContext.Provider
      value={{
        tracks: trackList,
        currentTrack,
        currentIndex,
        isPlaying,
        isLoading,
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
        src={getAudioSrc()}
        preload="auto"
      />
      {children}
    </PlayerContext.Provider>
  );
};
