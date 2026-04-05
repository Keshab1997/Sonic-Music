-- Drop and recreate liked_songs with TEXT track_id (for external IDs like jiosaavn)
DROP TABLE IF EXISTS liked_songs;

CREATE TABLE IF NOT EXISTS liked_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  liked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

-- Enable RLS
ALTER TABLE liked_songs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own liked songs
CREATE POLICY "Users can view own liked songs"
  ON liked_songs FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own liked songs
CREATE POLICY "Users can insert own liked songs"
  ON liked_songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own liked songs
CREATE POLICY "Users can delete own liked songs"
  ON liked_songs FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_liked_songs_user_id ON liked_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_songs_track_id ON liked_songs(track_id);
CREATE INDEX IF NOT EXISTS idx_liked_songs_liked_at ON liked_songs(liked_at DESC);