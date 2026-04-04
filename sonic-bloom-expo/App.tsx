import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, Image, SafeAreaView, TouchableOpacity, FlatList, Dimensions, TextInput } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlayerProvider, usePlayer } from "./src/context/PlayerContext";
import { AuthProvider } from "./src/context/AuthContext";
import { useState, useEffect, useCallback } from 'react';
import { Track } from './src/data/playlist';

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

// Parse song from API response
const parseSong = (s: any, offset: number): Track | null => {
  if (!s.downloadUrl?.length) return null;
  const url96 = s.downloadUrl?.find((d: any) => d.quality === "96kbps")?.link;
  const url160 = s.downloadUrl?.find((d: any) => d.quality === "160kbps")?.link;
  const url320 = s.downloadUrl?.find((d: any) => d.quality === "320kbps")?.link;
  const bestUrl = url160 || url96 || s.downloadUrl?.[0]?.link || "";
  if (!bestUrl) return null;
  return {
    id: offset,
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

// Home Screen with all sections - each section has its own state
const HomeScreen = ({ navigation }: any) => {
  const { playTrackList, currentTrack, isPlaying, togglePlay, next, prev } = usePlayer();
  
  // Main sections
  const [trending, setTrending] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [bengaliHits, setBengaliHits] = useState<Track[]>([]);
  const [forYou, setForYou] = useState<Track[]>([]);
  const [songOfDay, setSongOfDay] = useState<Track | null>(null);
  const [timeMachine70s, setTimeMachine70s] = useState<Track[]>([]);
  const [timeMachine90s, setTimeMachine90s] = useState<Track[]>([]);
  const [timeMachine2000s, setTimeMachine2000s] = useState<Track[]>([]);
  
  // Dynamic sections (loaded on tap)
  const [moodSongs, setMoodSongs] = useState<Track[]>([]);
  const [moodLoading, setMoodLoading] = useState(false);
  const [artistSongs, setArtistSongs] = useState<Track[]>([]);
  const [artistLoading, setArtistLoading] = useState(false);
  const [labelSongs, setLabelSongs] = useState<Track[]>([]);
  const [labelLoading, setLabelLoading] = useState(false);
  const [decadeSongs, setDecadeSongs] = useState<Track[]>([]);
  const [decadeLoading, setDecadeLoading] = useState(false);
  const [quickSongs, setQuickSongs] = useState<Track[]>([]);
  const [quickLoading, setQuickLoading] = useState(false);
  
  const [loading, setLoading] = useState(true);

  const fetchSongs = useCallback(async (query: string, setter: (t: Track[]) => void, langFilter?: string) => {
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(query)}&page=1&limit=15`);
      if (!res.ok) return;
      const data = await res.json();
      let songs = data.data?.results?.filter((s: any) => s.downloadUrl?.length > 0) || [];
      if (langFilter) songs = songs.filter((s: any) => s.language === langFilter);
      const tracks: Track[] = songs.map((s: any, i: number) => parseSong(s, i)).filter(Boolean);
      setter(tracks.slice(0, 10));
    } catch { /* ignore */ }
  }, []);

  const fetchSongsWithLoading = useCallback(async (query: string, setter: (t: Track[]) => void, setLoading: (l: boolean) => void, langFilter?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(query)}&page=1&limit=15`);
      if (!res.ok) return;
      const data = await res.json();
      let songs = data.data?.results?.filter((s: any) => s.downloadUrl?.length > 0) || [];
      if (langFilter) songs = songs.filter((s: any) => s.language === langFilter);
      const tracks: Track[] = songs.map((s: any, i: number) => parseSong(s, i)).filter(Boolean);
      setter(tracks.slice(0, 10));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchSingleSong = useCallback(async (query: string, setter: (t: Track | null) => void) => {
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(query)}&page=1&limit=5`);
      if (!res.ok) return;
      const data = await res.json();
      const songs = data.data?.results?.filter((s: any) => s.downloadUrl?.length > 0) || [];
      if (songs.length > 0) {
        const track = parseSong(songs[0], 0);
        if (track) setter(track);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    const today = new Date();
    const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const dayQueries = ["bollywood hits", "hindi romantic", "bengali modern", "arijit singh", "shreya ghoshal"];
    const dayQuery = dayQueries[daySeed % dayQueries.length];
    
    Promise.all([
      fetchSongs("latest bollywood hits", setTrending),
      fetchSongs("new hindi songs 2025", setNewReleases),
      fetchSongs("bengali top hits", setBengaliHits, "bengali"),
      fetchSongs("arijit singh best songs", setForYou),
      fetchSingleSong(dayQuery, setSongOfDay),
      fetchSongs("old hindi songs 1970", setTimeMachine70s),
      fetchSongs("hindi songs 1990", setTimeMachine90s),
      fetchSongs("hindi songs 2000", setTimeMachine2000s),
    ]).finally(() => setLoading(false));
  }, [fetchSongs, fetchSingleSong]);

  const allSongs = [...trending, ...newReleases, ...bengaliHits, ...forYou, ...moodSongs, ...artistSongs, ...labelSongs, ...decadeSongs, ...quickSongs];

  const renderSongCard = ({ item }: { item: Track }) => {
    const isCurrentTrack = currentTrack?.id === item.id;
    const songIndex = allSongs.findIndex(s => s.id === item.id);
    const songsToPlay = allSongs.length > 0 ? allSongs : [item];
    const indexToPlay = songIndex >= 0 ? songIndex : 0;
    return (
      <TouchableOpacity
        style={[styles.card, isCurrentTrack && styles.cardActive]}
        activeOpacity={0.8}
        onPress={() => playTrackList(songsToPlay, indexToPlay)}
      >
        <Image source={{ uri: item.cover }} style={styles.cardImage} />
        {isCurrentTrack && isPlaying && (
          <View style={styles.playingOverlay}>
            <Text style={styles.playingText}>▶</Text>
          </View>
        )}
        <Text style={[styles.cardTitle, isCurrentTrack && styles.cardTitleActive]} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardArtist} numberOfLines={1}>{item.artist}</Text>
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, emoji: string, data: Track[], sectionLoading: boolean) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{emoji} {title}</Text>
      {sectionLoading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : data.length > 0 ? (
        <FlatList
          data={data}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderSongCard}
          contentContainerStyle={styles.horizontalList}
        />
      ) : (
        <Text style={styles.emptyText}>Tap a category above to load songs</Text>
      )}
    </View>
  );

  // Mood categories
  const moods = [
    { name: "Bollywood", emoji: "🎬", query: "bollywood hits" },
    { name: "Romantic", emoji: "❤️", query: "romantic songs" },
    { name: "Sad", emoji: "😢", query: "sad songs" },
    { name: "Party", emoji: "🎉", query: "party songs" },
    { name: "Devotional", emoji: "🙏", query: "devotional bhajan" },
    { name: "Bengali", emoji: "🎵", query: "bengali songs" },
    { name: "Retro", emoji: "📻", query: "old classic songs" },
    { name: "Workout", emoji: "💪", query: "workout songs" },
    { name: "Chill", emoji: "🌊", query: "chill songs" },
    { name: "Rap", emoji: "🎤", query: "hindi rap" },
  ];

  // Time Machine decades
  const decades = [
    { name: "70s", subtitle: "Golden Era", query: "old hindi songs 1970", color: "#b45309" },
    { name: "80s", subtitle: "Retro Magic", query: "hindi songs 1980", color: "#7c3aed" },
    { name: "90s", subtitle: "Nostalgia", query: "hindi songs 1990", color: "#2563eb" },
    { name: "2000s", subtitle: "Millennium", query: "hindi songs 2000", color: "#059669" },
    { name: "2010s", subtitle: "Modern Era", query: "hindi songs 2010", color: "#dc2626" },
    { name: "2020s", subtitle: "Now", query: "hindi songs 2024", color: "#d97706" },
  ];

  // Top Artists
  const hindiArtists = [
    { name: "Arijit Singh", query: "Arijit Singh hits" },
    { name: "Shreya Ghoshal", query: "Shreya Ghoshal songs" },
    { name: "A.R. Rahman", query: "AR Rahman best" },
    { name: "Kishore Kumar", query: "Kishore Kumar hits" },
    { name: "Atif Aslam", query: "Atif Aslam hits" },
    { name: "Sonu Nigam", query: "Sonu Nigam hits" },
  ];

  const bengaliArtists = [
    { name: "Anupam Roy", query: "Anupam Roy bengali" },
    { name: "Rupankar", query: "Rupankar bengali" },
    { name: "Nachiketa", query: "Nachiketa bengali" },
    { name: "Arijit (Bangla)", query: "Arijit Singh bengali" },
  ];

  // Music Labels
  const labels = [
    { name: "T-Series", query: "T-Series songs", color: "#dc2626" },
    { name: "Zee Music", query: "Zee Music Company", color: "#2563eb" },
    { name: "Sony Music", query: "Sony Music India", color: "#059669" },
    { name: "Saregama", query: "Saregama classics", color: "#d97706" },
    { name: "Tips", query: "Tips Official", color: "#7c3aed" },
    { name: "YRF", query: "Yash Raj Music", color: "#be185d" },
  ];

  // Quick picks
  const quickPlayButtons = [
    { title: "Arijit Singh Top 20", query: "Arijit Singh top hits", color: "#1a1a2e" },
    { title: "Bengali Modern Songs", query: "modern bengali songs", color: "#1a2e1a" },
    { title: "Bollywood Blockbusters", query: "bollywood blockbusters", color: "#2e1a1a" },
    { title: "Lofi & Chill", query: "lofi hindi chill", color: "#1a1a2e" },
  ];

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sonic Bloom</Text>
          <Text style={styles.headerSubtitle}>Welcome Back!</Text>
        </View>

        {/* Song of the Day */}
        {songOfDay && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Song of the Day</Text>
            <TouchableOpacity
              style={styles.songOfDayCard}
              activeOpacity={0.8}
              onPress={() => playTrackList([songOfDay], 0)}
            >
              <Image source={{ uri: songOfDay.cover }} style={styles.songOfDayImage} />
              <View style={styles.songOfDayInfo}>
                <Text style={styles.songOfDayTitle} numberOfLines={1}>{songOfDay.title}</Text>
                <Text style={styles.songOfDayArtist} numberOfLines={1}>{songOfDay.artist}</Text>
                <Text style={styles.songOfDayDuration}>{formatDuration(songOfDay.duration)}</Text>
              </View>
              <Ionicons name="play-circle" size={40} color="#1DB954" />
            </TouchableOpacity>
          </View>
        )}

        {renderSection("Trending Now", "🔥", trending, loading)}
        {renderSection("New Releases", "🎵", newReleases, loading)}
        {renderSection("Bangla Hits", "🎶", bengaliHits, loading)}
        {renderSection("For You", "✨", forYou, loading)}
        
        {/* Mood Categories - tap to load songs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎭 Browse by Mood</Text>
          <View style={styles.moodGrid}>
            {moods.map((mood) => (
              <TouchableOpacity
                key={mood.name}
                style={styles.moodButton}
                activeOpacity={0.8}
                onPress={() => fetchSongsWithLoading(mood.query, setMoodSongs, setMoodLoading)}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={styles.moodName}>{mood.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {renderSection("Mood Songs", "🎵", moodSongs, moodLoading)}

        {/* Time Machine - tap to load songs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕰️ Time Machine</Text>
          <View style={styles.decadeGrid}>
            {decades.map((decade) => (
              <TouchableOpacity
                key={decade.name}
                style={[styles.decadeButton, { backgroundColor: decade.color }]}
                activeOpacity={0.8}
                onPress={() => fetchSongsWithLoading(decade.query, setDecadeSongs, setDecadeLoading)}
              >
                <Text style={styles.decadeName}>{decade.name}</Text>
                <Text style={styles.decadeSubtitle}>{decade.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {renderSection("Decade Songs", "🎶", decadeSongs, decadeLoading)}

        {/* Top Hindi Artists - tap to load songs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎤 Hindi Artists</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistList}>
            {hindiArtists.map((artist) => (
              <TouchableOpacity
                key={artist.name}
                style={styles.artistButton}
                activeOpacity={0.8}
                onPress={() => fetchSongsWithLoading(artist.query, setArtistSongs, setArtistLoading)}
              >
                <View style={styles.artistImage}>
                  <Ionicons name="person" size={32} color="#888" />
                </View>
                <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Bengali Artists - tap to load songs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎵 Bengali Artists</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistList}>
            {bengaliArtists.map((artist) => (
              <TouchableOpacity
                key={artist.name}
                style={styles.artistButton}
                activeOpacity={0.8}
                onPress={() => fetchSongsWithLoading(artist.query, setArtistSongs, setArtistLoading)}
              >
                <View style={styles.artistImage}>
                  <Ionicons name="person" size={32} color="#888" />
                </View>
                <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {renderSection("Artist Songs", "🎤", artistSongs, artistLoading)}

        {/* Music Labels - tap to load songs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏢 Music Labels</Text>
          <View style={styles.labelGrid}>
            {labels.map((label) => (
              <TouchableOpacity
                key={label.name}
                style={[styles.labelButton, { backgroundColor: label.color }]}
                activeOpacity={0.8}
                onPress={() => fetchSongsWithLoading(label.query, setLabelSongs, setLabelLoading)}
              >
                <Text style={styles.labelName}>{label.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {renderSection("Label Songs", "🎵", labelSongs, labelLoading)}

        {/* Quick Play Buttons - tap to load songs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Picks</Text>
          <View style={styles.quickPicksGrid}>
            {quickPlayButtons.map((pick) => (
              <TouchableOpacity
                key={pick.title}
                style={[styles.quickPickButton, { backgroundColor: pick.color }]}
                activeOpacity={0.8}
                onPress={() => fetchSongsWithLoading(pick.query, setQuickSongs, setQuickLoading)}
              >
                <Ionicons name="musical-notes" size={20} color="#1DB954" />
                <Text style={styles.quickPickTitle}>{pick.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {renderSection("Quick Songs", "🎶", quickSongs, quickLoading)}

        {/* Pre-loaded Time Machine Sections */}
        {renderSection("70s Golden Era", "📻", timeMachine70s, loading)}
        {renderSection("90s Nostalgia", "🎶", timeMachine90s, loading)}
        {renderSection("2000s Hits", "🎵", timeMachine2000s, loading)}
      </ScrollView>
      
      {/* Mini Player at bottom */}
      {currentTrack && (
        <View style={styles.miniPlayer}>
          <Image source={{ uri: currentTrack.cover }} style={styles.miniPlayerImage} />
          <View style={styles.miniPlayerInfo}>
            <Text style={styles.miniPlayerTitle} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.miniPlayerArtist} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
          <View style={styles.miniPlayerControls}>
            <TouchableOpacity onPress={prev} style={styles.miniPlayerButton}>
              <Ionicons name="play-skip-back" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlay} style={styles.miniPlayerButton}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#1DB954" />
            </TouchableOpacity>
            <TouchableOpacity onPress={next} style={styles.miniPlayerButton}>
              <Ionicons name="play-skip-forward" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// Search Screen
const SearchScreen = () => {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(q)}&page=1&limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      const songs = data.data?.results?.filter((s: any) => s.downloadUrl?.length > 0) || [];
      const tracks: Track[] = songs.map((s: any, i: number) => parseSong(s, i)).filter(Boolean);
      setResults(tracks);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search songs, artists, albums..."
          placeholderTextColor="#666"
          onSubmitEditing={(e) => search(e.nativeEvent.text)}
          returnKeyType="search"
        />
      </View>
      {loading && <Text style={styles.loadingText}>Searching...</Text>}
      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const isCurrentTrack = currentTrack?.id === item.id;
            return (
              <TouchableOpacity 
                style={[styles.resultItem, isCurrentTrack && styles.resultItemActive]}
                activeOpacity={0.8}
                onPress={() => playTrack(item)}
              >
                <Image source={{ uri: item.cover }} style={styles.resultImage} />
                <View style={styles.resultInfo}>
                  <Text style={[styles.resultTitle, isCurrentTrack && styles.resultTitleActive]} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.resultArtist} numberOfLines={1}>{item.artist}</Text>
                </View>
                {isCurrentTrack && (
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#1DB954" />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
      {!loading && results.length === 0 && query && (
        <Text style={styles.emptyText}>No results found</Text>
      )}
      {!loading && !query && (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color="#333" />
          <Text style={styles.emptyText}>Search for songs to start playing</Text>
        </View>
      )}
    </View>
  );
};

// Library Screen
const LibraryScreen = () => (
  <View style={styles.screen}>
    <Ionicons name="library" size={64} color="#1DB954" />
    <Text style={styles.title}>Your Library</Text>
    <Text style={styles.subtitle}>Liked songs and playlists will appear here</Text>
  </View>
);

// Profile Screen
const ProfileScreen = () => (
  <View style={styles.screen}>
    <Ionicons name="person-circle" size={64} color="#1DB954" />
    <Text style={styles.title}>Profile</Text>
    <Text style={styles.subtitle}>Sign in to sync your music across devices</Text>
  </View>
);

const HomeTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'home';
        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Search') {
          iconName = focused ? 'search' : 'search-outline';
        } else if (route.name === 'Library') {
          iconName = focused ? 'library' : 'library-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#1DB954',
      tabBarInactiveTintColor: '#888',
      tabBarStyle: {
        backgroundColor: '#0a0a0a',
        borderTopColor: '#1a1a1a',
        borderTopWidth: 1,
        paddingBottom: 8,
        paddingTop: 8,
        height: 60,
      },
      headerStyle: {
        backgroundColor: '#0a0a0a',
      },
      headerTintColor: '#fff',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Search" component={SearchScreen} />
    <Tab.Screen name="Library" component={LibraryScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlayerProvider>
          <NavigationContainer>
            <SafeAreaView style={styles.safeArea}>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1DB954',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.7,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  horizontalList: {
    paddingRight: 16,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
  cardImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  cardArtist: {
    fontSize: 12,
    color: '#888',
  },
  screen: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1DB954',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
    paddingVertical: 0,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  resultImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  resultArtist: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  cardActive: {
    opacity: 0.8,
  },
  cardTitleActive: {
    color: '#1DB954',
  },
  playingOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(29, 185, 84, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingText: {
    color: '#fff',
    fontSize: 12,
  },
  miniPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  miniPlayerImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
  },
  miniPlayerInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  miniPlayerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniPlayerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  miniPlayerArtist: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  miniPlayerButton: {
    padding: 8,
  },
  resultItemActive: {
    backgroundColor: '#1a2a1a',
    borderColor: '#1DB954',
    borderWidth: 1,
  },
  resultTitleActive: {
    color: '#1DB954',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodButton: {
    width: '30%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodName: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
  quickPicksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickPickButton: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickPickTitle: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
  songOfDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  songOfDayImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  songOfDayInfo: {
    flex: 1,
  },
  songOfDayTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  songOfDayArtist: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  songOfDayDuration: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  decadeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  decadeButton: {
    width: '30%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decadeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  decadeSubtitle: {
    fontSize: 10,
    color: '#ffffffcc',
    marginTop: 2,
  },
  artistList: {
    gap: 12,
    paddingRight: 16,
  },
  artistButton: {
    width: 80,
    alignItems: 'center',
    gap: 4,
  },
  artistImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistName: {
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
  },
  labelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labelButton: {
    width: '30%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
