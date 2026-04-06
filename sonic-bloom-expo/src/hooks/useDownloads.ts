import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { Track } from '../data/playlist';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const DOWNLOADS_KEY_PREFIX = 'sonic_downloads_';
const DOWNLOADS_TABLE_EXISTS_KEY = 'downloads_table_checked';
const STORAGE_LOCATION_KEY = 'sonic_storage_location';

export type StorageLocation = 'internal' | 'external';

export interface DownloadedTrack {
  track: Track;
  localUri: string;
  downloadedAt: number;
}

export const useDownloads = () => {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState<DownloadedTrack[]>([]);
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [storageLocation, setStorageLocation] = useState<StorageLocation>('internal');
  const prevUserIdRef = useRef<string | null>(null);
  const validDownloadsRef = useRef<DownloadedTrack[]>([]);

  // Get user-specific storage key
  const getStorageKey = useCallback(() => {
    return user ? `${DOWNLOADS_KEY_PREFIX}${user.id}` : null;
  }, [user]);

  // Get download directory based on storage location
  const getDownloadDirectory = useCallback(() => {
    if (Platform.OS === 'android' && storageLocation === 'external') {
      // For Android external storage (SD card)
      // Using Music directory which is accessible on most devices
      return `${FileSystem.Paths.document}../Music/SonicBloom/`;
    }
    // Default: Internal storage (document directory)
    return `${FileSystem.Paths.document}downloads/`;
  }, [storageLocation]);

  // Change storage location
  const changeStorageLocation = useCallback(async (location: StorageLocation) => {
    try {
      await AsyncStorage.setItem(STORAGE_LOCATION_KEY, location);
      setStorageLocation(location);
      console.log(`[useDownloads] Storage location changed to: ${location}`);
    } catch (e) {
      console.error('Failed to change storage location:', e);
    }
  }, []);

  useEffect(() => {
    // Load storage location preference
    const loadStorageLocation = async () => {
      try {
        const location = await AsyncStorage.getItem(STORAGE_LOCATION_KEY);
        if (location === 'external' || location === 'internal') {
          setStorageLocation(location);
        }
      } catch (e) {
        console.error('Failed to load storage location:', e);
      }
    };
    loadStorageLocation();

    // Clear data when user changes
    if (prevUserIdRef.current && prevUserIdRef.current !== user?.id) {
      setDownloads([]);
      setDownloading({});
    }
    prevUserIdRef.current = user?.id || null;
    loadDownloads();
  }, [user]);

  const loadDownloads = async () => {
    try {
      // First, determine which key to use
      let localKey = getStorageKey();
      
      // If no user, try guest key
      if (!localKey) {
        localKey = `${DOWNLOADS_KEY_PREFIX}guest`;
      }
      
      const localData = await AsyncStorage.getItem(localKey);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          
          // Don't validate files - just load them
          // File validation is expensive and causes issues
          setDownloads(parsed);
          validDownloadsRef.current = parsed;
        } catch (e) {
          console.error('[useDownloads] Failed to parse local data:', e);
        }
      } else {
        console.log('[useDownloads] No local data found');
      }
      
      // Then load from Supabase and merge with local (for logged-in users)
      if (user) {
        // Check if table exists first
        const tableChecked = await AsyncStorage.getItem(DOWNLOADS_TABLE_EXISTS_KEY);
        
        if (!tableChecked) {
          // Try to create table if it doesn't exist
          try {
            // This will fail if table doesn't exist, which is fine
            await supabase.from('downloads').select('id').limit(1);
            await AsyncStorage.setItem(DOWNLOADS_TABLE_EXISTS_KEY, 'true');
          } catch (e) {
            return; // Skip Supabase operations
          }
        }
        
        const { data, error } = await supabase
          .from('downloads')
          .select('*');
        
        if (!error && data && data.length > 0) {
          const supabaseDownloads = data.map((d: any) => ({
            track: d.track_data,
            localUri: d.local_uri,
            downloadedAt: new Date(d.downloaded_at).getTime(),
          }));
          
          // Get current downloads from local variable (not state)
          const currentDownloads = validDownloadsRef.current;
          // Merge: add supabase entries that don't exist locally
          const existingIds = new Set(currentDownloads.map(d => String(d.track.id)));
          const newFromSupabase = supabaseDownloads.filter((d: any) => !existingIds.has(String(d.track.id)));
          
          if (newFromSupabase.length > 0) {
            setDownloads(prev => [...prev, ...newFromSupabase]);
            // Update local cache with merged data
            const merged = [...currentDownloads, ...newFromSupabase];
            const key = getStorageKey();
            if (key) {
              await AsyncStorage.setItem(key, JSON.stringify(merged));
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to load downloads:', e);
    }
  };

  const saveDownloads = async (newDownloads: DownloadedTrack[]) => {
    try {
      setDownloads(newDownloads);
      
      // Save to user-specific AsyncStorage
      const key = getStorageKey();
      if (key) {
        await AsyncStorage.setItem(key, JSON.stringify(newDownloads));
      } else {
        await AsyncStorage.setItem(`${DOWNLOADS_KEY_PREFIX}guest`, JSON.stringify(newDownloads));
      }
      
      // Sync to Supabase if user is logged in (RLS ensures user-specific)
      if (user) {
        const toSync = newDownloads.map(d => ({
          user_id: user.id,
          track_id: String(d.track.id),
          track_data: d.track,
          local_uri: d.localUri,
          downloaded_at: new Date(d.downloadedAt).toISOString(),
        }));
        
        // Delete old downloads and insert new ones
        await supabase.from('downloads').delete();
        if (toSync.length > 0) {
          await supabase.from('downloads').insert(toSync);
        }
      }
    } catch (e) {
      console.error('Failed to save downloads:', e);
    }
  };

  const isDownloaded = useCallback((trackId: string) => {
    return downloads.some(d => {
      if (!d.track) return false;
      // Check both songId (JioSaavn ID) and track.id for compatibility
      const dSongId = d.track.songId || d.track.id;
      return String(dSongId) === String(trackId);
    });
  }, [downloads]);

  const getDownloadedTrack = useCallback((trackId: string) => {
    return downloads.find(d => {
      if (!d.track) return false;
      // Check both songId (JioSaavn ID) and track.id for compatibility
      const dSongId = d.track.songId || d.track.id;
      return String(dSongId) === String(trackId);
    });
  }, [downloads]);

  const downloadTrack = async (track: Track) => {
    // Use songId (JioSaavn ID) as the unique identifier, fallback to track.id
    const trackId = String(track.songId || track.id);
    
    if (!track?.src || !trackId || isDownloaded(trackId)) {
      return;
    }

    setDownloading(prev => ({ ...prev, [trackId]: 0 }));

    try {
      // Get download directory based on user preference
      const downloadDir = getDownloadDirectory();
      
      // Create downloads directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }
      
      const safeTitle = (track.title || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      const fileName = `${trackId}_${safeTitle}.mp3`;
      const localUri = `${downloadDir}${fileName}`;

      setDownloading(prev => ({ ...prev, [trackId]: 50 }));
      
      // Download file
      const downloadResumable = FileSystem.createDownloadResumable(
        track.src,
        localUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloading(prev => ({ ...prev, [trackId]: Math.round(progress * 100) }));
        }
      );
      
      await downloadResumable.downloadAsync();
      setDownloading(prev => ({ ...prev, [trackId]: 100 }));

      const newDownload = { track, localUri, downloadedAt: Date.now() };
      
      setDownloads(prev => {
        const newDownloads = [...prev, newDownload];
        saveDownloads(newDownloads);
        return newDownloads;
      });
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
      // Check if file exists before deleting
      const fileInfo = await FileSystem.getInfoAsync(downloaded.localUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(downloaded.localUri);
      }
    } catch (e) {
      console.error('Failed to delete file:', e);
    }

    const newDownloads = downloads.filter(d => {
      if (!d.track) return false;
      const dSongId = d.track.songId || d.track.id;
      return String(dSongId) !== String(trackId);
    });
    await saveDownloads(newDownloads);
  };

  const deleteAll = async () => {
    try {
      for (const d of downloads) {
        const fileInfo = await FileSystem.getInfoAsync(d.localUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(d.localUri);
        }
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

  // Get total download size
  const getTotalDownloadSize = useCallback(async () => {
    let totalSize = 0;
    try {
      for (const d of downloads) {
        const fileInfo = await FileSystem.getInfoAsync(d.localUri);
        if (fileInfo.exists && 'size' in fileInfo) {
          totalSize += fileInfo.size || 0;
        }
      }
    } catch (e) {
      console.error('Failed to calculate total size:', e);
    }
    return totalSize;
  }, [downloads]);

  // Format bytes to human readable
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

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
    getTotalDownloadSize,
    formatBytes,
    storageLocation,
    changeStorageLocation,
    getDownloadDirectory,
  };
};
