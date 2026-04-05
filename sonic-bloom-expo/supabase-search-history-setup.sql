-- ============================================
-- Sonic Bloom Search History Setup
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Drop existing if re-running (use DO to handle if not exists)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own search history" ON search_history;
  DROP POLICY IF EXISTS "Users can add search history" ON search_history;
  DROP POLICY IF EXISTS "Users can delete search history" ON search_history;
  DROP INDEX IF EXISTS idx_search_history_user_id;
  DROP INDEX IF EXISTS idx_search_history_user_created;
  DROP TABLE IF EXISTS search_history;
END $$;

-- Step 2: Create search_history table
CREATE TABLE search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, query)
);

-- Step 3: Enable RLS
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies
CREATE POLICY "Users can view own search history" ON search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add search history" ON search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete search history" ON search_history FOR DELETE USING (auth.uid() = user_id);

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user_created ON search_history(user_id, created_at DESC);