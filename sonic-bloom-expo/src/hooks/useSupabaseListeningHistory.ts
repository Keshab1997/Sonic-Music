import { useCallback } from 'react'
import type { Track } from '@/data/playlist'

interface UseListeningHistoryReturn {
  history: unknown[]
  loading: boolean
  error: Error | null
  addToHistory: (trackId: string, durationPlayed: number, completed: boolean) => Promise<boolean>
  getTopTracks: (limit?: number) => Promise<Track[]>
  clearHistory: () => Promise<boolean>
}

export function useListeningHistory(): UseListeningHistoryReturn {
  const addToHistory = useCallback(async (_trackId: string, _durationPlayed: number, _completed: boolean) => {
    // Stub - Supabase not configured
    return true
  }, [])

  const getTopTracks = useCallback(async (_limit = 10): Promise<Track[]> => {
    return []
  }, [])

  const clearHistory = useCallback(async () => {
    return true
  }, [])

  return {
    history: [],
    loading: false,
    error: null,
    addToHistory,
    getTopTracks,
    clearHistory
  }
}
