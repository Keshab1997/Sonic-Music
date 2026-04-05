-- ============================================
-- Sonic Bloom Library Setup
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Create tables
CREATE TABLE IF NOT EXISTS playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  track_data JSONB NOT NULL,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, track_id)
);

CREATE TABLE IF NOT EXISTS followed_artists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  artist_image TEXT,
  followed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, artist_id)
);

CREATE TABLE IF NOT EXISTS saved_albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id TEXT NOT NULL,
  album_name TEXT NOT NULL,
  album_cover TEXT,
  album_artist TEXT,
  album_year INTEGER,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, album_id)
);

-- Step 2: Enable RLS
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE followed_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_albums ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies (if re-running)
DO $$
BEGIN
  -- Playlists policies
  DROP POLICY IF EXISTS "Users can view own playlists" ON playlists;
  DROP POLICY IF EXISTS "Users can create own playlists" ON playlists;
  DROP POLICY IF EXISTS "Users can update own playlists" ON playlists;
  DROP POLICY IF EXISTS "Users can delete own playlists" ON playlists;
  
  -- Playlist tracks policies
  DROP POLICY IF EXISTS "Users can view own playlist tracks" ON playlist_tracks;
  DROP POLICY IF EXISTS "Users can add tracks to own playlists" ON playlist_tracks;
  DROP POLICY IF EXISTS "Users can remove tracks from own playlists" ON playlist_tracks;
  
  -- Followed artists policies
  DROP POLICY IF EXISTS "Users can view own followed artists" ON followed_artists;
  DROP POLICY IF EXISTS "Users can follow artists" ON followed_artists;
  DROP POLICY IF EXISTS "Users can unfollow artists" ON followed_artists;
  
  -- Saved albums policies
  DROP POLICY IF EXISTS "Users can view own saved albums" ON saved_albums;
  DROP POLICY IF EXISTS "Users can save albums" ON saved_albums;
  DROP POLICY IF EXISTS "Users can unsave albums" ON saved_albums;
END $$;

-- Step 4: Create RLS Policies
-- Playlists
CREATE POLICY "Users can view own playlists" ON playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own playlists" ON playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playlists" ON playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own playlists" ON playlists FOR DELETE USING (auth.uid() = user_id);

-- Playlist Tracks
CREATE POLICY "Users can view own playlist tracks" ON playlist_tracks FOR SELECT USING (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_tracks.playlist_id AND playlists.user_id = auth.uid())
);
CREATE POLICY "Users can add tracks to own playlists" ON playlist_tracks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_tracks.playlist_id AND playlists.user_id = auth.uid())
);
CREATE POLICY "Users can remove tracks from own playlists" ON playlist_tracks FOR DELETE USING (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_tracks.playlist_id AND playlists.user_id = auth.uid())
);

-- Followed Artists
CREATE POLICY "Users can view own followed artists" ON followed_artists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can follow artists" ON followed_artists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unfollow artists" ON followed_artists FOR DELETE USING (auth.uid() = user_id);

-- Saved Albums
CREATE POLICY "Users can view own saved albums" ON saved_albums FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save albums" ON saved_albums FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave albums" ON saved_albums FOR DELETE USING (auth.uid() = user_id);

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_followed_artists_user_id ON followed_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_albums_user_id ON saved_albums(user_id);
