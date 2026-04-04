# Supabase Setup Guide - Sonic Bloom Player

## Overview
This project uses Supabase for database, authentication, and storage. The following guide explains how to set up and use Supabase in this project.

## Configuration

### Environment Variables
All Supabase credentials are stored in `.env.local`:

```env
VITE_SUPABASE_URL=https://hcutwzcybidywtmmbehq.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_ACCESS_TOKEN=sbp_xxxxx
SUPABASE_PROJECT_ID=hcutwzcybidywtmmbehq
```

### MCP Server Configuration
The MCP server is configured in `.vscode/settings.json` to enable Roo Code to interact with Supabase.

## Database Schema

The database schema is defined in `supabase/schema.sql` and includes:

### Tables
- **playlists** - User-created playlists
- **tracks** - Music tracks with metadata
- **playlist_tracks** - Junction table linking tracks to playlists
- **listening_history** - Track play history for analytics
- **user_preferences** - User settings and preferences
- **liked_songs** - User's favorite/liked tracks

### Setup Instructions

#### Option 1: Using Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project: `hcutwzcybidywtmmbehq`
3. Navigate to **SQL Editor**
4. Copy the contents of `supabase/schema.sql`
5. Paste into the editor and click **Run**

#### Option 2: Using Supabase CLI
```bash
# Install Supabase CLI
brew install supabase/tap/supabase  # macOS
# or
npm install -g supabase

# Run setup script
chmod +x supabase/setup.sh
./supabase/setup.sh
```

## Custom Hooks

### usePlaylists
Manage playlists with Supabase:
```typescript
import { usePlaylists } from './hooks/useSupabasePlaylists'

function MyComponent() {
  const {
    playlists,
    loading,
    createPlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    getPlaylistTracks
  } = usePlaylists()

  // Use the functions...
}
```

### useListeningHistory
Track and retrieve listening history:
```typescript
import { useListeningHistory } from './hooks/useSupabaseListeningHistory'

function MyComponent() {
  const {
    history,
    addToHistory,
    getTopTracks,
    clearHistory
  } = useListeningHistory()

  // Use the functions...
}
```

### useLikedSongs
Manage liked/favorite songs:
```typescript
import { useLikedSongs } from './hooks/useSupabaseLikedSongs'

function MyComponent() {
  const {
    likedSongs,
    likeSong,
    unlikeSong,
    isLiked
  } = useLikedSongs()

  // Use the functions...
}
```

## Supabase Client

The Supabase client is available at `src/lib/supabase.ts`:

```typescript
import { supabase } from './lib/supabase'

// Direct usage
const { data, error } = await supabase
  .from('playlists')
  .select('*')
```

## Next Steps

1. **Apply the schema** to your Supabase project using the SQL Editor
2. **Test the connection** by running the app and checking the console
3. **Integrate hooks** into your components
4. **Enable authentication** if you want user-specific data

## Troubleshooting

### MCP Server Not Connecting
1. Verify `SUPABASE_ACCESS_TOKEN` is correct
2. Reload VS Code window
3. Check Roo Code settings for MCP configuration

### Database Queries Failing
1. Ensure the schema has been applied to Supabase
2. Check browser console for error messages
3. Verify RLS policies allow the operations you're trying to perform

### Environment Variables Not Loading
1. Restart the dev server after changing `.env.local`
2. Ensure variables are prefixed with `VITE_` for client-side access
