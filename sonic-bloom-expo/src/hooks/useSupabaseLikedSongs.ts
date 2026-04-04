import { useState, useCallback } from 'react'
import type { Track } from '@/data/playlist'

interface UseLikedSongsReturn {
  likedSongs: Track[]
  loading: boolean
  error: Error | null
  likeSong: (track: Track) => Promise<boolean>
  unlikeSong: (trackId: string) => Promise<boolean>
  isLiked: (trackId: string) => boolean
  refreshLikedSongs: () => Promise<void>
}

export function useLikedSongs(): UseLikedSongsReturn {
  const [likedSongs, setLikedSongs] = useState<Track[]>([])

  const likeSong = useCallback(async (_track: Track) => {
    // Stub - Supabase not configured
    return true
  }, [])

  const unlikeSong = useCallback(async (_trackId: string) => {
    // Stub - Supabase not configured
    return true
  }, [])

  const isLiked = useCallback((trackId: string) => {
    return likedSongs.some(song => String(song.id) === trackId)
  }, [likedSongs])

  const refreshLikedSongs = useCallback(async () => {
    // Stub - Supabase not configured
  }, [])

  return {
    likedSongs,
    loading: false,
    error: null,
    likeSong,
    unlikeSong,
    isLiked,
    refreshLikedSongs
  }
}
