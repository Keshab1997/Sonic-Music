-- Search Cache table - stores search results for offline/fast access
CREATE TABLE IF NOT EXISTS search_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  tracks JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, query)
);

ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (for faster searches)
CREATE POLICY "Anyone can read search cache"
  ON search_cache FOR SELECT
  USING (true);

-- Only logged in users can insert their own
CREATE POLICY "Users can insert own search cache"
  ON search_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only logged in users can delete their own
CREATE POLICY "Users can delete own search cache"
  ON search_cache FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_search_cache_user_query ON search_cache(user_id, query);
CREATE INDEX IF NOT EXISTS idx_search_cache_cached_at ON search_cache(cached_at DESC);

NOTIFY pgrst, 'reload schema';