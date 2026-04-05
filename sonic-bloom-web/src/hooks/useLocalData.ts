
import { useState, useCallback, useEffect } from "react";
import { Track } from "@/data/playlist";
import { supabase } from "@/lib/supabase";

const HISTORY_KEY = "sonic_search_history";
const FAVORITES_KEY = "sonic_favorites";

const getUserId = async () => {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

export const useLocalData = () => {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount, then sync from Supabase if logged in
  useEffect(() => {
    const load = async () => {
      try {
        const history = localStorage.getItem(HISTORY_KEY);
        if (history) setSearchHistory(JSON.parse(history));
        const favs = localStorage.getItem(FAVORITES_KEY);
        if (favs) setFavorites(JSON.parse(favs));
      } catch { /* ignore */ }

      // Pull data from Supabase for logged-in user
      if (supabase) {
        const userId = await getUserId();
        if (userId) {
          // Pull search history from Supabase
          try {
            const { data: historyData } = await supabase
              .from('search_history')
              .select('query')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(10);
            if (historyData && historyData.length > 0) {
              const remoteHistory = historyData.map((h: any) => h.query).filter(Boolean);
              setSearchHistory((prev) => {
                const merged = [...new Set([...remoteHistory, ...prev])].slice(0, 10);
                localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
                return merged;
              });
            }
          } catch { /* silent — use local fallback */ }

          // Pull liked songs from Supabase
          try {
            const { data } = await supabase
              .from('liked_songs')
              .select('track_id, tracks(id, title, artist, album, duration, youtube_id, cover_url, audio_url)')
              .eq('user_id', userId)
              .order('added_at', { ascending: false });

            if (data && data.length > 0) {
              const remoteFavs: Track[] = data
                .map((row: any) => {
                  const t = row.tracks;
                  if (!t) return null;
                  return {
                    id: Number(t.id) || 0,
                    title: t.title,
                    artist: t.artist,
                    album: t.album ?? '',
                    cover: t.cover_url ?? '',
                    src: t.audio_url ?? '',
                    duration: t.duration ?? 0,
                    type: 'youtube' as const,
                    songId: t.youtube_id ?? undefined,
                  };
                })
                .filter(Boolean) as Track[];
              setFavorites(remoteFavs);
              localStorage.setItem(FAVORITES_KEY, JSON.stringify(remoteFavs));
            }
          } catch { /* silent — use local fallback */ }
        }
      }

      setLoading(false);
    };
    load();
  }, []);

  // Sync favorites to Supabase in background
  const syncFavoriteToSupabase = useCallback(async (track: Track, action: 'add' | 'remove') => {
    if (!supabase) return
    try {
      const userId = await getUserId();
      if (!userId) return; // not logged in, skip cloud sync
      const trackId = String(track.id);

      if (action === 'add') {
        // Ensure track exists
        const { data: existingTrack } = await supabase.from('tracks').select('id').eq('id', trackId).single();
        if (!existingTrack) {
          await supabase.from('tracks').upsert({
            id: trackId,
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
            youtube_id: track.songId,
            cover_url: track.cover,
            audio_url: track.src,
          });
        }
        await supabase.from('liked_songs').upsert({ track_id: trackId, user_id: userId });
      } else {
        await supabase.from('liked_songs').delete().eq('track_id', trackId).eq('user_id', userId);
      }
    } catch (err) {
      console.error('Failed to sync favorite to Supabase:', err);
    }
  }, []);

  // Sync search history to Supabase in background
  const syncHistoryToSupabase = useCallback(async (query: string) => {
    if (!supabase) return
    try {
      const userId = await getUserId();
      if (!userId) return;
      await supabase.from('search_history').upsert({ 
        query, 
        user_id: userId,
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id,query' });
    } catch { /* silent */ }
  }, []);

  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((h) => h.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 10);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
    syncHistoryToSupabase(query);
  }, [syncHistoryToSupabase]);

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

