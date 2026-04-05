
import { useEffect, useRef } from "react";
import type { Track } from "@/data/playlist";

interface UseMediaSessionProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek?: (time: number) => void;
}

export function useMediaSession({
  currentTrack, isPlaying, progress, duration,
  onPlay, onPause, onNext, onPrev, onSeek,
}: UseMediaSessionProps) {
  // Always-fresh refs — no stale closure issue
  const progressRef = useRef(progress);
  const durationRef = useRef(duration);
  const onSeekRef = useRef(onSeek);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);

  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);
  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);
  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);
  useEffect(() => { onNextRef.current = onNext; }, [onNext]);
  useEffect(() => { onPrevRef.current = onPrev; }, [onPrev]);

  // Register action handlers once — refs always have latest values
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => onPlayRef.current());
    navigator.mediaSession.setActionHandler("pause", () => onPauseRef.current());
    navigator.mediaSession.setActionHandler("nexttrack", () => onNextRef.current());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPrevRef.current());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime != null) onSeekRef.current?.(details.seekTime);
    });
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      onSeekRef.current?.(Math.max(0, progressRef.current - (details.seekOffset ?? 10)));
    });
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      onSeekRef.current?.(Math.min(durationRef.current || Infinity, progressRef.current + (details.seekOffset ?? 10)));
    });
  }, []); // only once

  // Update metadata when track changes
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album || "",
      artwork: currentTrack.cover
        ? [
            { src: currentTrack.cover, sizes: "96x96", type: "image/jpeg" },
            { src: currentTrack.cover, sizes: "128x128", type: "image/jpeg" },
            { src: currentTrack.cover, sizes: "256x256", type: "image/jpeg" },
            { src: currentTrack.cover, sizes: "512x512", type: "image/jpeg" },
          ]
        : [],
    });
  }, [currentTrack]);

  // Update playback state
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // Update position state (shows time on lock screen / notification)
  useEffect(() => {
    if (!("mediaSession" in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(progress, duration),
      });
    } catch { /* ignore */ }
  }, [progress, duration]);
}
