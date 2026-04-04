import React, { createContext, useContext, ReactNode } from 'react';
import { useDownloads, DownloadedTrack } from '../hooks/useDownloads';

interface DownloadsContextType {
  downloads: DownloadedTrack[];
  downloading: Record<string, number>;
  isDownloaded: (trackId: string) => boolean;
  getDownloadedTrack: (trackId: string) => DownloadedTrack | undefined;
  downloadTrack: (track: any) => Promise<void>;
  deleteTrack: (trackId: string) => Promise<void>;
  deleteAll: () => Promise<void>;
  getDownloadProgress: (trackId: string) => number;
  isDownloading: (trackId: string) => boolean;
}

const DownloadsContext = createContext<DownloadsContextType | undefined>(undefined);

export function DownloadsProvider({ children }: { children: ReactNode }) {
  const downloads = useDownloads();
  return (
    <DownloadsContext.Provider value={downloads}>
      {children}
    </DownloadsContext.Provider>
  );
}

export function useDownloadsContext() {
  const ctx = useContext(DownloadsContext);
  if (!ctx) throw new Error('useDownloadsContext must be used within DownloadsProvider');
  return ctx;
}
