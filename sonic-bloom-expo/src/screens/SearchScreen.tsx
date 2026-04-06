import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '../data/playlist';
import { usePlayer } from '../context/PlayerContext';
import { useDownloadsContext } from '../context/DownloadsContext';
import { useSearchCache } from '../hooks/useSearchCache';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { Toast } from '../components/Toast';
import { CachedImage } from '../components/CachedImage';
import { lightHaptic, mediumHaptic } from '../lib/haptics';
import {
  API_BASE, SONGS_PER_PAGE,
  TRENDING_SEARCHES, HINDI_ARTISTS, BENGALI_ARTISTS
} from '../data/constants';

const { width } = Dimensions.get('window');

export const SearchScreen: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"songs" | "artists" | "albums">("songs");
  const [artistResults, setArtistResults] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [albumSongs, setAlbumSongs] = useState<Track[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<{ id: string; name: string } | null>(null);
  const [loadingAlbum, setLoadingAlbum] = useState(false);
  const [rawAlbums, setRawAlbums] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error'; visible: boolean }>({ message: '', type: 'success', visible: false });
  const [searchInBackground, setSearchInBackground] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchCacheRef = useRef<Map<string, { tracks: Track[], timestamp: number }>>(new Map());
  const { currentTrack, isPlaying, addToQueue, playTrackList } = usePlayer();
  const { isDownloaded, isDownloading, downloadTrack, getDownloadProgress } = useDownloadsContext();
  const { saveSearchResults, getCachedResults } = useSearchCache();
  const { searchHistory, addToHistory, clearHistory: clearSearchHistory, removeFromHistory } = useSearchHistory();
  const navigation = useNavigation();

  // Load cache from AsyncStorage on mount
  useEffect(() => {
    const loadCache = async () => {
      try {
        const cacheData = await AsyncStorage.getItem('sonic_search_cache');
        if (cacheData) {
          const parsed = JSON.parse(cacheData);
          searchCacheRef.current = new Map(Object.entries(parsed));
          console.log(`[Search] Loaded ${searchCacheRef.current.size} cached searches from storage`);
        }
      } catch (e) {
        console.error('[Search] Failed to load cache:', e);
      }
    };
    loadCache();
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  }, []);

  const handleSearch = (q: string) => {
    setQuery(q);
    addToHistory(q);
    lightHaptic();
  };

  const clearHistory = () => {
    clearSearchHistory();
  };

  const fetchSongs = useCallback(async (searchQuery: string, page: number, append = false) => {
    // Check cache first (lifetime validity)
    const cacheKey = `${searchQuery}-${page}`;
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached) {
      console.log('[Search] Using cached results (lifetime cache)');
      return { tracks: cached.tracks, hasMore: cached.tracks.length >= SONGS_PER_PAGE, total: cached.tracks.length };
    }
    
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        // Create new abort controller for this request
        const controller = new AbortController();
        
        // Set timeout for request (30 seconds)
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        console.log(`[Search] Fetching: "${searchQuery}" page ${page}, attempt ${retryCount + 1}`);
        
        const res = await fetch(
          `${API_BASE}/search/songs?query=${encodeURIComponent(searchQuery)}&page=${page}&limit=${SONGS_PER_PAGE}`,
          { 
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
          }
        );
        
        clearTimeout(timeoutId);
        
        console.log(`[Search] Response status: ${res.status}`);
        
        if (!res.ok) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`[Search] Retry ${retryCount}/${maxRetries} after ${2000 * retryCount}ms`);
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            continue;
          }
          console.error('[Search] All retries failed');
          return { tracks: [], hasMore: false, total: 0 };
        }
        
        const data = await res.json();
        console.log(`[Search] Got ${data.data?.results?.length || 0} results`);
      const songs = data.data?.results || [];
      
      if (songs.length === 0) {
        console.log('[Search] No results in response');
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`[Search] Empty response, retry ${retryCount}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          continue;
        }
      }
      
      const total = data.data?.total || songs.length;
      const offset = append ? results.length : 0;
      const tracks: Track[] = songs
        .map((s: any, i: number) => {
          if (!s.downloadUrl?.length) return null;
          const url160 = s.downloadUrl.find((d: any) => d.quality === "160kbps")?.link;
          const url96 = s.downloadUrl.find((d: any) => d.quality === "96kbps")?.link;
          const url320 = s.downloadUrl.find((d: any) => d.quality === "320kbps")?.link;
          const bestUrl = url160 || url96 || s.downloadUrl[0]?.link || "";
          if (!bestUrl) return null;
          return {
            id: 80000 + offset + i,
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
        })
        .filter((t: Track | null): t is Track => t !== null);
        
        // Cache the results permanently (lifetime cache)
        if (tracks.length > 0) {
          searchCacheRef.current.set(cacheKey, { tracks, timestamp: Date.now() });
          console.log(`[Search] Cached ${tracks.length} tracks permanently`);
          
          // Save to AsyncStorage for persistence
          try {
            const cacheObj = Object.fromEntries(searchCacheRef.current);
            await AsyncStorage.setItem('sonic_search_cache', JSON.stringify(cacheObj));
            console.log('[Search] Saved cache to storage');
          } catch (e) {
            console.error('[Search] Failed to save cache:', e);
          }
        }
        
        return { tracks, hasMore: songs.length >= SONGS_PER_PAGE, total };
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('[Search] Request cancelled or timeout');
          return { tracks: [], hasMore: false, total: 0 };
        }
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`[Search] Error, retry ${retryCount}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          continue;
        }
        
        return { tracks: [], hasMore: false, total: 0 };
      }
    }
    
    console.log('[Search] All attempts exhausted');
    return { tracks: [], hasMore: false, total: 0 };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setArtistResults([]);
      setTotalResults(0);
      setCurrentPage(1);
      setHasMore(true);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearchInBackground(true);
      setCurrentPage(1);
      
      // Don't cancel previous request here - let it complete
      const currentAbortController = new AbortController();
      abortControllerRef.current = currentAbortController;
      
      if (activeFilter === "songs") {
        const { tracks, hasMore, total } = await fetchSongs(query, 1);
        console.log(`[Search] Final results: ${tracks.length} tracks`);
        setResults(tracks);
        setHasMore(hasMore);
        setTotalResults(total);
        setArtistResults([]);
        
        if (tracks.length === 0) {
          showToast('No results found. Try different keywords.', 'info');
        }
      } else if (activeFilter === "artists") {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          const res = await fetch(
            `${API_BASE}/search/artists?query=${encodeURIComponent(query)}&page=1&limit=30`,
            { 
              signal: controller.signal,
              headers: { 'Cache-Control': 'no-cache' }
            }
          );
          
          clearTimeout(timeoutId);
          
          if (res.ok) {
            const data = await res.json();
            setArtistResults(data.data?.results || []);
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('[Search Artists] Error:', error);
          }
        }
        setResults([]);
        setTotalResults(0);
      } else if (activeFilter === "albums") {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          const res = await fetch(
            `${API_BASE}/search/albums?query=${encodeURIComponent(query)}&page=1&limit=30`,
            { 
              signal: controller.signal,
              headers: { 'Cache-Control': 'no-cache' }
            }
          );
          
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            const albums = data.data?.results || [];
            setRawAlbums(albums);
            const albumTracks: Track[] = albums.map((a: any, i: number) => {
              const albumName = typeof a.name === 'string' ? a.name : a.name?.name || a.name?.id || "Unknown Album";
              const artistName = typeof a.music === 'string' ? a.music :
                                 typeof a.primaryArtists === 'string' ? a.primaryArtists :
                                 a.music?.name || a.primaryArtists?.name || a.primaryArtists?.id || "Unknown";
              const coverUrl = Array.isArray(a.image) ?
                               (a.image[0]?.link || a.image[a.image.length - 1]?.link || "") :
                               (typeof a.image === 'string' ? a.image : "");
              return {
                id: 90000 + i,
                title: albumName,
                artist: artistName,
                album: albumName,
                cover: coverUrl,
                src: "",
                duration: 0,
                type: "audio" as const,
                songId: a.id,
              };
            });
            setResults(albumTracks);
            setTotalResults(albums.length);
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('[Search Albums] Error:', error);
          }
        }
        setArtistResults([]);
        setHasMore(false);
      }
      setLoading(false);
      setSearchInBackground(false);
    }, 500);
    return () => { 
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Don't clear cache on unmount - keep it for lifetime
    };
  }, [query, activeFilter, fetchSongs]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || activeFilter !== "songs") return;
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    const { tracks, hasMore: more } = await fetchSongs(query, nextPage, true);
    setResults((prev) => [...prev, ...tracks]);
    setHasMore(more);
    setCurrentPage(nextPage);
    setLoadingMore(false);
  }, [loadingMore, hasMore, currentPage, query, activeFilter, fetchSongs]);

  const handleSearchPlay = async (track: Track) => {
    playTrackList([track], 0);
    mediumHaptic();
  };

  const handleArtistPress = (artist: any) => {
    const artistName = typeof artist.name === 'string' ? artist.name : artist.name?.id || artist.name?.name || 'Unknown Artist';
    const artistImage = artist.image?.[0]?.link || '';
    (navigation as any).navigate('ArtistDetail', { artistName, artistImage });
    mediumHaptic();
  };

  const fetchAlbumSongs = useCallback(async (albumId: string, albumName: string) => {
    setLoadingAlbum(true);
    setSelectedAlbum({ id: albumId, name: albumName });
    setAlbumSongs([]);
    try {
      const res = await fetch(`${API_BASE}/albums?id=${albumId}`);
      if (res.ok) {
        const data = await res.json();
        const songs = data.data?.songs || [];
        if (songs.length > 0) {
          const tracks: Track[] = songs
            .map((s: any, i: number) => {
              if (!s.downloadUrl?.length) return null;
              const url160 = s.downloadUrl.find((d: any) => d.quality === "160kbps")?.link;
              const url96 = s.downloadUrl.find((d: any) => d.quality === "96kbps")?.link;
              const url320 = s.downloadUrl.find((d: any) => d.quality === "320kbps")?.link;
              const bestUrl = url160 || url96 || s.downloadUrl[0]?.link || "";
              if (!bestUrl) return null;
              return {
                id: 95000 + i,
                title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown",
                artist: s.primaryArtists || "Unknown",
                album: albumName,
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
            })
            .filter((t: Track | null): t is Track => t !== null);
          setAlbumSongs(tracks);
          setLoadingAlbum(false);
          return;
        }
      }
    } catch (e) { console.log('Album fetch error:', e); }
    try {
      const res = await fetch(`${API_BASE}/playlists?id=${albumId}`);
      if (res.ok) {
        const data = await res.json();
        const songs = data.data?.songs || [];
        if (songs.length > 0) {
          const tracks: Track[] = songs
            .map((s: any, i: number) => {
              if (!s.downloadUrl?.length) return null;
              const url160 = s.downloadUrl.find((d: any) => d.quality === "160kbps")?.link;
              const url96 = s.downloadUrl.find((d: any) => d.quality === "96kbps")?.link;
              const bestUrl = url160 || url96 || s.downloadUrl[0]?.link || "";
              return {
                id: 95000 + i,
                title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown",
                artist: s.primaryArtists || "Unknown",
                album: albumName,
                cover: s.image?.find((img: any) => img.quality === "500x500")?.link || "",
                src: bestUrl,
                duration: parseInt(String(s.duration)) || 0,
                type: "audio" as const,
                songId: s.id,
              };
            })
            .filter((t: Track | null): t is Track => t !== null);
          setAlbumSongs(tracks);
          setLoadingAlbum(false);
          return;
        }
      }
    } catch {}
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(albumName)}&page=1&limit=50`);
      if (res.ok) {
        const data = await res.json();
        const songs = data.data?.results || [];
        const tracks: Track[] = songs
          .map((s: any, i: number) => {
            if (!s.downloadUrl?.length) return null;
            const url160 = s.downloadUrl.find((d: any) => d.quality === "160kbps")?.link;
            const url96 = s.downloadUrl.find((d: any) => d.quality === "96kbps")?.link;
            const bestUrl = url160 || url96 || s.downloadUrl[0]?.link || "";
            return {
              id: 95000 + i,
              title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown",
              artist: s.primaryArtists || "Unknown",
              album: albumName,
              cover: s.image?.find((img: any) => img.quality === "500x500")?.link || "",
              src: bestUrl,
              duration: parseInt(String(s.duration)) || 0,
              type: "audio" as const,
              songId: s.id,
            };
          })
          .filter((t: Track | null): t is Track => t !== null);
        setAlbumSongs(tracks);
      }
    } catch {}
    setLoadingAlbum(false);
  }, []);

  const handleAlbumPress = (index: number) => {
    const rawAlbum = rawAlbums[index];
    if (rawAlbum && rawAlbum.id) {
      const albumName = typeof rawAlbum.name === 'string' ? rawAlbum.name : rawAlbum.name?.name || rawAlbum.name?.id || "Unknown Album";
      const albumCover = rawAlbum.image?.[0]?.link || '';
      const albumArtist = typeof rawAlbum.music === 'string' ? rawAlbum.music : rawAlbum.primaryArtists || '';
      (navigation as any).navigate('AlbumDetail', { albumId: rawAlbum.id, albumName, albumCover, albumArtist });
      mediumHaptic();
    }
  };

  const backToAlbums = () => {
    setSelectedAlbum(null);
    setAlbumSongs([]);
  };

  const FILTERS = [
    { key: "songs" as const, label: "Songs", icon: "musical-notes" },
    { key: "artists" as const, label: "Artists", icon: "people" },
    { key: "albums" as const, label: "Albums", icon: "disc" },
  ];

  return (
    <View style={styles.container}>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
      
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#555" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search songs, artists, albums..."
          placeholderTextColor="#555"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {searchInBackground && (
          <ActivityIndicator size="small" color="#1DB954" style={{ marginRight: 8 }} />
        )}
        {query.length > 0 && !searchInBackground && (
          <TouchableOpacity onPress={() => setQuery("")} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Filter Chips */}
        {query.length > 0 && (
          <View style={styles.filterChips}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, { backgroundColor: activeFilter === f.key ? '#1DB954' : '#1a1a1a' }]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={f.icon as any} size={14} color={activeFilter === f.key ? '#000' : '#888'} />
                <Text style={[styles.filterChipText, { color: activeFilter === f.key ? '#000' : '#888' }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State - No Query */}
        {!query ? (
          <>
            {/* Trending Searches */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔥 Trending Searches</Text>
              <View style={styles.trendingGrid}>
                {TRENDING_SEARCHES.map((t, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.trendingBtn}
                    onPress={() => handleSearch(t.query)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.trendingBtnText}>{t.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Top Artists Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎤 Top Artists</Text>
              <View style={styles.artistsGrid}>
                {[...HINDI_ARTISTS, ...BENGALI_ARTISTS].slice(0, 8).map((artist, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.artistItem}
                    onPress={() => handleSearch(artist.query)}
                    activeOpacity={0.7}
                  >
                    <CachedImage
                      source={{ uri: artist.image }}
                      style={styles.artistImage}
                      defaultSource={require('../../assets/icon.png')}
                    />
                    <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <View style={styles.section}>
                <View style={styles.historyHeader}>
                  <Text style={styles.sectionTitle}>🕐 Recent Searches</Text>
                  <TouchableOpacity onPress={clearHistory} activeOpacity={0.7}>
                    <Text style={styles.clearAllText}>Clear All</Text>
                  </TouchableOpacity>
                </View>
                {searchHistory.map((h, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.historyItem}
                    onPress={() => handleSearch(h)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={18} color="#555" />
                    <Text style={styles.historyText} numberOfLines={1}>{h}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        removeFromHistory(h);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={18} color="#555" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1DB954" />
            <Text style={styles.loadingText}>Searching for "{query}"...</Text>
            <Text style={styles.loadingSubText}>Please wait, this may take up to 30 seconds</Text>
          </View>
        ) : results.length === 0 && artistResults.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>No results found for "{query}"</Text>
            <Text style={styles.emptySubText}>Try different keywords or check your connection</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setQuery('');
                setTimeout(() => setQuery(query), 100);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={18} color="#1DB954" />
              <Text style={styles.retryBtnText}>Retry Search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Songs Results */}
            {activeFilter === "songs" && results.length > 0 && (
              <View style={styles.resultsContainer}>
                <View style={styles.resultsActions}>
                  <Text style={styles.resultsCount}>
                    Showing {results.length} of {totalResults}+ results
                  </Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        results.forEach(track => addToQueue(track));
                        showToast(`Added ${results.length} songs to queue`, 'success');
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="list" size={14} color="#1DB954" />
                      <Text style={styles.actionBtnText}>Add to Queue</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={async () => {
                        const tracksToDownload = results.filter(track => !isDownloaded(String(track.songId || track.id)));
                        console.log('[SearchScreen] Downloading:', tracksToDownload.length, 'tracks');
                        for (const track of tracksToDownload) {
                          await downloadTrack(track);
                        }
                        showToast(`Downloading ${tracksToDownload.length} songs`, 'info');
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="download" size={14} color="#1DB954" />
                      <Text style={styles.actionBtnText}>Download All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={async () => {
                        setLoading(true);
                        const randomPage = Math.floor(Math.random() * 10) + 1;
                        try {
                          const res = await fetch(
                            `${API_BASE}/search/songs?query=${encodeURIComponent(query)}&page=${randomPage}&limit=${SONGS_PER_PAGE}`
                          );
                          if (res.ok) {
                            const data = await res.json();
                            const songs = data.data?.results || [];
                            const tracks: Track[] = songs
                              .map((s: any, i: number) => {
                                if (!s.downloadUrl?.length) return null;
                                const url160 = s.downloadUrl.find((d: any) => d.quality === "160kbps")?.link;
                                const url96 = s.downloadUrl.find((d: any) => d.quality === "96kbps")?.link;
                                const bestUrl = url160 || url96 || s.downloadUrl[0]?.link || "";
                                return {
                                  id: 80000 + i,
                                  title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown",
                                  artist: s.primaryArtists || "Unknown",
                                  album: typeof s.album === "string" ? s.album : s.album?.name || "",
                                  cover: s.image?.find((img: any) => img.quality === "500x500")?.link || "",
                                  src: bestUrl,
                                  duration: parseInt(String(s.duration)) || 0,
                                  type: "audio" as const,
                                  songId: s.id,
                                };
                              })
                              .filter((t: Track | null): t is Track => t !== null);
                            setResults(tracks);
                            setCurrentPage(1);
                            setHasMore(true);
                            showToast(`Loaded ${tracks.length} new songs`, 'info');
                          }
                        } catch {
                          showToast('Failed to load more songs', 'error');
                        }
                        setLoading(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="shuffle" size={14} color="#1DB954" />
                      <Text style={styles.actionBtnText}>Next</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.playAllBtn]}
                      onPress={() => {
                        playTrackList(results, 0);
                        showToast(`Playing ${results.length} songs`, 'success');
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="play" size={14} color="#000" />
                      <Text style={[styles.actionBtnText, { color: '#000' }]}>Play All</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {results.map((item, index) => {
                  const isCurrentTrack = currentTrack?.id === item.id;
                  const downloaded = isDownloaded(String(item.songId || item.id));
                  const downloading = isDownloading(String(item.songId || item.id));
                  const progress = getDownloadProgress(String(item.songId || item.id));
                  return (
                    <TouchableOpacity
                      key={`search_song_${item.songId || item.id}_${index}`}
                      style={[
                        styles.songRow,
                        isCurrentTrack && styles.songRowActive
                      ]}
                      onPress={() => handleSearchPlay(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.songImageContainer}>
                        <CachedImage
                          source={{ uri: item.cover || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }}
                          style={styles.songImage}
                          defaultSource={require('../../assets/icon.png')}
                        />
                        {isCurrentTrack && (
                          <View style={styles.songOverlay}>
                            <Ionicons name={isPlaying ? ("play-back" as any) : "play"} size={20} color="#1DB954" />
                          </View>
                        )}
                      </View>
                      <View style={styles.songInfo}>
                        <Text style={[styles.songTitle, isCurrentTrack && styles.songTitleActive]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
                        {downloading && (
                          <View style={styles.downloadProgress}>
                            <View style={styles.downloadProgressTrack}>
                              <View style={[styles.downloadProgressFill, { width: `${progress}%` }]} />
                            </View>
                            <Text style={styles.downloadProgressText}>{progress}%</Text>
                          </View>
                        )}
                        {downloaded && (
                          <Text style={styles.downloadedBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#1DB954" /> Downloaded
                          </Text>
                        )}
                      </View>
                      <View style={styles.songActions}>
                        <TouchableOpacity
                          style={styles.downloadBtn}
                          onPress={() => {
                            if (downloaded) {
                              showToast('Already downloaded', 'info');
                            } else {
                              downloadTrack(item);
                              showToast('Downloading...', 'info');
                            }
                          }}
                          disabled={downloading}
                          activeOpacity={0.7}
                        >
                          {downloading ? (
                            <ActivityIndicator size="small" color="#1DB954" />
                          ) : downloaded ? (
                            <Ionicons name="checkmark-circle" size={20} color="#1DB954" />
                          ) : (
                            <Ionicons name="download-outline" size={20} color="#888" />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.songAddBtn}
                          onPress={() => addToQueue(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add-circle-outline" size={24} color="#1DB954" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Load More Button */}
                {hasMore && activeFilter === "songs" && (
                  <TouchableOpacity
                    style={styles.loadMoreBtn}
                    onPress={loadMore}
                    disabled={loadingMore}
                    activeOpacity={0.7}
                  >
                    {loadingMore ? (
                      <ActivityIndicator size="small" color="#1DB954" />
                    ) : (
                      <Text style={styles.loadMoreText}>Load More Songs</Text>
                    )}
                  </TouchableOpacity>
                )}
                {!hasMore && results.length > 0 && (
                  <Text style={styles.noMoreText}>No more results</Text>
                )}
              </View>
            )}

            {/* Artists Results */}
            {activeFilter === "artists" && artistResults.length > 0 && (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsSubTitle}>Artists ({artistResults.length})</Text>
                <View style={styles.artistsResultsGrid}>
                  {artistResults.map((artist: any, i: number) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.artistResultItem}
                      onPress={() => handleArtistPress(artist)}
                      activeOpacity={0.7}
                    >
                      <CachedImage
                        source={{ uri: artist.image?.[0]?.link || '' }}
                        style={styles.artistResultImage}
                        defaultSource={require('../../assets/icon.png')}
                      />
                      <Text style={styles.artistResultName} numberOfLines={1}>{artist.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Albums Results / Album Songs View */}
            {activeFilter === "albums" && (
              <View style={styles.resultsContainer}>
                {selectedAlbum && albumSongs.length > 0 ? (
                  <>
                    <View style={styles.albumHeader}>
                      <TouchableOpacity onPress={backToAlbums} activeOpacity={0.7} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={18} color="#1DB954" />
                        <Text style={styles.backBtnText}>Back to Albums</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.playAllSmallBtn}
                        onPress={() => playTrackList(albumSongs, 0)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="play" size={16} color="#1DB954" />
                        <Text style={styles.playAllSmallText}>Play All</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.albumNameTitle}>{selectedAlbum.name}</Text>
                    <Text style={styles.albumSongCount}>{albumSongs.length} songs</Text>
                    {loadingAlbum ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#1DB954" />
                      </View>
                    ) : (
                      albumSongs.map((track, index) => {
                        const isCurrentTrack = currentTrack?.id === track.id;
                        return (
                          <TouchableOpacity
                            key={`album_song_${track.songId || track.id}_${index}`}
                            style={[styles.songRow, isCurrentTrack && styles.songRowActive]}
                            onPress={() => playTrackList(albumSongs, index)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.songImageContainer}>
                              <CachedImage
                                source={{ uri: track.cover || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }}
                                style={[styles.songImage, { width: 48, height: 48 }]}
                                defaultSource={require('../../assets/icon.png')}
                              />
                              {isCurrentTrack && (
                                <View style={styles.songOverlay}>
                                  <Ionicons name={isPlaying ? ("play-back" as any) : "play"} size={18} color="#1DB954" />
                                </View>
                              )}
                            </View>
                            <View style={styles.songInfo}>
                              <Text style={[styles.songTitle, isCurrentTrack && styles.songTitleActive]} numberOfLines={1}>{track.title}</Text>
                              <Text style={styles.songArtist} numberOfLines={1}>{track.artist}</Text>
                            </View>
                            <TouchableOpacity style={styles.songAddBtn} onPress={() => addToQueue(track)} activeOpacity={0.7}>
                              <Ionicons name="add-circle-outline" size={22} color="#1DB954" />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </>
                ) : loadingAlbum ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1DB954" />
                    <Text style={styles.loadingText}>Loading album...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.resultsSubTitle}>Albums ({results.length})</Text>
                    <View style={styles.albumsGrid}>
                      {results.map((album, i) => (
                        <TouchableOpacity
                          key={i}
                          style={styles.albumGridItem}
                          onPress={() => handleAlbumPress(i)}
                          activeOpacity={0.7}
                        >
                          <CachedImage
                            source={{ uri: album.cover || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }}
                            style={styles.albumGridImage}
                            defaultSource={require('../../assets/icon.png')}
                          />
                          <Text style={styles.albumGridTitle} numberOfLines={1}>{album.title}</Text>
                          <Text style={styles.albumGridArtist} numberOfLines={1}>{album.artist}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollContent: { paddingBottom: 140 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 16, marginTop: 12, marginBottom: 8, gap: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  filterChips: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, gap: 6 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  trendingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trendingBtn: { backgroundColor: '#1a0808', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#222' },
  trendingBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  artistsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  artistItem: { width: (width - 56) / 4 - 9, alignItems: 'center' },
  artistImage: { width: '100%', aspectRatio: 1, borderRadius: 999, backgroundColor: '#1a1a1a', marginBottom: 6 },
  artistName: { fontSize: 11, color: '#ccc', textAlign: 'center' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  clearAllText: { fontSize: 12, color: '#1DB954' },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', gap: 12 },
  historyText: { flex: 1, fontSize: 14, color: '#ccc' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { color: '#fff', fontSize: 14, marginTop: 12, fontWeight: '600' },
  loadingSubText: { color: '#888', fontSize: 12, marginTop: 4 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: '#fff', fontSize: 16, marginTop: 12, fontWeight: '600' },
  emptySubText: { color: '#888', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1a1a1a', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 20, borderWidth: 1, borderColor: '#1DB954' },
  retryBtnText: { color: '#1DB954', fontSize: 14, fontWeight: '600' },
  resultsContainer: { paddingHorizontal: 16 },
  resultsActions: { marginBottom: 12 },
  resultsCount: { fontSize: 14, color: '#888', marginBottom: 8 },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  actionBtnText: { fontSize: 12, color: '#1DB954', fontWeight: '600' },
  playAllBtn: { backgroundColor: '#1DB954' },
  songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  songRowActive: { backgroundColor: '#0d1f0d', borderRadius: 8, paddingHorizontal: 8 },
  songImageContainer: { position: 'relative' },
  songImage: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#1a1a1a' },
  songOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 14, color: '#fff', fontWeight: '600' },
  songTitleActive: { color: '#1DB954' },
  songArtist: { fontSize: 12, color: '#888', marginTop: 2 },
  songActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  downloadBtn: { padding: 8 },
  songAddBtn: { padding: 8 },
  downloadProgress: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  downloadProgressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(29,185,84,0.2)', borderRadius: 2 },
  downloadProgressFill: { height: '100%', backgroundColor: '#1DB954', borderRadius: 2 },
  downloadProgressText: { fontSize: 10, color: '#1DB954', width: 30 },
  downloadedBadge: { fontSize: 10, color: '#1DB954', marginTop: 2 },
  loadMoreBtn: { marginTop: 16, paddingVertical: 12, backgroundColor: '#1a1a1a', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#1DB954' },
  loadMoreText: { fontSize: 14, color: '#1DB954', fontWeight: '600' },
  noMoreText: { textAlign: 'center', fontSize: 12, color: '#555', marginTop: 16, marginBottom: 8 },
  resultsSubTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  artistsResultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  artistResultItem: { width: (width - 56) / 3 - 8, alignItems: 'center' },
  artistResultImage: { width: '100%', aspectRatio: 1, borderRadius: 999, backgroundColor: '#1a1a1a', marginBottom: 6 },
  artistResultName: { fontSize: 12, color: '#ccc', textAlign: 'center' },
  albumHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { fontSize: 14, color: '#1DB954' },
  playAllSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  playAllSmallText: { fontSize: 12, color: '#1DB954', fontWeight: '600' },
  albumNameTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  albumSongCount: { fontSize: 12, color: '#888', marginBottom: 12 },
  albumsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  albumGridItem: { width: (width - 56) / 3 - 8 },
  albumGridImage: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#1a1a1a', marginBottom: 6 },
  albumGridTitle: { fontSize: 12, color: '#ccc', fontWeight: '600' },
  albumGridArtist: { fontSize: 10, color: '#888' },
});
