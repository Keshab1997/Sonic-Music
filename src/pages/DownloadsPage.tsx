import { useState } from "react";
import { Download, Play, Trash2, Music, WifiOff, CheckCircle, AlertCircle, HardDrive } from "lucide-react";
import { useDownloads } from "@/hooks/useDownloads";
import { usePlayer } from "@/context/PlayerContext";
import { Track } from "@/data/playlist";

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const DownloadsPage = () => {
  const { downloads, removeDownload, clearAllDownloads, getOfflineTrack, isDownloading, downloadProgress, downloadToDevice, downloadAllToDevice } = useDownloads();
  const { playTrackList } = usePlayer();
  const [confirmClear, setConfirmClear] = useState(false);

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Download size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Downloads</h1>
              <p className="text-sm text-muted-foreground">{downloads.length} songs available offline</p>
            </div>
          </div>
          {downloads.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={downloadAllToDevice}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors flex items-center gap-2"
                title="Download all to device"
              >
                <HardDrive size={14} /> Save All to Device
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  confirmClear
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {confirmClear ? "Confirm Clear All" : "Clear All"}
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
              Total size: ~{(downloads.reduce((acc, d) => acc + (d.audioData.byteLength / (1024 * 1024)), 0)).toFixed(1)} MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
