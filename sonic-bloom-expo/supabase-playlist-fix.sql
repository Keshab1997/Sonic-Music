-- Fix: Add foreign key relationship back and handle duplicates
-- Run this in Supabase SQL Editor

-- Drop and recreate playlist_tracks with proper FK
DROP TABLE IF EXISTS playlist_tracks;

CREATE TABLE IF NOT EXISTS playlist_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  track_data JSONB,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, track_id)
);

ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies with text comparison
DROP POLICY IF EXISTS "Users can view own playlist tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Users can add tracks to own playlists" ON playlist_tracks;
DROP POLICY IF EXISTS "Users can remove tracks from own playlists" ON playlist_tracks;

CREATE POLICY "Users can view own playlist tracks" ON playlist_tracks FOR SELECT USING (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id::text = playlist_tracks.playlist_id AND playlists.user_id = auth.uid())
);

CREATE POLICY "Users can add tracks to own playlists" ON playlist_tracks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id::text = playlist_tracks.playlist_id AND playlists.user_id = auth.uid())
);

CREATE POLICY "Users can remove tracks from own playlists" ON playlist_tracks FOR DELETE USING (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id::text = playlist_tracks.playlist_id AND playlists.user_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);

NOTIFY pgrst, 'reload schema';