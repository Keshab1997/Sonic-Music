-- Create downloads table for user-specific downloads
CREATE TABLE IF NOT EXISTS downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  track_data JSONB NOT NULL,
  local_uri TEXT NOT NULL,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

-- Enable RLS
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own downloads
CREATE POLICY "Users can view own downloads"
  ON downloads FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own downloads
CREATE POLICY "Users can insert own downloads"
  ON downloads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own downloads
CREATE POLICY "Users can update own downloads"
  ON downloads FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own downloads
CREATE POLICY "Users can delete own downloads"
  ON downloads FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_track_id ON downloads(track_id);
