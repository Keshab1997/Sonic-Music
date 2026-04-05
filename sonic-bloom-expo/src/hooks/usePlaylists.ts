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
    console.log('[usePlaylists] loadPlaylists called, user:', user?.id);
    try {
      setLoading(true);
      if (user) {
        // First get all playlists
        const { data: playlistsData, error: playlistsError } = await supabase
          .from('playlists')
          .select('*')
          .order('created_at', { ascending: false });
        
        console.log('[usePlaylists] Playlists result:', { count: playlistsData?.length, error: playlistsError });
        
        if (playlistsError) {
          console.error('[usePlaylists] Playlists error:', playlistsError);
        }
        
        if (playlistsData && playlistsData.length > 0) {
        // Then get all playlist_tracks for these playlists
        const playlistIds = playlistsData.map(p => p.id);
        console.log('[usePlaylists] Playlist IDs:', playlistIds);
        
        const { data: tracksData, error: tracksError } = await supabase
          .from('playlist_tracks')
          .select('*')
          .in('playlist_id', playlistIds)
          .order('position', { ascending: true });
        
        console.log('[usePlaylists] Tracks query result:', { count: tracksData?.length, error: tracksError, playlistIds });
        
        // Group tracks by playlist
        const tracksByPlaylist: Record<string, any[]> = {};
        if (tracksData && tracksData.length > 0) {
          for (const track of tracksData) {
            if (!tracksByPlaylist[track.playlist_id]) {
              tracksByPlaylist[track.playlist_id] = [];
            }
            tracksByPlaylist[track.playlist_id].push(track.track_data);
          }
          console.log('[usePlaylists] Tracks by playlist:', Object.keys(tracksByPlaylist).map(k => ({ playlist_id: k, count: tracksByPlaylist[k].length })));
        } else {
          console.log('[usePlaylists] No tracks found in database');
        }
          
          const mapped: Playlist[] = playlistsData.map(p => ({
            id: p.id,
            name: p.name,
            cover: p.cover_url,
            trackCount: tracksByPlaylist[p.id]?.length || 0,
            tracks: tracksByPlaylist[p.id] || [],
          }));
          
          console.log('[usePlaylists] Mapped playlists:', mapped.map(p => ({ id: p.id, name: p.name, trackCount: p.trackCount })));
          setPlaylists(mapped);
          const key = getStorageKey();
          if (key) await AsyncStorage.setItem(key, JSON.stringify(mapped));
          setLoading(false);
          return;
        }
        
        setPlaylists([]);
        setLoading(false);
        return;
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
    console.log('[usePlaylists] createPlaylist called:', name, 'user:', user?.id);
    if (!user || !name.trim()) {
      console.log('[usePlaylists] No user or empty name');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({ user_id: user.id, name: name.trim() })
        .select()
        .single();
      
      console.log('[usePlaylists] Create result:', { data, error });
      
      if (!error && data) {
        const newPlaylist: Playlist = { id: data.id, name: data.name, trackCount: 0, tracks: [] };
        const updated = [newPlaylist, ...playlists];
        setPlaylists(updated);
        const key = getStorageKey();
        if (key) await AsyncStorage.setItem(key, JSON.stringify(updated));
        console.log('[usePlaylists] Playlist created:', newPlaylist.id);
        return newPlaylist;
      }
    } catch (e) {
      console.error('[usePlaylists] Failed to create playlist:', e);
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
    console.log('[usePlaylists] addTrackToPlaylist called:', { playlistId, trackId: track.id, trackTitle: track.title });
    try {
      const playlist = playlists.find(p => p.id === playlistId);
      if (!playlist) {
        console.log('[usePlaylists] Playlist not found:', playlistId);
        return;
      }
      
      const position = playlist.tracks.length;
      console.log('[usePlaylists] Inserting to Supabase, position:', position);
      
      const { data, error } = await supabase.from('playlist_tracks').insert({
        playlist_id: playlistId,
        track_id: String(track.id),
        track_data: track,
        position,
      });
      
      console.log('[usePlaylists] Insert result:', { data, error });
      
      if (error) {
        console.error('[usePlaylists] Supabase error:', error);
      }
      
      const updated = playlists.map(p => {
        if (p.id === playlistId) {
          return { ...p, tracks: [...p.tracks, track], trackCount: p.trackCount + 1 };
        }
        return p;
      });
      setPlaylists(updated);
      const key = getStorageKey();
      if (key) await AsyncStorage.setItem(key, JSON.stringify(updated));
      console.log('[usePlaylists] Track added successfully');
    } catch (e) {
      console.error('[usePlaylists] Failed to add track to playlist:', e);
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
