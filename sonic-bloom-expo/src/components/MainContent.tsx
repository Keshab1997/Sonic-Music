
import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
  Pressable,
} from "react-native";
import { Play, ChevronRight, Music2, Sparkles, TrendingUp, Clock, RefreshCw, ChevronLeft, Pause, ListMusic, Eye, Trash2, Search, Loader2, Plus, Download, CheckCircle } from "lucide-react-native";
import { toast } from "sonner";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { useHomeData } from "@/hooks/useHomeData";
import { useRecentlyPlayed } from "@/hooks/useRecentlyPlayed";
import { useListeningStats } from "@/hooks/useListeningStats";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { ArtistDetail } from "@/components/ArtistDetail";
import { ArtistPlaylist } from "@/components/ArtistPlaylist";
import { ViewAllArtists } from "@/components/ViewAllArtists";
import { ActressesModal } from "@/components/ActressesModal";
import { PlaylistsModal } from "@/components/PlaylistsModal";
import { TimeMachinePlaylist } from "@/components/TimeMachinePlaylist";
import { MoodPlaylist } from "@/components/MoodPlaylist";
import { FullPlaylist } from "@/components/FullPlaylist";
import { SearchOverlay } from "@/components/SearchOverlay";
import { SectionSkeleton, HeroSkeleton, ArtistGridSkeleton } from "@/components/Skeletons";
import { DeferredSection } from "@/components/DeferredSection";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Track } from "@/data/playlist";
import {
  topArtists,
  allArtists,
  actresses,
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
import { useDownloads } from "@/hooks/useDownloads";
import { useDownloadsContext } from "@/context/DownloadsContext";
  import { usePlaylists } from "@/hooks/usePlaylists";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_SIZE = SCREEN_WIDTH < 380 ? 112 : 144;
const CARD_SIZE_SMALL = SCREEN_WIDTH < 380 ? 96 : 112;

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

// ─── Reusable Components ──────────────────────────────────────────────────────

const parseGradient = (gradient: string): [string, string] => {
  const parts = gradient.replace("from-", "").replace("to-", "").split(" ");
  const colorMap: Record<string, string> = {
    "rose-600": "#e11d48", "pink-600": "#db2777", "purple-600": "#9333ea",
    "indigo-600": "#4f46e5", "blue-600": "#2563eb", "cyan-600": "#0891b2",
    "teal-600": "#0d9488", "green-600": "#16a34a", "amber-600": "#d97706",
    "orange-600": "#ea580c", "red-600": "#dc2626", "slate-600": "#475569",
  };
  return [colorMap[parts[0]] || parts[0], colorMap[parts[1]] || parts[1]] as [string, string];
};

const SectionHeader = ({ title, icon, rightAction, subtitle }: {
  title: string;
  icon?: React.ReactNode;
  rightAction?: { label: string; onPress: () => void };
  subtitle?: string;
}) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {rightAction && (
      <TouchableOpacity onPress={rightAction.onPress} style={styles.sectionHeaderRight}>
        <Text style={styles.viewAllText}>{rightAction.label}</Text>
        <ChevronRight size={12} color="#1DB954" />
      </TouchableOpacity>
    )}
  </View>
);

const TrackCard = ({ track, index, tracks, onPress, showRank, showBadge, badgeText, badgeColor, onAddToQueue, onDownload, isDownloaded, isDownloading, downloadProgress }: {
  track: Track;
  index: number;
  tracks: Track[];
  onPress: () => void;
  showRank?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  badgeColor?: string;
  onAddToQueue?: () => void;
  onDownload?: () => void;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  downloadProgress?: number;
}) => (
  <TouchableOpacity onPress={onPress} style={styles.trackCard} activeOpacity={0.7}>
    <View style={styles.trackCardImageContainer}>
      <Image
        source={{ uri: track.cover }}
        style={styles.trackCardImage}
        resizeMode="cover"
      />
      <View style={styles.trackCardOverlay}>
        <View style={styles.playButton}>
          <Play size={14} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
        </View>
      </View>
      {showRank && (
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{index + 1}</Text>
        </View>
      )}
      {showBadge && badgeText && (
        <View style={[styles.badge, { backgroundColor: badgeColor || "#16a34a" }]}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      )}
      {onAddToQueue && (
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); onAddToQueue(); }}
          style={styles.queueButton}
          activeOpacity={0.7}
        >
          <Plus size={12} color="#fff" />
        </TouchableOpacity>
      )}
      {onDownload && (
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); onDownload(); }}
          disabled={isDownloaded || isDownloading}
          style={[
            styles.downloadButton,
            isDownloaded && styles.downloadButtonDownloaded,
            isDownloading && styles.downloadButtonDownloading,
          ]}
          activeOpacity={0.7}
        >
          {isDownloading ? (
            <Loader2 size={10} color="#fff" />
          ) : isDownloaded ? (
            <CheckCircle size={10} color="#fff" />
          ) : (
            <Download size={10} color="#fff" />
          )}
        </TouchableOpacity>
      )}
    </View>
    <Text style={styles.trackCardTitle} numberOfLines={1}>{track.title}</Text>
    <Text style={styles.trackCardArtist} numberOfLines={1}>{track.artist}</Text>
  </TouchableOpacity>
);

const ArtistCircle = ({ image, name, onPress, ringColor }: {
  image: string;
  name: string;
  onPress: () => void;
  ringColor?: string;
}) => (
  <TouchableOpacity onPress={onPress} style={styles.artistCircle} activeOpacity={0.7}>
    <View style={[styles.artistImageContainer, ringColor && { borderWidth: 2, borderColor: ringColor }]}>
      <Image source={{ uri: image }} style={styles.artistImage} resizeMode="cover" />
      <View style={styles.artistOverlay}>
        <Play size={16} color="#fff" />
      </View>
    </View>
    <Text style={styles.artistName} numberOfLines={2}>{name}</Text>
  </TouchableOpacity>
);

