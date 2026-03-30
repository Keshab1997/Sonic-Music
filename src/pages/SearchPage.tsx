import { useState, FormEvent, useCallback, useRef, useEffect } from "react";
import { Search, Play, Clock, Loader2, AlertCircle, Pause, ExternalLink } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useYouTubeSearch } from "@/hooks/useYouTubeSearch";

const formatDuration = (seconds: number) => {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          events?: {
            onReady?: (event: { target: { playVideo: () => void } }) => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
          playerVars?: Record<string, number | string>;
        }
      ) => YTPlayer;
      PlayerState: { PLAYING: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  destroy: () => void;
  getPlayerState: () => number;
}

let ytApiLoaded = false;
let ytApiLoading = false;
const ytCallbacks: (() => void)[] = [];

function loadYouTubeAPI() {
  if (ytApiLoaded) return Promise.resolve();
  if (ytApiLoading) {
    return new Promise<void>((resolve) => ytCallbacks.push(resolve));
  }
  ytApiLoading = true;
  return new Promise<void>((resolve) => {
    ytCallbacks.push(resolve);
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    window.onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      ytApiLoading = false;
      ytCallbacks.forEach((cb) => cb());
      ytCallbacks.length = 0;
    };
  });
}

export const SearchPage = () => {
  const [query, setQuery] = useState("");
  const { results, loading, error, search } = useYouTubeSearch();
  const { playTrack, currentTrack, isPlaying, pause } = usePlayer();
  const [hasSearched, setHasSearched] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setHasSearched(true);
    search(query);
  };

  const destroyPlayer = useCallback(() => {
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.destroy();
      } catch {
        // ignore
      }
      ytPlayerRef.current = null;
    }
    setPlayerReady(false);
    setEmbedFailed(false);
  }, []);

  const handlePlay = useCallback(async (videoId: string, track: typeof results[0]) => {
    destroyPlayer();
    setActiveVideoId(videoId);
    setEmbedFailed(false);
    playTrack(track);

    await loadYouTubeAPI();

    if (!playerContainerRef.current) return;

    // Create a div for the player
    const playerDiv = document.createElement("div");
    playerDiv.id = `yt-player-${videoId}`;
    playerDiv.style.width = "100%";
    playerDiv.style.height = "100%";
    playerContainerRef.current.innerHTML = "";
    playerContainerRef.current.appendChild(playerDiv);

    try {
      const player = new window.YT.Player(playerDiv.id, {
        videoId: videoId,
        events: {
          onReady: (event) => {
            event.target.playVideo();
            setPlayerReady(true);
          },
          onError: () => {
            setEmbedFailed(true);
            setPlayerReady(false);
          },
        },
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
        },
      });
      ytPlayerRef.current = player;
    } catch {
      setEmbedFailed(true);
    }
  }, [destroyPlayer, playTrack]);

  const handlePause = useCallback(() => {
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch {
        // ignore
      }
    }
    destroyPlayer();
    setActiveVideoId(null);
    pause();
  }, [destroyPlayer, pause]);

  useEffect(() => {
    return () => {
      destroyPlayer();
    };
  }, [destroyPlayer]);

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
              const videoId = track.src.split("v=")[1];
              const isActive = activeVideoId === videoId;
              const isCurrentlyPlaying = isActive && isPlaying;

              return (
                <div key={`${track.src}-${i}`}>
                  <div
                    onClick={() => {
                      if (isActive && isPlaying) {
                        handlePause();
                      } else {
                        handlePlay(videoId, track);
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
                      {isCurrentlyPlaying ? (
                        <div className="absolute inset-0 rounded-md bg-black/40 flex items-center justify-center gap-0.5">
                          <span className="w-0.5 h-3 bg-white rounded-full animate-pulse-glow" />
                          <span className="w-0.5 h-4 bg-white rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
                          <span className="w-0.5 h-2 bg-white rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
                          <span className="w-0.5 h-3 bg-white rounded-full animate-pulse-glow" style={{ animationDelay: "0.45s" }} />
                        </div>
                      ) : (
                        <div className="absolute inset-0 rounded-md bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
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

                  {/* YouTube player inline */}
                  {isActive && !embedFailed && (
                    <div className="mt-2 mb-4 rounded-xl overflow-hidden bg-black border border-border">
                      <div
                        ref={isActive ? playerContainerRef : undefined}
                        className="relative w-full"
                        style={{ paddingBottom: "56.25%" }}
                      >
                        <div id={`yt-player-${videoId}`} className="absolute top-0 left-0 w-full h-full" />
                      </div>
                      <div className="p-3 bg-card flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePause();
                          }}
                          className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center hover:scale-105 transition-transform"
                        >
                          <Pause size={14} className="text-background" />
                        </button>
                        <p className="text-xs text-muted-foreground">Click pause or another song to stop</p>
                      </div>
                    </div>
                  )}

                  {/* Fallback when embed is blocked */}
                  {isActive && embedFailed && (
                    <div className="mt-2 mb-4 rounded-xl overflow-hidden border border-border bg-card">
                      <div className="p-6 text-center">
                        <img
                          src={track.cover}
                          alt={track.title}
                          className="w-24 h-24 rounded-lg object-cover mx-auto mb-3"
                        />
                        <p className="text-sm font-semibold text-foreground mb-1">{track.title}</p>
                        <p className="text-xs text-muted-foreground mb-4">{track.artist}</p>
                        <p className="text-xs text-muted-foreground mb-4">
                          This video cannot be embedded. Watch it on YouTube:
                        </p>
                        <a
                          href={`https://www.youtube.com/watch?v=${videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                        >
                          <ExternalLink size={16} />
                          Watch on YouTube
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};
