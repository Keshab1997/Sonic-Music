import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Image,
  ActivityIndicator, ScrollView, StyleSheet, Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Search, X, Play, Pause, Plus, RefreshCw, Flame, Headphones, Radio, Heart, Music2 } from "lucide-react-native";
import { usePlayer } from "@/context/PlayerContext";
import { Track } from "@/data/playlist";

const YT_API = "https://sonic-bloom-player.vercel.app/api/youtube-search";
const YT_STREAM_API = "https://sonic-bloom-player.vercel.app/api/yt-stream";
const DEBOUNCE_MS = 500;
const RECENT_SEARCHES_KEY = "yt_recent_searches_native";
const { width } = Dimensions.get("window");
const CARD_WIDTH = 120;

const SEARCH_CHIPS = [
  { label: "🎵 Hindi", query: "hindi songs" },
  { label: "🎶 Bangla", query: "bangla songs" },
  { label: "🌙 Lofi", query: "lofi remix" },
  { label: "💕 Romantic", query: "romantic songs" },
  { label: "🔥 Trending", query: "trending songs 2026" },
  { label: "🎸 Rock", query: "rock songs" },
  { label: "🙏 Bhajan", query: "devotional bhajan" },
  { label: "🎤 Pop", query: "pop songs" },
];

const FRONT_SECTIONS = [
  { id: "trending", label: "Trending Now", emoji: "🔥", query: "top trending songs 2026 hindi" },
  { id: "bangla", label: "Bangla Hits", emoji: "🎵", query: "viral bangla song 2026" },
  { id: "bollywood", label: "Bollywood Party", emoji: "🎬", query: "bollywood party songs 2026" },
  { id: "lofi", label: "Lofi & Chill", emoji: "🌙", query: "hindi lofi chill remix" },
  { id: "romantic", label: "Romantic Melodies", emoji: "💕", query: "hindi bengali romantic songs" },
  { id: "oldclassics", label: "Old Classics", emoji: "📻", query: "old hindi classic songs 70s 80s" },
  { id: "indie", label: "Indie Bengali", emoji: "🌿", query: "indie bengali band fossils chandrabindoo" },
  { id: "devotional", label: "Devotional", emoji: "🙏", query: "bengali devotional songs kirtan bhajan" },
];

interface YTVideo {
  videoId: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
}

const streamCache = new Map<string, { url: string; ts: number }>();
const sectionCache = new Map<string, { tracks: Track[]; ts: number }>();