const MoodCard = ({ mood, onPress }: {
  mood: MoodCategory;
  onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress} style={styles.moodCard} activeOpacity={0.7}>
    <LinearGradient colors={parseGradient(mood.gradient)} style={styles.moodCardInner}>
      <View style={styles.moodCardOverlay} />
      <View style={styles.moodCardContent}>
        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
        <Text style={styles.moodName}>{mood.name}</Text>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

const EraCard = ({ era, onPress }: {
  era: typeof eraCategories[0];
  onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress} style={styles.eraCard} activeOpacity={0.7}>
    <LinearGradient colors={parseGradient(era.gradient)} style={styles.eraCardInner}>
      <View style={styles.eraCardOverlay} />
      <View style={styles.eraCardContent}>
        <Text style={styles.eraName}>{era.name}</Text>
        <Text style={styles.eraSubtitle}>{era.subtitle}</Text>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

const LabelCard = ({ label, onPress, onShuffle, isLoading }: {
  label: MusicLabel;
  onPress: () => void;
  onShuffle: () => void;
  isLoading: boolean;
}) => (
  <TouchableOpacity onPress={onPress} style={styles.labelCard} activeOpacity={0.7}>
    <LinearGradient colors={parseGradient(label.gradient)} style={styles.labelCardInner}>
      <View style={styles.labelCardOverlay} />
      <View style={styles.labelCardContent}>
        <Text style={[styles.labelName, { color: label.textColor }]}>{label.name}</Text>
      </View>
      <TouchableOpacity onPress={onShuffle} style={styles.labelShuffleButton} activeOpacity={0.7}>
        {isLoading ? (
          <Loader2 size={12} color="rgba(255,255,255,0.8)" />
        ) : (
          <RefreshCw size={12} color="rgba(255,255,255,0.8)" />
        )}
      </TouchableOpacity>
    </LinearGradient>
  </TouchableOpacity>
);

const QuickPickButton = ({ title, desc, query, color, onPress, isLoading, iconColor }: {
  title: string;
  desc: string;
  query: string;
  color: string;
  onPress: () => void;
  isLoading: boolean;
  iconColor?: string;
}) => {
  const bgColors = parseGradient(color);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      style={[styles.quickPickButton, { borderColor: "rgba(255,255,255,0.1)" }]}
      activeOpacity={0.7}
    >
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} />
      <View style={styles.quickPickIcon}>
        {isLoading ? (
          <ActivityIndicator size={14} color={iconColor || "#1DB954"} />
        ) : (
          <Play size={14} color={iconColor || "#1DB954"} />
        )}
      </View>
      <View style={styles.quickPickText}>
        <Text style={styles.quickPickTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.quickPickDesc} numberOfLines={1}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Content Component ───────────────────────────────────────────────────

export const MainContent = () => {
  const { currentTrack, isPlaying, playTrackList, playTrack, togglePlay, addToQueue, addToListeningHistory } = usePlayer();
  const { user } = useAuth();
  const { trendingSongs, newReleases, charts, featuredPlaylists: apiFeaturedPlaylists, loading: homeLoading } = useHomeData();
  const [featuredPlaylists, setFeaturedPlaylists] = useState<typeof apiFeaturedPlaylists>([]);
  const [playlistFilter, setPlaylistFilter] = useState<"all" | "hindi" | "bengali">("all");

  const [shuffleIndex, setShuffleIndex] = useState(0);

  useEffect(() => {
    if (apiFeaturedPlaylists.length > 0) {
      let filtered = [...apiFeaturedPlaylists];
      if (playlistFilter === "hindi") {
        filtered = filtered.filter(p => p.language === "hindi");
      } else if (playlistFilter === "bengali") {
        filtered = filtered.filter(p => p.language === "bengali");
      }
      const shuffled = [...filtered];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setFeaturedPlaylists(shuffled);
    }
  }, [apiFeaturedPlaylists, playlistFilter, shuffleIndex]);
  
  const handleShufflePlaylists = useCallback(() => {
    setShuffleIndex(prev => prev + 1);
  }, []);
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
  const [showFullFeaturedPlaylists, setShowFullFeaturedPlaylists] = useState(false);
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
  const { downloadTrack, isDownloaded, isDownloading, getDownloadProgress } = useDownloadsContext();
  const { playlists, createPlaylist, addTrackToPlaylist } = usePlaylists();

  const [bengaliHits, setBengaliHits] = useState<Track[]>([]);
  const [forYouTracks, setForYouTracks] = useState<Track[]>([]);
  const [bengaliAlbums, setBengaliAlbums] = useState<{ name: string; cover: string; id: string }[]>([]);
  const [topChartTracks, setTopChartTracks] = useState<Track[]>([]);
  const [actressPlaylist, setActressPlaylist] = useState<{ name: string; query: string } | null>(null);
  const [actressSearch, setActressSearch] = useState("");
  const [showActressesModal, setShowActressesModal] = useState(false);
  const [showPlaylistsModal, setShowPlaylistsModal] = useState(false);

  const DISPLAY_COUNT = 8;
  const DISPLAY_COUNT_MOBILE = 5;

  useEffect(() => {
    const API = "https://jiosaavn-api-privatecvc2.vercel.app";
    const fetchSection = async (queries: string[], setter: (t: Track[]) => void, offset: number, langFilter?: string) => {
      try {
        const query = queries[Math.floor(Math.random() * queries.length)];
        const page = Math.floor(Math.random() * 4) + 1;
        const res = await fetch(`${API}/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=15`);
        if (!res.ok) return;
        const data = await res.json();
        let songs = data.data?.results || [];
        if (langFilter) {
          songs = songs.filter((s: { language?: string }) => s.language === langFilter);
        }
        const tracks: Track[] = songs
          .filter((s: { downloadUrl?: unknown[] }) => s.downloadUrl?.length > 0)
          .map((s: { downloadUrl: { quality: string; link: string }[]; name: string; primaryArtists: string; album?: { name?: string } | string; image: { quality: string; link: string }[]; duration: string | number; id: string }, i: number) => {
            const url96 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "96kbps")?.link;
            const url160 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "160kbps")?.link;
            const bestUrl = url160 || url96 || s.downloadUrl?.[0]?.link || "";
            return { id: offset + i, title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown", artist: s.primaryArtists || "Unknown", album: typeof s.album === "string" ? s.album : s.album?.name || "", cover: s.image?.find((img: { quality: string }) => img.quality === "500x500")?.link || s.image?.[s.image.length - 1]?.link || "", src: bestUrl, duration: parseInt(String(s.duration)) || 0, type: "audio" as const, songId: s.id } as Track;
          });
        setter(tracks);
      } catch { /* skip */ }
    };

    fetchSection(
      ["bengali top hits", "bangla gaan arijit", "anupam roy bengali", "bengali modern songs", "bangla adhunik gaan", "kumar sanu bengali", "bengali romantic songs"],
      setBengaliHits, 7000, "bengali"
    );
    fetchSection(["bollywood romantic hits", "hindi love songs", "bollywood sad songs", "hindi acoustic"], setForYouTracks, 9000);

    // Top Charts
    fetch(`${API}/charts`).then(r => r.json()).then(data => {
      const songs = data.data?.results || [];
      if (songs.length > 0) {
        setTopChartTracks(songs.slice(0, 8).map((s: { downloadUrl: { quality: string; link: string }[]; name: string; primaryArtists: string; album?: { name?: string } | string; image: { quality: string; link: string }[]; duration: string | number; id: string }, i: number) => {
          const url96 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "96kbps")?.link;
          const url160 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "160kbps")?.link;
          return {
            id: 10000 + i, title: s.name?.replace(/"/g, '"') || "Unknown", artist: s.primaryArtists || "Unknown",
            album: typeof s.album === "string" ? s.album : s.album?.name || "",
            cover: s.image?.find((img: { quality: string }) => img.quality === "500x500")?.link || "",
            src: url160 || url96 || "", duration: parseInt(String(s.duration)) || 0, type: "audio" as const, songId: s.id,
          } as Track;
        }));
      }
    }).catch(() => {});

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

  const AUTO_REFRESH_MS = 120000;

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

  useEffect(() => {
    const API = "https://jiosaavn-api-privatecvc2.vercel.app";

    const refreshFromAPI = async (queries: string[], setter: (t: Track[]) => void, offset: number, langFilter?: string) => {
      try {
        const query = queries[Math.floor(Math.random() * queries.length)];
        const page = Math.floor(Math.random() * 4) + 1;
        const res = await fetch(`${API}/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=15`);
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
            return { id: offset + i, title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown", artist: s.primaryArtists || "Unknown", album: typeof s.album === "string" ? s.album : s.album?.name || "", cover: s.image?.find((img: { quality: string }) => img.quality === "500x500")?.link || s.image?.[s.image.length - 1]?.link || "", src: bestUrl, duration: parseInt(String(s.duration)) || 0, type: "audio" as const, songId: s.id } as Track;
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
      refreshFromAPI(
        ["bengali top hits", "bangla gaan arijit", "anupam roy bengali", "bengali modern songs", "bangla adhunik gaan", "kumar sanu bengali", "bengali romantic songs"],
        setBengaliHits, 7000, "bengali"
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
    if (currentTrack && isPlaying && currentTrack.songId) {
      addToListeningHistory(String(currentTrack.songId), currentTrack.duration || 0, false);
      recordPlay(currentTrack.artist, currentTrack.duration || 0);
    }
  }, [currentTrack?.src, isPlaying, addToListeningHistory, recordPlay]);

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


  const playLabelSongs = async (label: MusicLabel | { name: string; searchQuery: string }, isRefresh = false) => {
    const labelName = "name" in label ? label.name : "";
    setLoadingLabel(labelName);
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

  const playJioSaavnPlaylist = async (playlist: { id: string; title: string }) => {
    toast.loading(`Loading ${playlist.title}...`, { id: "playlist-load" });
    try {
      const res = await fetch(`${API_BASE}/playlists?id=${playlist.id}`);
      if (!res.ok) {
        toast.error("Failed to load playlist", { id: "playlist-load" });
        return;
      }
      const data = await res.json();
      const songs = data.data?.songs || [];
      const tracks: Track[] = songs
        .filter((s: { downloadUrl?: unknown[] }) => s.downloadUrl?.length > 0)
        .map((s: { downloadUrl: { quality: string; link: string }[]; name: string; primaryArtists: string; album?: { name?: string } | string; image: { quality: string; link: string }[]; duration: string | number; id: string }, i: number) => {
          const url96 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "96kbps")?.link;
          const url160 = s.downloadUrl?.find((d: { quality: string }) => d.quality === "160kbps")?.link;
          const bestUrl = url160 || url96 || s.downloadUrl?.[0]?.link || "";
          return {
            id: 8000 + i,
            title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown",
            artist: s.primaryArtists || "Unknown",
            album: typeof s.album === "string" ? s.album : s.album?.name || "",
            cover: s.image?.find((img: { quality: string }) => img.quality === "500x500")?.link || s.image?.[s.image.length - 1]?.link || "",
            src: bestUrl,
            duration: parseInt(String(s.duration)) || 0,
            type: "audio" as const,
            songId: s.id,
          } as Track;
        });
      if (tracks.length > 0) {
        toast.success(`Playing ${playlist.title} (${tracks.length} songs)`, { id: "playlist-load" });
        playTrackList(tracks, 0);
      } else {
        toast.error("No songs found in playlist", { id: "playlist-load" });
      }
    } catch { 
      toast.error("Failed to load playlist", { id: "playlist-load" });
    }
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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Pull to refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <View style={styles.pullIndicator}>
          <RefreshCw
            size={20}
            color="#1DB954"
            style={{ transform: [{ rotate: `${pullDistance * 3}deg` }] }}
          />
        </View>
      )}

      <ScrollView
        ref={pullRef as any}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              trendingInitialized.current = false;
              newReleasesInitialized.current = false;
              setDisplayedTrending([]);
              setDisplayedNewReleases([]);
            }}
            tintColor="#1DB954"
          />
        }
      >
        {/* Mobile Search Bar */}
        <View style={styles.searchBarContainer}>
          <TouchableOpacity
            onPress={() => setShowSearch(true)}
            style={styles.searchBar}
            activeOpacity={0.7}
          >
            <Search size={18} color="#888" />
            <Text style={styles.searchBarText}>Search songs, artists, albums...</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Carousel */}
        {carouselSongs.length > 0 && (
          <View style={styles.carouselContainer}>
            {carouselSongs.map((song, i) => (
              <View
                key={song.src}
                style={[
                  styles.carouselSlide,
                  { opacity: i === carouselIndex ? 1 : 0 },
                  i !== carouselIndex && styles.carouselSlideHidden,
                ]}
                pointerEvents={i === carouselIndex ? "auto" : "none"}
              >
                <Image source={{ uri: song.cover }} style={styles.carouselImage} resizeMode="cover" />
                <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.7)", "rgba(0,0,0,0.9)"]} style={styles.carouselGradient} />
                <View style={styles.carouselContent}>
                  <View style={styles.carouselInfo}>
                    <Image source={{ uri: song.cover }} style={styles.carouselThumb} resizeMode="cover" />
                    <View style={styles.carouselText}>
                      <Text style={styles.carouselLabel}>
                        {i === 0 ? "Featured" : `#${i + 1} Trending`}
                      </Text>
                      <Text style={styles.carouselTitle} numberOfLines={2}>{song.title}</Text>
                      <Text style={styles.carouselArtist} numberOfLines={1}>{song.artist}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => playTrackList(carouselSongs, i)}
                    style={styles.carouselPlayButton}
                    activeOpacity={0.7}
                  >
                    <Play size={10} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
                    <Text style={styles.carouselPlayText}>Play</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={styles.carouselControls}>
              <TouchableOpacity
                onPress={() => setCarouselIndex((prev) => (prev - 1 + carouselSongs.length) % carouselSongs.length)}
                style={styles.carouselNavButton}
                activeOpacity={0.7}
              >
                <ChevronLeft size={14} color="#fff" />
              </TouchableOpacity>
              {carouselSongs.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setCarouselIndex(i)}
                  style={[styles.carouselDot, i === carouselIndex && styles.carouselDotActive]}
                  activeOpacity={0.7}
                />
              ))}
              <TouchableOpacity
                onPress={() => setCarouselIndex((prev) => (prev + 1) % carouselSongs.length)}
                style={styles.carouselNavButton}
                activeOpacity={0.7}
              >
                <ChevronRight size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.contentPadding}>
          {/* Time Greeting */}
          {!activeCarouselSong && (
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingEmoji}>{timeData.emoji}</Text>
              <View style={styles.greetingText}>
                <Text style={styles.greetingTitle}>{timeData.title}</Text>
                <Text style={styles.greetingSubtitle}>{timeData.subtitle}</Text>
              </View>
            </View>
          )}

          {/* Quick Play */}
          <TouchableOpacity
            onPress={() => handleSearchAndPlay(timeData.searchQuery)}
            style={styles.quickPlayCard}
            activeOpacity={0.7}
          >
            <View style={styles.quickPlayLeft}>
              <View style={styles.quickPlayIcon}>
                <Sparkles size={18} color="#1DB954" />
              </View>
              <View>
                <Text style={styles.quickPlayTitle}>{timeData.title} Mix</Text>
                <Text style={styles.quickPlaySubtitle}>{timeData.subtitle}</Text>
              </View>
            </View>
            <View style={styles.quickPlayButton}>
              {isLoading(timeData.searchQuery) ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Play size={14} color="#fff" style={{ marginLeft: 2 }} />
              )}
            </View>
          </TouchableOpacity>

          {/* Song of the Day */}
          {songOfDay && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>⭐</Text>
                <Text style={styles.sectionTitle}>Song of the Day</Text>
              </View>
              <TouchableOpacity
                onPress={() => playTrack(songOfDay)}
                style={styles.songOfDayCard}
                activeOpacity={0.7}
              >
                <View style={styles.songOfDayImageContainer}>
                  <Image source={{ uri: songOfDay.cover }} style={styles.songOfDayImage} resizeMode="cover" />
                  <View style={styles.songOfDayOverlay}>
                    {currentTrack?.src === songOfDay.src && isPlaying ? (
                      <Pause size={18} color="#fff" />
                    ) : (
                      <Play size={18} color="#fff" />
                    )}
                  </View>
                </View>
                <View style={styles.songOfDayInfo}>
                  <Text style={styles.songOfDayTitle} numberOfLines={1}>{songOfDay.title}</Text>
                  <Text style={styles.songOfDayArtist} numberOfLines={1}>{songOfDay.artist}</Text>
                  <Text style={styles.songOfDayBadge}>Fresh pick for today</Text>
                </View>
                <Text style={styles.songOfDayDuration}>{formatDuration(songOfDay.duration)}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Visualizer */}
          <View style={styles.section}>
            <AudioVisualizer />
            {currentTrack && isPlaying && (
              <View style={styles.nowPlayingInfo}>
                <Image source={{ uri: currentTrack.cover }} style={styles.nowPlayingImage} resizeMode="cover" />
                <View>
                  <Text style={styles.nowPlayingTitle} numberOfLines={1}>{currentTrack.title}</Text>
                  <Text style={styles.nowPlayingArtist} numberOfLines={1}>{currentTrack.artist}</Text>
                </View>
              </View>
            )}
          </View>

          {/* ── TRENDING ── */}
          <View style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>🔥 Trending</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Trending Now */}
          {displayedTrending.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="Trending Now"
                icon={<TrendingUp size={16} color="#1DB954" />}
                rightAction={{ label: "View All", onPress: () => setShowFullTrending(true) }}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {displayedTrending.map((track, i) => (
                  <TrackCard
                    key={track.src + i}
                    track={track}
                    index={i}
                    tracks={displayedTrending}
                    onPress={() => playTrackList(displayedTrending, i)}
                    showRank
                    onAddToQueue={() => addToQueue(track)}
                    onDownload={() => {
                      console.log('[MainContent] Download clicked for:', track.title, 'id:', track.id);
                      downloadTrack(track);
                    }}
                    isDownloaded={isDownloaded(String(track.id))}
                    isDownloading={isDownloading(String(track.id))}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {homeLoading && (
            <View style={styles.section}>
              <View style={styles.skeletonHeader}>
                <View style={styles.skeletonTitle} />
              </View>
              <SectionSkeleton count={6} />
              <View style={styles.skeletonHeader}>
                <View style={[styles.skeletonTitle, { width: 96 }]} />
              </View>
              <SectionSkeleton count={6} />
            </View>
          )}

          {/* New Releases */}
          {displayedNewReleases.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="New Releases"
                icon={<Music2 size={16} color="#1DB954" />}
                rightAction={{ label: "View All", onPress: () => setShowFullFeaturedPlaylists(true) }}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {displayedNewReleases.map((track, i) => (
                  <TrackCard
                    key={track.src + i}
                    track={track}
                    index={i}
                    tracks={displayedNewReleases}
                    onPress={() => playTrackList(displayedNewReleases, i)}
                    showBadge
                    badgeText="NEW"
                    badgeColor="#16a34a"
                    onAddToQueue={() => addToQueue(track)}
                    onDownload={() => {
                      console.log('[MainContent] Download clicked for:', track.title, 'id:', track.id);
                      downloadTrack(track);
                    }}
                    isDownloaded={isDownloaded(String(track.id))}
                    isDownloading={isDownloading(String(track.id))}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Recently Played */}
          {history.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Clock size={16} color="#1DB954" />
                  <Text style={styles.sectionTitle}>Recently Played</Text>
                </View>
                <View style={styles.sectionHeaderRight}>
                  <TouchableOpacity onPress={clearHistory} style={styles.clearButton} activeOpacity={0.7}>
                    <Trash2 size={12} color="#888" />
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowFullHistory(true)} style={styles.viewAllButton} activeOpacity={0.7}>
                    <Text style={styles.viewAllText}>View All</Text>
                    <ChevronRight size={12} color="#1DB954" />
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {history.slice(0, 8).map((entry, i) => (
                  <TrackCard
                    key={`${entry.track.src}-${i}`}
                    track={entry.track}
                    index={i}
                    tracks={history.map(h => h.track)}
                    onPress={() => playTrack(entry.track)}
                    onDownload={() => downloadTrack(entry.track)}
                    isDownloaded={isDownloaded(String(entry.track.id))}
                    isDownloading={isDownloading(String(entry.track.id))}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Continue Listening */}
          {history.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>▶️</Text>
                <Text style={styles.sectionTitle}>Continue Listening</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {history.slice(0, 6).map((entry, i) => (
                  <View key={`${entry.track.src}-${i}`} style={styles.continueCard}>
                    <TouchableOpacity onPress={() => playTrack(entry.track)} activeOpacity={0.7}>
                      <View style={styles.continueImageContainer}>
                        <Image source={{ uri: entry.track.cover }} style={styles.continueImage} resizeMode="cover" />
                        <View style={styles.continueOverlay}>
                          <View style={styles.continuePlayButton}>
                            <Play size={14} color="#fff" style={{ marginLeft: 2 }} />
                          </View>
                        </View>
                        {/* Progress bar */}
                        <View style={styles.continueProgressBar}>
                          <View style={[styles.continueProgress, { width: `${Math.random() * 60 + 20}%` }]} />
                        </View>
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); downloadTrack(entry.track); }}
                          disabled={isDownloaded(String(entry.track.id)) || isDownloading(String(entry.track.id))}
                          style={[
                            styles.continueDownloadButton,
                            isDownloaded(String(entry.track.id)) && styles.continueDownloadButtonDownloaded,
                            isDownloading(String(entry.track.id)) && styles.continueDownloadButtonDownloading,
                          ]}
                          activeOpacity={0.7}
                        >
                          {isDownloading(String(entry.track.id)) ? (
                            <Loader2 size={10} color="#fff" />
                          ) : isDownloaded(String(entry.track.id)) ? (
                            <CheckCircle size={10} color="#fff" />
                          ) : (
                            <Download size={10} color="#fff" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                    <Text style={styles.continueTitle} numberOfLines={1}>{entry.track.title}</Text>
                    <Text style={styles.continueArtist} numberOfLines={1}>{entry.track.artist}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Mood Categories */}
          <DeferredSection>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Music2 size={16} color="#1DB954" />
                <Text style={styles.sectionTitle}>Browse by Mood</Text>
              </View>
              <View style={styles.moodGrid}>
                {moodCategories.map((mood) => (
                  <MoodCard
                    key={mood.name}
                    mood={mood}
                    onPress={() => {
                      console.log(`[BrowseByMood] 🎯 Mood selected: "${mood.name}" | Search Query: "${mood.searchQuery}"`);
                      setMoodPlaylist(mood);
                    }}
                  />
                ))}
              </View>
            </View>
          </DeferredSection>

          {/* Top Music Labels */}
          <DeferredSection>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Music2 size={16} color="#1DB954" />
                <Text style={styles.sectionTitle}>Top Music Labels</Text>
              </View>
              <View style={styles.labelGrid}>
                {musicLabels.map((label) => (
                  <LabelCard
                    key={label.name}
                    label={label}
                    onPress={() => loadingLabel !== label.name && playLabelSongs(label)}
                    onShuffle={() => {
                      if (loadingLabel !== label.name) playLabelSongs(label, true);
                    }}
                    isLoading={loadingLabel === label.name}
                  />
                ))}
              </View>
            </View>
          </DeferredSection>

          {/* Featured Playlists from JioSaavn */}
          {featuredPlaylists.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Music2 size={16} color="#1DB954" />
                  <Text style={styles.sectionTitle}>Featured Playlists</Text>
                </View>
                <View style={styles.sectionHeaderRight}>
                  <TouchableOpacity onPress={() => setShowPlaylistsModal(true)} style={styles.iconButton} activeOpacity={0.7}>
                    <Search size={12} color="#1DB954" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowFullTrending(true)} style={styles.viewAllButton} activeOpacity={0.7}>
                    <Text style={styles.viewAllText}>View All</Text>
                    <ChevronRight size={12} color="#1DB954" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.filterChips}>
                <TouchableOpacity
                  onPress={() => setPlaylistFilter("all")}
                  style={[styles.filterChip, playlistFilter === "all" && styles.filterChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, playlistFilter === "all" && styles.filterChipTextActive]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPlaylistFilter("hindi")}
                  style={[styles.filterChip, playlistFilter === "hindi" && styles.filterChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, playlistFilter === "hindi" && styles.filterChipTextActive]}>Hindi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPlaylistFilter("bengali")}
                  style={[styles.filterChip, playlistFilter === "bengali" && styles.filterChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, playlistFilter === "bengali" && styles.filterChipTextActive]}>Bengali</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {featuredPlaylists.map((playlist) => (
                  <TouchableOpacity
                    key={playlist.id}
                    onPress={() => loadingLabel !== playlist.id && playJioSaavnPlaylist(playlist)}
                    style={styles.playlistCard}
                    activeOpacity={0.7}
                  >
                    <View style={styles.playlistImageContainer}>
                      <Image
                        source={{ uri: playlist.image?.find((img: { quality: string }) => img.quality === "500x500")?.link || playlist.image?.[playlist.image.length - 1]?.link || "" }}
                        style={styles.playlistImage}
                        resizeMode="cover"
                      />
                      <View style={styles.playlistOverlay}>
                        <View style={styles.playlistPlayButton}>
                          <Play size={14} color="#fff" style={{ marginLeft: 2 }} />
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => { 
                          e.stopPropagation(); 
                          addToQueue({ id: Date.now(), title: playlist.title, artist: playlist.subtitle, album: "", cover: playlist.image?.[0]?.link || "", src: "", duration: 0, type: "audio" }); 
                          toast.success("Added to queue", { description: playlist.title });
                        }}
                        style={styles.playlistQueueButton}
                        activeOpacity={0.7}
                      >
                        <Plus size={12} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async (e) => {
                          e.stopPropagation();
                          if (!user) {
                            toast.error("Please login to save playlists");
                            return;
                          }
                          const newPlaylist = await createPlaylist(playlist.title);
                          if (newPlaylist) {
                            toast.success("Playlist created", { description: playlist.title });
                          } else {
                            toast.error("Failed to create playlist");
                          }
                        }}
                        style={[styles.playlistQueueButton, { right: 36 }]}
                        activeOpacity={0.7}
                      >
                        <Plus size={10} color="#1DB954" style={{ transform: [{ rotate: '45deg' }] }} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.playlistTitle} numberOfLines={1}>{playlist.title}</Text>
                    <Text style={styles.playlistSubtitle} numberOfLines={1}>{playlist.subtitle}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.shuffleAllContainer}>
                <TouchableOpacity
                  onPress={handleShufflePlaylists}
                  style={styles.shuffleAllButton}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={14} color="#888" />
                  <Text style={styles.shuffleAllText}>Shuffle All ({apiFeaturedPlaylists.length})</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {featuredPlaylists.length === 0 && !homeLoading && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Music2 size={16} color="#1DB954" />
                <Text style={styles.sectionTitle}>Featured Playlists</Text>
              </View>
              <Text style={styles.loadingText}>Loading playlists...</Text>
            </View>
          )}

          {/* Saved Artists */}
          <DeferredSection>
            {artistFavorites.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Saved Artists ({artistFavorites.length})</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                  {artistFavorites.map((artist) => (
                    <ArtistCircle
                      key={artist.id}
                      image={artist.image}
                      name={artist.name}
                      onPress={() => setArtistPlaylist({ name: artist.name, query: artist.name, artistId: artist.id })}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </DeferredSection>

          {/* Top Hindi Artists */}
          <DeferredSection>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Hindi Artists</Text>
                <TouchableOpacity onPress={() => setShowViewAllArtists(true)} style={styles.viewAllButton} activeOpacity={0.7}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <ChevronRight size={12} color="#1DB954" />
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {hindiArtists.map((artist) => (
                  <ArtistCircle
                    key={artist.name}
                    image={artist.image}
                    name={artist.name}
                    onPress={() => setArtistPlaylist({ name: artist.name, query: artist.searchQuery })}
                  />
                ))}
              </ScrollView>
            </View>
          </DeferredSection>

          {/* Top Bengali Artists */}
          <DeferredSection>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Bengali Artists</Text>
                <TouchableOpacity onPress={() => setShowViewAllArtists(true)} style={styles.viewAllButton} activeOpacity={0.7}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <ChevronRight size={12} color="#1DB954" />
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {bengaliArtists.map((artist) => (
                  <ArtistCircle
                    key={artist.name}
                    image={artist.image}
                    name={artist.name}
                    onPress={() => setArtistPlaylist({ name: artist.name, query: artist.searchQuery })}
                  />
                ))}
              </ScrollView>
            </View>
          </DeferredSection>

          {/* Actresses - Singer All Time Hits */}
          <DeferredSection>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionEmoji}>🎤</Text>
                  <Text style={styles.sectionTitle}>Actress & Singers</Text>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowActressesModal(true)} style={styles.viewAllButton} activeOpacity={0.7}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <ChevronRight size={12} color="#1DB954" />
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {actresses.slice(0, 10).map((actress) => (
                  <TouchableOpacity
                    key={actress.name}
                    onPress={() => setActressPlaylist({ name: actress.name, query: actress.searchQuery })}
                    style={styles.actressCircle}
                    activeOpacity={0.7}
                  >
                    <View style={styles.actressImageContainer}>
                      <Image source={{ uri: actress.image }} style={styles.actressImage} resizeMode="cover" />
                      <View style={styles.artistOverlay}>
                        <Play size={16} color="#fff" />
                      </View>
                    </View>
                    <Text style={styles.actressName} numberOfLines={2}>{actress.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </DeferredSection>

          {/* Bengali Hits */}
          <DeferredSection>
            {bengaliHits.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEmoji}>🎵</Text>
                  <Text style={styles.sectionTitle}>Bangla Hits</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                  {bengaliHits.map((track, i) => (
                    <TrackCard
                      key={track.src + i}
                      track={track}
                      index={i}
                      tracks={bengaliHits}
                      onPress={() => playTrackList(bengaliHits, i)}
                      showBadge
                      badgeText="BANGLA"
                      badgeColor="#15803d"
                      onAddToQueue={() => addToQueue(track)}
                      onDownload={() => downloadTrack(track)}
                      isDownloaded={isDownloaded(String(track.id))}
                      isDownloading={isDownloading(String(track.id))}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </DeferredSection>

          {/* For You — Personalized */}
          <DeferredSection>
            {forYouTracks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Sparkles size={16} color="#1DB954" />
                  <Text style={styles.sectionTitle}>For You</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                  {forYouTracks.map((track, i) => (
                    <TrackCard
                      key={track.src + i}
                      track={track}
                      index={i}
                      tracks={forYouTracks}
                      onPress={() => playTrackList(forYouTracks, i)}
                      onAddToQueue={() => addToQueue(track)}
                      onDownload={() => downloadTrack(track)}
                      isDownloaded={isDownloaded(String(track.id))}
                      isDownloading={isDownloading(String(track.id))}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </DeferredSection>

          {/* Time Machine */}
          <DeferredSection>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <TrendingUp size={16} color="#1DB954" />
                  <Text style={styles.sectionTitle}>Time Machine</Text>
                </View>
                <Text style={styles.sectionSubtitle}>Decades</Text>
              </View>
              <View style={styles.eraGrid}>
                {eraCategories.map((era) => (
                  <EraCard
                    key={era.name}
                    era={era}
                    onPress={() => setTimeMachineEra(era)}
                  />
                ))}
              </View>
            </View>
          </DeferredSection>

          {/* Quick Picks */}
          <DeferredSection>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Picks</Text>
              <View style={styles.quickPicksGrid}>
                <QuickPickButton
                  title="Arijit Singh Top 20"
                  desc="Most popular tracks"
                  query="Arijit Singh top hits"
                  color="from-rose-600/20 to-pink-600/10"
                  onPress={() => handleSearchAndPlay("Arijit Singh top hits")}
                  isLoading={isLoading("Arijit Singh top hits")}
                />
                <QuickPickButton
                  title="Bengali Modern Songs"
                  desc="Contemporary bengali hits"
                  query="modern bengali songs"
                  color="from-green-600/20 to-teal-600/10"
                  onPress={() => handleSearchAndPlay("modern bengali songs")}
                  isLoading={isLoading("modern bengali songs")}
                />
                <QuickPickButton
                  title="Bollywood Blockbusters"
                  desc="Chart-topping movie songs"
                  query="bollywood blockbuster songs"
                  color="from-orange-600/20 to-red-600/10"
                  onPress={() => handleSearchAndPlay("bollywood blockbuster songs")}
                  isLoading={isLoading("bollywood blockbuster songs")}
                />
                <QuickPickButton
                  title="Lofi & Chill"
                  desc="Relaxed vibes for focus"
                  query="lofi hindi songs chill"
                  color="from-indigo-600/20 to-purple-600/10"
                  onPress={() => handleSearchAndPlay("lofi hindi songs chill")}
                  isLoading={isLoading("lofi hindi songs chill")}
                />
              </View>
            </View>
          </DeferredSection>

        </View>

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

        {actressPlaylist && (
          <ArtistPlaylist
            artistName={actressPlaylist.name}
            searchQuery={actressPlaylist.query}
            onClose={() => setActressPlaylist(null)}
          />
        )}
        {showActressesModal && (
          <ActressesModal
            onSelectArtist={(artist) => {
              setShowActressesModal(false);
              setActressPlaylist({ name: artist.name, query: artist.searchQuery });
            }}
            onClose={() => setShowActressesModal(false)}
          />
        )}
        {showPlaylistsModal && (
          <PlaylistsModal
            onSelectPlaylist={(playlist) => {
              setShowPlaylistsModal(false);
              playJioSaavnPlaylist(playlist);
            }}
            onClose={() => setShowPlaylistsModal(false)}
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
        {showFullFeaturedPlaylists && (
          <FullPlaylist
            title="Featured Playlists"
            icon="trending"
            initialSongs={apiFeaturedPlaylists.map((p, i) => ({
              id: 9000 + i,
              title: p.title,
              artist: p.subtitle,
              album: p.language || "",
              cover: p.image?.[0]?.link || "",
              src: p.id,
              duration: 0,
              type: "audio" as const,
              songId: p.id,
            }))}
            onClose={() => setShowFullFeaturedPlaylists(false)}
          />
        )}
        {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  pullIndicator: {
    alignItems: "center",
    paddingVertical: 12,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "rgba(10,10,10,0.8)",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  searchBarText: {
    fontSize: 14,
    color: "#888",
  },
  carouselContainer: {
    height: 200,
    marginBottom: 16,
  },
  carouselSlide: {
    ...StyleSheet.absoluteFillObject,
  },
  carouselSlideHidden: {
    opacity: 0,
  },
  carouselImage: {
    width: "100%",
    height: "100%",
  },
  carouselGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  carouselContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  carouselInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  carouselThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  carouselText: {
    flex: 1,
  },
  carouselLabel: {
    fontSize: 9,
    color: "#1DB954",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  carouselTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  carouselArtist: {
    fontSize: 10,
    color: "#888",
  },
  carouselPlayButton: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#1DB954",
    alignSelf: "flex-start",
  },
  carouselPlayText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  carouselControls: {
    position: "absolute",
    bottom: 12,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  carouselNavButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  carouselDotActive: {
    width: 16,
    backgroundColor: "#1DB954",
  },
  contentPadding: {
    paddingHorizontal: 16,
  },
  greetingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  greetingEmoji: {
    fontSize: 24,
  },
  greetingText: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  greetingSubtitle: {
    fontSize: 12,
    color: "#888",
    marginLeft: 32,
  },
  quickPlayCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(29,185,84,0.15)",
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.2)",
    marginBottom: 24,
  },
  quickPlayLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quickPlayIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(29,185,84,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickPlayTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  quickPlaySubtitle: {
    fontSize: 10,
    color: "#888",
  },
  quickPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1DB954",
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  sectionSubtitle: {
    fontSize: 10,
    color: "#888",
  },
  sectionEmoji: {
    fontSize: 16,
  },
  sectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  clearButtonText: {
    fontSize: 10,
    color: "#888",
    fontWeight: "600",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewAllText: {
    fontSize: 10,
    color: "#1DB954",
    fontWeight: "600",
  },
  iconButton: {
    padding: 4,
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#2a2a2a",
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  horizontalScroll: {
    gap: 10,
    paddingRight: 16,
  },
  trackCard: {
    width: CARD_SIZE,
  },
  trackCardImageContainer: {
    position: "relative",
    marginBottom: 6,
  },
  trackCardImage: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 8,
  },
  trackCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1DB954",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },
  rankBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  rankText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#fff",
  },
  badge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#fff",
  },
  queueButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },
  downloadButton: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },
  downloadButtonDownloaded: {
    backgroundColor: "rgba(22,163,74,0.8)",
    opacity: 1,
  },
  downloadButtonDownloading: {
    backgroundColor: "rgba(202,138,4,0.8)",
    opacity: 1,
  },
  trackCardTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  trackCardArtist: {
    fontSize: 9,
    color: "#888",
  },
  skeletonHeader: {
    marginBottom: 8,
  },
  skeletonTitle: {
    width: 64,
    height: 16,
    borderRadius: 4,
    backgroundColor: "#2a2a2a",
  },
  songOfDayCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
  },
  songOfDayImageContainer: {
    position: "relative",
  },
  songOfDayImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  songOfDayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  songOfDayInfo: {
    flex: 1,
  },
  songOfDayTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  songOfDayArtist: {
    fontSize: 10,
    color: "#888",
  },
  songOfDayBadge: {
    fontSize: 9,
    color: "#fbbf24",
    marginTop: 2,
  },
  songOfDayDuration: {
    fontSize: 10,
    color: "#888",
  },
  nowPlayingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  nowPlayingImage: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  nowPlayingTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  nowPlayingArtist: {
    fontSize: 10,
    color: "#888",
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  moodCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
  },
  moodCardInner: {
    ...StyleSheet.absoluteFillObject,
  },
  moodCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  moodCardContent: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  moodEmoji: {
    fontSize: 20,
  },
  moodName: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 4,
  },
  labelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  labelCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
  },
  labelCardInner: {
    ...StyleSheet.absoluteFillObject,
  },
  labelCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  labelCardContent: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  labelName: {
    fontSize: 11,
    fontWeight: "bold",
  },
  labelShuffleButton: {
    position: "absolute",
    bottom: 6,
    right: 6,
    padding: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  filterChips: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
  },
  filterChipActive: {
    backgroundColor: "#1DB954",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  playlistCard: {
    width: CARD_SIZE,
  },
  playlistImageContainer: {
    position: "relative",
    marginBottom: 6,
  },
  playlistImage: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 8,
  },
  playlistOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  playlistPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1DB954",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },
  playlistQueueButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },
  playlistTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  playlistSubtitle: {
    fontSize: 9,
    color: "#888",
  },
  shuffleAllContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  shuffleAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
  },
  shuffleAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },
  loadingText: {
    fontSize: 14,
    color: "#888",
  },
  artistCircle: {
    alignItems: "center",
    width: 80,
  },
  artistImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    marginBottom: 6,
  },
  artistImage: {
    width: "100%",
    height: "100%",
  },
  artistOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0)",
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  artistName: {
    fontSize: 10,
    color: "#888",
    textAlign: "center",
    width: 64,
  },
  actressCircle: {
    alignItems: "center",
    width: 80,
  },
  actressImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "#ec4899",
  },
  actressImage: {
    width: "100%",
    height: "100%",
  },
  actressName: {
    fontSize: 10,
    color: "#888",
    textAlign: "center",
    width: 80,
  },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(219,39,119,0.2)",
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#f472b6",
  },
  continueCard: {
    width: CARD_SIZE,
  },
  continueImageContainer: {
    position: "relative",
    marginBottom: 6,
  },
  continueImage: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 8,
  },
  continueOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  continuePlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1DB954",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },
  continueProgressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  continueProgress: {
    height: "100%",
    backgroundColor: "#1DB954",
    borderBottomRightRadius: 8,
  },
  continueDownloadButton: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },
  continueDownloadButtonDownloaded: {
    backgroundColor: "rgba(22,163,74,0.8)",
    opacity: 1,
  },
  continueDownloadButtonDownloading: {
    backgroundColor: "rgba(202,138,4,0.8)",
    opacity: 1,
  },
  continueTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  continueArtist: {
    fontSize: 9,
    color: "#888",
  },
  suspenseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  suspensePlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },
  suspenseBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(220,38,38,0.9)",
  },
  suspenseBadgeText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#fff",
  },
  suspenseQueueButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },
  eraGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  eraCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
  },
  eraCardInner: {
    ...StyleSheet.absoluteFillObject,
  },
  eraCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  eraCardContent: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  eraName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
  },
  eraSubtitle: {
    fontSize: 8,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  quickPicksGrid: {
    gap: 10,
  },
  quickPickButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  quickPickIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(29,185,84,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickPickText: {
    flex: 1,
  },
  quickPickTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  quickPickDesc: {
    fontSize: 9,
    color: "#888",
  },
  ytOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ytPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },
  ytBadgeAbsolute: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(220,38,38,0.9)",
  },
  ytQueueButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },
  ytDownloadButton: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },
  ytDownloadButtonDownloaded: {
    backgroundColor: "rgba(22,163,74,0.8)",
    opacity: 1,
  },
  ytDownloadButtonDownloading: {
    backgroundColor: "rgba(202,138,4,0.8)",
    opacity: 1,
  },
  ytBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(220,38,38,0.2)",
  },
  ytBadgeText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#f87171",
  },
});
