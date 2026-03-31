import { useState, useEffect, useCallback } from "react";
import { X, Play, Loader2, RefreshCw, Save, Check, Music2 } from "lucide-react";
import { Track } from "@/data/playlist";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";

interface ArtistPlaylistProps {
  artistName: string;
  searchQuery: string;
  onClose: () => void;
}

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

const shuffleArray = <T,>(arr: T[]): T[] => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const parseSong = (s: {
  name: string;
  primaryArtists: string;
  album: { name: string } | string;
  duration: string | number;
  image: { quality: string; link: string }[];
  downloadUrl: { quality: string; link: string }[];
  id: string;
}, i: number): Track => {
  const url96 = s.downloadUrl?.find((d) => d.quality === "96kbps")?.link;
  const url160 = s.downloadUrl?.find((d) => d.quality === "160kbps")?.link;
  const url320 = s.downloadUrl?.find((d) => d.quality === "320kbps")?.link;
  const bestUrl = url160 || url96 || url320 || s.downloadUrl?.[0]?.link || "";
  return {
    id: 10000 + i,
    title: s.name,
    artist: s.primaryArtists || "Unknown",
    album: typeof s.album === "string" ? s.album : s.album?.name || "",
    cover: s.image?.find((img) => img.quality === "500x500")?.link ||
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
};

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const ArtistPlaylist = ({ artistName, searchQuery, onClose }: ArtistPlaylistProps) => {
  const { playTrackList, currentTrack, isPlaying, tracks: playerTracks } = usePlayer();
  const { createPlaylist, addToPlaylist } = usePlaylists();

  const [songs, setSongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showEnded, setShowEnded] = useState(false);
  const [error, setError] = useState(false);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    setShowEnded(false);
    setError(false);
    setSongs([]);
    try {
      const page = Math.floor(Math.random() * 3) + 1;
      const ts = Date.now();
      const rand = Math.random().toString(36).slice(2, 10);
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}&page=${page}&limit=20&_t=${ts}&_r=${rand}`);
      if (!res.ok) { setLoading(false); setError(true); return; }
      const data = await res.json();
      const results = data.data?.results || [];
      const filtered = results.filter((s: { downloadUrl?: unknown[] }) => s.downloadUrl?.length > 0);
      const shuffled = shuffleArray(filtered);
      const tracks = shuffled.slice(0, 20).map((s: {
        name: string;
        primaryArtists: string;
        album: { name: string } | string;
        duration: string | number;
        image: { quality: string; link: string }[];
        downloadUrl: { quality: string; link: string }[];
        id: string;
      }, i: number) => parseSong(s, i));
      setSongs(tracks);
      setSaved(false);
    } catch { setError(true); }
    setLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  useEffect(() => {
    if (songs.length === 0) return;
    const isCurrentArtistPlaylist = songs.some((s) => s.src === currentTrack?.src);
    if (!isCurrentArtistPlaylist) return;
    if (isPlaying) setShowEnded(false);
  }, [currentTrack?.src, isPlaying, songs]);

  useEffect(() => {
    if (songs.length === 0 || !currentTrack) return;
    const isCurrentArtistPlaylist = songs.some((s) => s.src === currentTrack.src);
    if (!isCurrentArtistPlaylist) return;
    const currentIdx = playerTracks.findIndex((t) => t.src === currentTrack.src);
    if (currentIdx === playerTracks.length - 1 && !isPlaying) {
      setShowEnded(true);
    }
  }, [isPlaying, currentTrack, playerTracks, songs]);

  const handleSave = () => {
    if (songs.length === 0) return;
    const pl = createPlaylist(`${artistName} - Top 20`);
    songs.forEach((track) => addToPlaylist(pl.id, track));
    setSaved(true);
  };

  const isArtistActive = songs.some((s) => s.src === currentTrack?.src);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] glass-heavy border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-3 md:p-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="min-w-0 flex-1 mr-2">
            <h2 className="text-base md:text-lg font-bold text-foreground truncate">{artistName}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">{songs.length} songs</p>
              <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <Music2 size={9} /> Playlist
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSongs}
              disabled={loading}
              className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh songs"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleSave}
              disabled={loading || songs.length === 0 || saved}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all flex items-center gap-1.5 ${
                saved
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
              }`}
            >
              {saved ? <><Check size={13} /> Saved</> : <><Save size={13} /> Save</>}
            </button>
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

        {showEnded && isArtistActive && (
          <div className="mx-3 md:mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 flex-shrink-0">
            <Music2 size={18} className="text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-300">{artistName} er gaan sesh hoye geche!</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Notun list pete Refresh button e click korun</p>
            </div>
            <button
              onClick={fetchSongs}
              className="px-3 py-1.5 text-[10px] rounded-full bg-amber-500/20 text-amber-300 font-medium hover:bg-amber-500/30 transition-colors flex-shrink-0"
            >
              Refresh
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-3 space-y-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          )}
          {!loading && songs.length === 0 && !error && (
            <p className="text-sm text-muted-foreground text-center py-12">No songs found</p>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <p className="text-sm text-destructive">Songs load korte somossa hoyeche</p>
              <button
                onClick={fetchSongs}
                className="px-4 py-2 text-xs rounded-full bg-primary text-primary-foreground font-medium hover:brightness-110 transition-all"
              >
                Abar try korun
              </button>
            </div>
          )}
          {songs.map((track, i) => {
            const isActive = currentTrack?.src === track.src;
            return (
              <div
                key={`${track.src}-${i}`}
                onClick={() => playTrackList(songs, i)}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors group ${
                  isActive ? "bg-primary/10" : "hover:bg-accent"
                }`}
              >
                <div className="relative flex-shrink-0 w-8 text-center">
                  <span className="text-xs text-muted-foreground group-hover:hidden">{i + 1}</span>
                  <Play size={14} className="text-primary hidden group-hover:block mx-auto" />
                </div>
                <div className="relative flex-shrink-0">
                  <img src={track.cover} alt="" className={`w-11 h-11 rounded-md object-cover ${isActive ? "ring-1 ring-primary" : ""}`} />
                  {isActive && isPlaying && (
                    <div className="absolute inset-0 rounded-md bg-black/40 flex items-center justify-center">
                      <div className="flex items-end gap-0.5">
                        <span className="w-0.5 h-2 bg-white rounded-full animate-pulse-glow" />
                        <span className="w-0.5 h-3 bg-white rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
                        <span className="w-0.5 h-2 bg-white rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>{track.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.album}</p>
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                  {formatDuration(track.duration)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
