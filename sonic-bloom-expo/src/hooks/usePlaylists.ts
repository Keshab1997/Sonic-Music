import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Track } from '../data/playlist';

const PLAYLISTS_KEY_PREFIX = 'sonic_playlists_';

export interface Playlist {
  id: string;
  name: string;
  cover?: string;
  trackCount: number;
  tracks: Track[];
}

export const usePlaylists = () => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const prevUserIdRef = useRef<string | null>(null);

  const getStorageKey = useCallback(() => {
    return user ? `${PLAYLISTS_KEY_PREFIX}${user.id}` : null;
  }, [user]);

  useEffect(() => {
    if (prevUserIdRef.current && prevUserIdRef.current !== user?.id) {
      setPlaylists([]);
    }
    prevUserIdRef.current = user?.id || null;
    loadPlaylists();
  }, [user]);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      if (user) {
        const { data, error } = await supabase
          .from('playlists')
          .select('*, playlist_tracks(*)')
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          const mapped: Playlist[] = data.map(p => ({
            id: p.id,
            name: p.name,
            cover: p.cover_url,
            trackCount: p.playlist_tracks?.length || 0,
            tracks: (p.playlist_tracks || []).sort((a: any, b: any) => a.position - b.position).map((t: any) => t.track_data),
          }));
          setPlaylists(mapped);
          const key = getStorageKey();
          if (key) await AsyncStorage.setItem(key, JSON.stringify(mapped));
          return;
        }
      } else {
        setPlaylists([]);
      }
    } catch (e) {
      console.error('Failed to load playlists:', e);
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async (name: string): Promise<Playlist | null> => {
    if (!user || !name.trim()) return null;
    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({ user_id: user.id, name: name.trim() })
        .select()
        .single();
      
      if (!error && data) {
        const newPlaylist: Playlist = { id: data.id, name: data.name, trackCount: 0, tracks: [] };
        const updated = [newPlaylist, ...playlists];
        setPlaylists(updated);
        const key = getStorageKey();
        if (key) await AsyncStorage.setItem(key, JSON.stringify(updated));
        return newPlaylist;
      }
    } catch (e) {
      console.error('Failed to create playlist:', e);
    }
    return null;
  };

  const deletePlaylist = async (id: string) => {
    try {
      await supabase.from('playlists').delete().eq('id', id);
      const updated = playlists.filter(p => p.id !== id);
      setPlaylists(updated);
      const key = getStorageKey();
      if (key) await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete playlist:', e);
    }
  };

  const addTrackToPlaylist = async (playlistId: string, track: Track) => {
    try {
      const playlist = playlists.find(p => p.id === playlistId);
      if (!playlist) return;
      
      const position = playlist.tracks.length;
      await supabase.from('playlist_tracks').insert({
        playlist_id: playlistId,
        track_id: String(track.id),
        track_data: track,
        position,
      });
      
      const updated = playlists.map(p => {
        if (p.id === playlistId) {
          return { ...p, tracks: [...p.tracks, track], trackCount: p.trackCount + 1 };
        }
        return p;
      });
      setPlaylists(updated);
      const key = getStorageKey();
      if (key) await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to add track to playlist:', e);
    }
  };

  const removeTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    try {
      await supabase.from('playlist_tracks').delete().eq('playlist_id', playlistId).eq('track_id', String(trackId));
      const updated = playlists.map(p => {
        if (p.id === playlistId) {
          const tracks = p.tracks.filter((t: Track) => String(t.id) !== String(trackId));
          return { ...p, tracks, trackCount: tracks.length };
        }
        return p;
      });
      setPlaylists(updated);
      const key = getStorageKey();
      if (key) await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to remove track from playlist:', e);
    }
  };

  return { playlists, loading, createPlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist };
};
