import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Playlist, Track } from '../lib/supabase'

interface UsePlaylistsReturn {
  playlists: Playlist[]
  loading: boolean
  error: Error | null
  createPlaylist: (name: string, description?: string) => Promise<Playlist | null>
  deletePlaylist: (id: string) => Promise<boolean>
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<boolean>
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<boolean>
  getPlaylistTracks: (playlistId: string) => Promise<Track[]>
  refreshPlaylists: () => Promise<void>
}

export function usePlaylists(): UsePlaylistsReturn {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPlaylists = useCallback(async () => {
    if (!supabase) {
      setPlaylists([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err
      setPlaylists(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching playlists:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (supabase) {
      fetchPlaylists()
    } else {
      setLoading(false)
    }
  }, [fetchPlaylists])

  const createPlaylist = useCallback(async (name: string, description?: string) => {
    if (!supabase) return null
    try {
      const { data, error: err } = await supabase
        .from('playlists')
        .insert({ name, description })
        .select()
        .single()

      if (err) throw err
      setPlaylists(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error creating playlist:', err)
      return null
    }
  }, [])

  const deletePlaylist = useCallback(async (id: string) => {
    if (!supabase) return false
    try {
      const { error: err } = await supabase
        .from('playlists')
        .delete()
        .eq('id', id)

      if (err) throw err
      setPlaylists(prev => prev.filter(p => p.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting playlist:', err)
      return false
    }
  }, [])

  const addTrackToPlaylist = useCallback(async (playlistId: string, track: Track) => {
    if (!supabase) return false
    try {
      // First, ensure track exists
      let trackData = track
      if (!track.id) {
        const { data: existingTrack } = await supabase
          .from('tracks')
          .select('*')
          .eq('youtube_id', track.youtube_id)
          .single()

        if (existingTrack) {
          trackData = existingTrack
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
            .select()
            .single()
          
          if (newTrack) trackData = newTrack
        }
      }

      // Get current max position
      const { data: existingTracks } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1)

      const maxPosition = existingTracks?.[0]?.position ?? -1

      // Add to playlist
      const { error: err } = await supabase
        .from('playlist_tracks')
        .insert({
          playlist_id: playlistId,
          track_id: trackData.id,
          position: maxPosition + 1
        })

      if (err) throw err
      return true
    } catch (err) {
      console.error('Error adding track to playlist:', err)
      return false
    }
  }, [])

  const removeTrackFromPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    if (!supabase) return false
    try {
      const { error: err } = await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId)

      if (err) throw err
      return true
    } catch (err) {
      console.error('Error removing track from playlist:', err)
      return false
    }
  }, [])

  const getPlaylistTracks = useCallback(async (playlistId: string) => {
    if (!supabase) return []
    try {
      const { data, error: err } = await supabase
        .from('playlist_tracks')
        .select(`
          track:tracks (*)
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true })

      if (err) throw err
      return data?.map(item => item.track) || []
    } catch (err) {
      console.error('Error getting playlist tracks:', err)
      return []
    }
  }, [])

  return {
    playlists,
    loading,
    error,
    createPlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    getPlaylistTracks,
    refreshPlaylists: fetchPlaylists
  }
}
