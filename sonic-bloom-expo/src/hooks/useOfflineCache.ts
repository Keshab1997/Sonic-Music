import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '../data/playlist';
import { fetchJioSaavn } from '../lib/api';

const OFFLINE_CACHE_KEY = 'sonic_offline_cache';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedData {
  trending: Track[];
  newReleases: Track[];
  bengaliHits: Track[];
  forYou: Track[];
  suspense: Track[];
  cachedAt: number;
}

export const useOfflineCache = () => {
  const [cachedData, setCachedData] = useState<CachedData | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Load cached data on mount
  useEffect(() => {
    const loadCache = async () => {
      try {
        const stored = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
        if (stored) {
          const parsed: CachedData = JSON.parse(stored);
          // Check if cache is still valid (less than 24 hours old)
          const isExpired = Date.now() - parsed.cachedAt > CACHE_EXPIRY_MS;
          if (!isExpired) {
            setCachedData(parsed);
          } else {
            // Clear expired cache
            await AsyncStorage.removeItem(OFFLINE_CACHE_KEY);
          }
        }
      } catch (e) {
        console.error('Failed to load offline cache:', e);
      }
    };
    loadCache();
  }, []);

  // Save data to cache
  const saveToCache = useCallback(async (data: {
    trending: Track[];
    newReleases: Track[];
    bengaliHits: Track[];
    forYou: Track[];
    suspense: Track[];
  }) => {
    try {
      const cacheData: CachedData = {
        ...data,
        cachedAt: Date.now(),
      };
      await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cacheData));
      setCachedData(cacheData);
    } catch (e) {
      console.error('Failed to save to offline cache:', e);
    }
  }, []);

  // Fetch with offline fallback
  const fetchWithOfflineFallback = useCallback(async (
    fetchFn: () => Promise<Track[]>,
    cacheKey: keyof CachedData
  ): Promise<Track[]> => {
    try {
      const result = await fetchFn();
      if (result.length > 0) {
        setIsOffline(false);
        return result;
      }
      // If fetch returned empty, try cache
      if (cachedData && cachedData[cacheKey]) {
        setIsOffline(true);
        return cachedData[cacheKey] as Track[];
      }
      return [];
    } catch (e) {
      console.error('Fetch failed, using offline cache:', e);
      setIsOffline(true);
      if (cachedData && cachedData[cacheKey]) {
        return cachedData[cacheKey] as Track[];
      }
      return [];
    }
  }, [cachedData]);

  return {
    isOffline,
    cachedData,
    saveToCache,
    fetchWithOfflineFallback,
  };
};
