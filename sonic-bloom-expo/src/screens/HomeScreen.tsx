import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '../data/playlist';
import { usePlayer } from '../context/PlayerContext';
import { RECENTLY_PLAYED_KEY } from '../data/constants';
import { fetchJioSaavn } from '../lib/api';
import { useOfflineCache } from '../hooks/useOfflineCache';
import { HomeCarousel } from './home/HomeCarousel';
import { HomeQuickPicks } from './home/HomeQuickPicks';
import { HomeSections } from './home/HomeSections';
import { HomeDiscover } from './home/HomeDiscover';
import { HomeContent } from './home/HomeContent';
import { BottomSheetModal } from '../components/BottomSheetModal';

export const HomeScreen: React.FC = () => {
  const { playTrackList, currentTrack, isPlaying, addToQueue } = usePlayer();
  const { saveToCache, cachedData, isOffline } = useOfflineCache();

  // Section tracks
  const [trending, setTrending] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [bengaliHits, setBengaliHits] = useState<Track[]>([]);
  const [forYou, setForYou] = useState<Track[]>([]);
  const [suspense, setSuspense] = useState<Track[]>([]);
  const [ytTrending, setYtTrending] = useState<Track[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);

  // Loading states
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
  const [refreshing, setRefreshing] = useState(false);

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

  // Auto-advance carousel
  useEffect(() => {
    if (trending.length === 0) return;
    // Clear any existing interval before creating a new one
    if (carouselTimer.current) {
      clearInterval(carouselTimer.current);
      carouselTimer.current = null;
    }
    carouselTimer.current = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % Math.min(trending.length, 5));
    }, 5000);
    return () => {
      if (carouselTimer.current) {
        clearInterval(carouselTimer.current);
        carouselTimer.current = null;
      }
    };
  }, [trending.length]);

  // Fetch all data with offline caching - OPTIMIZED with parallel fetching (YouTube removed)
  const fetchAllData = useCallback(async () => {
    try {
      // Fetch all data in parallel for better performance
      const [
        trendingData,
        newReleasesData,
        bengaliHitsData,
        forYouData,
      ] = await Promise.all([
        fetchJioSaavn("latest bollywood hits", 0).finally(() => setLoadingTrending(false)),
        fetchJioSaavn("new hindi songs 2025", 0).finally(() => setLoadingNewReleases(false)),
        fetchJioSaavn("bengali top hits", 0, 15, "bengali").finally(() => setLoadingBengali(false)),
        fetchJioSaavn("bollywood romantic hits", 0).finally(() => setLoadingForYou(false)),
      ]);

      // Update all states at once
      setTrending(trendingData);
      setNewReleases(newReleasesData);
      setBengaliHits(bengaliHitsData);
      setForYou(forYouData);
      setSuspense([]);
      setYtTrending([]);
      setLoadingSuspense(false);
      setLoadingYtTrending(false);

      // Save to offline cache
      await saveToCache({
        trending: trendingData,
        newReleases: newReleasesData,
        bengaliHits: bengaliHitsData,
        forYou: forYouData,
        suspense: [],
        ytTrending: [],
      });
    } catch (error) {
      console.error('Error fetching home data:', error);
    }
  }, [saveToCache]);

  // Initial Data Fetching
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setLoadingTrending(true);
    setLoadingNewReleases(true);
    setLoadingBengali(true);
    setLoadingForYou(true);
    setLoadingSuspense(true);
    setLoadingYtTrending(true);
    fetchAllData();
    setTimeout(() => setRefreshing(false), 2000);
  }, [fetchAllData]);

  // Open bottom sheet with a query
  const openSheet = useCallback(async (title: string, query: string, offset: number, isYoutube = false, langFilter?: string) => {
    setSheetTitle(title);
    setSheetTracks([]);
    setSheetLoading(true);
    setSheetVisible(true);
    const tracks = await fetchJioSaavn(query, offset, 15, langFilter);
    setSheetTracks(tracks);
    setSheetLoading(false);
  }, []);

  // Play a track
  const handlePlay = useCallback((track: Track, allTracks: Track[], index: number) => {
    playTrackList(allTracks, index);
  }, [playTrackList]);

  // Play from bottom sheet
  const handleSheetPlay = useCallback((track: Track, index: number) => {
    playTrackList(sheetTracks, index);
  }, [playTrackList, sheetTracks]);

  // Quick Pick
  const handleQuickPick = useCallback(async (query: string, offset: number) => {
    setLoadingQuickPick(query);
    const tracks = await fetchJioSaavn(query, offset);
    if (tracks.length > 0) playTrackList(tracks, 0);
    setLoadingQuickPick(null);
  }, [playTrackList]);

  // Label play
  const handleLabelPlay = useCallback(async (label: { name: string; query: string; color: string }) => {
    setLoadingLabel(label.name);
    const tracks = await fetchJioSaavn(label.query, 20000 + [{ name: "T-Series" }, { name: "Saregama" }, { name: "Zee Music" }, { name: "Sony Music" }, { name: "YRF Music" }, { name: "Tips" }].findIndex(l => l.name === label.name) * 100);
    if (tracks.length > 0) playTrackList(tracks, 0);
    setLoadingLabel(null);
  }, [playTrackList]);

  // Time greeting quick play
  const handleTimePlay = useCallback(async (query: string) => {
    setLoadingQuickPick(query);
    const tracks = await fetchJioSaavn(query, 30000);
    if (tracks.length > 0) playTrackList(tracks, 0);
    setLoadingQuickPick(null);
  }, [playTrackList]);

  // Clear recently played
  const handleClearRecentlyPlayed = useCallback(() => {
    setRecentlyPlayed([]);
    AsyncStorage.removeItem(RECENTLY_PLAYED_KEY).catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      {/* Offline Indicator */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📡 Showing cached content - Offline mode</Text>
        </View>
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1DB954" />
        }
      >
        {/* Hero Carousel */}
        <HomeCarousel
          songs={trending}
          carouselIndex={carouselIndex}
          onCarouselChange={setCarouselIndex}
          onPlay={handlePlay}
        />

        {/* Quick Picks - Time greeting + Song of the Day */}
        <HomeQuickPicks
          trending={trending}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          loadingQuickPick={loadingQuickPick}
          onTimePlay={handleTimePlay}
          onSongPlay={(song) => handlePlay(song, [song], 0)}
        />

        {/* Main Sections - Trending, New Releases, Recently Played */}
        <HomeSections
          trending={trending}
          newReleases={newReleases}
          recentlyPlayed={recentlyPlayed}
          loadingTrending={loadingTrending}
          loadingNewReleases={loadingNewReleases}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onAddToQueue={addToQueue}
          onViewAll={openSheet}
          onClearRecentlyPlayed={handleClearRecentlyPlayed}
        />

        {/* Discover - Mood, Labels, Eras, Artists */}
        <HomeDiscover
          loadingLabel={loadingLabel}
          onMoodPress={(title, query, offset) => openSheet(title, query, offset)}
          onLabelPlay={handleLabelPlay}
          onArtistPress={(title, query, offset) => openSheet(title, query, offset)}
          onEraPress={(title, query, offset) => openSheet(title, query, offset)}
        />

        {/* Content - Quick Picks */}
        <HomeContent
          suspense={suspense}
          ytTrending={ytTrending}
          loadingSuspense={loadingSuspense}
          loadingYtTrending={loadingYtTrending}
          loadingQuickPick={loadingQuickPick}
          loadingYtPick={loadingYtPick}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onAddToQueue={addToQueue}
          onViewAll={openSheet}
          onQuickPick={handleQuickPick}
          onYtQuickPick={() => {}}
        />
      </ScrollView>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  offlineBanner: { backgroundColor: '#f59e0b', paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
  offlineText: { fontSize: 12, fontWeight: '600', color: '#000' },
  scrollContent: { paddingBottom: 140 },
});
