
import { useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from "../data/playlist";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const HISTORY_KEY = "sonic_search_history";
const FAVORITES_KEY = "sonic_favorites";
const FAVORITES_KEY_PREFIX = "sonic_favorites_user_";

export const useLocalData = () => {
  const { user } = useAuth();
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const pendingSyncRef = useRef<Set<string>>(new Set());
  const prevUserIdRef = useRef<string | null>(null);

  // Get user-specific storage key for favorites
  const getFavoritesKey = useCallback(() => {
    if (user) {
      return `${FAVORITES_KEY_PREFIX}${user.id}`;
    }
    return FAVORITES_KEY;
  }, [user]);

  // Load from AsyncStorage on mount and when user changes
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load search history (shared)
        const history = await AsyncStorage.getItem(HISTORY_KEY);
        if (history) setSearchHistory(JSON.parse(history));

        // Load favorites (user-specific)
        const favs = await AsyncStorage.getItem(getFavoritesKey());
        if (favs) {
          setFavorites(JSON.parse(favs));
        } else if (!user) {
          // Try legacy key for non-logged in users
          const legacyFavs = await AsyncStorage.getItem(FAVORITES_KEY);
          if (legacyFavs) setFavorites(JSON.parse(legacyFavs));
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };

    // Clear favorites when user changes to different user
    if (prevUserIdRef.current && prevUserIdRef.current !== user?.id) {
      setFavorites([]);
    }
    prevUserIdRef.current = user?.id || null;

    loadData();
  }, [user, getFavoritesKey]);

  // Sync favorites to Supabase in background
  const syncFavoriteToSupabase = useCallback(async (track: Track, action: 'add' | 'remove') => {
    if (!user) return; // Only sync for logged in users
    
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
            cover_url: track.cover,
            audio_url: track.src
          });
        }

        // Add to liked_songs with user_id
        await supabase.from('liked_songs').upsert({
          track_id: trackId,
          user_id: user.id
        });
      } else {
        await supabase.from('liked_songs').delete().eq('track_id', trackId).eq('user_id', user.id);
      }
    } catch (err) {
      console.error('Failed to sync favorite to Supabase:', err);
    }
  }, [user]);

  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((h) => h.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 10);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    AsyncStorage.removeItem(HISTORY_KEY);
  }, []);

  const removeHistoryItem = useCallback((query: string) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((h) => h !== query);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addFavorite = useCallback((track: Track) => {
    // Instant UI update - optimistic update
    setFavorites((prev) => {
      if (prev.some((t) => t.src === track.src)) return prev;
      const updated = [track, ...prev];
      AsyncStorage.setItem(getFavoritesKey(), JSON.stringify(updated));
      return updated;
    });
    
    // Background sync to Supabase for logged in users
    if (user) {
      syncFavoriteToSupabase(track, 'add');
    }
  }, [getFavoritesKey, user, syncFavoriteToSupabase]);

  const removeFavorite = useCallback((trackSrc: string) => {
    // Instant UI update - optimistic update
    setFavorites((prev) => {
      const updated = prev.filter((t) => t.src !== trackSrc);
      AsyncStorage.setItem(getFavoritesKey(), JSON.stringify(updated));
      return updated;
    });
    
    // Background sync to Supabase for logged in users
    if (user) {
      const track = favorites.find(t => t.src === trackSrc);
      if (track) {
        syncFavoriteToSupabase(track, 'remove');
      }
    }
  }, [favorites, getFavoritesKey, user, syncFavoriteToSupabase]);

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

