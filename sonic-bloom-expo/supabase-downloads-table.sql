-- Create downloads table for storing user downloads
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  track_data JSONB NOT NULL,
  local_uri TEXT NOT NULL,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON public.downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_track_id ON public.downloads(track_id);

-- Enable Row Level Security
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only see their own downloads
CREATE POLICY "Users can view own downloads"
  ON public.downloads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own downloads
CREATE POLICY "Users can insert own downloads"
  ON public.downloads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own downloads
CREATE POLICY "Users can update own downloads"
  ON public.downloads
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own downloads
CREATE POLICY "Users can delete own downloads"
  ON public.downloads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.downloads TO authenticated;
GRANT ALL ON public.downloads TO service_role;
