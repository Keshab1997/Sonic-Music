import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Track } from '../data/playlist';

interface UseMediaSessionProps {
  track: Track | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek?: (time: number) => void;
}

export const useMediaSession = ({
  track,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onSeek,
}: UseMediaSessionProps) => {
  const handlersRef = useRef({ onPlay, onPause, onNext, onPrev, onSeek });

  // Update handlers ref
  useEffect(() => {
    handlersRef.current = { onPlay, onPause, onNext, onPrev, onSeek };
  }, [onPlay, onPause, onNext, onPrev, onSeek]);

  // Setup MediaSession for web
  useEffect(() => {
    if (Platform.OS !== 'web' || !('mediaSession' in navigator) || !track) return;

    // Set media metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || '',
      artwork: [
        { src: track.cover, sizes: '96x96', type: 'image/jpeg' },
        { src: track.cover, sizes: '128x128', type: 'image/jpeg' },
        { src: track.cover, sizes: '192x192', type: 'image/jpeg' },
        { src: track.cover, sizes: '256x256', type: 'image/jpeg' },
        { src: track.cover, sizes: '384x384', type: 'image/jpeg' },
        { src: track.cover, sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    // Set action handlers
    navigator.mediaSession.setActionHandler('play', () => handlersRef.current.onPlay());
    navigator.mediaSession.setActionHandler('pause', () => handlersRef.current.onPause());
    navigator.mediaSession.setActionHandler('nexttrack', () => handlersRef.current.onNext());
    navigator.mediaSession.setActionHandler('previoustrack', () => handlersRef.current.onPrev());
    if (handlersRef.current.onSeek) {
      navigator.mediaSession.setActionHandler('seekto', (details: any) => {
        if (details.seekTime) handlersRef.current.onSeek?.(details.seekTime);
      });
    }

    // Update playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [track?.id, isPlaying]);
};
