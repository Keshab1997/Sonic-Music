# YouTube Music Search Integration

## Overview
Added YouTube Music search capability to the SearchScreen, allowing users to search and play songs from both JioSaavn and YouTube.

## Features Added

### 1. Source Toggle
- **Location**: Below search bar
- **Options**: JioSaavn | YouTube
- **Design**: Segmented control with active state highlighting
- **Default**: JioSaavn

### 2. YouTube Search
- Searches YouTube videos using existing API endpoint
- Returns up to 20 results
- Displays video thumbnail, title, and channel name
- YouTube badge on thumbnails for easy identification

### 3. Smart UI Adaptation
- **Filter Chips**: Only shown for JioSaavn (Songs/Artists/Albums)
- **Action Buttons**: 
  - JioSaavn: Add to Queue, Download All, Next, Play All
  - YouTube: Add to Queue, Play All (no download option)
- **Download Button**: Hidden for YouTube tracks

### 4. Playback Integration
- YouTube tracks play using existing YouTube iframe player
- Seamless integration with PlayerContext
- Queue management works for both sources

## User Experience

### Search Flow
1. User types search query
2. Selects source (JioSaavn or YouTube)
3. Results appear with appropriate UI
4. Click to play or add to queue

### Visual Indicators
- 🔴 YouTube badge on video thumbnails
- Different action buttons based on source
- Source-specific result count display

## Technical Implementation

### State Management
```typescript
const [searchSource, setSearchSource] = useState<"saavn" | "youtube">("saavn");
```

### YouTube Search Function
```typescript
const fetchYouTubeSongs = async (searchQuery: string): Promise<Track[]> => {
  const res = await fetch(`${YT_API}?q=${encodeURIComponent(searchQuery)}`);
  const videos = await res.json();
  return videos.map(v => ({
    id: `youtube_${v.videoId}`,
    type: "youtube",
    songId: v.videoId,
    // ... other fields
  }));
}
```

### Conditional Rendering
- Filter chips only for JioSaavn
- Download buttons only for audio tracks
- YouTube badge for video tracks

## API Endpoints Used

### YouTube Search
- **Endpoint**: `https://sonic-bloom-player.vercel.app/api/youtube-search`
- **Method**: GET
- **Query**: `?q=search_query`
- **Response**: Array of video objects

### YouTube Stream (for playback)
- **Endpoint**: `https://sonic-bloom-player.vercel.app/api/yt-stream`
- **Method**: GET
- **Query**: `?id=video_id`
- **Response**: Audio stream URL

## Files Modified

1. **SearchScreen.tsx**
   - Added `searchSource` state
   - Added source toggle UI
   - Added `fetchYouTubeSongs` function
   - Modified search logic to handle both sources
   - Updated UI to show/hide features based on source
   - Added YouTube badge styling

## Styling

### New Styles Added
```typescript
sourceToggle: { 
  flexDirection: 'row', 
  marginHorizontal: 16, 
  marginBottom: 8, 
  gap: 8, 
  backgroundColor: '#1a1a1a', 
  borderRadius: 12, 
  padding: 4 
},
sourceBtn: { 
  flex: 1, 
  flexDirection: 'row', 
  alignItems: 'center', 
  justifyContent: 'center', 
  paddingVertical: 8, 
  borderRadius: 8, 
  gap: 6 
},
sourceBtnActive: { 
  backgroundColor: '#1DB954' 
},
ytBadge: { 
  position: 'absolute', 
  top: 4, 
  right: 4, 
  backgroundColor: '#FF0000', 
  borderRadius: 4, 
  padding: 2 
}
```

## Testing Checklist

- [x] Source toggle switches between JioSaavn and YouTube
- [x] YouTube search returns results
- [x] YouTube tracks display with badge
- [x] YouTube tracks play correctly
- [x] Download button hidden for YouTube tracks
- [x] Filter chips hidden for YouTube
- [x] Action buttons adapt to source
- [x] Queue management works for both sources
- [x] Search history works for both sources

## Known Limitations

1. **YouTube Tracks**
   - Cannot be downloaded (streaming only)
   - No artist/album filters available
   - Pagination not supported (fixed 20 results)

2. **Performance**
   - YouTube search may be slower than JioSaavn
   - Video thumbnails may take time to load

## Future Improvements

- [ ] Add YouTube playlist search
- [ ] Add YouTube channel search
- [ ] Implement pagination for YouTube results
- [ ] Add video duration display
- [ ] Add view count display
- [ ] Cache YouTube search results
- [ ] Add "Open in YouTube" option
- [ ] Support YouTube Music API (if available)

## Usage Example

```typescript
// User searches for "arijit singh"
// Selects YouTube source
// Gets 20 YouTube videos
// Clicks on a video
// Video plays using YouTube iframe
// Can add to queue, play next, etc.
```

## Benefits

✅ More content variety (JioSaavn + YouTube)  
✅ Better search coverage  
✅ Seamless source switching  
✅ Consistent UI/UX  
✅ No breaking changes to existing features  
✅ Smart feature adaptation based on source  

## Notes

- YouTube tracks are identified by `type: "youtube"` and `songId: videoId`
- Existing PlayerContext handles YouTube playback via iframe
- No changes needed to download or liked songs features
- Search history works across both sources
