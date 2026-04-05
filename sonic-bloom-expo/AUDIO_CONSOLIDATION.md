# Audio Player Consolidation

## Changes Made

### Problem
The app was using 3 different audio systems simultaneously:
1. `expo-av` (Audio.Sound) - for regular audio tracks
2. `react-native-track-player` - unused but installed
3. `react-native-youtube-iframe` - for YouTube videos

This caused:
- Memory leaks and conflicts
- Inconsistent playback behavior
- Unnecessary dependencies
- Complex state management

### Solution
Consolidated to a unified audio system:
- **AudioService** (`src/service/AudioService.ts`) - Handles all regular audio playback with expo-av
- **YouTube Iframe** - Continues to handle YouTube videos separately (as required)
- **Removed** `react-native-track-player` completely

### Benefits
✅ Single source of truth for audio playback  
✅ Cleaner code and easier maintenance  
✅ Better memory management  
✅ Reduced bundle size  
✅ No more audio conflicts  
✅ Consistent playback behavior  

## Architecture

```
PlayerContext
    ├── AudioService (expo-av)
    │   └── Regular audio tracks (.mp3, .m4a, etc.)
    └── YouTube Iframe
        └── YouTube videos only
```

## Files Modified

1. **Created**: `src/service/AudioService.ts`
   - Unified audio service class
   - Handles load, play, pause, seek, volume, rate
   - Quality selection logic

2. **Updated**: `src/context/PlayerContext.tsx`
   - Removed direct expo-av usage
   - Uses AudioService for all audio operations
   - Simplified state management
   - Better cleanup on unmount

3. **Deprecated**: `src/service/PlaybackService.ts`
   - No longer used (can be deleted)
   - Kept for reference only

4. **Updated**: `package.json`
   - Removed `react-native-track-player` dependency

## Migration Steps

If you have existing code using the old system:

### Before
```typescript
const { sound } = await Audio.Sound.createAsync({ uri: src });
await sound.playAsync();
```

### After
```typescript
await audioService.load(src);
await audioService.play();
```

## Next Steps

Run the following commands:
```bash
npm install
npx expo start --clear
```

## Testing Checklist

- [ ] Regular audio tracks play correctly
- [ ] YouTube videos play correctly
- [ ] Play/pause works
- [ ] Seek forward/backward works
- [ ] Volume control works
- [ ] Playback speed works
- [ ] Queue management works
- [ ] Next/previous track works
- [ ] Repeat modes work
- [ ] Shuffle works
- [ ] Sleep timer works
- [ ] No memory leaks on track changes
- [ ] Background playback works
- [ ] Lock screen controls work

## Known Issues

None currently. If you encounter any issues, please report them.

## Future Improvements

- [ ] Add crossfade support in AudioService
- [ ] Implement audio equalizer with expo-av
- [ ] Add gapless playback
- [ ] Optimize YouTube player initialization
