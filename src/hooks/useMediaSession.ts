import { useEffect } from "react";
import type { Track } from "@/data/playlist";

interface UseMediaSessionProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek?: (time: number) => void;
}

export function useMediaSession({
  currentTrack, isPlaying,
  onPlay, onPause, onNext, onPrev, onSeek,
}: UseMediaSessionProps) {
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!currentTrack) return;

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
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      if (onSeek) onSeek(Math.max(0, (navigator.mediaSession.playbackState === "playing" ? 0 : 0) - 10));
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      if (onSeek) onSeek(0 + 10);
    });

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [currentTrack, isPlaying, onPlay, onPause, onNext, onPrev, onSeek]);
}