const resolveAudioUrl = async (videoId: string): Promise<string | null> => {
  const cached = streamCache.get(videoId);
  if (cached && Date.now() - cached.ts < 3600000) return cached.url;
  try {
    const res = await fetch(`${YT_STREAM_API}?id=${videoId}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.audioUrl) {
      streamCache.set(videoId, { url: data.audioUrl, ts: Date.now() });
      return data.audioUrl;
    }
  } catch { /* silent */ }
  return null;
};

const toTrack = (v: YTVideo, i: number): Track => ({
  id: 70000 + i,
  title: v.title,
  artist: v.author || "YouTube",
  album: "",
  cover: v.thumbnail || "",
  src: `https://www.youtube.com/watch?v=${v.videoId}`,
  duration: v.duration || 0,
  type: "youtube" as const,
  songId: v.videoId,
});

export default function YoutubeMusicPage() {
  const { playTrackList, currentTrack, isPlaying, addToQueue } = usePlayer();

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"home" | "search">("home");
  const [sectionTracks, setSectionTracks] = useState<Map<string, Track[]>>(new Map());
  const [sectionsLoading, setSectionsLoading] = useState<Record<string, boolean>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches
  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY).then(stored => {
      if (stored) setRecentSearches(JSON.parse(stored));
    }).catch(() => {});
  }, []);

  const saveRecentSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== q.toLowerCase());
      const updated = [q, ...filtered].slice(0, 8);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  // Fetch section tracks
  const fetchSection = useCallback(async (sectionId: string, sectionQuery: string) => {
    const cached = sectionCache.get(sectionId);
    if (cached && Date.now() - cached.ts < 3600000) {
      setSectionTracks(prev => new Map(prev).set(sectionId, cached.tracks));
      return;
    }
    setSectionsLoading(prev => ({ ...prev, [sectionId]: true }));
    try {
      const res = await fetch(`${YT_API}?q=${encodeURIComponent(sectionQuery)}`);
      if (!res.ok) return;
      const videos: YTVideo[] = await res.json();
      const tracks = videos.slice(0, 12).map((v, i) => toTrack(v, i));
      sectionCache.set(sectionId, { tracks, ts: Date.now() });
      setSectionTracks(prev => new Map(prev).set(sectionId, tracks));
    } catch { /* silent */ }
    setSectionsLoading(prev => ({ ...prev, [sectionId]: false }));
  }, []);

  // Load all sections on mount in batches
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      for (let i = 0; i < FRONT_SECTIONS.length; i += 2) {
        if (cancelled) return;
        const batch = FRONT_SECTIONS.slice(i, i + 2);
        await Promise.all(batch.map(s => fetchSection(s.id, s.query)));
      }
    };
    load();
    return () => { cancelled = true; };
  }, [fetchSection]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setViewMode("home");
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setViewMode("search");
      setSearchLoading(true);
      try {
        const res = await fetch(`${YT_API}?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const videos: YTVideo[] = await res.json();
          setSearchResults(videos.map((v, i) => toTrack(v, i)));
        }
      } catch { /* silent */ }
      setSearchLoading(false);
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Play handler — resolve audio URL first
  const handlePlay = useCallback(async (track: Track, allTracks: Track[], idx: number) => {
    const videoId = track.songId;
    if (!videoId) return;

    // Already resolved
    const cached = streamCache.get(videoId);
    if (cached && Date.now() - cached.ts < 3600000) {
      const resolved = allTracks.map((t, i) => i === idx ? { ...t, src: cached.url, type: "audio" as const } : t);
      playTrackList(resolved, idx);
      return;
    }

    setResolvingId(videoId);
    const audioUrl = await resolveAudioUrl(videoId);
    setResolvingId(null);

    if (audioUrl) {
      const resolved = allTracks.map((t, i) => i === idx ? { ...t, src: audioUrl, type: "audio" as const } : t);
      playTrackList(resolved, idx);
    } else {
      playTrackList(allTracks, idx);
    }
  }, [playTrackList]);

  const isTrackPlaying = useCallback((t: Track) =>
    currentTrack?.songId === t.songId && isPlaying, [currentTrack?.songId, isPlaying]);

  // Track card for horizontal sections
  const renderTrackCard = useCallback((track: Track, allTracks: Track[], idx: number) => {
    const playing = isTrackPlaying(track);
    const resolving = resolvingId === track.songId;
    return (
      <TouchableOpacity
        key={track.songId || idx}
        style={[styles.card, playing && styles.cardActive]}
        onPress={() => handlePlay(track, allTracks, idx)}
        activeOpacity={0.75}
      >
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: track.cover }} style={styles.cardImage} />
          {(playing || resolving) && (
            <View style={styles.cardOverlay}>
              {resolving
                ? <ActivityIndicator size="small" color="#fff" />
                : playing ? <Pause size={18} color="#fff" /> : <Play size={18} color="#fff" />
              }
            </View>
          )}
        </View>
        <Text style={[styles.cardTitle, playing && styles.activeText]} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.cardArtist} numberOfLines={1}>{track.artist}</Text>
      </TouchableOpacity>
    );
  }, [isTrackPlaying, resolvingId, handlePlay]);

  // Search result row
  const renderSearchRow = useCallback(({ item, index }: { item: Track; index: number }) => {
    const playing = isTrackPlaying(item);
    const resolving = resolvingId === item.songId;
    return (
      <TouchableOpacity
        style={[styles.row, playing && styles.rowActive]}
        onPress={() => handlePlay(item, searchResults, index)}
        activeOpacity={0.75}
      >
        <View style={styles.rowImageWrap}>
          <Image source={{ uri: item.cover }} style={styles.rowImage} />
          {(playing || resolving) && (
            <View style={styles.cardOverlay}>
              {resolving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Pause size={16} color="#fff" />
              }
            </View>
          )}
        </View>
        <View style={styles.rowInfo}>
          <Text style={[styles.rowTitle, playing && styles.activeText]} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.rowArtist} numberOfLines={1}>{item.artist}</Text>
        </View>
        <TouchableOpacity
          onPress={() => addToQueue(item)}
          style={styles.queueBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Plus size={18} color="#888" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [isTrackPlaying, resolvingId, handlePlay, searchResults, addToQueue]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Search size={18} color="#888" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search songs, artists..."
          placeholderTextColor="#555"
          returnKeyType="search"
          onSubmitEditing={() => query.trim() && saveRecentSearch(query.trim())}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick chips */}
      {viewMode === "home" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipsContent}>
          {SEARCH_CHIPS.map(chip => (
            <TouchableOpacity key={chip.query} style={styles.chip} onPress={() => setQuery(chip.query)}>
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Search Results */}
      {viewMode === "search" && (
        <View style={styles.flex1}>
          {searchLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#1DB954" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item, i) => item.songId || String(i)}
              renderItem={renderSearchRow}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>No results found</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* Home Sections */}
      {viewMode === "home" && (
        <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false} contentContainerStyle={styles.homeContent}>
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🕐 Recent Searches</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
                {recentSearches.map((s, i) => (
                  <TouchableOpacity key={i} style={styles.recentChip} onPress={() => setQuery(s)}>
                    <Text style={styles.recentChipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {FRONT_SECTIONS.map(section => {
            const tracks = sectionTracks.get(section.id) || [];
            const loading = sectionsLoading[section.id];
            return (
              <View key={section.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.emoji} {section.label}</Text>
                  {tracks.length > 0 && (
                    <TouchableOpacity
                      onPress={() => handlePlay(tracks[0], tracks, 0)}
                      style={styles.playAllBtn}
                    >
                      <Play size={12} color="#1DB954" fill="#1DB954" />
                      <Text style={styles.playAllText}>Play</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {loading ? (
                  <View style={styles.skeletonRow}>
                    {[0, 1, 2, 3].map(i => (
                      <View key={i} style={styles.skeleton} />
                    ))}
                  </View>
                ) : tracks.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
                    {tracks.map((t, i) => renderTrackCard(t, tracks, i))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptySection}>
                    <Text style={styles.emptyText}>No songs loaded</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  flex1: { flex: 1 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#1a1a1a", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 15 },
  chips: { maxHeight: 44, marginBottom: 4 },
  chipsContent: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: "#1a1a1a", borderRadius: 20,
  },
  chipText: { color: "#ccc", fontSize: 13 },
  recentChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: "#1e1e1e", borderRadius: 16,
    borderWidth: 1, borderColor: "#333",
  },
  recentChipText: { color: "#aaa", fontSize: 12 },
  homeContent: { paddingBottom: 120 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  playAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: "#1a2a1a", borderRadius: 16,
  },
  playAllText: { color: "#1DB954", fontSize: 12, fontWeight: "600" },
  cardRow: { paddingHorizontal: 16, gap: 12 },
  card: { width: CARD_WIDTH },
  cardActive: { opacity: 0.85 },
  cardImageWrap: { position: "relative" },
  cardImage: {
    width: CARD_WIDTH, height: CARD_WIDTH,
    borderRadius: 10, backgroundColor: "#1a1a1a",
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 12, fontWeight: "600", color: "#fff", marginTop: 6 },
  cardArtist: { fontSize: 11, color: "#888", marginTop: 2 },
  activeText: { color: "#1DB954" },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
  },
  rowActive: { backgroundColor: "#0d1f0d" },
  rowImageWrap: { position: "relative" },
  rowImage: { width: 52, height: 52, borderRadius: 8, backgroundColor: "#1a1a1a" },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "600", color: "#fff" },
  rowArtist: { fontSize: 12, color: "#888", marginTop: 2 },
  queueBtn: { padding: 8 },
  listContent: { paddingBottom: 120 },
  skeletonRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12 },
  skeleton: {
    width: CARD_WIDTH, height: CARD_WIDTH,
    borderRadius: 10, backgroundColor: "#1a1a1a",
  },
  emptySection: { height: 80, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  loadingText: { color: "#888", marginTop: 12, fontSize: 14 },
  emptyText: { color: "#555", fontSize: 14 },
});
