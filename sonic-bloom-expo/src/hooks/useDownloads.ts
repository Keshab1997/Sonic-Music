import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Track } from '../data/playlist';

const DOWNLOADS_KEY = 'sonic_downloads';

export interface DownloadedTrack {
  track: Track;
  localUri: string;
  downloadedAt: number;
}

export const useDownloads = () => {
  const [downloads, setDownloads] = useState<DownloadedTrack[]>([]);
  const [downloading, setDownloading] = useState<Record<string, number>>({});

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
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
