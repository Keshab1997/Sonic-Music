import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, Text, View, ScrollView, Image, SafeAreaView,
  TouchableOpacity, FlatList, Dimensions, TextInput,
  ActivityIndicator, Modal, Pressable
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlayerProvider, usePlayer } from "./src/context/PlayerContext";
import { AuthProvider } from "./src/context/AuthContext";
import { useState, useEffect, useCallback, useRef } from 'react';
import { Track } from './src/data/playlist';

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";
const YT_API = "https://sonic-bloom-player.vercel.app/api/youtube-search";
const YT_STREAM_API = "https://sonic-bloom-player.vercel.app/api/yt-stream";
const { width } = Dimensions.get('window');
const CARD_W = 120;
const RECENTLY_PLAYED_KEY = "sonic_recently_played_native";

const MOODS = [
  { name: "Bollywood", emoji: "🎬", color: "#dc2626", query: "bollywood songs hits" },
  { name: "Romantic", emoji: "❤️", color: "#ec4899", query: "romantic bollywood songs" },
  { name: "Sad", emoji: "😢", color: "#3b82f6", query: "dard bhare sad songs" },
  { name: "Party", emoji: "🎉", color: "#f59e0b", query: "party songs hindi" },
  { name: "Devotional", emoji: "🙏", color: "#d97706", query: "devotional bhajan songs" },
  { name: "Bengali", emoji: "🎵", color: "#10b981", query: "bengali popular songs" },
  { name: "Retro", emoji: "📻", color: "#7c3aed", query: "old hindi classic songs" },
  { name: "Workout", emoji: "💪", color: "#ef4444", query: "workout motivation songs" },
  { name: "Chill", emoji: "🌊", color: "#06b6d4", query: "chill hindi songs" },
  { name: "Rap", emoji: "🎤", color: "#374151", query: "rap songs hindi" },
];

const LABELS = [
  { name: "T-Series", query: "T-Series songs", color: "#1d4ed8" },
  { name: "Saregama", query: "Saregama classics", color: "#92400e" },
  { name: "Zee Music", query: "Zee Music Company", color: "#6d28d9" },
  { name: "Sony Music", query: "Sony Music India", color: "#0369a1" },
  { name: "YRF Music", query: "YRF Music", color: "#991b1b" },
  { name: "Tips", query: "Tips Official", color: "#065f46" },
];

const ERAS = [
  { name: "70s", subtitle: "Golden Era", query: "old hindi songs 1970", color: "#92400e" },
  { name: "80s", subtitle: "Retro Magic", query: "hindi songs 1980", color: "#6d28d9" },
  { name: "90s", subtitle: "Nostalgia", query: "hindi songs 1990", color: "#1d4ed8" },
  { name: "2000s", subtitle: "Millennium", query: "hindi songs 2000", color: "#065f46" },
  { name: "2010s", subtitle: "Modern Era", query: "hindi songs 2015", color: "#991b1b" },
  { name: "2020s", subtitle: "Now", query: "latest hindi songs 2025", color: "#4338ca" },
];

