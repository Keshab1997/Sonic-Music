import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '../data/playlist';

const LIKED_TRACKS_KEY = 'sonic_liked_tracks_full';

export const useLikedSongs = () => {
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(LIKED_TRACKS_KEY)
      .then((stored) => { if (stored) setLikedTracks(JSON.parse(stored)); })
      .catch(() => {});
  }, []);

  const persist = useCallback((tracks: Track[]) => {
    AsyncStorage.setItem(LIKED_TRACKS_KEY, JSON.stringify(tracks)).catch(() => {});
  }, []);

  const isLiked = useCallback(
    (trackId: string) => likedTracks.some((t) => String(t.id) === trackId),
    [likedTracks]
  );

  const likeTrack = useCallback((track: Track) => {
    setLikedTracks((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      const next = [track, ...prev];
      persist(next);
      return next;
    });
  }, [persist]);

  const unlikeTrack = useCallback((trackId: string) => {
    setLikedTracks((prev) => {
      const next = prev.filter((t) => String(t.id) !== trackId);
      persist(next);
      return next;
    });
  }, [persist]);

  const toggleLike = useCallback((track: Track) => {
    if (isLiked(String(track.id))) unlikeTrack(String(track.id));
    else likeTrack(track);
  }, [isLiked, likeTrack, unlikeTrack]);

  return { likedTracks, isLiked, likeTrack, unlikeTrack, toggleLike };
};
