
import { useState, useCallback, useEffect, useRef } from "react";
import { Track } from "@/data/playlist";
import { supabase } from "@/lib/supabase";

const HISTORY_KEY = "sonic_search_history";
const FAVORITES_KEY = "sonic_favorites";

export const useLocalData = () => {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const pendingSyncRef = useRef<Set<string>>(new Set());

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
    setLoading(false);
  }, []);

  // Sync favorites to Supabase in background
  const syncFavoriteToSupabase = useCallback(async (track: Track, action: 'add' | 'remove') => {
    try {
      const trackId = String(track.id);
      
      if (action === 'add') {
        // First ensure track exists in Supabase
        const { data: existingTrack } = await supabase
          .from('tracks')
          .select('id')
          .eq('id', trackId)
          .single();

        if (!existingTrack) {
          await supabase.from('tracks').upsert({
            id: trackId,
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
            youtube_id: track.songId,
            cover_url: track.cover,
            audio_url: track.src
          });
        }

        // Add to liked_songs
        await supabase.from('liked_songs').upsert({
          track_id: trackId,
          user_id: null
        });
      } else {
        await supabase.from('liked_songs').delete().eq('track_id', trackId);
      }
    } catch (err) {
      console.error('Failed to sync favorite to Supabase:', err);
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
    // Instant UI update - optimistic update
    setFavorites((prev) => {
      if (prev.some((t) => t.src === track.src)) return prev;
      const updated = [track, ...prev];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
    
    // Background sync to Supabase
    syncFavoriteToSupabase(track, 'add');
  }, [syncFavoriteToSupabase]);

  const removeFavorite = useCallback((trackSrc: string) => {
    // Instant UI update - optimistic update
    setFavorites((prev) => {
      const updated = prev.filter((t) => t.src !== trackSrc);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
    
    // Background sync to Supabase
    const track = favorites.find(t => t.src === trackSrc);
    if (track) {
      syncFavoriteToSupabase(track, 'remove');
    }
  }, [favorites, syncFavoriteToSupabase]);

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
    loading,
    addToHistory,
    clearHistory,
    removeHistoryItem,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
  };
};

