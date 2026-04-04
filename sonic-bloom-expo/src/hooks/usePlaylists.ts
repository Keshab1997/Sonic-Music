
import { useState, useCallback, useEffect } from "react";
import { Track, Playlist } from "@/data/playlist";
import { supabase } from "@/lib/supabase";

const PLAYLISTS_KEY = "sonic_playlists";

export const usePlaylists = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PLAYLISTS_KEY);
      if (stored) setPlaylists(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Sync playlist to Supabase in background
  const syncPlaylistToSupabase = useCallback(async (playlist: Playlist, action: 'create' | 'delete' | 'rename' | 'add_track' | 'remove_track', track?: Track) => {
    try {
      if (action === 'create') {
        await supabase.from('playlists').upsert({
          id: playlist.id,
          name: playlist.name,
          tracks_count: 0
        });
      } else if (action === 'delete') {
        await supabase.from('playlists').delete().eq('id', playlist.id);
      } else if (action === 'rename') {
        await supabase.from('playlists').update({ name: playlist.name }).eq('id', playlist.id);
      } else if (action === 'add_track' && track) {
        // Ensure track exists
        const trackId = String(track.id);
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
            audio_url: track.src
          });
        }
        // Add to playlist_tracks
        const { data: existing } = await supabase.from('playlist_tracks').select('id').eq('playlist_id', playlist.id).eq('track_id', trackId).single();
        if (!existing) {
          const { data: count } = await supabase.from('playlist_tracks').select('id', { count: 'exact' }).eq('playlist_id', playlist.id);
          await supabase.from('playlist_tracks').insert({
            playlist_id: playlist.id,
            track_id: trackId,
            position: count?.length ?? 0
          });
        }
      } else if (action === 'remove_track' && track) {
        await supabase.from('playlist_tracks').delete().eq('playlist_id', playlist.id).eq('track_id', String(track.id));
      }
    } catch (err) {
      console.error('Failed to sync playlist to Supabase:', err);
    }
  }, []);

  const createPlaylist = useCallback((name: string) => {
    const newPlaylist: Playlist = {
      id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      tracks: [],
      createdAt: Date.now(),
    };
    // Instant UI update
    setPlaylists((prev) => {
      const updated = [...prev, newPlaylist];
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
    // Background sync
    syncPlaylistToSupabase(newPlaylist, 'create');
    return newPlaylist;
  }, [syncPlaylistToSupabase]);

  const deletePlaylist = useCallback((id: string) => {
    // Instant UI update
    setPlaylists((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
    // Background sync
    syncPlaylistToSupabase({ id, name: '', tracks: [], createdAt: 0 }, 'delete');
  }, [syncPlaylistToSupabase]);

  const renamePlaylist = useCallback((id: string, name: string) => {
    // Instant UI update
    setPlaylists((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, name } : p));
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
    // Background sync
    const playlist = playlists.find(p => p.id === id);
    if (playlist) {
      syncPlaylistToSupabase({ ...playlist, name }, 'rename');
    }
  }, [playlists, syncPlaylistToSupabase]);

  const addToPlaylist = useCallback((playlistId: string, track: Track) => {
    // Instant UI update
    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== playlistId) return p;
        if (p.tracks.some((t) => t.src === track.src)) return p;
        return { ...p, tracks: [...p.tracks, track] };
      });
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
    // Background sync
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      syncPlaylistToSupabase(playlist, 'add_track', track);
    }
  }, [playlists, syncPlaylistToSupabase]);

  const removeFromPlaylist = useCallback((playlistId: string, trackSrc: string) => {
    // Instant UI update
    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== playlistId) return p;
        return { ...p, tracks: p.tracks.filter((t) => t.src !== trackSrc) };
      });
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
    // Background sync
    const playlist = playlists.find(p => p.id === playlistId);
    const track = playlist?.tracks.find(t => t.src === trackSrc);
    if (playlist && track) {
      syncPlaylistToSupabase(playlist, 'remove_track', track);
    }
  }, [playlists, syncPlaylistToSupabase]);

  return {
    playlists,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addToPlaylist,
    removeFromPlaylist,
  };
};