const HINDI_ARTISTS = [
  { name: "Arijit Singh", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", query: "Arijit Singh hits" },
  { name: "Shreya Ghoshal", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop", query: "Shreya Ghoshal songs" },
  { name: "A.R. Rahman", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop", query: "AR Rahman best songs" },
  { name: "Kishore Kumar", image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200&h=200&fit=crop", query: "Kishore Kumar hits" },
  { name: "Atif Aslam", image: "https://images.unsplash.com/photo-1477233534935-f5e6fe7c1159?w=200&h=200&fit=crop", query: "Atif Aslam hits" },
  { name: "Neha Kakkar", image: "https://images.unsplash.com/photo-1484755560615-a4c64e778a6c?w=200&h=200&fit=crop", query: "Neha Kakkar songs" },
  { name: "Sonu Nigam", image: "https://images.unsplash.com/photo-1446057032654-9d8885f9a5c8?w=200&h=200&fit=crop", query: "Sonu Nigam hits" },
  { name: "Kumar Sanu", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop", query: "Kumar Sanu hits" },
];

const BENGALI_ARTISTS = [
  { name: "Anupam Roy", image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200&h=200&fit=crop", query: "Anupam Roy bengali songs" },
  { name: "Rupankar", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", query: "Rupankar bengali songs" },
  { name: "Nachiketa", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop", query: "Nachiketa bengali songs" },
  { name: "Lopamudra Mitra", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop", query: "Lopamudra Mitra bengali songs" },
];

const QUICK_PICKS = [
  { title: "Arijit Singh Top 20", desc: "Most popular tracks", query: "Arijit Singh top hits", color: "#1a0808" },
  { title: "Bengali Modern", desc: "Contemporary bengali hits", query: "modern bengali songs", color: "#081a08" },
  { title: "Bollywood Blockbusters", desc: "Chart-topping movie songs", query: "bollywood blockbuster songs", color: "#1a0f00" },
  { title: "Lofi & Chill", desc: "Relaxed vibes", query: "lofi hindi songs chill", color: "#08081a" },
];

const YT_QUICK_PICKS = [
  { title: "Arijit Singh Live", desc: "Top YouTube performances", query: "arijit singh live performance 2024", color: "#1a0808" },
  { title: "Bangla Hits on YT", desc: "Viral Bengali music videos", query: "viral bangla song 2024 2025", color: "#081a08" },
  { title: "Bollywood Unplugged", desc: "Acoustic & studio sessions", query: "bollywood unplugged acoustic 2024", color: "#1a0f00" },
  { title: "Lofi Bengali", desc: "Chill Bengali lofi beats", query: "bengali lofi chill music", color: "#08081a" },
];

const TIME_GREETINGS: Record<string, { title: string; subtitle: string; emoji: string; query: string }> = {
  morning: { title: "Good Morning", subtitle: "Start your day with fresh vibes", emoji: "☀️", query: "morning songs hindi bengali" },
  afternoon: { title: "Good Afternoon", subtitle: "Keep the energy going", emoji: "🌤️", query: "bollywood upbeat songs" },
  evening: { title: "Good Evening", subtitle: "Unwind with soulful melodies", emoji: "🌅", query: "romantic evening songs hindi" },
  night: { title: "Good Night", subtitle: "Relax and drift away", emoji: "🌙", query: "lofi chill night songs hindi" },
};

const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
};

// JioSaavn song parser — id must be unique per section
const parseSong = (s: any, id: number): Track | null => {
  if (!s.downloadUrl?.length) return null;
  const url160 = s.downloadUrl.find((d: any) => d.quality === "160kbps")?.link;
  const url96 = s.downloadUrl.find((d: any) => d.quality === "96kbps")?.link;
  const url320 = s.downloadUrl.find((d: any) => d.quality === "320kbps")?.link;
  const bestUrl = url160 || url96 || s.downloadUrl[0]?.link || "";
  if (!bestUrl) return null;
  return {
    id,
    title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown",
    artist: s.primaryArtists || "Unknown",
    album: typeof s.album === "string" ? s.album : s.album?.name || "",
    cover: s.image?.find((img: any) => img.quality === "500x500")?.link || s.image?.[s.image.length - 1]?.link || "",
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

// Fetch from JioSaavn
const fetchJioSaavn = async (
  query: string,
  offset: number,
  limit = 15,
  langFilter?: string
): Promise<Track[]> => {
  try {
    const page = Math.floor(Math.random() * 3) + 1;
    const res = await fetch(
      `${API_BASE}/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    let songs = data.data?.results || [];
    if (langFilter) songs = songs.filter((s: any) => s.language === langFilter);
    return songs
      .map((s: any, i: number) => parseSong(s, offset + i))
      .filter((t: Track | null): t is Track => t !== null)
      .slice(0, 12);
  } catch {
    return [];
  }
};

// Fetch from YouTube
const fetchYouTube = async (query: string, offset: number): Promise<Track[]> => {
  try {
    const res = await fetch(`${YT_API}?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const videos: any[] = await res.json();
    return videos.slice(0, 12).map((v, i) => ({
      id: offset + i,
      title: v.title,
      artist: v.author || "YouTube",
      album: "",
      cover: v.thumbnail || "",
      src: `https://www.youtube.com/watch?v=${v.videoId}`,
      duration: v.duration || 0,
      type: "youtube" as const,
      songId: v.videoId,
    }));
  } catch {
    return [];
  }
};

// Resolve YouTube audio URL before playing
const resolveYtAudio = async (track: Track): Promise<Track> => {
  if (track.type !== "youtube" || !track.songId) return track;
  try {
    const res = await fetch(`${YT_STREAM_API}?id=${track.songId}`);
    if (!res.ok) return track;
    const data = await res.json();
    if (data?.audioUrl) return { ...track, src: data.audioUrl, type: "audio" };
  } catch {}
  return track;
};

// Date-based song of the day index
const getSongOfDayIndex = (max: number) => {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return seed % Math.max(max, 1);
};

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// ==================== Component 1: BottomSheetModal ====================
interface BottomSheetModalProps {
  visible: boolean;
  title: string;
  tracks: Track[];
  loading: boolean;
  onClose: () => void;
  onPlayTrack: (track: Track, index: number) => void;
  onAddToQueue: (track: Track) => void;
}

const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  visible,
  title,
  tracks,
  loading,
  onClose,
  onPlayTrack,
  onAddToQueue,
}) => {
  const { currentTrack } = usePlayer();

  const renderItem = ({ item, index }: { item: Track; index: number }) => {
    const isPlaying = currentTrack?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.sheetRow, isPlaying && styles.sheetRowPlaying]}
        onPress={() => onPlayTrack(item, index)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.cover }}
          style={styles.sheetCover}
          defaultSource={require('./assets/icon.png')}
        />
        <View style={styles.sheetInfo}>
          <Text
            style={[styles.sheetTitle, isPlaying && styles.sheetTitlePlaying]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.sheetArtist} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.sheetAddBtn}
          onPress={() => onAddToQueue(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color="#1DB954" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={() => {}}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitleHeader}>{title}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1DB954" />
            </View>
          ) : tracks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No songs found</Text>
            </View>
          ) : (
            <FlatList
              data={tracks}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ==================== Component 2: MiniPlayer ====================
const MiniPlayer: React.FC<{ onExpand?: () => void }> = ({ onExpand }) => {
  const { currentTrack, isPlaying, togglePlay, next, prev } = usePlayer();

  if (!currentTrack) return null;

  return (
    <TouchableOpacity
      style={styles.miniPlayer}
      activeOpacity={0.9}
      onPress={onExpand}
    >
      <Image
        source={{ uri: currentTrack.cover }}
        style={styles.miniCover}
        defaultSource={require('./assets/icon.png')}
      />
      <View style={styles.miniInfo}>
        <Text style={styles.miniTitle} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text style={styles.miniArtist} numberOfLines={1}>
          {currentTrack.artist}
        </Text>
      </View>
      <TouchableOpacity style={styles.miniBtn} onPress={prev} activeOpacity={0.7}>
        <Ionicons name="play-skip-back" size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.miniBtn} onPress={togglePlay} activeOpacity={0.7}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={26} color="#1DB954" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.miniBtn} onPress={next} activeOpacity={0.7}>
        <Ionicons name="play-skip-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};


// ==================== Reusable Components ====================
interface SongCardProps {
  track: Track;
  index: number;
  allTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: (track: Track, allTracks: Track[], index: number) => void;
  onAddToQueue: (track: Track) => void;
  badge?: string;
  badgeColor?: string;
}

const SongCard: React.FC<SongCardProps> = ({
  track, index, allTracks, currentTrack, isPlaying, onPlay, onAddToQueue, badge, badgeColor
}) => {
  const isCurrentTrack = currentTrack?.id === track.id;
  return (
    <TouchableOpacity
      style={{ width: CARD_W, marginRight: 12 }}
      onPress={() => onPlay(track, allTracks, index)}
      activeOpacity={0.7}
    >
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: track.cover }}
          style={{ width: CARD_W, height: CARD_W, borderRadius: 10, backgroundColor: '#1a1a1a' }}
          defaultSource={require('./assets/icon.png')}
        />
        {isCurrentTrack && isPlaying && (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderRadius: 10 }}>
            <Ionicons name="pause" size={28} color="#fff" />
          </View>
        )}
        {badge && (
          <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: badgeColor || 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
            <Text style={{ fontSize: 9, color: '#fff', fontWeight: 'bold' }}>{badge}</Text>
          </View>
        )}
        <TouchableOpacity
          style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
          onPress={(e) => { e.stopPropagation(); onAddToQueue(track); }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={{ fontSize: 12, color: isCurrentTrack ? '#1DB954' : '#fff', fontWeight: 'bold', marginTop: 6 }} numberOfLines={1}>{track.title}</Text>
      <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }} numberOfLines={1}>{track.artist}</Text>
    </TouchableOpacity>
  );
};

interface SectionHeaderProps {
  title: string;
  emoji?: string;
  onViewAll?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, emoji, onViewAll, onRefresh, refreshing }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, marginTop: 4 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {emoji && <Text style={{ fontSize: 18, marginRight: 6 }}>{emoji}</Text>}
      <Text style={{ fontSize: 17, color: '#fff', fontWeight: 'bold' }}>{title}</Text>
    </View>
    {onViewAll && (
      <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
        <Text style={{ fontSize: 12, color: '#1DB954' }}>View All ›</Text>
      </TouchableOpacity>
    )}
    {onRefresh && !onViewAll && (
      <TouchableOpacity onPress={onRefresh} activeOpacity={0.7}>
        <Ionicons name="refresh" size={18} color={refreshing ? '#1DB954' : '#888'} />
      </TouchableOpacity>
    )}
  </View>
);

const SectionSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={{ width: CARD_W, marginRight: 12 }}>
        <View style={{ width: CARD_W, height: CARD_W, borderRadius: 10, backgroundColor: '#1a1a1a' }} />
        <View style={{ height: 10, backgroundColor: '#1a1a1a', borderRadius: 4, marginTop: 6, width: '80%' }} />
        <View style={{ height: 8, backgroundColor: '#1a1a1a', borderRadius: 4, marginTop: 4, width: '60%' }} />
      </View>
    ))}
  </ScrollView>
);

