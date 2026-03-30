import { useState, useEffect, useCallback, useRef } from "react";
import { Play, ChevronRight, Music2, Sparkles, TrendingUp, BarChart3, Clock, RefreshCw, ChevronLeft, Pause, ListMusic } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useHomeData } from "@/hooks/useHomeData";
import { useRecentlyPlayed } from "@/hooks/useRecentlyPlayed";
import { useListeningStats } from "@/hooks/useListeningStats";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { ArtistDetail } from "@/components/ArtistDetail";
import { ViewAllArtists } from "@/components/ViewAllArtists";
import { TimeMachinePlaylist } from "@/components/TimeMachinePlaylist";
import { MoodPlaylist } from "@/components/MoodPlaylist";
import { Track } from "@/data/playlist";
import {
  topArtists,
  allArtists,
  moodCategories,
  MoodCategory,
  eraCategories,
  timeSuggestions,
  getTimeOfDay,
  Artist,
} from "@/data/homeData";

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// Song of the Day - changes daily based on date hash
const getSongOfDayIndex = (max: number) => {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return seed % Math.max(max, 1);
};

export const MainContent = () => {
  const { currentTrack, isPlaying, playTrackList, playTrack, togglePlay } = usePlayer();
  const { trendingSongs, newReleases, charts, loading: homeLoading } = useHomeData();
  const { history, addToHistory } = useRecentlyPlayed();
  const { stats, recordPlay } = useListeningStats();

  const [searchingFor, setSearchingFor] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [artistDetail, setArtistDetail] = useState<{ name: string; query: string } | null>(null);
  const [showViewAllArtists, setShowViewAllArtists] = useState(false);
  const [timeMachineEra, setTimeMachineEra] = useState<typeof eraCategories[0] | null>(null);
  const [moodPlaylist, setMoodPlaylist] = useState<MoodCategory | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const timeOfDay = getTimeOfDay();
  const timeData = timeSuggestions[timeOfDay];

  // Track play for recently played + stats
  useEffect(() => {
    if (currentTrack && isPlaying) {
      addToHistory(currentTrack);
      recordPlay(currentTrack.artist, currentTrack.duration || 0);
    }
  }, [currentTrack?.src, isPlaying]);

  // Hero carousel auto-rotate
  useEffect(() => {
    if (trendingSongs.length === 0) return;
    carouselTimerRef.current = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % Math.min(trendingSongs.length, 5));
    }, 5000);
    return () => {
      if (carouselTimerRef.current) clearInterval(carouselTimerRef.current);
    };
  }, [trendingSongs]);

  const handleSearchAndPlay = useCallback(async (query: string) => {
    setSearchingFor(query);
    setSearchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(query)}&page=1&limit=20`);
      if (!res.ok) return;
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
          const url160 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "160kbps")?.link;
          const url96 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "96kbps")?.link;
          const url320 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "320kbps")?.link;
          const bestUrl = url160 || url96 || url320 || s.downloadUrl?.[0]?.link || "";
          return {
            id: 3000 + i,
            title: s.name,
            artist: s.primaryArtists || "Unknown",
            album: typeof s.album === "string" ? s.album : s.album?.name || "",
            cover: s.image?.find((img: { quality: string }) => img.quality === "500x500")?.link || s.image?.[s.image.length - 1]?.link || "",
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
      if (tracks.length > 0) playTrackList(tracks, 0);
    } catch { /* ignore */ }
    setSearchingFor(null);
    setSearchLoading(false);
  }, [playTrackList]);

  const hindiArtists = topArtists.filter((a) => a.language === "hindi");
  const bengaliArtists = topArtists.filter((a) => a.language === "bengali");

  // Song of the Day
  const songOfDay = trendingSongs.length > 0 ? trendingSongs[getSongOfDayIndex(trendingSongs.length)] : null;

  // Hero carousel songs (top 5 trending)
  const carouselSongs = trendingSongs.slice(0, 5);
  const activeCarouselSong = carouselSongs[carouselIndex] || null;

  // Top artist by plays
  const topArtistName = Object.entries(stats.topArtists).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const isLoading = (query: string) => searchLoading && searchingFor === query;

  return (
    <main className="flex-1 overflow-y-auto pb-28">
      {/* Hero Carousel */}
      {carouselSongs.length > 0 && (
        <div className="relative h-56 sm:h-72 md:h-80 overflow-hidden mb-6">
          {carouselSongs.map((song, i) => (
            <div
              key={song.src}
              className={`absolute inset-0 transition-opacity duration-1000 ${i === carouselIndex ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              <div className="absolute inset-0">
                <img src={song.cover} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
              </div>
              <div className="relative h-full flex items-end px-4 md:px-6 pb-4 md:pb-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <img src={song.cover} alt="" className="w-14 h-14 md:w-20 md:h-20 rounded-xl shadow-2xl object-cover" />
                  <div>
                    <p className="text-[10px] md:text-xs text-primary font-medium uppercase tracking-wider mb-1">
                      {i === 0 ? "🎵 Featured" : `#${i + 1} Trending`}
                    </p>
                    <h2 className="text-base md:text-2xl font-bold text-foreground line-clamp-1">{song.title}</h2>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{song.artist}</p>
                    <button
                      onClick={() => playTrackList(carouselSongs, i)}
                      className="mt-1.5 md:mt-2 px-3 md:px-4 py-1 md:py-1.5 bg-primary text-primary-foreground text-[10px] md:text-xs font-medium rounded-full hover:brightness-110 transition-all flex items-center gap-1.5"
                    >
                      <Play size={10} fill="currentColor" /> Play Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {/* Carousel dots */}
          <div className="absolute bottom-3 right-6 flex items-center gap-1.5 z-10">
            <button
              onClick={() => setCarouselIndex((prev) => (prev - 1 + carouselSongs.length) % carouselSongs.length)}
              className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {carouselSongs.map((_, i) => (
              <button
                key={i}
                onClick={() => setCarouselIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === carouselIndex ? "bg-primary w-4" : "bg-white/40 hover:bg-white/60"}`}
              />
            ))}
            <button
              onClick={() => setCarouselIndex((prev) => (prev + 1) % carouselSongs.length)}
              className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="px-4 md:px-6">
        {/* Time-based Greeting + Quick Play */}
        {!activeCarouselSong && (
          <div className="mb-6 animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-4xl">{timeData.emoji}</span>
              <h2 className="text-3xl font-bold text-foreground">{timeData.title}</h2>
            </div>
            <p className="text-muted-foreground text-sm ml-12">{timeData.subtitle}</p>
          </div>
        )}

        {/* Quick Play */}
        <div
          onClick={() => handleSearchAndPlay(timeData.searchQuery)}
          className="mb-8 p-4 rounded-xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20 cursor-pointer hover:border-primary/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Sparkles size={20} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{timeData.title} Mix</p>
                <p className="text-xs text-muted-foreground">{timeData.subtitle} — Tap to play</p>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              {isLoading(timeData.searchQuery) ? (
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play size={16} className="text-primary-foreground ml-0.5" />
              )}
            </div>
          </div>
        </div>

        {/* Listening Stats */}
        {stats.totalPlays > 0 && (
          <section className="mb-8 animate-fade-in">
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-foreground">Your Listening Stats</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.totalPlays}</p>
                  <p className="text-[10px] text-muted-foreground">Songs Played</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.totalMinutes}</p>
                  <p className="text-[10px] text-muted-foreground">Minutes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.songsPlayedToday}</p>
                  <p className="text-[10px] text-muted-foreground">Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{stats.streakDays}</p>
                  <p className="text-[10px] text-muted-foreground">Day Streak 🔥</p>
                </div>
              </div>
              {topArtistName && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Top Artist: <span className="text-foreground font-medium">{topArtistName}</span>
                </p>
              )}
            </div>
          </section>
        )}

        {/* Song of the Day */}
        {songOfDay && (
          <section className="mb-8 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⭐</span>
              <h3 className="text-lg font-bold text-foreground">Song of the Day</h3>
            </div>
            <div
              onClick={() => playTrack(songOfDay)}
              className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 cursor-pointer hover:border-amber-500/40 transition-all group"
            >
              <div className="relative flex-shrink-0">
                <img src={songOfDay.cover} alt="" className="w-16 h-16 rounded-lg object-cover shadow-md" />
                <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                  {currentTrack?.src === songOfDay.src && isPlaying ? (
                    <Pause size={20} className="text-white" />
                  ) : (
                    <Play size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{songOfDay.title}</p>
                <p className="text-xs text-muted-foreground truncate">{songOfDay.artist}</p>
                <p className="text-[10px] text-amber-400 mt-0.5">✨ Fresh pick for today</p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDuration(songOfDay.duration)}</span>
            </div>
          </section>
        )}

        {/* Visualizer */}
        <div className="mb-8 animate-fade-in">
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

        {/* Trending Now */}
        {trendingSongs.length > 0 && (
          <section className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" />
                <h3 className="text-lg font-bold text-foreground">Trending Now</h3>
              </div>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Live from JioSaavn</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {trendingSongs.map((track, i) => (
                <div
                  key={track.src}
                  onClick={() => playTrackList(trendingSongs, i)}
                  className="flex-shrink-0 w-36 group cursor-pointer"
                >
                  <div className="relative mb-2">
                    <img src={track.cover} alt="" className="w-36 h-36 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-lg">
                        <Play size={16} className="text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute top-2 left-2 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">
                      #{i + 1}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">{track.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {homeLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={24} className="animate-spin text-primary" />
          </div>
        )}

        {/* New Releases */}
        {newReleases.length > 0 && (
          <section className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Music2 size={18} className="text-primary" />
                <h3 className="text-lg font-bold text-foreground">New Releases</h3>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {newReleases.map((track, i) => (
                <div
                  key={track.src}
                  onClick={() => playTrackList(newReleases, i)}
                  className="flex-shrink-0 w-36 group cursor-pointer"
                >
                  <div className="relative mb-2">
                    <img src={track.cover} alt="" className="w-36 h-36 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-lg">
                        <Play size={16} className="text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute top-2 left-2 text-[9px] font-bold text-white bg-green-600/80 px-1.5 py-0.5 rounded">
                      NEW
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">{track.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recently Played */}
        {history.length > 0 && (
          <section className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-primary" />
                <h3 className="text-lg font-bold text-foreground">Recently Played</h3>
              </div>
              <span className="text-[10px] text-muted-foreground">{history.length} tracks</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {history.slice(0, 12).map((entry, i) => (
                <div
                  key={`${entry.track.src}-${i}`}
                  onClick={() => playTrack(entry.track)}
                  className="flex-shrink-0 w-28 group cursor-pointer"
                >
                  <div className="relative mb-2">
                    <img src={entry.track.cover} alt="" className="w-28 h-28 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                        {currentTrack?.src === entry.track.src && isPlaying ? (
                          <Pause size={14} className="text-primary-foreground" />
                        ) : (
                          <Play size={14} className="text-primary-foreground ml-0.5" />
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-foreground truncate">{entry.track.title}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{entry.track.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Mood Categories */}
        <section className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Music2 size={18} className="text-primary" />
            <h3 className="text-lg font-bold text-foreground">Browse by Mood</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {moodCategories.map((mood) => (
              <button
                key={mood.name}
                onClick={() => setMoodPlaylist(mood)}
                className={`relative p-3.5 rounded-xl bg-gradient-to-br ${mood.gradient} cursor-pointer hover:scale-[1.03] transition-transform group overflow-hidden`}
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                <div className="relative">
                  <span className="text-xl">{mood.emoji}</span>
                  <p className="text-xs font-bold text-white mt-1.5">{mood.name}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Top Hindi Artists */}
        <section className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-foreground">Top Hindi Artists</h3>
            <button
              onClick={() => setShowViewAllArtists(true)}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {hindiArtists.map((artist) => (
              <button
                key={artist.name}
                onClick={() => setArtistDetail({ name: artist.name, query: artist.searchQuery })}
                className="flex-shrink-0 flex flex-col items-center gap-2 group"
              >
                <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all">
                  <img src={artist.image} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Play size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center w-20 truncate">{artist.name}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Top Bengali Artists */}
        <section className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-foreground">Top Bengali Artists</h3>
            <button
              onClick={() => setShowViewAllArtists(true)}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {bengaliArtists.map((artist) => (
              <button
                key={artist.name}
                onClick={() => setArtistDetail({ name: artist.name, query: artist.searchQuery })}
                className="flex-shrink-0 flex flex-col items-center gap-2 group"
              >
                <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all">
                  <img src={artist.image} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Play size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center w-20 truncate">{artist.name}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Era / Time Machine */}
        <section className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              <h3 className="text-lg font-bold text-foreground">Time Machine</h3>
            </div>
            <p className="text-[10px] text-muted-foreground">Travel through decades</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {eraCategories.map((era) => (
              <button
                key={era.name}
                onClick={() => setTimeMachineEra(era)}
                className={`relative p-3 rounded-xl bg-gradient-to-br ${era.gradient} cursor-pointer hover:scale-[1.03] transition-transform group overflow-hidden`}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="relative text-center">
                  <p className="text-xl font-black text-white">{era.name}</p>
                  <p className="text-[9px] text-white/80 mt-0.5">{era.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Quick Picks */}
        <section className="mb-8 animate-fade-in">
          <h3 className="text-lg font-bold text-foreground mb-3">Quick Picks</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { title: "Arijit Singh Top 20", desc: "Most popular tracks", query: "Arijit Singh top hits", color: "from-rose-600/20 to-pink-600/10" },
              { title: "Bengali Modern Songs", desc: "Contemporary bengali hits", query: "modern bengali songs", color: "from-green-600/20 to-teal-600/10" },
              { title: "Bollywood Blockbusters", desc: "Chart-topping movie songs", query: "bollywood blockbuster songs", color: "from-orange-600/20 to-red-600/10" },
              { title: "Lofi & Chill", desc: "Relaxed vibes for focus", query: "lofi hindi songs chill", color: "from-indigo-600/20 to-purple-600/10" },
            ].map((pick) => (
              <button
                key={pick.title}
                onClick={() => handleSearchAndPlay(pick.query)}
                disabled={isLoading(pick.query)}
                className={`flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r ${pick.color} border border-border hover:border-primary/30 transition-all group cursor-pointer`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors">
                  {isLoading(pick.query) ? (
                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play size={16} className="text-primary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground">{pick.title}</p>
                  <p className="text-[10px] text-muted-foreground">{pick.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Artist Detail Modal */}
      {artistDetail && (
        <ArtistDetail
          artistName={artistDetail.name}
          searchQuery={artistDetail.query}
          onClose={() => setArtistDetail(null)}
        />
      )}

      {/* View All Artists Modal */}
      {showViewAllArtists && (
        <ViewAllArtists
          onSelectArtist={(artist) => {
            setShowViewAllArtists(false);
            setArtistDetail({ name: artist.name, query: artist.searchQuery });
          }}
          onClose={() => setShowViewAllArtists(false)}
        />
      )}

      {/* Time Machine Playlist Modal */}
      {timeMachineEra && (
        <TimeMachinePlaylist
          eraName={timeMachineEra.name}
          subtitle={timeMachineEra.subtitle}
          searchQuery={timeMachineEra.searchQuery}
          onClose={() => setTimeMachineEra(null)}
        />
      )}

      {/* Mood Playlist Modal */}
      {moodPlaylist && (
        <MoodPlaylist
          moodName={moodPlaylist.name}
          emoji={moodPlaylist.emoji}
          searchQuery={moodPlaylist.searchQuery}
          gradient={moodPlaylist.gradient}
          onClose={() => setMoodPlaylist(null)}
        />
      )}
    </main>
  );
};
