import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Track } from '../data/playlist';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const DOWNLOADS_KEY = 'sonic_downloads';

export interface DownloadedTrack {
  track: Track;
  localUri: string;
  downloadedAt: number;
}

export const useDownloads = () => {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState<DownloadedTrack[]>([]);
  const [downloading, setDownloading] = useState<Record<string, number>>({});

  useEffect(() => {
    loadDownloads();
  }, [user]);

  const loadDownloads = async () => {
    try {
      if (user) {
        // Load from Supabase for logged-in users
        const { data, error } = await supabase
          .from('downloads')
          .select('*')
          .eq('user_id', user.id);
        
        if (!error && data) {
          const mapped = data.map(d => ({
            track: d.track_data,
            localUri: d.local_uri,
            downloadedAt: new Date(d.downloaded_at).getTime(),
          }));
          setDownloads(mapped);
          await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(mapped));
          return;
        }
      }
      
      // Fallback to local storage
      const stored = await AsyncStorage.getItem(DOWNLOADS_KEY);
      if (stored) {
        setDownloads(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load downloads:', e);
    }
  };

  const saveDownloads = async (newDownloads: DownloadedTrack[]) => {
    try {
      await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(newDownloads));
      setDownloads(newDownloads);
      
      // Sync to Supabase if user is logged in
      if (user) {
        const toSync = newDownloads.map(d => ({
          user_id: user.id,
          track_id: String(d.track.id),
          track_data: d.track,
          local_uri: d.localUri,
          downloaded_at: new Date(d.downloadedAt).toISOString(),
        }));
        
        // Delete old downloads and insert new ones
        await supabase.from('downloads').delete().eq('user_id', user.id);
        if (toSync.length > 0) {
          await supabase.from('downloads').insert(toSync);
        }
      }
    } catch (e) {
      console.error('Failed to save downloads:', e);
    }
  };

  const isDownloaded = useCallback((trackId: string) => {
    return downloads.some(d => String(d.track.id) === String(trackId));
  }, [downloads]);

  const getDownloadedTrack = useCallback((trackId: string) => {
    return downloads.find(d => String(d.track.id) === String(trackId));
  }, [downloads]);

  const downloadTrack = async (track: Track) => {
    if (!track.src || isDownloaded(String(track.id))) return;

    const trackId = String(track.id);
    setDownloading(prev => ({ ...prev, [trackId]: 0 }));

    try {
      const downloadDir = FileSystem.Paths.cache;
      const fileName = `${trackId}_${track.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
      const file = new FileSystem.File(downloadDir, fileName);
      const localUri = file.uri;

      // Use the new File.downloadFileAsync API (no progress callback available)
      setDownloading(prev => ({ ...prev, [trackId]: 50 }));
      await FileSystem.File.downloadFileAsync(track.src, file, { idempotent: true });
      setDownloading(prev => ({ ...prev, [trackId]: 100 }));

      const newDownloads = [...downloads, { track, localUri, downloadedAt: Date.now() }];
      await saveDownloads(newDownloads);
    } catch (e) {
      console.error('Failed to download track:', e);
    } finally {
      setDownloading(prev => { const n = { ...prev }; delete n[trackId]; return n; });
    }
  };

  const deleteTrack = async (trackId: string) => {
    const downloaded = getDownloadedTrack(trackId);
    if (!downloaded) return;

    try {
      await FileSystem.deleteAsync(downloaded.localUri);
    } catch (e) {
      console.error('Failed to delete file:', e);
    }

    const newDownloads = downloads.filter(d => String(d.track.id) !== String(trackId));
    await saveDownloads(newDownloads);
  };

  const deleteAll = async () => {
    try {
      for (const d of downloads) {
        await FileSystem.deleteAsync(d.localUri);
      }
    } catch (e) {
      console.error('Failed to delete files:', e);
    }

    await saveDownloads([]);
  };

  const getDownloadProgress = useCallback((trackId: string) => {
    return downloading[String(trackId)] || 0;
  }, [downloading]);

  const isDownloading = useCallback((trackId: string) => {
    return String(trackId) in downloading;
  }, [downloading]);

  return {
    downloads,
    downloading,
    isDownloaded,
    getDownloadedTrack,
    downloadTrack,
    deleteTrack,
    deleteAll,
    getDownloadProgress,
    isDownloading,
  };
};
