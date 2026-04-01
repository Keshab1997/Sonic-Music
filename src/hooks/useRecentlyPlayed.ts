
import { useState, useCallback, useEffect } from "react";
import { Track } from "@/data/playlist";

const HISTORY_KEY = "sonic_play_history";
const MAX_HISTORY = 30;

export interface HistoryEntry {
  track: Track;
  playedAt: number;
}

export const useRecentlyPlayed = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const addToHistory = useCallback((track: Track) => {
    setHistory((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter((h) => h.track.src !== track.src);
      const updated = [{ track, playedAt: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  return { history, addToHistory, clearHistory };
};

