import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

// Use Platform-specific storage for credentials
// In React Native, we use hardcoded values or a config file
// since import.meta.env doesn't exist
const SUPABASE_URL = 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = 'placeholder-key'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Helper types for common operations
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Database types will be generated automatically
export interface Playlist {
  id: string
  name: string
  description?: string
  cover_url?: string
  created_at: string
  updated_at: string
}

export interface Track {
  id: string
  title: string
  artist: string
  album?: string
  duration: number
  youtube_id?: string
  cover_url?: string
  audio_url?: string
}

export interface UserListeningHistory {
  id: string
  user_id: string
  track_id: string
  played_at: string
  duration_played: number
}
