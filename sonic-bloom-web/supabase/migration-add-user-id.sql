-- Migration: Add user_id to existing tables
-- Run this in Supabase SQL Editor if tables already exist

-- 1. Drop foreign key constraint first, then change types
ALTER TABLE playlist_tracks DROP CONSTRAINT IF EXISTS playlist_tracks_playlist_id_fkey;
ALTER TABLE playlists ALTER COLUMN id TYPE TEXT;
ALTER TABLE playlist_tracks ALTER COLUMN playlist_id TYPE TEXT;
ALTER TABLE playlist_tracks ADD CONSTRAINT playlist_tracks_playlist_id_fkey
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE;

-- 2. Add user_id columns
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE liked_songs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE listening_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Fix liked_songs unique constraint (was per track, now per user+track)
ALTER TABLE liked_songs DROP CONSTRAINT IF EXISTS liked_songs_track_id_key;
ALTER TABLE liked_songs ADD CONSTRAINT liked_songs_user_track_unique UNIQUE (user_id, track_id);

-- 4. Fix user_preferences unique constraint
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_key_key;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_key_unique UNIQUE (user_id, key);

-- 5. Drop old public policies
DROP POLICY IF EXISTS "Allow public read access on playlists" ON playlists;
DROP POLICY IF EXISTS "Allow public insert on playlists" ON playlists;
DROP POLICY IF EXISTS "Allow public update on playlists" ON playlists;
DROP POLICY IF EXISTS "Allow public delete on playlists" ON playlists;
DROP POLICY IF EXISTS "Allow public read access on liked_songs" ON liked_songs;
DROP POLICY IF EXISTS "Allow public insert on liked_songs" ON liked_songs;
DROP POLICY IF EXISTS "Allow public delete on liked_songs" ON liked_songs;
DROP POLICY IF EXISTS "Allow public read access on listening_history" ON listening_history;
DROP POLICY IF EXISTS "Allow public insert on listening_history" ON listening_history;
DROP POLICY IF EXISTS "Allow public read access on user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow public insert on user_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow public update on user_preferences" ON user_preferences;
-- Also drop schema-auth.sql policies if already applied
DROP POLICY IF EXISTS "Users can view own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can create own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can update own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can delete own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can view own liked songs" ON liked_songs;
DROP POLICY IF EXISTS "Users can like songs" ON liked_songs;
DROP POLICY IF EXISTS "Users can unlike songs" ON liked_songs;
DROP POLICY IF EXISTS "Users can view own history" ON listening_history;
DROP POLICY IF EXISTS "Users can insert own history" ON listening_history;
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

-- 6. Create correct per-user RLS policies
CREATE POLICY "Users can view own playlists" ON playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own playlists" ON playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playlists" ON playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own playlists" ON playlists FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own liked songs" ON liked_songs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can like songs" ON liked_songs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike songs" ON liked_songs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own history" ON listening_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON listening_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- 7. Tracks: public read, authenticated write (unchanged)
DROP POLICY IF EXISTS "Allow public read access on tracks" ON tracks;
DROP POLICY IF EXISTS "Allow public insert on tracks" ON tracks;
DROP POLICY IF EXISTS "Allow public update on tracks" ON tracks;
DROP POLICY IF EXISTS "Anyone can view tracks" ON tracks;
DROP POLICY IF EXISTS "Authenticated users can add tracks" ON tracks;
CREATE POLICY "Anyone can view tracks" ON tracks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add tracks" ON tracks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update tracks" ON tracks FOR UPDATE USING (auth.role() = 'authenticated');
