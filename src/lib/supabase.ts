import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      storageKey: 'sonic-bloom-auth',
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
)

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
