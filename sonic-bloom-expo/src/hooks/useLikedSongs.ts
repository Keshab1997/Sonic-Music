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

  useEffect(() => {
    // Clear data when user changes
    if (prevUserIdRef.current && prevUserIdRef.current !== user?.id) {
      setLikedSongs([]);
    }
    prevUserIdRef.current = user?.id || null;
    loadLikedSongs();
  }, [user]);

  const loadLikedSongs = async () => {
    try {
      setLoading(true);
      if (user) {
        // Load from Supabase for logged-in users (user-specific via RLS)
        const { data, error } = await supabase
          .from('liked_songs')
          .select('*')
          .eq('user_id', user.id)
          .order('liked_at', { ascending: false });
        
        if (!error && data) {
          const mapped = data.map(d => ({
            track: d.track_data,
            likedAt: new Date(d.liked_at).getTime(),
          }));
          setLikedSongs(mapped);
          // Cache to user-specific AsyncStorage
          const key = getStorageKey();
          if (key) {
            await AsyncStorage.setItem(key, JSON.stringify(mapped));
          }
          return;
        }
      } else {
        // No user logged in, load from local storage
        const key = getStorageKey();
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          setLikedSongs(JSON.parse(stored));
          return;
        }
        setLikedSongs([]);
      }
    } catch (e) {
      console.error('Failed to load liked songs:', e);
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
            track_data: d.track,
            liked_at: new Date(d.likedAt).toISOString(),
          }));
        
        // Delete old liked songs for this user and insert new ones
        await supabase.from('liked_songs').delete().eq('user_id', user.id);
        if (toSync.length > 0) {
          await supabase.from('liked_songs').insert(toSync);
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
