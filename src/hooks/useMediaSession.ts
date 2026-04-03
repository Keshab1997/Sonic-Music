
import { useEffect } from "react";
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
  // Set metadata when track changes
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

    navigator.mediaSession.setActionHandler("play", onPlay);
    navigator.mediaSession.setActionHandler("pause", onPause);
    navigator.mediaSession.setActionHandler("nexttrack", onNext);
    navigator.mediaSession.setActionHandler("previoustrack", onPrev);
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime != null && onSeek) onSeek(details.seekTime);
    });
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      if (onSeek) onSeek(Math.max(0, progress - (details.seekOffset ?? 10)));
    });
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      if (onSeek) onSeek(Math.min(duration || Infinity, progress + (details.seekOffset ?? 10)));
    });
  }, [currentTrack, onPlay, onPause, onNext, onPrev, onSeek, progress, duration]);

  // Update playback state
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // Update position state (shows time on lock screen)
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

