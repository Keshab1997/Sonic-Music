import React, { createContext, useContext, ReactNode } from 'react';
import { useLikedSongs, LikedSong } from '../hooks/useLikedSongs';
import { Track } from '../data/playlist';

interface LikedSongsContextType {
  likedSongs: LikedSong[];
  loading: boolean;
  isLiked: (trackId: string) => boolean;
  toggleLike: (track: Track) => Promise<void>;
  clearAll: () => Promise<void>;
}

const LikedSongsContext = createContext<LikedSongsContextType | undefined>(undefined);

export function LikedSongsProvider({ children }: { children: ReactNode }) {
  const likedSongs = useLikedSongs();
  return (
    <LikedSongsContext.Provider value={likedSongs}>
      {children}
    </LikedSongsContext.Provider>
  );
}

export function useLikedSongsContext() {
  const ctx = useContext(LikedSongsContext);
  if (!ctx) throw new Error('useLikedSongsContext must be used within LikedSongsProvider');
  return ctx;
}
