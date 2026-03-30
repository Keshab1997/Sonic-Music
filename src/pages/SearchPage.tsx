import { useState, FormEvent, useRef, useCallback } from "react";
import { Search, Play, Clock, Loader2, AlertCircle, Pause } from "lucide-react";
import ReactPlayer from "react-player";
import { usePlayer } from "@/context/PlayerContext";
import { useYouTubeSearch } from "@/hooks/useYouTubeSearch";

const formatDuration = (seconds: number) => {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const SearchPage = () => {
  const [query, setQuery] = useState("");
  const { results, loading, error, search } = useYouTubeSearch();
  const { playTrack, currentTrack, isPlaying, pause, togglePlay } = usePlayer();
  const [hasSearched, setHasSearched] = useState(false);
  const playerRef = useRef<ReactPlayer>(null);
  const isYouTube = currentTrack?.type === "youtube";

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setHasSearched(true);
    search(query);
  };

  const handleProgress = useCallback((state: { playedSeconds: number }) => {
    // Progress tracked by ReactPlayer
  }, []);

  const handleDuration = useCallback((d: number) => {
    // Duration handled by ReactPlayer
  }, []);

  const handleEnded = useCallback(() => {
    // Next track handled by PlayerContext
  }, []);

  const handleError = useCallback((e: unknown) => {
    console.error("YouTube player error:", e);
  }, []);

  return (
    <main className="flex-1 overflow-y-auto pb-28">
      <div className="px-6 pt-8">
        <h2 className="text-3xl font-bold text-foreground mb-6">Search YouTube</h2>

        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for any song, artist, or album..."
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Search"}
          </button>
        </form>

        {/* YouTube Player */}
        {isYouTube && currentTrack && (
          <div className="mb-8 rounded-xl overflow-hidden bg-card border border-border">
            <div className="aspect-video w-full max-w-2xl">
              <ReactPlayer
                ref={playerRef}
                url={currentTrack.src}
                playing={isPlaying}
                controls
                width="100%"
                height="100%"
                onProgress={handleProgress}
                onDuration={handleDuration}
                onEnded={handleEnded}
                onError={handleError}
                config={{
                  youtube: {
                    playerVars: {
                      autoplay: 1,
                      origin: typeof window !== "undefined" ? window.location.origin : "",
                    },
                  },
                }}
              />
            </div>
            <div className="p-4 flex items-center gap-4">
              <img src={currentTrack.cover} alt="" className="w-12 h-12 rounded-md object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{currentTrack.title}</p>
                <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
              </div>
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center hover:scale-105 transition-transform"
              >
                {isPlaying ? (
                  <Pause size={18} className="text-background" />
                ) : (
                  <Play size={18} className="text-background ml-0.5" />
                )}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive mb-6">
            <AlertCircle size={18} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No results found for "{query}"</p>
          </div>
        )}

        {!hasSearched && !loading && (
          <div className="text-center py-20">
            <Search size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Search for any YouTube song to start playing</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground mb-3">
              {results.length} results for "{query}"
            </p>
            {results.map((track, i) => {
              const isActive = currentTrack?.src === track.src;
              const isCurrentlyPlaying = isActive && isPlaying;

              return (
                <div
                  key={`${track.src}-${i}`}
                  onClick={() => {
                    if (isActive) {
                      isPlaying ? pause() : playTrack(track);
                    } else {
                      playTrack(track);
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-accent border border-transparent"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={track.cover}
                      alt={track.title}
                      className="w-14 h-14 rounded-md object-cover"
                    />
                    {isActive && isPlaying && (
                      <div className="absolute inset-0 rounded-md bg-black/40 flex items-center justify-center gap-0.5">
                        <span className="w-0.5 h-3 bg-white rounded-full animate-pulse-glow" />
                        <span className="w-0.5 h-4 bg-white rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
                        <span className="w-0.5 h-2 bg-white rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
                        <span className="w-0.5 h-3 bg-white rounded-full animate-pulse-glow" style={{ animationDelay: "0.45s" }} />
                      </div>
                    )}
                    {!isActive && (
                      <div className="absolute inset-0 rounded-md bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={18} className="text-white ml-0.5" fill="white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                      {track.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                  </div>

                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock size={12} />
                    <span className="text-xs tabular-nums">{formatDuration(track.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};
