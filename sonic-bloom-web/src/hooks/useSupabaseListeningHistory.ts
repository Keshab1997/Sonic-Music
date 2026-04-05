import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Track as SupabaseTrack } from '../lib/supabase'
import type { Track, AudioUrls } from '@/data/playlist'

interface HistoryEntry {
  track: Track
  played_at: string
  duration_played: number
  completed: boolean
}

interface UseListeningHistoryReturn {
  history: HistoryEntry[]
  loading: boolean
  error: Error | null
  addToHistory: (trackId: string, durationPlayed: number, completed: boolean) => Promise<boolean>
  getTopTracks: (limit?: number) => Promise<Track[]>
  clearHistory: () => Promise<boolean>
}

// Helper function to convert Supabase Track to app Track format
function toAppTrack(item: SupabaseTrack): Track {
  const numericId = item.id 
    ? parseInt(item.id.replace(/-/g, '').slice(0, 8), 36) || Math.floor(Math.random() * 1000000)
    : Math.floor(Math.random() * 1000000);
  
  return {
    id: numericId,
    title: item.title,
    artist: item.artist,
    album: item.album || '',
    cover: item.cover_url || '',
    src: item.audio_url || '',
    duration: item.duration,
    type: item.youtube_id ? 'youtube' : 'audio',
    songId: item.youtube_id,
    audioUrls: item.audio_url ? { '160kbps': item.audio_url } as AudioUrls : undefined,
  };
}

export function useListeningHistory(): UseListeningHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!supabase) {
      setHistory([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('listening_history')
        .select(`
          played_at,
          duration_played,
          completed,
          tracks (
            id,
            title,
            artist,
            album,
            duration,
            youtube_id,
            cover_url,
            audio_url
          )
        `)
        .order('played_at', { ascending: false })
        .limit(100)

      if (err) throw err
      
      const formattedData: HistoryEntry[] = (data || []).map(item => {
        const tracksData = item.tracks as SupabaseTrack[] | SupabaseTrack | null;
        let track: SupabaseTrack | null = null;
        
        if (Array.isArray(tracksData)) {
          track = tracksData.length > 0 ? tracksData[0] : null;
        } else if (tracksData) {
          track = tracksData;
        }
        
        return {
          track: track ? toAppTrack(track) : {} as Track,
          played_at: item.played_at,
          duration_played: item.duration_played,
          completed: item.completed
        };
      }).filter(entry => entry.track && entry.track.title);
      
      setHistory(formattedData)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching listening history:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (supabase) {
      fetchHistory()
    } else {
      setLoading(false)
    }
  }, [fetchHistory])

  const addToHistory = useCallback(async (trackId: string, durationPlayed: number, completed: boolean) => {
    if (!supabase) return false
    try {
      const { error: err } = await supabase
        .from('listening_history')
        .insert({
          track_id: trackId,
          duration_played: durationPlayed,
          completed,
          user_id: null // Will be set by Supabase if auth is enabled
        })

      if (err) throw err
      await fetchHistory()
      return true
    } catch (err) {
      console.error('Error adding to listening history:', err)
      return false
    }
  }, [fetchHistory])

  const getTopTracks = useCallback(async (limit = 10): Promise<Track[]> => {
    if (!supabase) return []
    try {
      const { data, error: err } = await supabase
        .from('listening_history')
        .select(`
          tracks (
            id,
            title,
            artist,
            album,
            duration,
            youtube_id,
            cover_url,
            audio_url
          )
        `)
        .order('played_at', { ascending: false })
        .limit(limit)

      if (err) throw err
      
      const tracks: Track[] = (data || [])
        .map(item => {
          const tracksData = item.tracks as SupabaseTrack[] | SupabaseTrack | null;
          if (Array.isArray(tracksData)) {
            return tracksData.length > 0 ? toAppTrack(tracksData[0]) : null;
          }
          if (!tracksData) return null;
          return toAppTrack(tracksData);
        })
        .filter((track): track is Track => track !== null);
      
      return tracks;
    } catch (err) {
      console.error('Error getting top tracks:', err)
      return []
    }
  }, [])

  const clearHistory = useCallback(async () => {
    if (!supabase) {
      setHistory([])
      return true
    }
    try {
      const { error: err } = await supabase
        .from('listening_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (err) throw err
      setHistory([])
      return true
    } catch (err) {
      console.error('Error clearing history:', err)
      return false
    }
  }, [])

  return {
    history,
    loading,
    error,
    addToHistory,
    getTopTracks,
    clearHistory
  }
}
