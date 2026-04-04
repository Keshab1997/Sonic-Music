
import { useState, useEffect, useCallback } from "react";
import { X, Play, Loader2, RefreshCw, Save, Check, Music2, ListPlus, Plus, Heart } from "lucide-react-native";
import { Track } from "@/data/playlist";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useLocalData } from "@/hooks/useLocalData";
import { useArtistFavorites } from "@/hooks/useArtistFavorites";
import { toast } from "@/hooks/use-toast";

interface ArtistPlaylistProps {
  artistName: string;
  searchQuery: string;
  artistId?: string;
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

export const ArtistPlaylist = ({ artistName, searchQuery, artistId, onClose }: ArtistPlaylistProps) => {
  const { playTrackList, currentTrack, isPlaying, tracks: playerTracks, addToQueue, playNext } = usePlayer();
  const { createPlaylist, addToPlaylist } = usePlaylists();
  const { isFavorite, toggleFavorite } = useLocalData();
  const { isFavorite: isArtistFavorite, toggleFavorite: toggleArtistFavorite } = useArtistFavorites();

  const [songs, setSongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showEnded, setShowEnded] = useState(false);
  const [error, setError] = useState(false);
  const [songMenu, setSongMenu] = useState<number | null>(null);
  const [artistImage, setArtistImage] = useState<string>("");

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    setShowEnded(false);
    setError(false);
    setSongs([]);
    try {
      const page = Math.floor(Math.random() * 3) + 1;
      const url = artistId
        ? `${API_BASE}/artists/${artistId}/songs?page=${page}`
        : `${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}&page=${page}&limit=20`;
      const res = await fetch(url);
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
      
      // Set artist image from first song
      if (tracks.length > 0 && !artistImage) {
        setArtistImage(tracks[0].cover);
      }
    } catch { setError(true); }
    setLoading(false);
  }, [searchQuery, artistId]);

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

  const handleAddAllToQueue = () => {
    if (songs.length === 0) return;
    songs.forEach(track => addToQueue(track));
    toast({
      title: "Added to Queue",
      description: `${songs.length} songs from ${artistName} added to your queue`,
      duration: 3000,
    });
  };

  const handleToggleFavorite = () => {
    const artist = {
      id: artistId || artistName.toLowerCase().replace(/\s+/g, '-'),
      name: artistName,
      image: artistImage || songs[0]?.cover || '',
    };
    
    const wasFavorite = isArtistFavorite(artist.id);
    toggleArtistFavorite(artist);
    
    toast({
      title: wasFavorite ? "Removed from Favorites" : "Added to Favorites",
      description: wasFavorite ? `${artistName} removed from your favorites` : `${artistName} added to your favorites`,
      duration: 3000,
    });
  };

  const isArtistActive = songs.some((s) => s.src === currentTrack?.src);
  const artistFavorited = isArtistFavorite(artistId || artistName.toLowerCase().replace(/\s+/g, '-'));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] glass-heavy border border-border sm:rounded-2xl rounded-t-2xl rounded-b-none shadow-2xl overflow-hidden flex flex-col">
        {/* Header Section */}
        <div className="relative px-4 pt-3 pb-3 sm:px-5 sm:pt-4 sm:pb-4 border-b border-border flex-shrink-0 overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
          <div className="absolute inset-0 backdrop-blur-sm" />

          <div className="relative z-10">
            {/* Top Row: Artist Name + Heart (Left) | Close Button (Right) */}
            <div className="flex items-center justify-between mb-2.5 sm:mb-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
                <h2 className="text-lg sm:text-2xl font-extrabold text-foreground truncate tracking-tight">{artistName}</h2>
                <button
                  onClick={handleToggleFavorite}
                  className={`p-1.5 sm:p-2 rounded-full transition-all hover:scale-110 active:scale-95 flex-shrink-0 ${
                    artistFavorited
                      ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-red-500"
                  }`}
                  title={artistFavorited ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart size={18} fill={artistFavorited ? "currentColor" : "none"} strokeWidth={2} />
                </button>
              </div>
              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-all hover:scale-110 active:scale-95 flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <p className="text-xs sm:text-sm text-muted-foreground">{songs.length} songs</p>
              <span className="text-[10px] text-primary bg-primary/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Music2 size={10} /> Artist Playlist
              </span>
              {artistFavorited && (
                <span className="text-[10px] text-red-500 bg-red-500/15 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Heart size={10} fill="currentColor" /> Favorite
                </span>
              )}
            </div>

            {/* Action Buttons - Responsive */}
            <div className="flex items-center gap-2 flex-wrap">
              {songs.length > 0 && (
                <button
                  onClick={() => playTrackList(songs, 0)}
                  className="px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-95 flex items-center gap-1.5 sm:gap-2"
                >
                  <Play size={14} fill="currentColor" />
                  Play All
                </button>
              )}
              <button
                onClick={handleAddAllToQueue}
                disabled={loading || songs.length === 0}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm rounded-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium transition-all active:scale-95 flex items-center gap-1.5 sm:gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ListPlus size={14} />
                Queue
              </button>
              <button
                onClick={handleSave}
                disabled={loading || songs.length === 0 || saved}
                className={`px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm rounded-full font-medium transition-all active:scale-95 flex items-center gap-1.5 sm:gap-2 ${
                  saved
                    ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                    : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
              </button>
              <button
                onClick={fetchSongs}
                disabled={loading}
                className="p-2 rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-all active:scale-95"
                title="Refresh songs"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>

        {showEnded && isArtistActive && (
          <div className="mx-3 sm:mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 flex-shrink-0">
            <Music2 size={18} className="text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-600">{artistName} er gaan sesh hoye geche!</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Notun list pete Refresh button e click korun</p>
            </div>
            <button
              onClick={fetchSongs}
              className="px-3 py-1.5 text-[10px] rounded-full bg-amber-500/20 text-amber-600 font-medium hover:bg-amber-500/30 transition-colors flex-shrink-0"
            >
              Refresh
            </button>
          </div>
        )}

        {/* Song List - Scrollable */}
        <div className="overflow-y-auto flex-1 px-3 sm:px-4 pt-3 pb-28 space-y-1.5 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          )}
          {!loading && songs.length === 0 && !error && (
            <p className="text-sm text-muted-foreground text-center py-16">No songs found</p>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-destructive">Songs load korte somossa hoyeche</p>
              <button
                onClick={fetchSongs}
                className="px-5 py-2.5 text-xs rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all active:scale-95"
              >
                Abar try korun
              </button>
            </div>
          )}
          {songs.map((track, i) => {
            const isActive = currentTrack?.src === track.src;
            const liked = isFavorite(track.src);
            return (
              <div
                key={`${track.src}-${i}`}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group relative ${
                  isActive
                    ? "bg-primary/15 border border-primary/25 shadow-sm shadow-primary/10"
                    : "hover:bg-accent/50 border border-transparent"
                }`}
              >
                <div className="relative flex-shrink-0 w-10 text-center" onClick={() => playTrackList(songs, i)}>
                  {isActive && isPlaying ? (
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse-glow" />
                      <span className="w-0.5 h-4 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
                      <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
                    </div>
                  ) : (
                    <>
                      <span className="text-sm text-muted-foreground group-hover:hidden font-medium">{i + 1}</span>
                      <Play size={16} className="text-primary hidden group-hover:block mx-auto" fill="currentColor" />
                    </>
                  )}
                </div>
                <div className="relative flex-shrink-0" onClick={() => playTrackList(songs, i)}>
                  <img src={track.cover} alt="" className={`w-12 h-12 rounded-lg object-cover shadow-sm transition-all ${isActive ? "ring-2 ring-primary" : "group-hover:ring-1 group-hover:ring-primary/30"}`} />
                </div>
                <div className="flex-1 min-w-0" onClick={() => playTrackList(songs, i)}>
                  <p className={`text-[13px] font-semibold truncate transition-colors ${isActive ? "text-primary" : "text-foreground group-hover:text-primary"}`}>{track.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{track.album}</p>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0 font-medium" onClick={() => playTrackList(songs, i)}>
                  {formatDuration(track.duration)}
                </span>

                {/* Like Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(track); }}
                  className={`p-1.5 sm:p-2 rounded-full transition-all flex-shrink-0 ${
                    liked ? "text-red-500 hover:text-red-600 hover:scale-110" : "text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100 hover:text-red-500 hover:scale-110"
                  }`}
                  title={liked ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart size={16} fill={liked ? "currentColor" : "none"} strokeWidth={2} />
                </button>

                {/* More Options Menu */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSongMenu(songMenu === i ? null : i); }}
                    className="p-1.5 sm:p-2 rounded-full text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100 hover:text-foreground hover:bg-accent transition-all"
                    title="More options"
                  >
                    <Plus size={16} />
                  </button>
                  {songMenu === i && (
                    <>
                      <div className="fixed inset-0 z-50" onClick={(e) => { e.stopPropagation(); setSongMenu(null); }} />
                      <div className="absolute right-0 top-full mt-1 z-[60] w-44 glass-heavy border border-border rounded-lg shadow-2xl overflow-hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playNext(track);
                            setSongMenu(null);
                            toast({
                              title: "Added to Queue",
                              description: `${track.title} will play next`,
                              duration: 3000,
                            });
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors"
                        >
                          <ListPlus size={14} /> Play Next
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToQueue(track);
                            setSongMenu(null);
                            toast({
                              title: "Added to Queue",
                              description: `${track.title} added to your queue`,
                              duration: 3000,
                            });
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors"
                        >
                          <ListPlus size={14} /> Add to Queue
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

