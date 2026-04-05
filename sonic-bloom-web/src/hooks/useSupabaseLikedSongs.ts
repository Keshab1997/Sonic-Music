import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Track as SupabaseTrack } from '../lib/supabase'
import type { Track, AudioUrls } from '@/data/playlist'

// Extended track interface for Supabase operations
interface SupabaseTrackInput {
  id?: string | number;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  youtube_id?: string;
  cover_url?: string;
  audio_url?: string;
}

interface UseLikedSongsReturn {
  likedSongs: Track[]
  loading: boolean
  error: Error | null
  likeSong: (track: SupabaseTrackInput) => Promise<boolean>
  unlikeSong: (trackId: string) => Promise<boolean>
  isLiked: (trackId: string) => boolean
  refreshLikedSongs: () => Promise<void>
}

// Helper function to convert Supabase Track to app Track format
function toAppTrack(item: SupabaseTrack): Track {
  // Generate a numeric ID from the UUID or use a random fallback
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

export function useLikedSongs(): UseLikedSongsReturn {
  const [likedSongs, setLikedSongs] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchLikedSongs = useCallback(async () => {
    if (!supabase) {
      setLikedSongs([])
      setLoading(false)
      return
    }
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
        .map(item => {
          const tracksData = item.tracks as SupabaseTrack[] | SupabaseTrack | null;
          // Handle both array and single object responses from Supabase
          if (Array.isArray(tracksData)) {
            return tracksData.length > 0 ? toAppTrack(tracksData[0]) : null;
          }
          if (!tracksData) return null;
          return toAppTrack(tracksData);
        })
        .filter((track): track is Track => track !== null)
      
      setLikedSongs(tracks)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching liked songs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (supabase) {
      fetchLikedSongs()
    } else {
      setLoading(false)
    }
  }, [fetchLikedSongs])

  const likeSong = useCallback(async (track: SupabaseTrackInput) => {
    if (!supabase) return false
    try {
      // First check if track exists in tracks table
      let trackDbId: string | undefined = typeof track.id === 'string' ? track.id : undefined;
      
      if (!trackDbId && track.youtube_id) {
        const { data: existingTrack } = await supabase
          .from('tracks')
          .select('id')
          .eq('youtube_id', track.youtube_id)
          .single()

        if (existingTrack) {
          trackDbId = existingTrack.id
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
          
          if (newTrack) trackDbId = newTrack.id
        }
      }

      if (!trackDbId) return false

      const { error: err } = await supabase
        .from('liked_songs')
        .insert({ track_id: trackDbId })

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
    if (!supabase) return false
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
    // Check by songId (youtube_id) or by string comparison of id
    return likedSongs.some(song => 
      song.songId === trackId || String(song.id) === trackId
    )
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
