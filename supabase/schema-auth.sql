-- Update RLS policies for authenticated users
-- Run this AFTER the main schema.sql if you want user-specific data

-- Drop existing public policies
DROP POLICY IF EXISTS "Allow public insert on playlists" ON playlists;
DROP POLICY IF EXISTS "Allow public update on playlists" ON playlists;
DROP POLICY IF EXISTS "Allow public delete on playlists" ON playlists;
DROP POLICY IF EXISTS "Allow public insert on tracks" ON tracks;
DROP POLICY IF EXISTS "Allow public update on tracks" ON tracks;
DROP POLICY IF EXISTS "Allow public insert on playlist_tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Allow public delete on playlist_tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Allow public insert on listening_history" ON listening_history;
DROP POLICY IF EXISTS "Allow public insert on user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow public update on user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow public insert on liked_songs" ON liked_songs;
DROP POLICY IF EXISTS "Allow public delete on liked_songs" ON liked_songs;

-- Add user_id column to tables that need user-specific data
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE listening_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE liked_songs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create policies for authenticated users
CREATE POLICY "Users can view own playlists" ON playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own playlists" ON playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playlists" ON playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own playlists" ON playlists FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own listening history" ON listening_history FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own listening history" ON listening_history FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own liked songs" ON liked_songs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can like songs" ON liked_songs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can unlike songs" ON liked_songs FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Keep public read access on tracks (shared music library)
CREATE POLICY "Anyone can view tracks" ON tracks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add tracks" ON tracks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
