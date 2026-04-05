
import { useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";

export const KEYBOARD_SHORTCUTS = [
  { key: "Space", description: "Play / Pause" },
  { key: "→", description: "Next track" },
  { key: "←", description: "Previous track" },
  { key: "Shift + →", description: "Forward 10s" },
  { key: "Shift + ←", description: "Backward 10s" },
  { key: "↑", description: "Volume up" },
  { key: "↓", description: "Volume down" },
  { key: "M", description: "Mute / Unmute" },
  { key: "S", description: "Toggle shuffle" },
  { key: "R", description: "Cycle repeat" },
  { key: "L", description: "Like / Unlike" },
  { key: "N", description: "Toggle lyrics" },
  { key: "/", description: "Focus search" },
  { key: "?", description: "Show shortcuts" },
] as const;

export const useKeyboardShortcuts = (callbacks?: {
  onLyrics?: () => void;
  onLike?: () => void;
  onShowShortcuts?: () => void;
}) => {
  const { togglePlay, next, prev, setVolume, volume, toggleShuffle, toggleRepeat, seek, progress, duration } = usePlayer();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          if (e.shiftKey) { 
            e.preventDefault();
            seek(Math.min(progress + 10, duration || progress + 10)); 
          }
          else { e.preventDefault(); next(); }
          break;
        case "ArrowLeft":
          if (e.shiftKey) { 
            e.preventDefault();
            seek(Math.max(progress - 10, 0)); 
          }
          else { e.preventDefault(); prev(); }
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.05));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.05));
          break;
        case "m": case "M":
          setVolume(volume === 0 ? 0.7 : 0);
          break;
        case "s": case "S":
          toggleShuffle();
          break;
        case "r": case "R":
          toggleRepeat();
          break;
        case "l": case "L":
          callbacks?.onLike?.();
          break;
        case "n": case "N":
          callbacks?.onLyrics?.();
          break;
        case "/":
          e.preventDefault();
          document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Search"]')?.focus();
          break;
        case "?":
          callbacks?.onShowShortcuts?.();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlay, next, prev, setVolume, volume, toggleShuffle, toggleRepeat, seek, progress, duration, callbacks]);
};

