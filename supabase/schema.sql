-- Supabase Database Schema for Sonic Bloom Music Player

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration INTEGER NOT NULL,
  youtube_id TEXT,
  cover_url TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlist-Tracks junction table
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, track_id)
);

-- User listening history
CREATE TABLE IF NOT EXISTS listening_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  duration_played INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Liked songs (favorites)
CREATE TABLE IF NOT EXISTS liked_songs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(track_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_listening_history_track ON listening_history(track_id);
CREATE INDEX IF NOT EXISTS idx_listening_history_played_at ON listening_history(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);

-- Enable Row Level Security (RLS)
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE liked_songs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (no auth required for now)
CREATE POLICY "Allow public read access on playlists" ON playlists FOR SELECT USING (true);
CREATE POLICY "Allow public read access on tracks" ON tracks FOR SELECT USING (true);
CREATE POLICY "Allow public read access on playlist_tracks" ON playlist_tracks FOR SELECT USING (true);
CREATE POLICY "Allow public read access on listening_history" ON listening_history FOR SELECT USING (true);
CREATE POLICY "Allow public read access on user_preferences" ON user_preferences FOR SELECT USING (true);
CREATE POLICY "Allow public read access on liked_songs" ON liked_songs FOR SELECT USING (true);

-- Create policies for public write access (for demo purposes)
CREATE POLICY "Allow public insert on playlists" ON playlists FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on playlists" ON playlists FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on playlists" ON playlists FOR DELETE USING (true);

CREATE POLICY "Allow public insert on tracks" ON tracks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on tracks" ON tracks FOR UPDATE USING (true);

CREATE POLICY "Allow public insert on playlist_tracks" ON playlist_tracks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on playlist_tracks" ON playlist_tracks FOR DELETE USING (true);

CREATE POLICY "Allow public insert on listening_history" ON listening_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert on user_preferences" ON user_preferences FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on user_preferences" ON user_preferences FOR UPDATE USING (true);

CREATE POLICY "Allow public insert on liked_songs" ON liked_songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on liked_songs" ON liked_songs FOR DELETE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for playlists
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_preferences
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
