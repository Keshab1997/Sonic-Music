import { useState, useCallback, useEffect } from "react";
import { Track, Playlist } from "@/data/playlist";

const PLAYLISTS_KEY = "sonic_playlists";

export const usePlaylists = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PLAYLISTS_KEY);
      if (stored) setPlaylists(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const createPlaylist = useCallback((name: string) => {
    const newPlaylist: Playlist = {
      id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      tracks: [],
      createdAt: Date.now(),
    };
    setPlaylists((prev) => {
      const updated = [...prev, newPlaylist];
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
    return newPlaylist;
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    setPlaylists((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, name } : p));
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addToPlaylist = useCallback((playlistId: string, track: Track) => {
    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== playlistId) return p;
        if (p.tracks.some((t) => t.src === track.src)) return p;
        return { ...p, tracks: [...p.tracks, track] };
      });
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFromPlaylist = useCallback((playlistId: string, trackSrc: string) => {
    setPlaylists((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== playlistId) return p;
        return { ...p, tracks: p.tracks.filter((t) => t.src !== trackSrc) };
      });
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    playlists,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addToPlaylist,
    removeFromPlaylist,
  };
};
