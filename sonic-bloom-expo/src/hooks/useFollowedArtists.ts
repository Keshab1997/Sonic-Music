import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const ARTISTS_KEY_PREFIX = 'sonic_followed_artists_';

export interface FollowedArtist {
  id: string;
  artistId: string;
  name: string;
  image?: string;
  followedAt: number;
}

export const useFollowedArtists = () => {
  const { user } = useAuth();
  const [artists, setArtists] = useState<FollowedArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const prevUserIdRef = useRef<string | null>(null);

  const getStorageKey = useCallback(() => {
    return user ? `${ARTISTS_KEY_PREFIX}${user.id}` : null;
  }, [user]);

  useEffect(() => {
    if (prevUserIdRef.current && prevUserIdRef.current !== user?.id) {
      setArtists([]);
    }
    prevUserIdRef.current = user?.id || null;
    loadArtists();
  }, [user]);

  const loadArtists = async () => {
    try {
      setLoading(true);
      if (user) {
        const { data, error } = await supabase
          .from('followed_artists')
          .select('*')
          .order('followed_at', { ascending: false });
        
        if (!error && data) {
          const mapped: FollowedArtist[] = data.map(a => ({
            id: a.id,
            artistId: a.artist_id,
            name: a.artist_name,
            image: a.artist_image,
            followedAt: new Date(a.followed_at).getTime(),
          }));
          setArtists(mapped);
          const key = getStorageKey();
          if (key) await AsyncStorage.setItem(key, JSON.stringify(mapped));
          return;
        }
      } else {
        setArtists([]);
      }
    } catch (e) {
      console.error('Failed to load followed artists:', e);
    } finally {
      setLoading(false);
    }
  };

  const followArtist = async (artistId: string, name: string, image?: string) => {
    if (!user) return;
    try {
      await supabase.from('followed_artists').insert({
        user_id: user.id,
        artist_id: artistId,
        artist_name: name,
        artist_image: image,
      });
      const newArtist: FollowedArtist = { id: Date.now().toString(), artistId, name, image, followedAt: Date.now() };
      const updated = [newArtist, ...artists];
      setArtists(updated);
      const key = getStorageKey();
      if (key) await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to follow artist:', e);
    }
  };

  const unfollowArtist = async (artistId: string) => {
    try {
      await supabase.from('followed_artists').delete().eq('artist_id', artistId);
      const updated = artists.filter(a => a.artistId !== artistId);
      setArtists(updated);
      const key = getStorageKey();
      if (key) await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to unfollow artist:', e);
    }
  };

  const isFollowing = useCallback((artistId: string) => {
    return artists.some(a => a.artistId === artistId);
  }, [artists]);

  return { artists, loading, followArtist, unfollowArtist, isFollowing };
};
