import { useState, useEffect, useCallback, useRef } from "react";
import { Play, ChevronRight, Music2, Sparkles, TrendingUp, BarChart3, Clock, RefreshCw, ChevronLeft, Pause, ListMusic, Eye, Trash2, Search, Loader2 } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useHomeData } from "@/hooks/useHomeData";
import { useRecentlyPlayed } from "@/hooks/useRecentlyPlayed";
import { useListeningStats } from "@/hooks/useListeningStats";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { ArtistDetail } from "@/components/ArtistDetail";
import { ArtistPlaylist } from "@/components/ArtistPlaylist";
import { ViewAllArtists } from "@/components/ViewAllArtists";
import { TimeMachinePlaylist } from "@/components/TimeMachinePlaylist";
import { MoodPlaylist } from "@/components/MoodPlaylist";
import { FullPlaylist } from "@/components/FullPlaylist";
import { SearchOverlay } from "@/components/SearchOverlay";
import { SectionSkeleton, HeroSkeleton, ArtistGridSkeleton } from "@/components/Skeletons";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Track } from "@/data/playlist";
import {
  topArtists,
  moodCategories,
  MoodCategory,
  eraCategories,
  timeSuggestions,
  getTimeOfDay,
  Artist,
  musicLabels,
  MusicLabel,
} from "@/data/homeData";
import { useArtistFavorites } from "@/hooks/useArtistFavorites";

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const getSongOfDayIndex = (max: number) => {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return seed % Math.max(max, 1);
};

