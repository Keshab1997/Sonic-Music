import { useState, useEffect, useCallback } from "react";
import { Track } from "@/data/playlist";

const DB_NAME = "SonicBloomDownloads";
const DB_VERSION = 1;
const STORE_NAME = "tracks";

interface DownloadedTrack {
  id: string;
  track: Track;
  audioData: ArrayBuffer;
  downloadedAt: number;
}

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

export const useDownloads = () => {
  const [downloads, setDownloads] = useState<DownloadedTrack[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  // Load all downloads from IndexedDB on mount
  useEffect(() => {
    const loadDownloads = async () => {
      try {
        const database = await openDB();
        const transaction = database.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
          setDownloads(request.result || []);
        };
        request.onerror = () => console.error("Failed to load downloads:", request.error);
      } catch (error) {
        console.error("Error loading downloads:", error);
      }
    };
    loadDownloads();
  }, []);

  const isDownloaded = useCallback((trackId: string) => {
    return downloads.some((d) => d.id === trackId);
  }, [downloads]);

  const isDownloading = useCallback((trackId: string) => {
    return downloadingIds.has(trackId);
  }, [downloadingIds]);

  const getProgress = useCallback((trackId: string) => {
    return downloadProgress[trackId] || 0;
  }, [downloadProgress]);

  const downloadTrack = useCallback(async (track: Track) => {
    if (isDownloaded(track.songId || track.src) || isDownloading(track.songId || track.src)) {
      return;
    }

    const trackId = track.songId || track.src;
    setDownloadingIds((prev) => new Set(prev).add(trackId));
    setDownloadProgress((prev) => ({ ...prev, [trackId]: 0 }));

    try {
      // For YouTube tracks, fetch directly from Invidious
      let audioUrl = track.src;
      if (track.type === "youtube" && track.songId) {
        // Get audio URL from yt-stream API first
        const streamRes = await fetch(`/api/yt-stream?id=${track.songId}`);
        if (streamRes.ok) {
          const streamData = await streamRes.json().catch(() => null);
          if (streamData?.audioUrl) {
            audioUrl = streamData.audioUrl;
          }
        }
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      // Fetch the audio file with timeout
      const response = await fetch(audioUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      // Read the full response body
      const arrayBuffer = await response.arrayBuffer();
      console.log(`Downloaded ${arrayBuffer.byteLength} bytes for track ${trackId}`);

      // Verify we got a reasonable file size (at least 100KB for a song)
      if (arrayBuffer.byteLength < 100000) {
        throw new Error(`Downloaded file too small: ${arrayBuffer.byteLength} bytes`);
      }

      // Save to IndexedDB
      const database = await openDB();
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const downloadedTrack: DownloadedTrack = {
        id: trackId,
        track,
        audioData: arrayBuffer,
        downloadedAt: Date.now(),
      };
      store.put(downloadedTrack);

      // Update state
      setDownloads((prev) => [...prev, downloadedTrack]);
      setDownloadProgress((prev) => ({ ...prev, [trackId]: 100 }));

      setDownloadProgress((prev) => ({ ...prev, [trackId]: 100 }));
    } catch (error) {
      console.error("Download failed:", error);
      setDownloadProgress((prev) => ({ ...prev, [trackId]: -1 }));
      setTimeout(() => {
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[trackId];
          return next;
        });
      }, 3000);
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
    }
  }, [isDownloaded, isDownloading]);

  const removeDownload = useCallback(async (trackId: string) => {
    try {
      const database = await openDB();
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.delete(trackId);

      setDownloads((prev) => prev.filter((d) => d.id !== trackId));
    } catch (error) {
      console.error("Failed to remove download:", error);
    }
  }, []);

  const clearAllDownloads = useCallback(async () => {
    try {
      const database = await openDB();
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      setDownloads([]);
    } catch (error) {
      console.error("Failed to clear downloads:", error);
    }
  }, []);

  // Get offline-playable track (with blob URL)
  const getOfflineTrack = useCallback((trackId: string): string | null => {
    const downloaded = downloads.find((d) => d.id === trackId);
    if (downloaded) {
      const blob = new Blob([downloaded.audioData], { type: "audio/mpeg" });
      return URL.createObjectURL(blob);
    }
    return null;
  }, [downloads]);

  const getDownloadedTracks = useCallback((): Track[] => {
    return downloads.map((d) => ({
      ...d.track,
      src: "", // Will be replaced with blob URL during playback
    }));
  }, [downloads]);

  // Download to device as file
  const downloadToDevice = useCallback((trackId: string) => {
    const downloaded = downloads.find((d) => d.id === trackId);
    if (!downloaded) return;

    const blob = new Blob([downloaded.audioData], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileName = `${downloaded.track.title} - ${downloaded.track.artist}`.replace(/[^a-z0-9\s-]/gi, "").trim() + ".mp3";
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [downloads]);

  // Download all to device
  const downloadAllToDevice = useCallback(() => {
    downloads.forEach((d, i) => {
      setTimeout(() => {
        const blob = new Blob([d.audioData], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const fileName = `${d.track.title} - ${d.track.artist}`.replace(/[^a-z0-9\s-]/gi, "").trim() + ".mp3";
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, i * 500); // Stagger downloads to avoid browser blocking
    });
  }, [downloads]);

  return {
    downloads,
    downloadingIds,
    downloadProgress,
    isDownloaded,
    isDownloading,
    getProgress,
    downloadTrack,
    removeDownload,
    clearAllDownloads,
    getOfflineTrack,
    getDownloadedTracks,
    downloadToDevice,
    downloadAllToDevice,
  };
};
