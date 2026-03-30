import { usePlayer } from "@/context/PlayerContext";
import { AlbumCard } from "@/components/AlbumCard";
import { AudioVisualizer } from "@/components/AudioVisualizer";

export const MainContent = () => {
  const { tracks, currentTrack, isPlaying } = usePlayer();

  return (
    <main className="flex-1 overflow-y-auto pb-28">
      {/* Header gradient */}
      <div className="relative">
        <div className="absolute inset-0 h-80 bg-gradient-to-b from-primary/10 to-background pointer-events-none" />

        <div className="relative px-6 pt-8">
          {/* Greeting */}
          <h2 className="text-3xl font-bold text-foreground mb-6 animate-fade-in">
            Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}
          </h2>

          {/* Visualizer */}
          <div className="mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <AudioVisualizer />
            {currentTrack && isPlaying && (
              <div className="mt-3 flex items-center gap-3">
                <img src={currentTrack.cover} alt="" className="w-8 h-8 rounded" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{currentTrack.title}</p>
                  <p className="text-xs text-muted-foreground">{currentTrack.artist}</p>
                </div>
              </div>
            )}
          </div>

          {/* Section title */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-foreground">Featured Tracks</h3>
            <p className="text-sm text-muted-foreground mt-1">Discover your next favorite sound</p>
          </div>

          {/* Album grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {tracks.map((track, i) => (
              <AlbumCard key={track.id} track={track} index={i} />
            ))}
          </div>

          {/* Recent section */}
          <div className="mt-10 mb-4">
            <h3 className="text-xl font-bold text-foreground">Recently Played</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            {tracks.slice(0, 4).map((track, i) => (
              <AlbumCard key={`recent-${track.id}`} track={track} index={i} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};
