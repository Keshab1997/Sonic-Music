import { useState, useCallback } from "react";
import { Play, ChevronRight, Music2, Sparkles, TrendingUp } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useMusicSearch } from "@/hooks/useYouTubeSearch";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import {
  topArtists,
  moodCategories,
  eraCategories,
  timeSuggestions,
  getTimeOfDay,
} from "@/data/homeData";

export const MainContent = () => {
  const { currentTrack, isPlaying, playTrackList } = usePlayer();
  const { search, loading } = useMusicSearch();
  const [searchingFor, setSearchingFor] = useState<string | null>(null);

  const timeOfDay = getTimeOfDay();
  const timeData = timeSuggestions[timeOfDay];

  const handleSearchAndPlay = useCallback(async (query: string) => {
    setSearchingFor(query);
    const res = await fetch(
      `https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${encodeURIComponent(query)}&page=1&limit=20`
    );
    if (!res.ok) { setSearchingFor(null); return; }
    const data = await res.json();
    const songs = data.data?.results || [];

    const tracks = songs
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
        const url160 = s.downloadUrl?.find((d) => d.quality === "160kbps")?.link;
        const url96 = s.downloadUrl?.find((d) => d.quality === "96kbps")?.link;
        const url320 = s.downloadUrl?.find((d) => d.quality === "320kbps")?.link;
        const bestUrl = url160 || url96 || url320 || s.downloadUrl?.[0]?.link || "";
        return {
          id: 3000 + i,
          title: s.name,
          artist: s.primaryArtists || "Unknown",
          album: typeof s.album === "string" ? s.album : s.album?.name || "",
          cover: s.image?.find((img) => img.quality === "500x500")?.link || s.image?.[s.image.length - 1]?.link || "",
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

    if (tracks.length > 0) {
      playTrackList(tracks, 0);
    }
    setSearchingFor(null);
  }, [playTrackList]);

  const hindiArtists = topArtists.filter((a) => a.language === "hindi");
  const bengaliArtists = topArtists.filter((a) => a.language === "bengali");

  return (
    <main className="flex-1 overflow-y-auto pb-28">
      {/* Hero section */}
      <div className="relative">
        <div className="absolute inset-0 h-[480px] bg-gradient-to-b from-primary/15 via-primary/5 to-background pointer-events-none" />

        <div className="relative px-6 pt-8">
          {/* Greeting */}
          <div className="mb-6 animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-4xl">{timeData.emoji}</span>
              <h2 className="text-3xl font-bold text-foreground">{timeData.title}</h2>
            </div>
            <p className="text-muted-foreground text-sm ml-12">{timeData.subtitle}</p>
          </div>

          {/* Quick Play - Time Suggestion */}
          <div
            onClick={() => handleSearchAndPlay(timeData.searchQuery)}
            className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 cursor-pointer hover:border-primary/40 transition-all group animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  <Sparkles size={24} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{timeData.title} Mix</p>
                  <p className="text-xs text-muted-foreground">{timeData.subtitle} — Tap to play</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                {loading && searchingFor === timeData.searchQuery ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play size={18} className="text-primary-foreground ml-0.5" />
                )}
              </div>
            </div>
          </div>

          {/* Visualizer */}
          <div className="mb-8 animate-fade-in" style={{ animationDelay: "0.15s" }}>
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
        </div>
      </div>

      <div className="px-6">
        {/* Mood Categories */}
        <section className="mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Music2 size={20} className="text-primary" />
              <h3 className="text-xl font-bold text-foreground">Browse by Mood</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {moodCategories.map((mood) => (
              <button
                key={mood.name}
                onClick={() => handleSearchAndPlay(mood.searchQuery)}
                disabled={loading && searchingFor === mood.searchQuery}
                className={`relative p-4 rounded-xl bg-gradient-to-br ${mood.gradient} cursor-pointer hover:scale-[1.03] transition-transform group overflow-hidden`}
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                <div className="relative">
                  <span className="text-2xl">{mood.emoji}</span>
                  <p className="text-sm font-bold text-white mt-2">{mood.name}</p>
                </div>
                {loading && searchingFor === mood.searchQuery && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Top Hindi Artists */}
        <section className="mb-10 animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-foreground">Top Hindi Artists</h3>
            <span className="text-xs text-muted-foreground">Tap to play</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {hindiArtists.map((artist) => (
              <button
                key={artist.name}
                onClick={() => handleSearchAndPlay(artist.searchQuery)}
                disabled={loading && searchingFor === artist.searchQuery}
                className="flex-shrink-0 flex flex-col items-center gap-2 group"
              >
                <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all">
                  <img
                    src={artist.image}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Play size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {loading && searchingFor === artist.searchQuery && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center w-20 truncate">
                  {artist.name}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Top Bengali Artists */}
        <section className="mb-10 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-foreground">Top Bengali Artists</h3>
            <span className="text-xs text-muted-foreground">Tap to play</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {bengaliArtists.map((artist) => (
              <button
                key={artist.name}
                onClick={() => handleSearchAndPlay(artist.searchQuery)}
                disabled={loading && searchingFor === artist.searchQuery}
                className="flex-shrink-0 flex flex-col items-center gap-2 group"
              >
                <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all">
                  <img
                    src={artist.image}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Play size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {loading && searchingFor === artist.searchQuery && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center w-20 truncate">
                  {artist.name}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Era / Century Suggestions */}
        <section className="mb-10 animate-fade-in" style={{ animationDelay: "0.35s" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              <h3 className="text-xl font-bold text-foreground">Time Machine</h3>
            </div>
            <p className="text-xs text-muted-foreground">Travel through decades</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {eraCategories.map((era) => (
              <button
                key={era.name}
                onClick={() => handleSearchAndPlay(era.searchQuery)}
                disabled={loading && searchingFor === era.searchQuery}
                className={`relative p-4 rounded-xl bg-gradient-to-br ${era.gradient} cursor-pointer hover:scale-[1.03] transition-transform group overflow-hidden`}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="relative text-center">
                  <p className="text-2xl font-black text-white">{era.name}</p>
                  <p className="text-[10px] text-white/80 mt-1">{era.subtitle}</p>
                </div>
                {loading && searchingFor === era.searchQuery && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Quick Picks */}
        <section className="mb-10 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-foreground">Quick Picks</h3>
            <ChevronRight size={18} className="text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: "Arijit Singh Top 20", desc: "Most popular tracks", query: "Arijit Singh top hits", color: "from-rose-600/30 to-pink-600/10" },
              { title: "Bengali Modern Songs", desc: "Contemporary bengali hits", query: "modern bengali songs", color: "from-green-600/30 to-teal-600/10" },
              { title: "Bollywood Blockbusters", desc: "Chart-topping movie songs", query: "bollywood blockbuster songs", color: "from-orange-600/30 to-red-600/10" },
              { title: "Lofi & Chill", desc: "Relaxed vibes for focus", query: "lofi hindi songs chill", color: "from-indigo-600/30 to-purple-600/10" },
            ].map((pick) => (
              <button
                key={pick.title}
                onClick={() => handleSearchAndPlay(pick.query)}
                disabled={loading && searchingFor === pick.query}
                className={`flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${pick.color} border border-border hover:border-primary/30 transition-all group cursor-pointer`}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors">
                  {loading && searchingFor === pick.query ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play size={18} className="text-primary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{pick.title}</p>
                  <p className="text-xs text-muted-foreground">{pick.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Now Playing */}
        {currentTrack && (
          <section className="mb-10 animate-fade-in">
            <h3 className="text-xl font-bold text-foreground mb-4">Now Playing</h3>
            <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-4">
              <img
                src={currentTrack.cover}
                alt={currentTrack.title}
                className="w-16 h-16 rounded-lg object-cover shadow-md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{currentTrack.title}</p>
                <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                {isPlaying && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" />
                    <span className="w-0.5 h-3 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.15s" }} />
                    <span className="w-0.5 h-2 bg-primary rounded-full animate-pulse-glow" style={{ animationDelay: "0.3s" }} />
                    <span className="text-[10px] text-primary ml-1">Playing</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};
