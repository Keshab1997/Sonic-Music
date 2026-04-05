import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Track } from '../lib/supabase'

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

export function useListeningHistory(): UseListeningHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchHistory = useCallback(async () => {
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
      
      const formattedData: HistoryEntry[] = (data || []).map(item => ({
        track: item.tracks as unknown as Track,
        played_at: item.played_at,
        duration_played: item.duration_played,
        completed: item.completed
      }))
      
      setHistory(formattedData)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching listening history:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const addToHistory = useCallback(async (trackId: string, durationPlayed: number, completed: boolean) => {
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
      return (data || []).map(item => item.tracks as unknown as Track)
    } catch (err) {
      console.error('Error getting top tracks:', err)
      return []
    }
  }, [])

  const clearHistory = useCallback(async () => {
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