export const MainContent = () => {
  const { currentTrack, isPlaying, playTrackList, playTrack, togglePlay } = usePlayer();
  const { trendingSongs, newReleases, charts, loading: homeLoading } = useHomeData();
  const { history, addToHistory, clearHistory } = useRecentlyPlayed();
  const { stats, recordPlay } = useListeningStats();

  const [searchingFor, setSearchingFor] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [artistDetail, setArtistDetail] = useState<{ name: string; query: string } | null>(null);
  const [artistPlaylist, setArtistPlaylist] = useState<{ name: string; query: string; artistId?: string } | null>(null);
  const [showViewAllArtists, setShowViewAllArtists] = useState(false);
  const [timeMachineEra, setTimeMachineEra] = useState<typeof eraCategories[0] | null>(null);
  const [moodPlaylist, setMoodPlaylist] = useState<MoodCategory | null>(null);
  const [showFullTrending, setShowFullTrending] = useState(false);
  const [showFullNewReleases, setShowFullNewReleases] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [displayedTrending, setDisplayedTrending] = useState<Track[]>([]);
  const [displayedNewReleases, setDisplayedNewReleases] = useState<Track[]>([]);
  const [shufflingTrending, setShufflingTrending] = useState(false);
  const [shufflingNewReleases, setShufflingNewReleases] = useState(false);
  const carouselTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRefreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trendingInitialized = useRef(false);
  const newReleasesInitialized = useRef(false);
  const { favorites: artistFavorites } = useArtistFavorites();

  // New personalized sections
  const [bengaliHits, setBengaliHits] = useState<Track[]>([]);
  const [thrillerVibes, setThrillerVibes] = useState<Track[]>([]);
  const [forYouTracks, setForYouTracks] = useState<Track[]>([]);
  const [bengaliAlbums, setBengaliAlbums] = useState<{ name: string; cover: string; id: string }[]>([]);
  const [horrorPodcast, setHorrorPodcast] = useState<Track[]>([]);
  const [topChartTracks, setTopChartTracks] = useState<Track[]>([]);

  const DISPLAY_COUNT = 10;

  // Fetch personalized playlists on mount
  useEffect(() => {
    const API = "https://jiosaavn-api-privatecvc2.vercel.app";
    const fetchSection = async (queries: string[], setter: (t: Track[]) => void, offset: number, langFilter?: string) => {
      try {
        // Pick random query from the list
        const query = queries[Math.floor(Math.random() * queries.length)];
        // Random page 1-4 for variety
        const page = Math.floor(Math.random() * 4) + 1;
        const res = await fetch(`${API}/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=25`);
        if (!res.ok) return;
        const data = await res.json();
        let songs = data.data?.results || [];
        if (langFilter) {
          songs = songs.filter((s: { language?: string }) => s.language === langFilter);
        }
        const tracks: Track[] = songs
          .filter((s: { downloadUrl?: unknown[] }) => s.downloadUrl?.length > 0)
          .map((s: { downloadUrl: { quality: string; link: string }[]; name: string; primaryArtists: string; album?: { name?: string } | string; image: { quality: string; link: string }[]; duration: string | number; id: string }, i: number) => {
            const url96 = s.downloadUrl?.find((d) => d.quality === "96kbps")?.link;
            const url160 = s.downloadUrl?.find((d) => d.quality === "160kbps")?.link;
            const bestUrl = url160 || url96 || s.downloadUrl?.[0]?.link || "";
            return {
              id: offset + i,
              title: s.name?.replace(/&quot;/g, '"').replace(/&amp;/g, "&") || "Unknown",
              artist: s.primaryArtists || "Unknown",
              album: typeof s.album === "string" ? s.album : s.album?.name || "",
              cover: s.image?.find((img) => img.quality === "500x500")?.link || s.image?.[s.image.length - 1]?.link || "",
              src: bestUrl,
              duration: parseInt(String(s.duration)) || 0,
              type: "audio" as const,
              songId: s.id,
            } as Track;
          });
        setter(getRandomBatch(tracks, DISPLAY_COUNT));
      } catch { /* skip */ }
    };

    // Bengali hits — multiple queries, random pick, random page
    fetchSection(
      ["bengali top hits", "bangla gaan arijit", "anupam roy bengali", "bengali modern songs", "bangla adhunik gaan", "kumar sanu bengali", "bengali romantic songs"],
      setBengaliHits, 7000, "bengali"
    );
    // Thriller — multiple queries
    fetchSection(
      ["thriller suspense hindi", "dark moody bollywood", "horror bollywood songs", "mystery hindi songs", "bhayanak bollywood"],
      setThrillerVibes, 8000, "hindi"
    );

    // For You: use top artist from listening history or fallback
    const topArtist = stats.topArtists?.[0]?.artist;
    if (topArtist) {
      fetchSection([`${topArtist} best songs`, `${topArtist} hits`, `${topArtist} popular`], setForYouTracks, 9000);
    } else {
      fetchSection(["bollywood romantic hits", "hindi love songs", "bollywood sad songs", "hindi acoustic"], setForYouTracks, 9000);
    }

    // Bengali Albums from modules API
    fetch(`${API}/modules?language=bengali`)
      .then((r) => r.json())
      .then((data) => {
        const mod = data.data || {};
        const albums = (mod.albums || [])
          .filter((a: { type: string; id: string; name: string; image: { quality: string; link: string }[] }) => a.type === "album")
          .map((a: { id: string; name: string; image: { quality: string; link: string }[] }) => ({
            id: a.id,
            name: a.name,
            cover: a.image?.find((img: { quality: string }) => img.quality === "500x500")?.link || a.image?.[a.image.length - 1]?.link || "",
          }));
        setBengaliAlbums(albums.slice(0, 12));
        // Charts
        const chartItems = (mod.charts || []).slice(0, 3);
        if (chartItems.length > 0) {
          fetch(`${API}/playlists?id=${chartItems[0].id}`)
            .then((r) => r.json())
            .then((d) => {
              const songs = d.data?.songs || [];
              setTopChartTracks(songs.slice(0, 10).map((s: { downloadUrl: { quality: string; link: string }[]; name: string; primaryArtists: string; album?: { name?: string } | string; image: { quality: string; link: string }[]; duration: string | number; id: string }, i: number) => {
                const url96 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "96kbps")?.link;
                const url160 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "160kbps")?.link;
                return {
                  id: 10000 + i, title: s.name?.replace(/&quot;/g, '"') || "Unknown", artist: s.primaryArtists || "Unknown",
                  album: typeof s.album === "string" ? s.album : s.album?.name || "",
                  cover: s.image?.find((img: { quality: string }) => img.quality === "500x500")?.link || "",
                  src: url160 || url96 || "", duration: parseInt(String(s.duration)) || 0, type: "audio" as const, songId: s.id,
                } as Track;
              }));
            }).catch(() => {});
        }
      }).catch(() => {});

    // Horror/Thriller Podcast-style (Bengali)
    fetchSection(
      ["bengali horror thriller songs", "bengali dark suspense", "bangla bhooter gaan", "bengali psychological thriller"],
      setHorrorPodcast, 11000, "bengali"
    );
  }, []);

  function getRandomBatch(allTracks: Track[], count: number): Track[] {
    if (allTracks.length <= count) return [...allTracks];
    const shuffled = [...allTracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  const AUTO_REFRESH_MS = 30000; // 30 seconds

  // Initialize displayed batch when master data arrives (run once per dataset)
  useEffect(() => {
    if (trendingSongs.length > 0 && !trendingInitialized.current) {
      trendingInitialized.current = true;
      setDisplayedTrending(getRandomBatch(trendingSongs, DISPLAY_COUNT));
    }
  }, [trendingSongs.length, getRandomBatch]);

  useEffect(() => {
    if (newReleases.length > 0 && !newReleasesInitialized.current) {
      newReleasesInitialized.current = true;
      setDisplayedNewReleases(getRandomBatch(newReleases, DISPLAY_COUNT));
    }
  }, [newReleases.length, getRandomBatch]);

  // Manual refresh handlers
  const refreshTrending = useCallback(() => {
    if (trendingSongs.length === 0) return;
    setShufflingTrending(true);
    setTimeout(() => {
      setDisplayedTrending(getRandomBatch(trendingSongs, DISPLAY_COUNT));
      setShufflingTrending(false);
    }, 500);
  }, [trendingSongs, getRandomBatch]);

  const refreshNewReleases = useCallback(() => {
    if (newReleases.length === 0) return;
    setShufflingNewReleases(true);
    setTimeout(() => {
      setDisplayedNewReleases(getRandomBatch(newReleases, DISPLAY_COUNT));
      setShufflingNewReleases(false);
    }, 500);
  }, [newReleases, getRandomBatch]);

  // Auto-refresh both sections every 30 seconds
  useEffect(() => {
    const API = "https://jiosaavn-api-privatecvc2.vercel.app";

    const refreshFromAPI = async (queries: string[], setter: (t: Track[]) => void, offset: number, langFilter?: string) => {
      try {
        const query = queries[Math.floor(Math.random() * queries.length)];
        const page = Math.floor(Math.random() * 4) + 1;
        const res = await fetch(`${API}/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=25`);
        if (!res.ok) return;
        const data = await res.json();
        let songs = data.data?.results || [];
        if (langFilter) songs = songs.filter((s: { language?: string }) => s.language === langFilter);
        const tracks = songs
          .filter((s: { downloadUrl?: unknown[] }) => s.downloadUrl?.length > 0)
          .map((s: { downloadUrl: { quality: string; link: string }[]; name: string; primaryArtists: string; album?: { name?: string } | string; image: { quality: string; link: string }[]; duration: string | number; id: string }, i: number) => {
            const url96 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "96kbps")?.link;
            const url160 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "160kbps")?.link;
            const bestUrl = url160 || url96 || s.downloadUrl?.[0]?.link || "";
            return { id: offset + i, title: s.name?.replace(/&quot;/g, '"').replace(/&amp;/g, "&") || "Unknown", artist: s.primaryArtists || "Unknown", album: typeof s.album === "string" ? s.album : s.album?.name || "", cover: s.image?.find((img: { quality: string }) => img.quality === "500x500")?.link || s.image?.[s.image.length - 1]?.link || "", src: bestUrl, duration: parseInt(String(s.duration)) || 0, type: "audio" as const, songId: s.id } as Track;
          });
        setter(getRandomBatch(tracks, DISPLAY_COUNT));
      } catch { /* skip */ }
    };

    autoRefreshTimerRef.current = setInterval(() => {
      if (trendingSongs.length > DISPLAY_COUNT) {
        setDisplayedTrending(getRandomBatch(trendingSongs, DISPLAY_COUNT));
      }
      if (newReleases.length > DISPLAY_COUNT) {
        setDisplayedNewReleases(getRandomBatch(newReleases, DISPLAY_COUNT));
      }
      // Re-fetch personalized sections from API for fresh songs
      refreshFromAPI(
        ["bengali top hits", "bangla gaan arijit", "anupam roy bengali", "bengali modern songs", "bangla adhunik gaan", "kumar sanu bengali", "bengali romantic songs"],
        setBengaliHits, 7000, "bengali"
      );
      refreshFromAPI(
        ["thriller suspense hindi", "dark moody bollywood", "horror bollywood songs", "mystery hindi songs", "bhayanak bollywood"],
        setThrillerVibes, 8000, "hindi"
      );
      refreshFromAPI(["bollywood romantic hits", "hindi love songs", "bollywood sad songs", "hindi acoustic"], setForYouTracks, 9000);
    }, AUTO_REFRESH_MS);

    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, [trendingSongs, newReleases, getRandomBatch]);

  const timeOfDay = getTimeOfDay();
  const timeData = timeSuggestions[timeOfDay];

  useEffect(() => {
    if (currentTrack && isPlaying) {
      addToHistory(currentTrack);
      recordPlay(currentTrack.artist, currentTrack.duration || 0);
    }
  }, [currentTrack?.src, isPlaying]);

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

  const loadMoreTrending = useCallback(async (page: number): Promise<Track[]> => {
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=latest%20bollywood%20hits&page=${page + 1}&limit=20`);
      if (!res.ok) return [];
      const data = await res.json();
      const songs = data.data?.results || [];
      return songs
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
          return {
            id: 5100 + page * 20 + i,
            title: s.name,
            artist: s.primaryArtists || "Unknown",
            album: typeof s.album === "string" ? s.album : s.album?.name || "",
            cover: s.image?.find((img: { quality: string }) => img.quality === "500x500")?.link || "",
            src: url160 || url96 || url320 || s.downloadUrl?.[0]?.link || "",
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
    } catch { return []; }
  }, []);

  const getDailySeed = () => {
    const today = new Date();
    return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  };

  const dailyShuffle = <T,>(arr: T[]): T[] => {
    const seed = getDailySeed();
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (seed * (i + 1)) % shuffled.length;
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const loadMoreNewReleases = useCallback(async (page: number): Promise<Track[]> => {
    try {
      const dailyOffset = getDailySeed() % 3;
      const actualPage = page + dailyOffset;
      const queries = ["new hindi songs 2025", "latest bollywood songs", "new bengali songs", "new punjabi songs"];
      const query = queries[getDailySeed() % queries.length];
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(query)}&page=${actualPage}&limit=20`);
      if (!res.ok) return [];
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
          return {
            id: 6100 + page * 20 + i,
            title: s.name,
            artist: s.primaryArtists || "Unknown",
            album: typeof s.album === "string" ? s.album : s.album?.name || "",
            cover: s.image?.find((img: { quality: string }) => img.quality === "500x500")?.link || "",
            src: url160 || url96 || url320 || s.downloadUrl?.[0]?.link || "",
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
      return page === 1 ? dailyShuffle(tracks) : tracks;
    } catch { return []; }
  }, []);

  const hindiArtists = topArtists.filter((a) => a.language === "hindi");
  const bengaliArtists = topArtists.filter((a) => a.language === "bengali");
  const songOfDay = trendingSongs.length > 0 ? trendingSongs[getSongOfDayIndex(trendingSongs.length)] : null;
  const carouselSongs = trendingSongs.slice(0, 5);
  const activeCarouselSong = carouselSongs[carouselIndex] || null;
  const topArtistName = Object.entries(stats.topArtists).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const isLoading = (query: string) => searchLoading && searchingFor === query;

  const parseLabelSong = (s: {
    name: string;
    primaryArtists: string;
    album: { name: string } | string;
    duration: string | number;
    image: { quality: string; link: string }[];
    downloadUrl: { quality: string; link: string }[];
    id: string;
  }, offset: number): Track | null => {
    if (!s.downloadUrl?.length) return null;
    const url96 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "96kbps")?.link;
    const url160 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "160kbps")?.link;
    const url320 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "320kbps")?.link;
    const bestUrl = url160 || url96 || url320 || s.downloadUrl?.[0]?.link || "";
    if (!bestUrl) return null;
    return {
      id: 20000 + offset,
      title: s.name,
      artist: s.primaryArtists || "Unknown",
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
  };

  const playLabelSongs = async (label: MusicLabel, isRefresh = false) => {
    setLoadingLabel(label.name);
    try {
      const page = isRefresh ? Math.floor(Math.random() * 10) + 1 : 1;
      const res = await fetch(
        `${API_BASE}/search/songs?query=${encodeURIComponent(label.searchQuery)}&page=${page}&limit=20`
      );
      if (!res.ok) return;
      const data = await res.json();
      const results = data.data?.results || [];
      const tracks = results
        .map((s: Parameters<typeof parseLabelSong>[0], i: number) => parseLabelSong(s, i))
        .filter((t: Track | null): t is Track => t !== null);
      if (tracks.length > 0) {
        playTrackList(tracks, 0);
      }
    } catch { /* ignore */ }
    setLoadingLabel(null);
  };

  const { containerRef: pullRef, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      trendingInitialized.current = false;
      newReleasesInitialized.current = false;
      setDisplayedTrending([]);
      setDisplayedNewReleases([]);
    },
    enabled: true,
  });

  return (
    <main ref={pullRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-32 md:pb-28">
      {/* Pull to refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div className="flex justify-center py-3 md:hidden">
          <RefreshCw
            size={20}
            className={`text-primary transition-transform ${isRefreshing ? "animate-spin" : ""}`}
            style={{ transform: `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
      )}
      {/* Mobile Search Bar */}
      <div className="md:hidden sticky top-0 z-10 px-4 pt-4 pb-2 bg-background/80 backdrop-blur-md">
        <button
          onClick={() => setShowSearch(true)}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border text-muted-foreground"
        >
          <Search size={16} />
          <span className="text-sm">Search songs, artists, albums...</span>
        </button>
      </div>

      {/* Hero Carousel */}
      {carouselSongs.length > 0 && (
        <div className="relative h-52 sm:h-64 md:h-80 overflow-hidden mb-4 md:mb-6">
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
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-primary font-medium uppercase tracking-wider mb-1">
                      {i === 0 ? "Featured" : `#${i + 1} Trending`}
                    </p>
                    <h2 className="text-sm sm:text-base md:text-2xl font-bold text-foreground line-clamp-1">{song.title}</h2>
                    <p className="text-[11px] md:text-sm text-muted-foreground truncate">{song.artist}</p>
                    <button
                      onClick={() => playTrackList(carouselSongs, i)}
                      className="mt-1.5 md:mt-2 px-3 md:px-4 py-1 md:py-1.5 bg-primary text-primary-foreground text-[10px] md:text-xs font-medium rounded-full hover:brightness-110 transition-all flex items-center gap-1.5"
                    >
                      <Play size={10} fill="currentColor" /> Play
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="absolute bottom-3 right-4 md:right-6 flex items-center gap-1.5 z-10">
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
        {/* Time Greeting (no carousel) */}
        {!activeCarouselSong && (
          <div className="mb-4 md:mb-6 animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl md:text-4xl">{timeData.emoji}</span>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">{timeData.title}</h2>
            </div>
            <p className="text-muted-foreground text-xs md:text-sm ml-10 md:ml-12">{timeData.subtitle}</p>
          </div>
        )}

        {/* Quick Play */}
        <div
          onClick={() => handleSearchAndPlay(timeData.searchQuery)}
          className="mb-6 md:mb-8 p-3 md:p-4 rounded-xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20 cursor-pointer hover:border-primary/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Sparkles size={18} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-xs md:text-sm text-foreground">{timeData.title} Mix</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">{timeData.subtitle}</p>
              </div>
            </div>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              {isLoading(timeData.searchQuery) ? (
                <div className="w-3 h-3 md:w-3.5 md:h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play size={14} className="text-primary-foreground ml-0.5" />
              )}
            </div>
          </div>
        </div>

        {/* Listening Stats */}
        {stats.totalPlays > 0 && (
          <section className="mb-6 md:mb-8 animate-fade-in">
            <div className="p-3 md:p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <BarChart3 size={14} className="text-indigo-400" />
                <h3 className="text-xs md:text-sm font-semibold text-foreground">Your Stats</h3>
              </div>
              <div className="grid grid-cols-4 gap-2 md:gap-3">
                <div className="text-center">
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stats.totalPlays}</p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground">Played</p>
                </div>
                <div className="text-center">
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stats.totalMinutes}</p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground">Minutes</p>
                </div>
                <div className="text-center">
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stats.songsPlayedToday}</p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground">Today</p>
                </div>
                <div className="text-center">
                  <p className="text-lg md:text-2xl font-bold text-primary">{stats.streakDays}</p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground">Streak</p>
                </div>
              </div>
              {topArtistName && (
                <p className="text-[10px] md:text-xs text-muted-foreground mt-2 text-center">
                  Top: <span className="text-foreground font-medium">{topArtistName}</span>
                </p>
              )}
            </div>
          </section>
        )}

        {/* Song of the Day */}
        {songOfDay && (
          <section className="mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <span className="text-base md:text-lg">⭐</span>
              <h3 className="text-base md:text-lg font-bold text-foreground">Song of the Day</h3>
            </div>
            <div
              onClick={() => playTrack(songOfDay)}
              className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 cursor-pointer hover:border-amber-500/40 transition-all group"
            >
              <div className="relative flex-shrink-0">
                <img src={songOfDay.cover} alt="" loading="lazy" className="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover shadow-md" />
                <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                  {currentTrack?.src === songOfDay.src && isPlaying ? (
                    <Pause size={18} className="text-white" />
                  ) : (
                    <Play size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-xs md:text-sm truncate">{songOfDay.title}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground truncate">{songOfDay.artist}</p>
                <p className="text-[9px] md:text-[10px] text-amber-400 mt-0.5">Fresh pick for today</p>
              </div>
              <span className="text-[10px] md:text-xs text-muted-foreground flex-shrink-0">{formatDuration(songOfDay.duration)}</span>
            </div>
          </section>
        )}

        {/* Visualizer */}
        <div className="mb-6 md:mb-8 animate-fade-in">
          <AudioVisualizer />
          {currentTrack && isPlaying && (
            <div className="mt-2 md:mt-3 flex items-center gap-2 md:gap-3">
              <img src={currentTrack.cover} alt="" className="w-7 h-7 md:w-8 md:h-8 rounded" />
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-semibold text-foreground truncate">{currentTrack.title}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
              </div>
            </div>
          )}
        </div>

        {/* Trending Now */}
        {displayedTrending.length > 0 && (
          <section className="mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                <h3 className="text-base md:text-lg font-bold text-foreground">Trending Now</h3>
                <button
                  onClick={refreshTrending}
                  disabled={shufflingTrending}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all disabled:opacity-50"
                  title="Shuffle"
                >
                  <RefreshCw size={14} className={shufflingTrending ? "animate-spin" : ""} />
                </button>
              </div>
              <button
                onClick={() => setShowFullTrending(true)}
                className="text-[10px] md:text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
              >
                View All <ChevronRight size={12} />
              </button>
            </div>
            <div className="flex gap-2.5 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {displayedTrending.map((track, i) => (
                <div
                  key={track.src + i}
                  onClick={() => playTrackList(displayedTrending, i)}
                  className="flex-shrink-0 w-28 md:w-36 group cursor-pointer"
                >
                  <div className="relative mb-1.5 md:mb-2">
                    <img src={track.cover} alt="" loading="lazy" className="w-28 h-28 md:w-36 md:h-36 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-lg">
                        <Play size={14} className="text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute top-1.5 left-1.5 text-[9px] md:text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">
                      #{i + 1}
                    </span>
                  </div>
                  <p className="text-[11px] md:text-xs font-medium text-foreground truncate">{track.title}</p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">{track.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {homeLoading && (
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <div className="w-16 h-4 bg-muted rounded animate-pulse" />
            </div>
            <SectionSkeleton count={6} />
            <div className="flex items-center gap-2 mb-2 md:mb-3 mt-4">
              <div className="w-24 h-4 bg-muted rounded animate-pulse" />
            </div>
            <SectionSkeleton count={6} />
          </div>
        )}

        {/* New Releases */}
        {displayedNewReleases.length > 0 && (
          <section className="mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <Music2 size={16} className="text-primary" />
                <h3 className="text-base md:text-lg font-bold text-foreground">New Releases</h3>
                <button
                  onClick={refreshNewReleases}
                  disabled={shufflingNewReleases}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all disabled:opacity-50"
                  title="Shuffle"
                >
                  <RefreshCw size={14} className={shufflingNewReleases ? "animate-spin" : ""} />
                </button>
              </div>
              <button
                onClick={() => setShowFullNewReleases(true)}
                className="text-[10px] md:text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
              >
                View All <ChevronRight size={12} />
              </button>
            </div>
            <div className="flex gap-2.5 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {displayedNewReleases.map((track, i) => (
                <div
                  key={track.src + i}
                  onClick={() => playTrackList(displayedNewReleases, i)}
                  className="flex-shrink-0 w-28 md:w-36 group cursor-pointer"
                >
                  <div className="relative mb-1.5 md:mb-2">
                    <img src={track.cover} alt="" loading="lazy" className="w-28 h-28 md:w-36 md:h-36 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-lg">
                        <Play size={14} className="text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute top-1.5 left-1.5 text-[8px] md:text-[9px] font-bold text-white bg-green-600/80 px-1.5 py-0.5 rounded">
                      NEW
                    </span>
                  </div>
                  <p className="text-[11px] md:text-xs font-medium text-foreground truncate">{track.title}</p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">{track.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recently Played */}
        {history.length > 0 && (
          <section className="mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                <h3 className="text-base md:text-lg font-bold text-foreground">Recently Played</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearHistory}
                  className="text-[10px] md:text-xs text-muted-foreground hover:text-destructive font-medium transition-colors flex items-center gap-1"
                >
                  <Trash2 size={12} /> Clear
                </button>
                <button
                  onClick={() => setShowFullHistory(true)}
                  className="text-[10px] md:text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                >
                  View All <ChevronRight size={12} />
                </button>
              </div>
            </div>
            <div className="flex gap-2.5 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {history.slice(0, 12).map((entry, i) => (
                <div
                  key={`${entry.track.src}-${i}`}
                  onClick={() => playTrack(entry.track)}
                  className="flex-shrink-0 w-24 md:w-28 group cursor-pointer"
                >
                  <div className="relative mb-1.5 md:mb-2">
                    <img src={entry.track.cover} alt="" loading="lazy" className="w-24 h-24 md:w-28 md:h-28 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <div className="w-7 h-7 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                        {currentTrack?.src === entry.track.src && isPlaying ? (
                          <Pause size={12} className="text-primary-foreground" />
                        ) : (
                          <Play size={12} className="text-primary-foreground ml-0.5" />
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] md:text-[11px] font-medium text-foreground truncate">{entry.track.title}</p>
                  <p className="text-[8px] md:text-[9px] text-muted-foreground truncate">{entry.track.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Continue Listening — Enhanced Recently Played */}
        {history.length > 0 && (
          <section className="mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">▶️</span>
                <h3 className="text-base md:text-lg font-bold text-foreground">Continue Listening</h3>
              </div>
            </div>
            <div className="flex gap-2.5 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {history.slice(0, 8).map((entry, i) => (
                <div key={`${entry.track.src}-${i}`} onClick={() => playTrack(entry.track)} className="flex-shrink-0 w-28 md:w-36 group cursor-pointer">
                  <div className="relative mb-1.5 md:mb-2">
                    <img src={entry.track.cover} alt="" loading="lazy" className="w-28 h-28 md:w-36 md:h-36 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                        <Play size={14} className="text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                    {/* Progress bar at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-lg overflow-hidden">
                      <div className="h-full bg-primary rounded-b-lg" style={{ width: `${Math.random() * 60 + 20}%` }} />
                    </div>
                  </div>
                  <p className="text-[11px] md:text-xs font-medium text-foreground truncate">{entry.track.title}</p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">{entry.track.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Mood Categories */}
        <section className="mb-6 md:mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <Music2 size={16} className="text-primary" />
            <h3 className="text-base md:text-lg font-bold text-foreground">Browse by Mood</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-2.5">
            {moodCategories.map((mood) => (
              <button
                key={mood.name}
                onClick={() => setMoodPlaylist(mood)}
                className={`relative p-3 md:p-3.5 rounded-xl bg-gradient-to-br ${mood.gradient} cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-transform group overflow-hidden`}
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                <div className="relative text-center">
                  <span className="text-lg md:text-xl">{mood.emoji}</span>
                  <p className="text-[10px] md:text-xs font-bold text-white mt-1">{mood.name}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Top Music Labels */}
        <section className="mb-6 md:mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <Music2 size={16} className="text-primary" />
            <h3 className="text-base md:text-lg font-bold text-foreground">Top Music Labels</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-2.5">
            {musicLabels.map((label) => (
              <div
                key={label.name}
                onClick={() => loadingLabel !== label.name && playLabelSongs(label)}
                className={`relative p-3 md:p-3.5 rounded-xl bg-gradient-to-br ${label.gradient} cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-transform group overflow-hidden`}
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                <div className="relative text-center">
                  <p className={`text-[11px] md:text-sm font-bold ${label.textColor}`}>{label.name}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (loadingLabel !== label.name) playLabelSongs(label, true);
                  }}
                  className="absolute bottom-1.5 right-1.5 p-1 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
                  title="Shuffle songs"
                >
                  {loadingLabel === label.name ? (
                    <Loader2 size={12} className="text-white/80 animate-spin" />
                  ) : (
                    <RefreshCw size={12} className="text-white/80" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Saved Artists (Mobile) */}
        {artistFavorites.length > 0 && (
          <section className="mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <h3 className="text-base md:text-lg font-bold text-foreground">Saved Artists ({artistFavorites.length})</h3>
            </div>
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {artistFavorites.map((artist) => (
                <button
                  key={artist.id}
                  onClick={() => setArtistPlaylist({ name: artist.name, query: artist.name, artistId: artist.id })}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 md:gap-2 group"
                >
                  <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all">
                    <img src={artist.image} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Play size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <p className="text-[10px] md:text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center w-16 md:w-20 truncate">{artist.name}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Top Hindi Artists */}
        <section className="mb-6 md:mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <h3 className="text-base md:text-lg font-bold text-foreground">Hindi Artists</h3>
            <button
              onClick={() => setShowViewAllArtists(true)}
              className="text-[11px] md:text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
            >
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {hindiArtists.map((artist) => (
              <button
                key={artist.name}
                onClick={() => setArtistPlaylist({ name: artist.name, query: artist.searchQuery })}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 md:gap-2 group"
              >
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all">
                  <img src={artist.image} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Play size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center w-16 md:w-20 truncate">{artist.name}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Top Bengali Artists */}
        <section className="mb-6 md:mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <h3 className="text-base md:text-lg font-bold text-foreground">Bengali Artists</h3>
            <button
              onClick={() => setShowViewAllArtists(true)}
              className="text-[11px] md:text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
            >
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {bengaliArtists.map((artist) => (
              <button
                key={artist.name}
                onClick={() => setArtistPlaylist({ name: artist.name, query: artist.searchQuery })}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 md:gap-2 group"
              >
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all">
                  <img src={artist.image} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Play size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center w-16 md:w-20 truncate">{artist.name}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Bengali Hits */}
        {bengaliHits.length > 0 && (
          <section className="mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🎵</span>
                <h3 className="text-base md:text-lg font-bold text-foreground">Bangla Hits</h3>
              </div>
            </div>
            <div className="flex gap-2.5 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {bengaliHits.map((track, i) => (
                <div key={track.src + i} onClick={() => playTrackList(bengaliHits, i)} className="flex-shrink-0 w-28 md:w-36 group cursor-pointer">
                  <div className="relative mb-1.5 md:mb-2">
                    <img src={track.cover} alt="" loading="lazy" className="w-28 h-28 md:w-36 md:h-36 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-lg">
                        <Play size={14} className="text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute top-1.5 left-1.5 text-[8px] md:text-[9px] font-bold text-white bg-green-700/80 px-1.5 py-0.5 rounded">
                      BANGLA
                    </span>
                  </div>
                  <p className="text-[11px] md:text-xs font-medium text-foreground truncate">{track.title}</p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">{track.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Thriller & Dark Vibes */}
        {thrillerVibes.length > 0 && (
          <section className="mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🎭</span>
                <h3 className="text-base md:text-lg font-bold text-foreground">Dark & Thriller</h3>
              </div>
            </div>
            <div className="flex gap-2.5 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {thrillerVibes.map((track, i) => (
                <div key={track.src + i} onClick={() => playTrackList(thrillerVibes, i)} className="flex-shrink-0 w-28 md:w-36 group cursor-pointer">
                  <div className="relative mb-1.5 md:mb-2">
                    <img src={track.cover} alt="" loading="lazy" className="w-28 h-28 md:w-36 md:h-36 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-lg">
                        <Play size={14} className="text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute top-1.5 left-1.5 text-[8px] md:text-[9px] font-bold text-white bg-red-900/80 px-1.5 py-0.5 rounded">
                      THRILLER
                    </span>
                  </div>
                  <p className="text-[11px] md:text-xs font-medium text-foreground truncate">{track.title}</p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">{track.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* For You — Personalized */}
        {forYouTracks.length > 0 && (
          <section className="mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                <h3 className="text-base md:text-lg font-bold text-foreground">For You</h3>
              </div>
            </div>
            <div className="flex gap-2.5 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {forYouTracks.map((track, i) => (
                <div key={track.src + i} onClick={() => playTrackList(forYouTracks, i)} className="flex-shrink-0 w-28 md:w-36 group cursor-pointer">
                  <div className="relative mb-1.5 md:mb-2">
                    <img src={track.cover} alt="" loading="lazy" className="w-28 h-28 md:w-36 md:h-36 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-lg">
                        <Play size={14} className="text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] md:text-xs font-medium text-foreground truncate">{track.title}</p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">{track.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bengali Albums */}
        {bengaliAlbums.length > 0 && (
          <section className="mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">💿</span>
                <h3 className="text-base md:text-lg font-bold text-foreground">Bengali Albums</h3>
              </div>
            </div>
            <div className="flex gap-2.5 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {bengaliAlbums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => handleSearchAndPlay(album.name)}
                  className="flex-shrink-0 w-28 md:w-36 group cursor-pointer"
                >
                  <div className="relative mb-1.5 md:mb-2">
                    <img src={album.cover} alt="" loading="lazy" className="w-28 h-28 md:w-36 md:h-36 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-lg">
                        <Play size={14} className="text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute top-1.5 left-1.5 text-[8px] md:text-[9px] font-bold text-white bg-purple-600/80 px-1.5 py-0.5 rounded">
                      ALBUM
                    </span>
                  </div>
                  <p className="text-[11px] md:text-xs font-medium text-foreground truncate">{album.name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sunday Suspense / Horror Thriller */}
        {horrorPodcast.length > 0 && (
          <section className="mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🎙️</span>
                <h3 className="text-base md:text-lg font-bold text-foreground">Sunday Suspense Vibes</h3>
              </div>
            </div>
            <div className="flex gap-2.5 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {horrorPodcast.map((track, i) => (
                <div key={track.src + i} onClick={() => playTrackList(horrorPodcast, i)} className="flex-shrink-0 w-28 md:w-36 group cursor-pointer">
                  <div className="relative mb-1.5 md:mb-2">
                    <img src={track.cover} alt="" loading="lazy" className="w-28 h-28 md:w-36 md:h-36 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-lg">
                        <Play size={14} className="text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute top-1.5 left-1.5 text-[8px] md:text-[9px] font-bold text-white bg-red-800/80 px-1.5 py-0.5 rounded">
                      HORROR
                    </span>
                  </div>
                  <p className="text-[11px] md:text-xs font-medium text-foreground truncate">{track.title}</p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">{track.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top Charts */}
        {topChartTracks.length > 0 && (
          <section className="mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🏆</span>
                <h3 className="text-base md:text-lg font-bold text-foreground">Top Charts</h3>
              </div>
            </div>
            <div className="space-y-1.5">
              {topChartTracks.map((track, i) => (
                <div
                  key={track.src + i}
                  onClick={() => playTrackList(topChartTracks, i)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                >
                  <span className={`text-sm font-bold w-6 text-center ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <img src={track.cover} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={16} className="text-primary" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Time Machine */}
        <section className="mb-6 md:mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              <h3 className="text-base md:text-lg font-bold text-foreground">Time Machine</h3>
            </div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground">Decades</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 md:gap-2.5">
            {eraCategories.map((era) => (
              <button
                key={era.name}
                onClick={() => setTimeMachineEra(era)}
                className={`relative p-3 md:p-3 rounded-xl bg-gradient-to-br ${era.gradient} cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-transform group overflow-hidden`}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="relative text-center">
                  <p className="text-lg md:text-xl font-black text-white">{era.name}</p>
                  <p className="text-[8px] md:text-[9px] text-white/80 mt-0.5 truncate">{era.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Quick Picks */}
        <section className="mb-6 md:mb-8 animate-fade-in">
          <h3 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3">Quick Picks</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-2.5">
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
                className={`flex items-center gap-3 p-3 md:p-3.5 rounded-xl bg-gradient-to-r ${pick.color} border border-border hover:border-primary/30 transition-all group cursor-pointer`}
              >
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors">
                  {isLoading(pick.query) ? (
                    <div className="w-3 h-3 md:w-3.5 md:h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play size={14} className="text-primary" />
                  )}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[11px] md:text-xs font-semibold text-foreground truncate">{pick.title}</p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">{pick.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Modals */}
      {artistDetail && (
        <ArtistDetail
          artistName={artistDetail.name}
          searchQuery={artistDetail.query}
          onClose={() => setArtistDetail(null)}
        />
      )}
      {artistPlaylist && (
        <ArtistPlaylist
          artistName={artistPlaylist.name}
          searchQuery={artistPlaylist.query}
          artistId={artistPlaylist.artistId}
          onClose={() => setArtistPlaylist(null)}
        />
      )}
      {showViewAllArtists && (
        <ViewAllArtists
          onSelectArtist={(artist) => {
            setShowViewAllArtists(false);
            setArtistPlaylist({ name: artist.name, query: artist.searchQuery, artistId: (artist as { artistId?: string }).artistId });
          }}
          onClose={() => setShowViewAllArtists(false)}
        />
      )}
      {timeMachineEra && (
        <TimeMachinePlaylist
          eraName={timeMachineEra.name}
          subtitle={timeMachineEra.subtitle}
          searchQuery={timeMachineEra.searchQuery}
          onClose={() => setTimeMachineEra(null)}
        />
      )}
      {moodPlaylist && (
        <MoodPlaylist
          moodName={moodPlaylist.name}
          emoji={moodPlaylist.emoji}
          searchQuery={moodPlaylist.searchQuery}
          gradient={moodPlaylist.gradient}
          onClose={() => setMoodPlaylist(null)}
        />
      )}

      {/* Full Playlist Modals */}
      {showFullTrending && (
        <FullPlaylist
          title="Trending Now"
          icon="trending"
          initialSongs={trendingSongs}
          loadMore={loadMoreTrending}
          onClose={() => setShowFullTrending(false)}
        />
      )}
      {showFullNewReleases && (
        <FullPlaylist
          title="New Releases"
          icon="new"
          initialSongs={newReleases}
          loadMore={loadMoreNewReleases}
          onClose={() => setShowFullNewReleases(false)}
        />
      )}
      {showFullHistory && (
        <FullPlaylist
          title="Recently Played"
          icon="history"
          initialSongs={history.map((h) => h.track)}
          onClose={() => setShowFullHistory(false)}
        />
      )}
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
    </main>
  );
};
