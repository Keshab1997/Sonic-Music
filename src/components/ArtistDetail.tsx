import { useState, useEffect } from "react";
import { X, Play, Loader2 } from "lucide-react";
import { Track } from "@/data/playlist";
import { usePlayer } from "@/context/PlayerContext";

interface ArtistDetailProps {
  artistName: string;
  searchQuery: string;
  onClose: () => void;
}

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

export const ArtistDetail = ({ artistName, searchQuery, onClose }: ArtistDetailProps) => {
  const { playTrackList } = usePlayer();
  const [songs, setSongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}&page=1&limit=20`)
      .then((res) => res.json())
      .then((data) => {
        const results = data.data?.results || [];
        const tracks: Track[] = results
          .filter((s: { downloadUrl?: unknown[] }) => s.downloadUrl?.length > 0)
          .map((s: {
            name: string;
            primaryArtists: string;
            album: { name: string } | string;
            duration: string | number;
            image: { quality: string; link: string }[];
            downloadUrl: { quality: string; link: string }[];
            id: string;
          }, i: number) => {
            const url96 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "96kbps")?.link;
            const url160 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "160kbps")?.link;
            const url320 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "320kbps")?.link;
            const bestUrl = url160 || url96 || url320 || s.downloadUrl?.[0]?.link || "";
            return {
              id: 7000 + i,
              title: s.name,
              artist: s.primaryArtists || artistName,
              album: typeof s.album === "string" ? s.album : s.album?.name || "",
              cover: s.image?.find((img: { quality: string }) => img.quality === "500x500")?.link ||
                     s.image?.[s.image.length - 1]?.link || "",
              src: bestUrl,
              duration: parseInt(String(s.duration)) || 0,
              type: "audio" as const,
              songId: s.id,
              audioUrls: {
                ...(url96 ? { "96kbps": url96 } : {}),
                ...(url160 ? { "160kbps": url160 } : {}),
                ...(url320 ? { "320kbps": url320 } : {}),
              },
            };
          });
        setSongs(tracks);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[80vh] glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{artistName}</h2>
            <p className="text-xs text-muted-foreground">{songs.length} songs</p>
          </div>
          <div className="flex items-center gap-2">
            {songs.length > 0 && (
              <button
                onClick={() => playTrackList(songs, 0)}
                className="px-3 py-1.5 text-xs rounded-full bg-primary text-primary-foreground font-medium hover:brightness-110 transition-all"
              >
                Play All
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh] p-3 space-y-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          )}
          {!loading && songs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No songs found</p>
          )}
          {songs.map((track, i) => (
            <div
              key={`${track.src}-${i}`}
              onClick={() => playTrackList(songs, i)}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent cursor-pointer transition-colors group"
            >
              <div className="relative flex-shrink-0">
                <img src={track.cover} alt="" className="w-11 h-11 rounded-md object-cover" />
                <div className="absolute inset-0 rounded-md bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Play size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                <p className="text-xs text-muted-foreground truncate">{track.album}</p>
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
