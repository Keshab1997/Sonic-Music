
import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
    AsyncStorage.getItem(HISTORY_KEY).then(stored => {
      if (stored) setHistory(JSON.parse(stored));
    }).catch(() => {});
  }, []);

  const addToHistory = useCallback((track: Track) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.track.src !== track.src);
      const updated = [{ track, playedAt: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    AsyncStorage.removeItem(HISTORY_KEY).catch(() => {});
  }, []);

  return { history, addToHistory, clearHistory };
};