// ==================== HomeScreen ====================
const HomeScreen = () => {
  const { playTrackList, playTrack, currentTrack, isPlaying, togglePlay, next, prev, addToQueue } = usePlayer();

  // Section tracks — প্রতিটা section আলাদা state
  const [trending, setTrending] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [bengaliHits, setBengaliHits] = useState<Track[]>([]);
  const [forYou, setForYou] = useState<Track[]>([]);
  const [suspense, setSuspense] = useState<Track[]>([]);
  const [ytTrending, setYtTrending] = useState<Track[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);

  // Loading states — প্রতিটা section-এর জন্য আলাদা
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingNewReleases, setLoadingNewReleases] = useState(true);
  const [loadingBengali, setLoadingBengali] = useState(true);
  const [loadingForYou, setLoadingForYou] = useState(true);
  const [loadingSuspense, setLoadingSuspense] = useState(true);
  const [loadingYtTrending, setLoadingYtTrending] = useState(true);

  // Carousel state
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // BottomSheet modal state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetTracks, setSheetTracks] = useState<Track[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);

  // Quick pick loading
  const [loadingQuickPick, setLoadingQuickPick] = useState<string | null>(null);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [loadingYtPick, setLoadingYtPick] = useState<string | null>(null);

  // Load recently played from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(RECENTLY_PLAYED_KEY)
      .then(stored => {
        if (stored) setRecentlyPlayed(JSON.parse(stored));
      })
      .catch(() => {});
  }, []);

  // Save to recently played when a new track plays
  useEffect(() => {
    if (!currentTrack) return;
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(t => t.id !== currentTrack.id);
      const updated = [currentTrack, ...filtered].slice(0, 20);
      AsyncStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, [currentTrack?.id]);

  // Auto-advance carousel every 5 seconds when trending loads
  useEffect(() => {
    if (trending.length === 0) return;
    carouselTimer.current = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % Math.min(trending.length, 5));
    }, 5000);
    return () => {
      if (carouselTimer.current) clearInterval(carouselTimer.current);
    };
  }, [trending.length]);

  // Initial Data Fetching
  useEffect(() => {
    // Trending — offset 1000
    fetchJioSaavn("latest bollywood hits", 1000)
      .then(setTrending)
      .finally(() => setLoadingTrending(false));

    // New Releases — offset 2000
    fetchJioSaavn("new hindi songs 2025", 2000)
      .then(setNewReleases)
      .finally(() => setLoadingNewReleases(false));

    // Bengali Hits — offset 7000, language filter "bengali"
    fetchJioSaavn("bengali top hits", 7000, 15, "bengali")
      .then(setBengaliHits)
      .finally(() => setLoadingBengali(false));

    // For You — offset 9000
    fetchJioSaavn("bollywood romantic hits", 9000)
      .then(setForYou)
      .finally(() => setLoadingForYou(false));

    // Sunday Suspense — YouTube, offset 11000
    fetchYouTube("Sunday Suspense Mirchi Bangla", 11000)
      .then(setSuspense)
      .finally(() => setLoadingSuspense(false));

    // YouTube Trending — offset 60000
    fetchYouTube("top hindi songs 2026 trending", 60000)
      .then(setYtTrending)
      .finally(() => setLoadingYtTrending(false));
  }, []);

  // Open bottom sheet with a query — fetches and shows results
  const openSheet = useCallback(async (title: string, query: string, offset: number, isYoutube = false, langFilter?: string) => {
    setSheetTitle(title);
    setSheetTracks([]);
    setSheetLoading(true);
    setSheetVisible(true);
    const tracks = isYoutube
      ? await fetchYouTube(query, offset)
      : await fetchJioSaavn(query, offset, 15, langFilter);
    setSheetTracks(tracks);
    setSheetLoading(false);
  }, []);

  // Play a track — resolve YouTube audio first if needed
  const handlePlay = useCallback(async (track: Track, allTracks: Track[], index: number) => {
    if (track.type === "youtube") {
      const resolved = await resolveYtAudio(track);
      const resolvedList = allTracks.map((t, i) => i === index ? resolved : t);
      playTrackList(resolvedList, index);
    } else {
      playTrackList(allTracks, index);
    }
  }, [playTrackList]);

  // Play from bottom sheet
  const handleSheetPlay = useCallback(async (track: Track, index: number) => {
    await handlePlay(track, sheetTracks, index);
  }, [handlePlay, sheetTracks]);

  // Quick Pick — search and immediately play
  const handleQuickPick = useCallback(async (query: string, offset: number) => {
    setLoadingQuickPick(query);
    const tracks = await fetchJioSaavn(query, offset);
    if (tracks.length > 0) playTrackList(tracks, 0);
    setLoadingQuickPick(null);
  }, [playTrackList]);

  // Label play
  const handleLabelPlay = useCallback(async (label: { name: string; query: string; color: string }) => {
    setLoadingLabel(label.name);
    const tracks = await fetchJioSaavn(label.query, 20000 + LABELS.indexOf(label) * 100);
    if (tracks.length > 0) playTrackList(tracks, 0);
    setLoadingLabel(null);
  }, [playTrackList]);

  // YouTube Quick Pick
  const handleYtQuickPick = useCallback(async (query: string, offset: number) => {
    setLoadingYtPick(query);
    const tracks = await fetchYouTube(query, offset);
    if (tracks.length > 0) {
      const first = await resolveYtAudio(tracks[0]);
      playTrackList([first, ...tracks.slice(1)], 0);
    }
    setLoadingYtPick(null);
  }, [playTrackList]);

  // Time greeting quick play
  const handleTimePlay = useCallback(async (query: string) => {
    setLoadingQuickPick(query);
    const tracks = await fetchJioSaavn(query, 30000);
    if (tracks.length > 0) playTrackList(tracks, 0);
    setLoadingQuickPick(null);
  }, [playTrackList]);

  // Derived values
  const timeData = TIME_GREETINGS[getTimeOfDay()];
  const songOfDay = trending.length > 0 ? trending[getSongOfDayIndex(trending.length)] : null;
  const carouselSongs = trending.slice(0, 5);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Section 1: Hero Carousel */}
        {trending.length > 0 && carouselSongs.length > 0 && (
          <View style={{ height: 220, position: 'relative' }}>
            {carouselSongs.map((song, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  opacity: carouselIndex === i ? 1 : 0,
                }}
              >
                <Image
                  source={{ uri: song.cover }}
                  style={{ width: '100%', height: '100%' }}
                  defaultSource={require('./assets/icon.png')}
                />
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundColor: 'rgba(0,0,0,0.85)' }} />
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundColor: 'transparent' }} />
                <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                  <Text style={{ fontSize: 10, color: '#1DB954', marginBottom: 4 }}>
                    {i === 0 ? 'Featured' : `#${i + 1} Trending`}
                  </Text>
                  <Text style={{ fontSize: 18, color: '#fff', fontWeight: 'bold' }} numberOfLines={1}>{song.title}</Text>
                  <Text style={{ fontSize: 12, color: '#aaa', marginTop: 2 }} numberOfLines={1}>{song.artist}</Text>
                  <TouchableOpacity
                    style={{ backgroundColor: '#1DB954', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start', marginTop: 8 }}
                    onPress={() => handlePlay(song, carouselSongs, i)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 12, color: '#000', fontWeight: 'bold' }}>▶ Play</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {/* Left Arrow */}
            <TouchableOpacity
              style={{ position: 'absolute', left: 8, top: '50%', marginTop: -14, width: 28, height: 28, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}
              onPress={() => setCarouselIndex(prev => (prev - 1 + carouselSongs.length) % carouselSongs.length)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={18} color="#fff" />
            </TouchableOpacity>
            {/* Right Arrow */}
            <TouchableOpacity
              style={{ position: 'absolute', right: 8, top: '50%', marginTop: -14, width: 28, height: 28, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}
              onPress={() => setCarouselIndex(prev => (prev + 1) % carouselSongs.length)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>
            {/* Dot Indicators */}
            <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
              {carouselSongs.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={{ width: carouselIndex === i ? 16 : 6, height: 6, backgroundColor: carouselIndex === i ? '#1DB954' : '#555', borderRadius: 3 }}
                  onPress={() => setCarouselIndex(i)}
                  activeOpacity={0.7}
                />
              ))}
            </View>
          </View>
        )}

        {/* Section 2: Time Greeting + Quick Play */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginRight: 8 }}>{timeData.emoji}</Text>
            <View>
              <Text style={{ fontSize: 20, color: '#fff', fontWeight: 'bold' }}>{timeData.title}</Text>
              <Text style={{ fontSize: 12, color: '#888' }}>{timeData.subtitle}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: '#111', borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 1, borderColor: 'rgba(29,185,84,0.22)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            onPress={() => handleTimePlay(timeData.query)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={{ fontSize: 14, color: '#fff', fontWeight: 'bold' }}>✨ {timeData.title} Mix</Text>
              <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Curated for this time of day</Text>
            </View>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#1DB954', justifyContent: 'center', alignItems: 'center' }}>
              {loadingQuickPick === timeData.query ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="play" size={18} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 3: Song of the Day */}
        {songOfDay && (
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <SectionHeader title="Song of the Day" emoji="⭐" />
            <TouchableOpacity
              style={{ backgroundColor: '#1a1200', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', flexDirection: 'row', alignItems: 'center' }}
              onPress={() => handlePlay(songOfDay, [songOfDay], 0)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: songOfDay.cover }}
                style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: '#1a1a1a' }}
                defaultSource={require('./assets/icon.png')}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 14, color: '#fff', fontWeight: 'bold' }} numberOfLines={1}>{songOfDay.title}</Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }} numberOfLines={1}>{songOfDay.artist}</Text>
                {songOfDay.duration > 0 && (
                  <Text style={{ fontSize: 10, color: '#f59e0b', marginTop: 2 }}>{formatDuration(songOfDay.duration)}</Text>
                )}
              </View>
              <Ionicons
                name={currentTrack?.id === songOfDay.id && isPlaying ? 'pause-circle' : 'play-circle'}
                size={40}
                color="#f59e0b"
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Section 4: Trending Now */}
        <View style={{ marginTop: 24 }}>
          <SectionHeader
            title="Trending Now"
            emoji="🔥"
            onViewAll={() => openSheet("Trending Now", "latest bollywood hits", 1000)}
          />
          {loadingTrending ? (
            <SectionSkeleton count={4} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              {trending.map((track, i) => (
                <SongCard
                  key={track.id}
                  track={track}
                  index={i}
                  allTracks={trending}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  onPlay={handlePlay}
                  onAddToQueue={addToQueue}
                  badge={`#${i + 1}`}
                  badgeColor="rgba(0,0,0,0.7)"
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Section 5: New Releases */}
        <View style={{ marginTop: 24 }}>
          <SectionHeader
            title="New Releases"
            emoji="🎵"
            onViewAll={() => openSheet("New Releases", "new hindi songs 2025", 2000)}
          />
          {loadingNewReleases ? (
            <SectionSkeleton count={4} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              {newReleases.map((track, i) => (
                <SongCard
                  key={track.id}
                  track={track}
                  index={i}
                  allTracks={newReleases}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  onPlay={handlePlay}
                  onAddToQueue={addToQueue}
                  badge="NEW"
                  badgeColor="#16a34a"
                />
              ))}
            </ScrollView>
          )}
        </View>
        {/* Section 6: Recently Played */}
        {recentlyPlayed.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <SectionHeader
              title="Recently Played"
              emoji="🕐"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginRight: 16, marginTop: -8, marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setRecentlyPlayed([]);
                  AsyncStorage.removeItem(RECENTLY_PLAYED_KEY).catch(() => {});
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, color: '#ef4444' }}>Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              {recentlyPlayed.map((track, i) => (
                <SongCard
                  key={track.id}
                  track={track}
                  index={i}
                  allTracks={recentlyPlayed}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  onPlay={handlePlay}
                  onAddToQueue={addToQueue}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Divider: Discover */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 28, marginBottom: 4 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
          <Text style={{ color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginHorizontal: 10, textTransform: 'uppercase' }}>🎭 Discover</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
        </View>

        {/* Section 7: Browse by Mood */}
        <View style={{ marginTop: 24 }}>
          <SectionHeader title="Browse by Mood" emoji="🎭" />
          <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MOODS.map((mood) => (
              <TouchableOpacity
                key={mood.name}
                style={{ width: (width - 48) / 2, height: 64, backgroundColor: mood.color, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 }}
                onPress={() => openSheet(mood.name, mood.query, 40000 + MOODS.indexOf(mood) * 100)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 24 }}>{mood.emoji}</Text>
                <Text style={{ fontSize: 14, color: '#fff', fontWeight: 'bold' }}>{mood.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 8: Top Music Labels */}
        <View style={{ marginTop: 24 }}>
          <SectionHeader title="Top Music Labels" emoji="🏢" />
          <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LABELS.map((label) => (
              <TouchableOpacity
                key={label.name}
                style={{ width: (width - 48) / 2, height: 56, backgroundColor: label.color, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, opacity: loadingLabel === label.name ? 0.6 : 1 }}
                onPress={() => handleLabelPlay(label)}
                disabled={loadingLabel === label.name}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 15, color: '#fff', fontWeight: 'bold' }}>{label.name}</Text>
                {loadingLabel === label.name ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="play" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Divider: Regional */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 28, marginBottom: 4 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
          <Text style={{ color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginHorizontal: 10, textTransform: 'uppercase' }}>🎵 Regional</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
        </View>

        {/* Section 9: Bangla Hits */}
        {(bengaliHits.length > 0 || loadingBengali) && (
          <View style={{ marginTop: 24 }}>
            <SectionHeader
              title="Bangla Hits"
              emoji="🎵"
              onViewAll={() => openSheet("Bangla Hits", "bengali top hits", 7000, false, "bengali")}
            />
            {loadingBengali ? (
              <SectionSkeleton count={4} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                {bengaliHits.map((track, i) => (
                  <SongCard
                    key={track.id}
                    track={track}
                    index={i}
                    allTracks={bengaliHits}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    onPlay={handlePlay}
                    onAddToQueue={addToQueue}
                    badge="BANGLA"
                    badgeColor="#15803d"
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Divider: Personalized */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 28, marginBottom: 4 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
          <Text style={{ color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginHorizontal: 10, textTransform: 'uppercase' }}>✨ Personalized</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
        </View>

        {/* Section 10: For You — Personalized */}
        {(forYou.length > 0 || loadingForYou) && (
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, marginRight: 6 }}>✨</Text>
                <Text style={{ fontSize: 17, color: '#fff', fontWeight: 'bold' }}>For You</Text>
                <View style={{ backgroundColor: 'rgba(29,185,84,0.22)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 }}>
                  <Text style={{ fontSize: 9, color: '#1DB954', fontWeight: 'bold' }}>Personalized</Text>
                </View>
              </View>
            </View>
            {loadingForYou ? (
              <SectionSkeleton count={4} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                {forYou.map((track, i) => (
                  <SongCard
                    key={track.id}
                    track={track}
                    index={i}
                    allTracks={forYou}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    onPlay={handlePlay}
                    onAddToQueue={addToQueue}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Divider: Artists */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 28, marginBottom: 4 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
          <Text style={{ color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginHorizontal: 10, textTransform: 'uppercase' }}>🎤 Artists</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
        </View>

        {/* Section 11: Hindi Artists */}
        <View style={{ marginTop: 16 }}>
          <SectionHeader
            title="Hindi Artists"
            emoji="🎤"
            onViewAll={() => openSheet("Hindi Artists", "hindi top artists songs", 50000)}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            {HINDI_ARTISTS.map((artist) => (
              <TouchableOpacity
                key={artist.name}
                style={{ width: 72, alignItems: 'center', marginRight: 16 }}
                onPress={() => openSheet(artist.name, artist.query, 50000 + HINDI_ARTISTS.indexOf(artist) * 100)}
                activeOpacity={0.7}
              >
                <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#333' }}>
                  <Image
                    source={{ uri: artist.image }}
                    style={{ width: 64, height: 64, borderRadius: 32 }}
                    defaultSource={require('./assets/icon.png')}
                  />
                </View>
                <Text style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 6 }} numberOfLines={2}>{artist.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Section 12: Bengali Artists */}
        <View style={{ marginTop: 20 }}>
          <SectionHeader title="Bengali Artists" emoji="🎵" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            {BENGALI_ARTISTS.map((artist) => (
              <TouchableOpacity
                key={artist.name}
                style={{ width: 72, alignItems: 'center', marginRight: 16 }}
                onPress={() => openSheet(artist.name, artist.query, 55000 + BENGALI_ARTISTS.indexOf(artist) * 100)}
                activeOpacity={0.7}
              >
                <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#333' }}>
                  <Image
                    source={{ uri: artist.image }}
                    style={{ width: 64, height: 64, borderRadius: 32 }}
                    defaultSource={require('./assets/icon.png')}
                  />
                </View>
                <Text style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 6 }} numberOfLines={2}>{artist.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Divider: Content */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 28, marginBottom: 4 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
          <Text style={{ color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginHorizontal: 10, textTransform: 'uppercase' }}>🎙️ Content</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
        </View>

        {/* Section 13: Sunday Suspense Vibes */}
        {(suspense.length > 0 || loadingSuspense) && (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, marginRight: 6 }}>🎙️</Text>
                <Text style={{ fontSize: 17, color: '#fff', fontWeight: 'bold' }}>Sunday Suspense Vibes</Text>
                <View style={{ backgroundColor: '#dc2626', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                  <Text style={{ fontSize: 9, color: '#fff', fontWeight: 'bold' }}>YT</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => openSheet("Sunday Suspense", "Sunday Suspense Mirchi Bangla", 11000, true)} activeOpacity={0.7}>
                <Text style={{ fontSize: 12, color: '#1DB954' }}>View All ›</Text>
              </TouchableOpacity>
            </View>
            {loadingSuspense ? (
              <SectionSkeleton count={4} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                {suspense.map((track, i) => (
                  <SongCard
                    key={track.id}
                    track={track}
                    index={i}
                    allTracks={suspense}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    onPlay={handlePlay}
                    onAddToQueue={addToQueue}
                    badge="▶ YT"
                    badgeColor="#dc2626"
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Divider: Time Machine */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 28, marginBottom: 4 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
          <Text style={{ color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginHorizontal: 10, textTransform: 'uppercase' }}>🕰️ Time Machine</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
        </View>

        {/* Section 14: Time Machine */}
        <View style={{ marginTop: 16 }}>
          <SectionHeader title="Time Machine" emoji="🕰️" />
          <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ERAS.map((era) => (
              <TouchableOpacity
                key={era.name}
                style={{ width: (width - 48) / 2, height: 72, backgroundColor: era.color, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => openSheet(era.name + "s Hits", era.query, 45000 + ERAS.indexOf(era) * 100)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 22, color: '#fff', fontWeight: '900' }}>{era.name}</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>{era.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Divider: Quick Picks */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 28, marginBottom: 4 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
          <Text style={{ color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginHorizontal: 10, textTransform: 'uppercase' }}>⚡ Quick Picks</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
        </View>

        {/* Section 15: Quick Picks */}
        <View style={{ marginTop: 16 }}>
          <SectionHeader title="Quick Picks" emoji="⚡" />
          <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {QUICK_PICKS.map((pick) => (
              <TouchableOpacity
                key={pick.title}
                style={{ width: (width - 48) / 2, backgroundColor: pick.color, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2a2a2a', flexDirection: 'row', alignItems: 'center', opacity: loadingQuickPick === pick.query ? 0.6 : 1 }}
                onPress={() => handleQuickPick(pick.query, 35000 + QUICK_PICKS.indexOf(pick) * 100)}
                disabled={loadingQuickPick === pick.query}
                activeOpacity={0.8}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(29,185,84,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                  {loadingQuickPick === pick.query ? (
                    <ActivityIndicator size="small" color="#1DB954" />
                  ) : (
                    <Ionicons name="musical-notes" size={18} color="#1DB954" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }} numberOfLines={1}>{pick.title}</Text>
                  <Text style={{ fontSize: 10, color: '#666', marginTop: 2 }} numberOfLines={1}>{pick.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Divider: YouTube */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 28, marginBottom: 4 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
          <Text style={{ color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginHorizontal: 10, textTransform: 'uppercase' }}>▶ YouTube</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#222' }} />
        </View>

        {/* Section 16: YouTube Trending */}
        {(ytTrending.length > 0 || loadingYtTrending) && (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, marginTop: 4 }}>
              <Text style={{ fontSize: 18, marginRight: 6 }}>▶️</Text>
              <Text style={{ fontSize: 17, color: '#fff', fontWeight: 'bold' }}>YouTube Trending</Text>
              <View style={{ backgroundColor: '#dc2626', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                <Text style={{ fontSize: 9, color: '#fff', fontWeight: 'bold' }}>YT</Text>
              </View>
            </View>
            {loadingYtTrending ? (
              <SectionSkeleton count={4} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                {ytTrending.map((track, i) => (
                  <SongCard
                    key={track.id}
                    track={track}
                    index={i}
                    allTracks={ytTrending}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    onPlay={handlePlay}
                    onAddToQueue={addToQueue}
                    badge="▶ YT"
                    badgeColor="#dc2626"
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Section 17: YouTube Quick Picks */}
        <View style={{ marginTop: 20 }}>
          <SectionHeader title="YouTube Quick Picks" emoji="🎬" />
          <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {YT_QUICK_PICKS.map((pick) => (
              <TouchableOpacity
                key={pick.title}
                style={{ width: (width - 48) / 2, backgroundColor: pick.color, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2a2a2a', flexDirection: 'row', alignItems: 'center', opacity: loadingYtPick === pick.query ? 0.6 : 1 }}
                onPress={() => handleYtQuickPick(pick.query, 65000 + YT_QUICK_PICKS.indexOf(pick) * 100)}
                disabled={loadingYtPick === pick.query}
                activeOpacity={0.8}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(220,38,38,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                  {loadingYtPick === pick.query ? (
                    <ActivityIndicator size="small" color="#dc2626" />
                  ) : (
                    <Ionicons name="logo-youtube" size={18} color="#dc2626" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }} numberOfLines={1}>{pick.title}</Text>
                  <Text style={{ fontSize: 10, color: '#666', marginTop: 2 }} numberOfLines={1}>{pick.desc}</Text>
                </View>
                <Text style={{ fontSize: 9, color: '#dc2626', fontWeight: 'bold' }}>YT</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* MiniPlayer always at bottom */}
      <MiniPlayer />

      {/* BottomSheetModal */}
      <BottomSheetModal
        visible={sheetVisible}
        title={sheetTitle}
        tracks={sheetTracks}
        loading={sheetLoading}
        onClose={() => setSheetVisible(false)}
        onPlayTrack={handleSheetPlay}
        onAddToQueue={addToQueue}
      />
    </View>
  );
};

// ==================== SearchScreen ====================
const SearchScreen = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { currentTrack, isPlaying, addToQueue, playTrackList } = usePlayer();

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const tracks = await fetchJioSaavn(query, 80000, 20);
      setResults(tracks);
      setLoading(false);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSearchPlay = async (track: Track) => {
    if (track.type === "youtube") {
      setResolvingId(track.songId || null);
      const resolved = await resolveYtAudio(track);
      setResolvingId(null);
      playTrackList([resolved], 0);
    } else {
      playTrackList([track], 0);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      {/* Search Bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 16, marginTop: 12, marginBottom: 8, gap: 10 }}>
        <Ionicons name="search" size={18} color="#555" />
        <TextInput
          style={{ flex: 1, color: '#fff', fontSize: 15 }}
          placeholder="Search songs, artists, albums..."
          placeholderTextColor="#555"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {!query ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="search-outline" size={64} color="#333" />
          <Text style={{ color: '#555', fontSize: 14, marginTop: 12 }}>Search for songs to start playing</Text>
        </View>
      ) : loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      ) : results.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="musical-notes-outline" size={64} color="#333" />
          <Text style={{ color: '#555', fontSize: 14, marginTop: 12 }}>No results found</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => String(item.id) + index}
          contentContainerStyle={{ paddingBottom: 140 }}
          renderItem={({ item }) => {
            const isPlaying = currentTrack?.id === item.id;
            const isResolving = resolvingId === item.songId;
            return (
              <TouchableOpacity
                style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 }, isPlaying && { backgroundColor: '#0d1f0d' }]}
                onPress={() => handleSearchPlay(item)}
                activeOpacity={0.7}
              >
                <View style={{ position: 'relative' }}>
                  <Image
                    source={{ uri: item.cover }}
                    style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: '#1a1a1a' }}
                    defaultSource={require('./assets/icon.png')}
                  />
                  {isResolving && (
                    <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                  {isPlaying && !isResolving && (
                    <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name={isPlaying && isPlaying ? "pause" : "play"} size={20} color="#fff" />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 14, color: '#fff', fontWeight: 'bold' }, isPlaying && { color: '#1DB954' }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }} numberOfLines={1}>{item.artist}</Text>
                </View>
                <TouchableOpacity style={{ padding: 6 }} onPress={() => addToQueue(item)} activeOpacity={0.7}>
                  <Ionicons name="add" size={22} color="#1DB954" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

// ==================== LibraryScreen ====================
const LibraryScreen = () => (
  <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name="library-outline" size={64} color="#1DB954" />
    <Text style={{ fontSize: 24, color: '#fff', fontWeight: 'bold', marginTop: 16 }}>Your Library</Text>
    <Text style={{ fontSize: 14, color: '#555', marginTop: 8 }}>Liked songs and playlists coming soon</Text>
  </View>
);

// ==================== ProfileScreen ====================
const ProfileScreen = () => (
  <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name="person-circle-outline" size={80} color="#1DB954" />
    <Text style={{ fontSize: 24, color: '#fff', fontWeight: 'bold', marginTop: 16 }}>Profile</Text>
    <Text style={{ fontSize: 14, color: '#555', marginTop: 8 }}>Sign in to sync your music</Text>
  </View>
);

// ==================== HomeTabs ====================
const HomeTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#0a0a0a',
        borderTopColor: '#1a1a1a',
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 8,
        paddingTop: 6,
      },
      tabBarActiveTintColor: '#1DB954',
      tabBarInactiveTintColor: '#555',
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
        if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';
        else if (route.name === 'Library') iconName = focused ? 'library' : 'library-outline';
        else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '600',
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Search" component={SearchScreen} />
    <Tab.Screen name="Library" component={LibraryScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// ==================== App Root ====================
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlayerProvider>
          <NavigationContainer>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Main" component={HomeTabs} />
              </Stack.Navigator>
              <StatusBar style="light" />
            </SafeAreaView>
          </NavigationContainer>
        </PlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// ==================== StyleSheet ====================
const styles = StyleSheet.create({
  // Layout
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  viewAllText: { fontSize: 12, color: '#1DB954', fontWeight: '600' },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 28, marginBottom: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#222' },
  dividerText: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginHorizontal: 10 },

  // Song Card
  card: { width: 120, marginRight: 12 },
  cardImage: { width: 120, height: 120, borderRadius: 10, backgroundColor: '#1a1a1a' },
  cardOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  cardBadge: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  cardBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  cardQueueBtn: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 12, fontWeight: '600', color: '#fff', marginTop: 6 },
  cardArtist: { fontSize: 11, color: '#888', marginTop: 2 },

  // Carousel
  carousel: { height: 220, position: 'relative' },
  carouselImage: { width: '100%', height: 220 },
  carouselOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0)' },
  carouselOverlayDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', padding: 16 },
  carouselLabel: { fontSize: 10, color: '#1DB954', fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  carouselTitle: { fontSize: 18, color: '#fff', fontWeight: '800', marginBottom: 2 },
  carouselArtist: { fontSize: 12, color: '#aaa', marginBottom: 10 },
  carouselPlayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1DB954', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, alignSelf: 'flex-start' },
  carouselPlayText: { fontSize: 12, color: '#000', fontWeight: '700' },
  carouselDots: { position: 'absolute', bottom: 12, right: 16, flexDirection: 'row', gap: 4, alignItems: 'center' },
  carouselDotActive: { width: 16, height: 6, backgroundColor: '#1DB954', borderRadius: 3 },
  carouselDotInactive: { width: 6, height: 6, backgroundColor: '#555', borderRadius: 3 },
  carouselArrow: { position: 'absolute', top: '50%', width: 28, height: 28, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // Time Greeting
  greetingEmoji: { fontSize: 24 },
  greetingTitle: { fontSize: 20, color: '#fff', fontWeight: '800', marginLeft: 8 },
  greetingSubtitle: { fontSize: 12, color: '#888', marginTop: 4, marginLeft: 32 },
  quickPlayCard: { backgroundColor: '#111', borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#1DB95433', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickPlayBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1DB954', alignItems: 'center', justifyContent: 'center' },

  // Song of Day
  sotdCard: { backgroundColor: '#1a1200', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#f59e0b33', flexDirection: 'row', alignItems: 'center', gap: 12 },
  sotdImage: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#2a2a2a' },
  sotdTitle: { fontSize: 14, color: '#fff', fontWeight: '700' },
  sotdArtist: { fontSize: 12, color: '#888', marginTop: 2 },
  sotdDuration: { fontSize: 10, color: '#f59e0b', marginTop: 4 },

  // Grid (Mood, Label, Era, QuickPick)
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  gridItem2col: { width: (width - 48) / 2, borderRadius: 14 },
  moodBtn: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  moodEmoji: { fontSize: 24 },
  moodName: { fontSize: 14, color: '#fff', fontWeight: '700' },
  labelBtn: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  labelName: { fontSize: 15, color: '#fff', fontWeight: '700' },
  eraBtn: { height: 72, alignItems: 'center', justifyContent: 'center' },
  eraName: { fontSize: 22, color: '#fff', fontWeight: '900' },
  eraSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  pickBtn: { padding: 14, borderWidth: 1, borderColor: '#2a2a2a', flexDirection: 'row', alignItems: 'center' },
  pickIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(29,185,84,0.15)', alignItems: 'center', justifyContent: 'center' },
  pickTitle: { fontSize: 12, color: '#fff', fontWeight: '700' },
  pickDesc: { fontSize: 10, color: '#666', marginTop: 2 },

  // Artist
  artistItem: { width: 72, alignItems: 'center', marginRight: 16 },
  artistImageWrap: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: '#333', overflow: 'hidden' },
  artistImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1a1a1a' },
  artistName: { fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 6, width: 72 },

  // Mini Player
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  miniPlayer: { position: 'absolute', bottom: 60, left: 0, right: 0, zIndex: 999, backgroundColor: '#1a1a1a', borderTopWidth: 1, borderTopColor: '#2a2a2a', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  miniCover: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#2a2a2a' },
  miniInfo: { flex: 1, marginLeft: 10 },
  miniTitle: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  miniArtist: { fontSize: 11, color: '#888' },
  miniBtn: { padding: 8 },
  miniPlayerImage: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#2a2a2a' },
  miniPlayerInfo: { flex: 1, marginLeft: 10, marginRight: 8 },
  miniPlayerTitle: { fontSize: 13, color: '#fff', fontWeight: '700' },
  miniPlayerArtist: { fontSize: 11, color: '#888', marginTop: 1 },
  miniPlayerControls: { flexDirection: 'row', alignItems: 'center' },
  miniPlayerBtn: { padding: 8 },

  // Bottom Sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheetContainer: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: 40 },
  dragHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  sheetTitleHeader: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 14 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  sheetRowPlaying: { backgroundColor: '#0d1f0d' },
  sheetCover: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#2a2a2a' },
  sheetInfo: { flex: 1, marginLeft: 12 },
  sheetTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  sheetTitlePlaying: { color: '#1DB954' },
  sheetArtist: { fontSize: 12, color: '#888', marginTop: 2 },
  sheetAddBtn: { padding: 6 },
  sheetRowImage: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#1a1a1a' },
  sheetRowTitle: { fontSize: 14, color: '#fff', fontWeight: '600' },
  sheetRowArtist: { fontSize: 12, color: '#888', marginTop: 2 },
  sheetQueueBtn: { padding: 8 },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1a1a1a', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 16, marginTop: 12, marginBottom: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  searchRowImage: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#1a1a1a' },
  searchRowTitle: { fontSize: 14, color: '#fff', fontWeight: '600' },
  searchRowArtist: { fontSize: 12, color: '#888', marginTop: 2 },

  // Skeleton
  skeletonImage: { width: 120, height: 120, borderRadius: 10, backgroundColor: '#1a1a1a', marginRight: 12 },
  skeletonTitle: { width: 90, height: 10, borderRadius: 5, backgroundColor: '#1a1a1a', marginTop: 8 },
  skeletonArtist: { width: 60, height: 8, borderRadius: 4, backgroundColor: '#161616', marginTop: 6 },

  // Pill badge
  pillBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 6 },
  pillBadgeText: { fontSize: 9, fontWeight: '700' },
});
