import { useState, useCallback, useEffect } from "react";
import { Track } from "@/data/playlist";

const HISTORY_KEY = "sonic_search_history";
const FAVORITES_KEY = "sonic_favorites";

export const useLocalData = () => {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const history = localStorage.getItem(HISTORY_KEY);
      if (history) setSearchHistory(JSON.parse(history));
      const favs = localStorage.getItem(FAVORITES_KEY);
      if (favs) setFavorites(JSON.parse(favs));
    } catch {
      // ignore
    }
  }, []);

  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((h) => h.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 10);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const removeHistoryItem = useCallback((query: string) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((h) => h !== query);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addFavorite = useCallback((track: Track) => {
    setFavorites((prev) => {
      if (prev.some((t) => t.src === track.src)) return prev;
      const updated = [track, ...prev];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFavorite = useCallback((trackSrc: string) => {
    setFavorites((prev) => {
      const updated = prev.filter((t) => t.src !== trackSrc);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isFavorite = useCallback(
    (trackSrc: string) => favorites.some((t) => t.src === trackSrc),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (track: Track) => {
      if (isFavorite(track.src)) {
        removeFavorite(track.src);
      } else {
        addFavorite(track);
      }
    },
    [isFavorite, removeFavorite, addFavorite]
  );

  return {
    searchHistory,
    favorites,
    addToHistory,
    clearHistory,
    removeHistoryItem,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
  };
};
