
import { useState, useCallback, useEffect } from "react";

export interface FavoriteArtist {
  id: string;
  name: string;
  image: string;
}

const KEY = "sonic_artist_favorites";

export const useArtistFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteArtist[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setFavorites(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const save = useCallback((list: FavoriteArtist[]) => {
    setFavorites(list);
    localStorage.setItem(KEY, JSON.stringify(list));
  }, []);

  const addFavorite = useCallback((artist: FavoriteArtist) => {
    setFavorites((prev) => {
      if (prev.some((a) => a.id === artist.id)) return prev;
      const updated = [artist, ...prev];
      localStorage.setItem(KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFavorite = useCallback((artistId: string) => {
    setFavorites((prev) => {
      const updated = prev.filter((a) => a.id !== artistId);
      localStorage.setItem(KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isFavorite = useCallback(
    (artistId: string) => favorites.some((a) => a.id === artistId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (artist: FavoriteArtist) => {
      if (isFavorite(artist.id)) {
        removeFavorite(artist.id);
      } else {
        addFavorite(artist);
      }
    },
    [isFavorite, removeFavorite, addFavorite]
  );

  return { favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite };
};

