import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Track } from '../data/playlist';

const SEARCH_CACHE_KEY = 'sonic_search_cache_';
const SEARCH_CACHE_MAX = 50;

export interface SearchCacheItem {
  query: string;
  tracks: Track[];
  cachedAt: number;
}

export const useSearchCache = () => {
  const { user } = useAuth();
  const [cachedSearches, setCachedSearches] = useState<SearchCacheItem[]>([]);

  // Load cached searches on mount
  useEffect(() => {
    loadCachedSearches();
  }, []);

  const loadCachedSearches = async () => {
    try {
      // Load from local first
      const keys = await AsyncStorage.getAllKeys();
      const searchKeys = keys.filter(k => k.startsWith(SEARCH_CACHE_KEY));
      
      const allCache: SearchCacheItem[] = [];
      for (const key of searchKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          try {
            allCache.push(JSON.parse(data));
          } catch {}
        }
      }
      
      // Sort by cachedAt and take max
      allCache.sort((a, b) => b.cachedAt - a.cachedAt);
      setCachedSearches(allCache.slice(0, SEARCH_CACHE_MAX));
      
      // Also load from Supabase if logged in
      if (user) {
        loadFromSupabase();
      }
    } catch (e) {
      console.log('[useSearchCache] Load error:', e);
    }
  };

  const loadFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('search_cache')
        .select('*')
        .eq('user_id', user.id)
        .order('cached_at', { ascending: false })
        .limit(SEARCH_CACHE_MAX);
      
      console.log('[useSearchCache] Load from Supabase:', { count: data?.length, error });
      
      if (!error && data && data.length > 0) {
        const mapped: SearchCacheItem[] = data.map(d => ({
          query: d.query,
          tracks: d.tracks,
          cachedAt: new Date(d.cached_at).getTime(),
        }));
        
        // Merge with local cache
        setCachedSearches(prev => {
          const merged = [...prev, ...mapped];
          const seen = new Set<string>();
          const unique = merged.filter(item => {
            if (seen.has(item.query)) return false;
            seen.add(item.query);
            return true;
          });
          return unique.slice(0, SEARCH_CACHE_MAX);
        });
      }
    } catch (e) {
      console.log('[useSearchCache] Supabase load error:', e);
    }
  };

  const saveSearchResults = useCallback(async (query: string, tracks: Track[]) => {
    if (!query.trim() || tracks.length === 0) return;
    
    console.log('[useSearchCache] Saving search:', query, 'tracks:', tracks.length);
    
    const cacheItem: SearchCacheItem = {
      query: query.trim(),
      tracks,
      cachedAt: Date.now(),
    };

    // Save to local storage
    try {
      await AsyncStorage.setItem(`${SEARCH_CACHE_KEY}${query.trim().toLowerCase()}`, JSON.stringify(cacheItem));
    } catch (e) {
      console.log('[useSearchCache] Local save error:', e);
    }

    // Update state
    setCachedSearches(prev => {
      const filtered = prev.filter(p => p.query.toLowerCase() !== query.toLowerCase());
      return [cacheItem, ...filtered].slice(0, SEARCH_CACHE_MAX);
    });

    // Save to Supabase if logged in
    if (user) {
      try {
        // Delete old entry and insert new
        await supabase.from('search_cache').delete().eq('user_id', user.id).eq('query', query.trim().toLowerCase());
        
        const { error } = await supabase.from('search_cache').insert({
          user_id: user.id,
          query: query.trim().toLowerCase(),
          tracks: tracks,
          cached_at: new Date().toISOString(),
        });
        
        console.log('[useSearchCache] Supabase save:', { error });
      } catch (e) {
        console.log('[useSearchCache] Supabase save error:', e);
      }
    }
  }, [user]);

  const getCachedResults = useCallback((query: string): Track[] | null => {
    const cached = cachedSearches.find(c => c.query.toLowerCase() === query.toLowerCase());
    return cached?.tracks || null;
  }, [cachedSearches]);

  const clearCache = useCallback(async () => {
    setCachedSearches([]);
    
    // Clear local storage
    const keys = await AsyncStorage.getAllKeys();
    const searchKeys = keys.filter(k => k.startsWith(SEARCH_CACHE_KEY));
    for (const key of searchKeys) {
      await AsyncStorage.removeItem(key);
    }
    
    // Clear Supabase
    if (user) {
      await supabase.from('search_cache').delete().eq('user_id', user.id);
    }
  }, [user]);

  return {
    cachedSearches,
    saveSearchResults,
    getCachedResults,
    clearCache,
  };
};