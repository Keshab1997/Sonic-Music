import { useState, useEffect, useCallback } from "react";
import { Track } from "@/data/playlist";
import {
  DB_NAME,
  DB_VERSION,
  STORE_NAME,
  DOWNLOAD_TIMEOUT_MS,
  DOWNLOAD_PROGRESS_CLEAR_MS,
  MIN_AUDIO_FILE_SIZE,
} from "@/lib/constants";
import { toast } from "sonner";

interface DownloadedTrack {
  id: string;
  track: Track;
  audioData: ArrayBuffer;
  downloadedAt: number;
}

interface PartialDownload {
  id: string;
  track: Track;
  chunks: ArrayBuffer[];
  receivedBytes: number;
  totalBytes: number;
  startedAt: number;
}

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new Error("Failed to open IndexedDB"));
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("partialDownloads")) {
        database.createObjectStore("partialDownloads", { keyPath: "id" });
      }
    };
  });
};

export class DownloadError extends Error {
  constructor(
    message: string,
    public readonly trackId: string,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = "DownloadError";
  }
}

export const useDownloads = () => {
  const [downloads, setDownloads] = useState<DownloadedTrack[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        request.onerror = () => {
          console.error("Failed to load downloads:", request.error);
          toast.error("Failed to load downloads from storage");
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Error loading downloads:", message);
        toast.error("Could not access download storage");
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

  const getError = useCallback((trackId: string) => {
    return errors[trackId] || null;
  }, [errors]);

  const clearError = useCallback((trackId: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[trackId];
      return next;
    });
  }, []);

  const savePartialDownload = useCallback(async (partial: PartialDownload) => {
    try {
      const database = await openDB();
      const transaction = database.transaction("partialDownloads", "readwrite");
      const store = transaction.objectStore("partialDownloads");
      store.put(partial);
    } catch (error) {
      console.error("Failed to save partial download:", error);
    }
  }, []);

  const getPartialDownload = useCallback(async (trackId: string): Promise<PartialDownload | null> => {
    try {
      const database = await openDB();
      const transaction = database.transaction("partialDownloads", "readonly");
      const store = transaction.objectStore("partialDownloads");
      const request = store.get(trackId);
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }, []);

  const clearPartialDownload = useCallback(async (trackId: string) => {
    try {
      const database = await openDB();
      const transaction = database.transaction("partialDownloads", "readwrite");
      const store = transaction.objectStore("partialDownloads");
      store.delete(trackId);
    } catch (error) {
      console.error("Failed to clear partial download:", error);
    }
  }, []);

  const downloadTrack = useCallback(async (track: Track) => {
    const trackId = track.songId || track.src;
    
    if (isDownloaded(trackId)) {
      toast.info("Already downloaded", { description: `${track.title} is already downloaded` });
      return;
    }
    
    if (isDownloading(trackId)) {
      return;
    }

    clearError(trackId);
    setDownloadingIds((prev) => new Set(prev).add(trackId));
    setDownloadProgress((prev) => ({ ...prev, [trackId]: 0 }));

    try {
      const partial = await getPartialDownload(trackId);
      let startFrom = 0;
      const existingChunks: ArrayBuffer[] = [];
      
      if (partial && partial.receivedBytes > 0) {
        startFrom = partial.receivedBytes;
        existingChunks.push(...partial.chunks);
        toast.info("Resuming download", { description: `Continuing ${track.title} from where it left off` });
      }

      let audioUrl: string;
      if (track.type === "youtube" && track.songId) {
        audioUrl = `/api/proxy-yt-download?id=${track.songId}`;
      } else {
        audioUrl = track.src;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

      const response = await fetch(audioUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...(startFrom > 0 ? { 'Range': `bytes=${startFrom}-` } : {}),
        }
      });
      clearTimeout(timeout);
      
      if (!response.ok) {
        if (response.status === 416 && startFrom > 0) {
          await clearPartialDownload(trackId);
          throw new DownloadError("Download range not available, restarting...", trackId, true);
        }
        throw new DownloadError(
          `Failed to fetch audio: ${response.status} ${response.statusText}`,
          trackId,
          response.status >= 500
        );
      }

      const contentLength = response.headers.get('content-length');
      const contentRange = response.headers.get('content-range');
      let totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      
      if (contentRange && partial) {
        const totalSize = parseInt(contentRange.split('/')[1], 10);
        totalBytes = totalSize - startFrom;
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        const arrayBuffer = await response.arrayBuffer();
        
        if (arrayBuffer.byteLength < MIN_AUDIO_FILE_SIZE) {
          throw new DownloadError(`Downloaded file too small: ${arrayBuffer.byteLength} bytes`, trackId, false);
        }

        const combinedBuffer = new ArrayBuffer(startFrom + arrayBuffer.byteLength);
        const view = new Uint8Array(combinedBuffer);
        let offset = 0;
        for (const chunk of existingChunks) {
          view.set(new Uint8Array(chunk), offset);
          offset += chunk.byteLength;
        }
        view.set(new Uint8Array(arrayBuffer), offset);

        const database = await openDB();
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const downloadedTrack: DownloadedTrack = {
          id: trackId,
          track,
          audioData: combinedBuffer,
          downloadedAt: Date.now(),
        };
        store.put(downloadedTrack);
        await clearPartialDownload(trackId);
        setDownloads((prev) => [...prev, downloadedTrack]);
        setDownloadProgress((prev) => ({ ...prev, [trackId]: 100 }));
        toast.success("Download complete", { description: `${track.title} is ready for offline playback` });
        return;
      }

      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        receivedBytes += value.length;
        
        const totalReceived = startFrom + receivedBytes;
        if (totalBytes > 0) {
          const progress = Math.round((totalReceived / (startFrom + totalBytes)) * 100);
          setDownloadProgress((prev) => ({ ...prev, [trackId]: progress }));
        }
        
        if (totalBytes > 0 && Math.round((totalReceived / (startFrom + totalBytes)) * 100) % 10 === 0) {
          const partialDownload: PartialDownload = {
            id: trackId,
            track,
            chunks: [...existingChunks, ...chunks.map(c => c.buffer)],
            receivedBytes: totalReceived,
            totalBytes: startFrom + totalBytes,
            startedAt: partial?.startedAt || Date.now(),
          };
          await savePartialDownload(partialDownload);
        }
      }

      const totalReceived = startFrom + receivedBytes;
      const arrayBuffer = new ArrayBuffer(totalReceived);
      const view = new Uint8Array(arrayBuffer);
      let offset = 0;
      for (const chunk of existingChunks) {
        view.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }
      for (const chunk of chunks) {
        view.set(chunk, offset);
        offset += chunk.length;
      }

      if (totalReceived < MIN_AUDIO_FILE_SIZE) {
        throw new DownloadError(`Downloaded file too small: ${totalReceived} bytes`, trackId, false);
      }

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
      await clearPartialDownload(trackId);

      setDownloads((prev) => [...prev, downloadedTrack]);
      setDownloadProgress((prev) => ({ ...prev, [trackId]: 100 }));
      toast.success("Download complete", { description: `${track.title} is ready for offline playback` });
    } catch (error) {
      const downloadError = error instanceof DownloadError 
        ? error 
        : new DownloadError(error instanceof Error ? error.message : "Unknown error occurred", trackId, true);
      
      console.error("Download failed:", downloadError.message);
      setErrors((prev) => ({ ...prev, [trackId]: downloadError.message }));
      setDownloadProgress((prev) => ({ ...prev, [trackId]: -1 }));
      
      toast.error("Download failed", { 
        description: downloadError.message,
        action: downloadError.retryable ? {
          label: "Retry",
          onClick: () => downloadTrack(track),
        } : undefined,
      });
      
      setTimeout(() => {
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[trackId];
          return next;
        });
      }, DOWNLOAD_PROGRESS_CLEAR_MS);
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
    }
  }, [isDownloaded, isDownloading, clearError, getPartialDownload, clearPartialDownload, savePartialDownload]);

  const retryDownload = useCallback(async (track: Track) => {
    const trackId = track.songId || track.src;
    clearError(trackId);
    await downloadTrack(track);
  }, [clearError, downloadTrack]);

  const removeDownload = useCallback(async (trackId: string) => {
    try {
      const database = await openDB();
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.delete(trackId);
      
      const partialTransaction = database.transaction("partialDownloads", "readwrite");
      const partialStore = partialTransaction.objectStore("partialDownloads");
      partialStore.delete(trackId);

      setDownloads((prev) => prev.filter((d) => d.id !== trackId));
      clearError(trackId);
      toast.success("Download removed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove download";
      console.error("Failed to remove download:", message);
      toast.error("Failed to remove download");
    }
  }, [clearError]);

  const clearAllDownloads = useCallback(async () => {
    try {
      const database = await openDB();
      const transaction = database.transaction([STORE_NAME, "partialDownloads"], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const partialStore = transaction.objectStore("partialDownloads");
      store.clear();
      partialStore.clear();
      setDownloads([]);
      setErrors({});
      toast.success("All downloads cleared");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to clear downloads";
      console.error("Failed to clear downloads:", message);
      toast.error("Failed to clear downloads");
    }
  }, []);

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
      src: "",
    }));
  }, [downloads]);

  const downloadToDevice = useCallback((trackId: string) => {
    const downloaded = downloads.find((d) => d.id === trackId);
    if (!downloaded) {
      toast.error("Download not found");
      return;
    }

    try {
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
      toast.success("File saved to device");
    } catch {
      toast.error("Failed to save file");
    }
  }, [downloads]);

  const downloadAllToDevice = useCallback(() => {
    downloads.forEach((d, i) => {
      setTimeout(() => {
        try {
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
        } catch {
          console.error(`Failed to save ${d.track.title}`);
        }
      }, i * 500);
    });
  }, [downloads]);

  return {
    downloads,
    downloadingIds,
    downloadProgress,
    errors,
    isDownloaded,
    isDownloading,
    getProgress,
    getError,
    clearError,
    downloadTrack,
    retryDownload,
    removeDownload,
    clearAllDownloads,
    getOfflineTrack,
    getDownloadedTracks,
    downloadToDevice,
    downloadAllToDevice,
  };
};
