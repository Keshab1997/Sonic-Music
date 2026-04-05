import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Track } from '../lib/supabase'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchLikedSongs = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('liked_songs')
        .select(`
          added_at,
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
        .order('added_at', { ascending: false })

      if (err) throw err
      
      const tracks: Track[] = (data || [])
        .map(item => item.tracks as unknown as Track)
        .filter(Boolean)
      
      setLikedSongs(tracks)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching liked songs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLikedSongs()
  }, [fetchLikedSongs])

  const likeSong = useCallback(async (track: Track) => {
    try {
      // First check if track exists in tracks table
      let trackId = track.id
      
      if (!trackId && track.youtube_id) {
        const { data: existingTrack } = await supabase
          .from('tracks')
          .select('id')
          .eq('youtube_id', track.youtube_id)
          .single()

        if (existingTrack) {
          trackId = existingTrack.id
        } else {
          const { data: newTrack } = await supabase
            .from('tracks')
            .insert({
              title: track.title,
              artist: track.artist,
              album: track.album,
              duration: track.duration,
              youtube_id: track.youtube_id,
              cover_url: track.cover_url,
              audio_url: track.audio_url
            })
            .select('id')
            .single()
          
          if (newTrack) trackId = newTrack.id
        }
      }

      if (!trackId) return false

      const { error: err } = await supabase
        .from('liked_songs')
        .insert({ track_id: trackId })

      if (err) {
        if (err.code === '23505') {
          // Already liked, ignore
          return true
        }
        throw err
      }
      
      await fetchLikedSongs()
      return true
    } catch (err) {
      console.error('Error liking song:', err)
      return false
    }
  }, [fetchLikedSongs])

  const unlikeSong = useCallback(async (trackId: string) => {
    try {
      const { error: err } = await supabase
        .from('liked_songs')
        .delete()
        .eq('track_id', trackId)

      if (err) throw err
      await fetchLikedSongs()
      return true
    } catch (err) {
      console.error('Error unliking song:', err)
      return false
    }
  }, [fetchLikedSongs])

  const isLiked = useCallback((trackId: string) => {
    return likedSongs.some(song => song.id === trackId)
  }, [likedSongs])

  return {
    likedSongs,
    loading,
    error,
    likeSong,
    unlikeSong,
    isLiked,
    refreshLikedSongs: fetchLikedSongs
  }
}
