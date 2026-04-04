import { usePlayer } from '../context/PlayerContext';
import { useMemo } from 'react';

// Custom hook that returns stable references for callbacks
export const usePlayerControls = () => {
  const player = usePlayer();
  
  // Return only the control functions (these are stable)
  return useMemo(() => ({
    togglePlay: player.togglePlay,
    next: player.next,
    prev: player.prev,
    seek: player.seek,
    setVolume: player.setVolume,
    toggleShuffle: player.toggleShuffle,
    toggleRepeat: player.toggleRepeat,
  }), [
    player.togglePlay,
    player.next,
    player.prev,
    player.seek,
    player.setVolume,
    player.toggleShuffle,
    player.toggleRepeat,
  ]);
};

// Hook for player state (values that change)
export const usePlayerState = () => {
  const player = usePlayer();
  
  return useMemo(() => ({
    isPlaying: player.isPlaying,
    shuffle: player.shuffle,
    repeat: player.repeat,
    volume: player.volume,
    progress: player.progress,
    duration: player.duration,
  }), [
    player.isPlaying,
    player.shuffle,
    player.repeat,
    player.volume,
    player.progress,
    player.duration,
  ]);
};
