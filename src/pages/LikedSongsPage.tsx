import { Heart, Play, Clock } from "lucide-react";
import { useLocalData } from "@/hooks/useLocalData";
import { usePlayer } from "@/context/PlayerContext";

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const LikedSongsPage = () => {
  const { favorites, toggleFavorite, isFavorite } = useLocalData();
  const { playTrackList, currentTrack, isPlaying } = usePlayer();

  return (
    <div className="flex-1 overflow-y-auto pb-32 md:pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/20 to-background px-6 pt-8 pb-6">
        <div className="flex items-end gap-3 md:gap-6">
          <div className="w-24 h-24 md:w-48 md:h-48 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl">
            <Heart size={32} className="text-primary-foreground md:w-20 md:h-20" fill="currentColor" />
          </div>
          <div className="flex-1 pb-4">
            <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 md:mb-2">Playlist</p>
            <h1 className="text-2xl md:text-5xl font-bold text-foreground mb-2 md:mb-4">Liked Songs</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              {favorites.length === 0 ? "No liked songs yet" : `${favorites.length} ${favorites.length === 1 ? 'song' : 'songs'}`}
            </p>
          </div>
        </div>
      </div>

      {/* Play Button */}
      {favorites.length > 0 && (
        <div className="px-6 py-6">
          <button
            onClick={() => playTrackList(favorites, 0)}
            className="w-14 h-14 rounded-full bg-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
          >
            <Play size={24} className="text-primary-foreground ml-0.5" fill="currentColor" />
          </button>
        </div>
      )}

      {/* Songs List */}
      <div className="px-6 pb-8">
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <Heart size={40} className="text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No liked songs yet</h3>
            <p className="text-sm text-muted-foreground">Songs you like will appear here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header Row */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2 text-xs text-muted-foreground border-b border-border">
              <span className="w-8 text-center">#</span>
              <span>Title</span>
              <span className="w-20 text-center hidden sm:block">Duration</span>
              <span className="w-12"></span>
            </div>

            {/* Songs */}
            {favorites.map((track, index) => {
              const isCurrentTrack = currentTrack?.src === track.src;
              const liked = isFavorite(track.src);

              return (
                <div
                  key={`${track.src}-${index}`}
                  className={`grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-3 rounded-lg transition-all group cursor-pointer ${
                    isCurrentTrack ? "bg-primary/10" : "hover:bg-accent"
                  }`}
                  onClick={() => playTrackList(favorites, index)}
                >
                  {/* Index / Playing Indicator */}
                  <div className="w-8 flex items-center justify-center">
                    {isCurrentTrack && isPlaying ? (
                      <div className="flex items-center gap-0.5">
                        <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse-glow" />
                        <span className="w-0.5 h-4 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
                        <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-muted-foreground group-hover:hidden">{index + 1}</span>
                        <Play size={14} className="text-primary hidden group-hover:block" fill="currentColor" />
                      </>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.cover}
                      alt={track.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${isCurrentTrack ? "text-primary" : "text-foreground"}`}>
                        {track.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="w-20 flex items-center justify-center hidden sm:flex">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {track.duration ? formatTime(track.duration) : "--:--"}
                    </span>
                  </div>

                  {/* Like Button */}
                  <div className="w-12 flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(track);
                      }}
                      className={`p-2 rounded-full transition-all ${
                        liked
                          ? "text-red-500 hover:text-red-600 hover:scale-110"
                          : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 hover:scale-110"
                      }`}
                    >
                      <Heart size={16} fill={liked ? "currentColor" : "none"} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
