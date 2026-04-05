import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase env:', { url: supabaseUrl, hasKey: !!supabaseAnonKey })

const validUrl = supabaseUrl && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))
const hasValidCredentials = validUrl && supabaseAnonKey

if (hasValidCredentials) {
  console.log('Supabase connected')
}

export const supabase = hasValidCredentials 
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        storageKey: 'sonic-bloom-auth',
        storage: window.localStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    })
  : null

if (hasValidCredentials) {
  console.log('Supabase connected')
} else if (supabaseUrl || supabaseAnonKey) {
  console.warn('Supabase credentials invalid. Check VITE_SUPABASE_URL (must start with http:// or https://) and VITE_SUPABASE_ANON_KEY')
}

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
