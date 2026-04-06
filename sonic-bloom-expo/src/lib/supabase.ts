import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import 'react-native-url-polyfill/auto'

// Use environment variables for Supabase credentials
// For Expo, set these in app.json or eas.json under "extra"
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hcutwzcybidywtmmbehq.supabase.co'
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjdXR3emN5YmlkeXd0bW1iZWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NDY1NTksImV4cCI6MjA4MzEyMjU1OX0.B0tTULLbpT7elnnZ5mrQC_dfdiZV52XcYRONTEwThOw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-react-native',
    },
  },
})

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
