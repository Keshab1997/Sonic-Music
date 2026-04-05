import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const ALBUMS_KEY_PREFIX = 'sonic_saved_albums_';

export interface SavedAlbum {
  id: string;
  albumId: string;
  name: string;
  cover?: string;
  artist: string;
  year?: number;
  savedAt: number;
}

export const useSavedAlbums = () => {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<SavedAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const prevUserIdRef = useRef<string | null>(null);

  const getStorageKey = useCallback(() => {
    return user ? `${ALBUMS_KEY_PREFIX}${user.id}` : null;
  }, [user]);

  useEffect(() => {
    if (prevUserIdRef.current && prevUserIdRef.current !== user?.id) {
      setAlbums([]);
    }
    prevUserIdRef.current = user?.id || null;
    loadAlbums();
  }, [user]);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      if (user) {
        const { data, error } = await supabase
          .from('saved_albums')
          .select('*')
          .order('saved_at', { ascending: false });
        
        if (!error && data) {
          const mapped: SavedAlbum[] = data.map(a => ({
            id: a.id,
            albumId: a.album_id,
            name: a.album_name,
            cover: a.album_cover,
            artist: a.album_artist,
            year: a.album_year,
            savedAt: new Date(a.saved_at).getTime(),
          }));
          setAlbums(mapped);
          const key = getStorageKey();
          if (key) await AsyncStorage.setItem(key, JSON.stringify(mapped));
          return;
        }
      } else {
        setAlbums([]);
      }
    } catch (e) {
      console.error('Failed to load saved albums:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveAlbum = async (albumId: string, name: string, artist: string, cover?: string, year?: number) => {
    if (!user) return;
    try {
      await supabase.from('saved_albums').insert({
        user_id: user.id,
        album_id: albumId,
        album_name: name,
        album_artist: artist,
        album_cover: cover,
        album_year: year,
      });
      const newAlbum: SavedAlbum = { id: Date.now().toString(), albumId, name, cover, artist, year, savedAt: Date.now() };
      const updated = [newAlbum, ...albums];
      setAlbums(updated);
      const key = getStorageKey();
      if (key) await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save album:', e);
    }
  };

  const unsaveAlbum = async (albumId: string) => {
    try {
      await supabase.from('saved_albums').delete().eq('album_id', albumId);
      const updated = albums.filter(a => a.albumId !== albumId);
      setAlbums(updated);
      const key = getStorageKey();
      if (key) await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to unsave album:', e);
    }
  };

  const isSaved = useCallback((albumId: string) => {
    return albums.some(a => a.albumId === albumId);
  }, [albums]);

  return { albums, loading, saveAlbum, unsaveAlbum, isSaved };
};
