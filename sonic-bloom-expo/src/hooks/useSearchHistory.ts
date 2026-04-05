import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const SEARCH_HISTORY_KEY = 'sonic_search_history';
const SEARCH_HISTORY_MAX = 20;

export const useSearchHistory = () => {
  const { user } = useAuth();
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const prevUserIdRef = useRef<string | null>(null);

  // Load on mount and when user changes
  useEffect(() => {
    const isLogin = prevUserIdRef.current === null && user !== null;
    const isLogout = prevUserIdRef.current !== null && user === null;
    prevUserIdRef.current = user?.id || null;
    
    if (isLogout) {
      // Load from local on logout
      loadLocalHistory();
    } else {
      loadHistory();
    }
  }, [user]);

  const loadLocalHistory = async () => {
    try {
      const data = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (data) {
        setSearchHistory(JSON.parse(data));
      }
    } catch (e) {
      console.log('[useSearchHistory] Load local error:', e);
    }
  };

  const loadHistory = async () => {
    try {
      if (user) {
        // Load from Supabase for logged in users
        const { data, error } = await supabase
          .from('search_history')
          .select('query')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(SEARCH_HISTORY_MAX);
        
        console.log('[useSearchHistory] Load from Supabase:', { count: data?.length, error });
        
        if (!error && data && data.length > 0) {
          const queries = data.map(d => d.query);
          setSearchHistory(queries);
          // Also cache locally
          await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(queries));
          return;
        }
      }
      
      // Fallback to local storage
      const data = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (data) {
        setSearchHistory(JSON.parse(data));
      }
    } catch (e) {
      console.log('[useSearchHistory] Load error:', e);
    }
  };

  const addToHistory = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    console.log('[useSearchHistory] Adding query:', query);
    
    // Update local state immediately
    setSearchHistory(prev => {
      const updated = [query, ...prev.filter(h => h !== query)].slice(0, SEARCH_HISTORY_MAX);
      // Save to local storage
      AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    // Save to Supabase if logged in
    if (user) {
      try {
        // Delete old same query and insert new
        await supabase.from('search_history').delete().eq('user_id', user.id).eq('query', query);
        const { error } = await supabase.from('search_history').insert({
          user_id: user.id,
          query: query.trim(),
        });
        console.log('[useSearchHistory] Saved to Supabase:', { error });
      } catch (e) {
        console.log('[useSearchHistory] Supabase save error:', e);
      }
    }
  }, [user]);

  const clearHistory = useCallback(async () => {
    setSearchHistory([]);
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    
    if (user) {
      await supabase.from('search_history').delete().eq('user_id', user.id);
    }
  }, [user]);

  const removeFromHistory = useCallback(async (queryToRemove: string) => {
    setSearchHistory(prev => {
      const updated = prev.filter(h => h !== queryToRemove);
      AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    
    if (user) {
      await supabase.from('search_history').delete().eq('user_id', user.id).eq('query', queryToRemove);
    }
  }, [user]);

  return {
    searchHistory,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };
};