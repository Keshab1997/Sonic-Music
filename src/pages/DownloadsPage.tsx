import { useState, useEffect } from "react";
import { Download, Play, Trash2, Music, WifiOff, CheckCircle, AlertCircle, HardDrive, AlertTriangle } from "lucide-react";
import { useDownloads } from "@/hooks/useDownloads";
import { usePlayer } from "@/context/PlayerContext";
import { Track } from "@/data/playlist";
import { toast } from "sonner";

// Storage warning threshold (500MB)
const STORAGE_WARNING_THRESHOLD = 500 * 1024 * 1024;
// Maximum storage limit (800MB - IndexedDB typically allows ~1GB per origin)
const STORAGE_MAX_LIMIT = 800 * 1024 * 1024;

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const DownloadsPage = () => {
  const { downloads, removeDownload, clearAllDownloads, getOfflineTrack, isDownloading, downloadProgress, downloadToDevice, downloadAllToDevice } = useDownloads();
  const { playTrackList } = usePlayer();
  const [confirmClear, setConfirmClear] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageWarning, setStorageWarning] = useState(false);
  const [storageCritical, setStorageCritical] = useState(false);

  // Calculate storage usage on mount and when downloads change
  useEffect(() => {
    const totalBytes = downloads.reduce((acc, d) => acc + d.audioData.byteLength, 0);
    setStorageUsed(totalBytes);
    setStorageWarning(totalBytes > STORAGE_WARNING_THRESHOLD);
    setStorageCritical(totalBytes > STORAGE_MAX_LIMIT);
    
    if (totalBytes > STORAGE_MAX_LIMIT) {
      toast.warning("Storage almost full!", {
        description: "You've used most of your offline storage. Consider removing some downloads.",
        duration: 5000,
      });
    }
  }, [downloads]);

  const handlePlayAll = () => {
    if (downloads.length === 0) return;
    const tracks: Track[] = downloads.map((d) => {
      const offlineSrc = getOfflineTrack(d.id);
      return {
        ...d.track,
        src: offlineSrc || d.track.src,
        type: "audio" as const,
      };
    });
    playTrackList(tracks, 0);
  };

  const handlePlaySingle = (index: number) => {
    const d = downloads[index];
    const offlineSrc = getOfflineTrack(d.id);
    const tracks: Track[] = downloads.map((dl, i) => ({
      ...dl.track,
      src: i === index ? (offlineSrc || dl.track.src) : dl.track.src,
      type: "audio" as const,
    }));
    playTrackList(tracks, index);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32">
      <div className="px-4 md:px-6 py-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <Download size={20} className="text-white md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Downloads</h1>
              <p className="text-xs md:text-sm text-muted-foreground">{downloads.length} songs available offline</p>
            </div>
          </div>
          {downloads.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={downloadAllToDevice}
                className="px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors flex items-center gap-1.5"
                title="Download all to device"
              >
                <HardDrive size={12} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Save All to Device</span><span className="sm:hidden">Save All</span>
              </button>
              <button
                onClick={() => {
                  if (confirmClear) {
                    clearAllDownloads();
                    setConfirmClear(false);
                  } else {
                    setConfirmClear(true);
                    setTimeout(() => setConfirmClear(false), 5000);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  confirmClear
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {confirmClear ? "Confirm" : "Clear All"}
              </button>
            </div>
          )}
        </div>

        {/* Play All Button */}
        {downloads.length > 0 && (
          <button
            onClick={handlePlayAll}
            className="w-full mb-6 p-4 rounded-xl bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 hover:border-green-500/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play size={18} className="text-white ml-0.5" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Play All Downloads</p>
                <p className="text-xs text-muted-foreground">{downloads.length} songs • Offline</p>
              </div>
            </div>
          </button>
        )}

        {/* Empty State */}
        {downloads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <WifiOff size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Downloads Yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Download songs to listen offline. Look for the download icon on any song.
            </p>
          </div>
        )}

        {/* Downloads List */}
        {downloads.length > 0 && (
          <div className="space-y-2">
            {downloads.map((d, i) => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors group"
              >
                {/* Cover Image */}
                <div className="relative flex-shrink-0">
                  <img
                    src={d.track.cover}
                    alt={d.track.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                    <button
                      onClick={() => handlePlaySingle(i)}
                      className="w-8 h-8 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Play size={14} className="text-primary-foreground ml-0.5" />
                    </button>
                  </div>
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.track.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.track.artist}</p>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-2">
                  {isDownloading(d.id) ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${downloadProgress[d.id] || 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{downloadProgress[d.id]}%</span>
                    </div>
                  ) : (
                    <>
                      <CheckCircle size={14} className="text-green-500" />
                      <span className="text-[10px] text-muted-foreground">{formatDuration(d.track.duration)}</span>
                      <button
                        onClick={() => downloadToDevice(d.id)}
                        className="p-1.5 rounded-full text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Save to device"
                      >
                        <HardDrive size={14} />
                      </button>
                      <button
                        onClick={() => removeDownload(d.id)}
                        className="p-1.5 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove download"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Storage Warning Banner */}
        {storageCritical && (
          <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-500">Storage Almost Full</p>
              <p className="text-xs text-red-400/80 mt-1">
                You've used {(storageUsed / (1024 * 1024)).toFixed(1)} MB of ~800 MB. Remove some downloads to free up space.
              </p>
            </div>
          </div>
        )}
        
        {storageWarning && !storageCritical && (
          <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
            <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-500">Storage Warning</p>
              <p className="text-xs text-yellow-400/80 mt-1">
                You've used {(storageUsed / (1024 * 1024)).toFixed(1)} MB. Consider removing some downloads.
              </p>
            </div>
          </div>
        )}

        {/* Storage Info */}
        {downloads.length > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Music size={14} className="text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Storage Used</span>
            </div>
            <p className="text-sm text-foreground">
              {downloads.length} song{downloads.length !== 1 ? "s" : ""} downloaded
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total size: ~{(storageUsed / (1024 * 1024)).toFixed(1)} MB
            </p>
            {/* Storage Progress Bar */}
            <div className="mt-3">
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    storageCritical ? "bg-red-500" : storageWarning ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, (storageUsed / STORAGE_MAX_LIMIT) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {(storageUsed / (1024 * 1024)).toFixed(1)} MB / ~{(STORAGE_MAX_LIMIT / (1024 * 1024)).toFixed(0)} MB ({((storageUsed / STORAGE_MAX_LIMIT) * 100).toFixed(0)}%)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
