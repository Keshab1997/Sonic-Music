# YouTube Audio Playback Issue - CRITICAL

## Problem Identified

### Error
```
ERROR Playback error: [Error: a8.W: None of the available extractors could read the stream.]
```

### Root Cause
1. **YouTube iframe is a VIDEO player** - not designed for audio-only playback
2. **Hidden player (1x1 size)** causes stream extraction failures
3. **YouTube's internal extractors fail** when player is too small or hidden
4. **Audio doesn't play** even though state shows "playing"

### Why It Happens
- YouTube iframe needs minimum dimensions to initialize properly
- Hidden/tiny players trigger YouTube's bot detection
- Stream extractors (a8.W) fail to read the video stream
- Player shows "playing" state but no audio output

## Current Implementation Issues

```typescript
<YoutubeIframe
  videoId={ytVideoId}
  play={ytPlaying}
  height={1}        // ❌ TOO SMALL
  width={1}         // ❌ TOO SMALL
  // Player fails to extract audio stream
/>
```

## Solutions

### Option 1: Make Player Visible (Quick Fix)
**Pros**: Simple, works immediately
**Cons**: Takes screen space, not ideal for music app

```typescript
<YoutubeIframe
  videoId={ytVideoId}
  play={ytPlaying}
  height={200}      // ✅ Minimum working size
  width={300}       // ✅ Minimum working size
/>
```

### Option 2: YouTube Audio Extraction (RECOMMENDED)
**Pros**: True audio-only, no video player needed, better performance
**Cons**: Requires backend API

#### Implementation Steps:

1. **Backend API** (Already exists at `YT_STREAM_API`)
   ```typescript
   // src/data/constants.ts
   export const YT_STREAM_API = "https://sonic-bloom-player.vercel.app/api/yt-stream";
   ```

2. **Extract Audio URL**
   ```typescript
   const extractYouTubeAudio = async (videoId: string): Promise<string | null> => {
     try {
       const res = await fetch(`${YT_STREAM_API}?id=${videoId}`);
       const data = await res.json();
       return data.audioUrl || null;
     } catch {
       return null;
     }
   };
   ```

3. **Play with AudioService**
   ```typescript
   const playYouTube = async (videoId: string) => {
     const audioUrl = await extractYouTubeAudio(videoId);
     if (audioUrl) {
       // Play as regular audio
       await audioService.load(audioUrl);
       await audioService.play();
     } else {
       // Fallback to iframe
       setYtVideoId(videoId);
       setYtPlaying(true);
     }
   };
   ```

### Option 3: Hybrid Approach (BEST)
Use audio extraction with iframe fallback

```typescript
const playYouTube = async (videoId: string) => {
  try {
    // Try audio extraction first
    const audioUrl = await extractYouTubeAudio(videoId);
    if (audioUrl) {
      isYoutubeRef.current = false; // Use audio player
      await audioService.load(audioUrl);
      await audioService.play();
      return;
    }
  } catch (err) {
    console.log('Audio extraction failed, using iframe');
  }
  
  // Fallback to iframe with visible player
  isYoutubeRef.current = true;
  setYtVideoId(videoId);
  setYtPlaying(true);
};
```

## Recommended Solution

**Use Option 3 (Hybrid)** because:
1. ✅ Audio extraction works for most videos
2. ✅ Better performance (no video rendering)
3. ✅ Fallback to iframe if extraction fails
4. ✅ Consistent with other audio tracks
5. ✅ No screen space wasted

## Implementation Plan

### Step 1: Create YouTube Audio Extractor
```typescript
// src/lib/youtubeAudio.ts
export const extractYouTubeAudio = async (videoId: string): Promise<string | null> => {
  try {
    const res = await fetch(`${YT_STREAM_API}?id=${videoId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.audioUrl || data.url || null;
  } catch (error) {
    console.error('YouTube audio extraction failed:', error);
    return null;
  }
};
```

### Step 2: Update PlayerContext
```typescript
const playYoutube = useCallback(async (videoId: string) => {
  console.log('playYoutube called with videoId:', videoId);
  
  // Try audio extraction first
  try {
    const audioUrl = await extractYouTubeAudio(videoId);
    if (audioUrl) {
      console.log('Using extracted audio URL');
      isYoutubeRef.current = false;
      stopYoutube();
      await audioService.load(audioUrl);
      await audioService.play();
      setIsPlaying(true);
      return;
    }
  } catch (err) {
    console.log('Audio extraction failed, using iframe fallback');
  }
  
  // Fallback to iframe
  isYoutubeRef.current = true;
  setYtVideoId(videoId);
  setYtPlaying(true);
  setIsPlaying(true);
}, []);
```

### Step 3: Update YouTube Iframe (Fallback Only)
```typescript
{ytVideoId && (
  <View style={{ 
    position: 'absolute', 
    bottom: 100, 
    right: 10,
    width: 200,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden'
  }}>
    <YoutubeIframe
      ref={ytPlayerRef}
      videoId={ytVideoId}
      play={ytPlaying}
      height={150}
      width={200}
      // Visible fallback player
    />
  </View>
)}
```

## Benefits of Hybrid Approach

### Performance
- ✅ No video rendering overhead
- ✅ Lower memory usage
- ✅ Better battery life
- ✅ Faster playback start

### User Experience
- ✅ Consistent audio playback
- ✅ Works with all player controls
- ✅ No visual distractions
- ✅ Reliable fallback

### Technical
- ✅ Uses existing AudioService
- ✅ Unified playback logic
- ✅ Better error handling
- ✅ Easier to maintain

## Testing Checklist

- [ ] Audio extraction works for popular videos
- [ ] Fallback to iframe when extraction fails
- [ ] Play/pause works correctly
- [ ] Seek works correctly
- [ ] Volume control works
- [ ] Next/previous track works
- [ ] Queue management works
- [ ] No memory leaks
- [ ] No playback errors

## Known Limitations

### Audio Extraction
- May fail for some videos (copyright, region-locked)
- Requires internet connection
- URL expires after some time (need to re-extract)

### Iframe Fallback
- Takes screen space
- Higher resource usage
- May trigger bot detection if hidden

## Next Steps

1. Implement `extractYouTubeAudio` function
2. Update `playYoutube` in PlayerContext
3. Test with various videos
4. Monitor error rates
5. Optimize extraction API if needed

## Alternative: Use expo-video

If YouTube extraction doesn't work well, consider:
```typescript
import { Video } from 'expo-video';

// Play YouTube video with expo-video
<Video
  source={{ uri: `https://www.youtube.com/watch?v=${videoId}` }}
  shouldPlay={ytPlaying}
  // Audio-only mode
/>
```

But this also has limitations with YouTube URLs.

## Conclusion

**The current approach (hidden 1x1 iframe) doesn't work** because:
- YouTube detects and blocks tiny/hidden players
- Stream extractors fail
- No audio output despite "playing" state

**Solution**: Extract audio URL and play with AudioService, with visible iframe as fallback.

This will fix the "None of the available extractors could read the stream" error! 🎉
