import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Track } from '../data/playlist';

const LIKED_SONGS_KEY_PREFIX = 'sonic_liked_songs_';
const LIKED_SONGS_KEY_GUEST = 'sonic_liked_songs_guest';

export interface LikedSong {
  track: Track;
  likedAt: number;
}

export const useLikedSongs = () => {
  const { user } = useAuth();
  const [likedSongs, setLikedSongs] = useState<LikedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const prevUserIdRef = useRef<string | null>(null);

  // Get user-specific storage key
  const getStorageKey = useCallback(() => {
    return user ? `${LIKED_SONGS_KEY_PREFIX}${user.id}` : LIKED_SONGS_KEY_GUEST;
  }, [user]);

  const migrateGuestData = async (userId: string) => {
    try {
      const guestData = await AsyncStorage.getItem(LIKED_SONGS_KEY_GUEST);
      console.log('[useLikedSongs] migrateGuestData called, guestData exists:', !!guestData);
      
      if (guestData) {
        const guestSongs = JSON.parse(guestData) as LikedSong[];
        console.log('[useLikedSongs] Guest songs count:', guestSongs.length);
        
        if (guestSongs.length > 0) {
          console.log('[useLikedSongs] Migrating guest liked songs to user account:', guestSongs.length);
          const toSync = guestSongs
            .filter(d => d.track && d.track.id)
            .map(d => ({
              user_id: userId,
              track_id: String(d.track.id),
            }));
          
          console.log('[useLikedSongs] Syncing to Supabase, count:', toSync.length);
          
          // Delete any existing for user and insert guest songs
          const { error: deleteError } = await supabase.from('liked_songs').delete().eq('user_id', userId);
          console.log('[useLikedSongs] Delete result:', deleteError);
          
          if (toSync.length > 0) {
            const { data, error } = await supabase.from('liked_songs').insert(toSync);
            console.log('[useLikedSongs] Insert result:', { data, error });
            
            if (error) {
              console.error('[useLikedSongs] Migration error:', error);
            } else {
              console.log('[useLikedSongs] Migration successful');
              // Clear guest data after successful migration
              await AsyncStorage.removeItem(LIKED_SONGS_KEY_GUEST);
            }
          }
        }
      }
    } catch (e) {
      console.error('[useLikedSongs] Migration failed:', e);
    }
  };

  useEffect(() => {
    const isFirstLogin = prevUserIdRef.current === null && user !== null;
    const isLogout = prevUserIdRef.current !== null && user === null;
    
    // Clear data when user changes (logout or switch users)
    if (prevUserIdRef.current && prevUserIdRef.current !== user?.id) {
      setLikedSongs([]);
    }
    
    prevUserIdRef.current = user?.id || null;
    loadLikedSongs();
    
    // Migrate guest data on first login (guest -> logged in)
    if (isFirstLogin) {
      console.log('[useLikedSongs] First login detected, running migration');
      migrateGuestData(user.id);
    }
  }, [user]);

  const loadLikedSongs = async () => {
    try {
      setLoading(true);
      if (user) {
        console.log('[useLikedSongs] Loading from Supabase for user:', user.id);
        // Load from Supabase for logged-in users (user-specific via RLS)
        const { data, error } = await supabase
          .from('liked_songs')
          .select('track_id')
          .eq('user_id', user.id);
        
        console.log('[useLikedSongs] Supabase response:', { data, error });
        
        if (!error && data && data.length > 0) {
          // Supabase only has track_id, need to use local storage for full data
          // For now, just log that we found synced data
          console.log('[useLikedSongs] Found', data.length, 'liked songs in Supabase (using local for full data)');
          // Continue to load from local storage which has full track data
        } else if (error) {
          console.error('[useLikedSongs] Supabase error:', error);
        }
        // Always load from local storage for full track data
      }
      
      // Load from local storage (guest or as fallback)
      const key = getStorageKey();
      console.log('[useLikedSongs] Loading from AsyncStorage, key:', key);
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[useLikedSongs] Loaded from local:', parsed.length, 'songs');
        setLikedSongs(parsed);
      } else {
        console.log('[useLikedSongs] No local data found');
        setLikedSongs([]);
      }
    } catch (e) {
      console.error('[useLikedSongs] Failed to load liked songs:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveLikedSongs = async (newLikedSongs: LikedSong[]) => {
    try {
      setLikedSongs(newLikedSongs);
      
      // Save to user-specific AsyncStorage
      const key = getStorageKey();
      if (key) {
        await AsyncStorage.setItem(key, JSON.stringify(newLikedSongs));
      }
      
      // Sync to Supabase if user is logged in (RLS ensures user-specific)
      if (user) {
        const toSync = newLikedSongs
          .filter(d => d.track && d.track.id)
          .map(d => ({
            user_id: user.id,
            track_id: String(d.track.id),
          }));
        
        console.log('[useLikedSongs] Syncing to Supabase, count:', toSync.length);
        
        // Delete old liked songs for this user and insert new ones
        const { error: deleteError } = await supabase.from('liked_songs').delete().eq('user_id', user.id);
        console.log('[useLikedSongs] Delete result:', deleteError);
        
        if (toSync.length > 0) {
          const { data, error } = await supabase.from('liked_songs').insert(toSync);
          console.log('[useLikedSongs] Insert result:', { data, error });
        }
      }
    } catch (e) {
      console.error('Failed to save liked songs:', e);
    }
  };

  const isLiked = useCallback((trackId: string) => {
    if (!trackId) return false;
    return likedSongs.some(s => s.track && s.track.id && String(s.track.id) === String(trackId));
  }, [likedSongs]);

  const toggleLike = async (track: Track) => {
    if (!track || !track.id) {
      console.warn('toggleLike called with invalid track:', track);
      return;
    }
    
    const trackId = String(track.id);
    
    if (isLiked(trackId)) {
      // Unlike
      const newLikedSongs = likedSongs.filter(s => s.track && s.track.id && String(s.track.id) !== trackId);
      await saveLikedSongs(newLikedSongs);
    } else {
      // Like
      const newLikedSongs = [{ track, likedAt: Date.now() }, ...likedSongs];
      await saveLikedSongs(newLikedSongs);
    }
  };

  const clearAll = async () => {
    try {
      if (user) {
        await supabase.from('liked_songs').delete().eq('user_id', user.id);
      }
      const key = getStorageKey();
      if (key) {
        await AsyncStorage.removeItem(key);
      }
      setLikedSongs([]);
    } catch (e) {
      console.error('Failed to clear liked songs:', e);
    }
  };

  return {
    likedSongs,
    loading,
    isLiked,
    toggleLike,
    clearAll,
  };
};
