import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useLikedSongsContext } from '../context/LikedSongsContext';
import { useDownloadsContext } from '../context/DownloadsContext';

// Helper to navigate to root stack screens
const navigateToScreen = (navigation: any, screenName: string) => {
  let nav = navigation;
  while (nav) {
    try {
      nav.navigate(screenName);
      return;
    } catch {
      nav = nav.getParent?.();
    }
  }
};

export const LibraryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { likedSongs } = useLikedSongsContext();
  const { downloads } = useDownloadsContext();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Library</Text>
        </View>

        {/* Liked Songs Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateToScreen(navigation, 'LikedSongs')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#1DB954', '#1ed760']}
            style={styles.cardIcon}
          >
            <Ionicons name="heart" size={32} color="#fff" />
          </LinearGradient>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Liked Songs</Text>
            <Text style={styles.cardSubtitle}>{likedSongs.length} songs</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#555" />
        </TouchableOpacity>

        {/* Downloads Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateToScreen(navigation, 'Downloads')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#3b82f6', '#60a5fa']}
            style={styles.cardIcon}
          >
            <Ionicons name="download" size={32} color="#fff" />
          </LinearGradient>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Downloads</Text>
            <Text style={styles.cardSubtitle}>{downloads.length} songs</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#555" />
        </TouchableOpacity>

        {/* Playlists Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateToScreen(navigation, 'Playlists')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#8b5cf6', '#a78bfa']}
            style={styles.cardIcon}
          >
            <Ionicons name="musical-notes" size={32} color="#fff" />
          </LinearGradient>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Playlists</Text>
            <Text style={styles.cardSubtitle}>Create & manage playlists</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#555" />
        </TouchableOpacity>

        {/* Artists Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateToScreen(navigation, 'Artists')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#ec4899', '#f472b6']}
            style={styles.cardIcon}
          >
            <Ionicons name="mic" size={32} color="#fff" />
          </LinearGradient>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Artists</Text>
            <Text style={styles.cardSubtitle}>Browse your artists</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#555" />
        </TouchableOpacity>

        {/* Albums Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateToScreen(navigation, 'Albums')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#f59e0b', '#fbbf24']}
            style={styles.cardIcon}
          >
            <Ionicons name="disc" size={32} color="#fff" />
          </LinearGradient>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Albums</Text>
            <Text style={styles.cardSubtitle}>Browse your albums</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#555" />
        </TouchableOpacity>

        {/* Profile Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateToScreen(navigation, 'Profile')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#6366f1', '#818cf8']}
            style={styles.cardIcon}
          >
            <Ionicons name="person" size={32} color="#fff" />
          </LinearGradient>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Profile</Text>
            <Text style={styles.cardSubtitle}>Account & settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#555" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollContent: { paddingBottom: 140 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { fontSize: 32, color: '#fff', fontWeight: '900' },
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 16, padding: 16, backgroundColor: '#1a1a1a', borderRadius: 16, gap: 16 },
  cardIcon: { width: 64, height: 64, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#1DB954', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 18, color: '#fff', fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#888' },
  section: { paddingHorizontal: 20, marginTop: 32 },
  sectionTitle: { fontSize: 22, color: '#fff', fontWeight: '800', marginBottom: 16 },
  emptyPlaylists: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#1a1a1a', borderRadius: 16 },
  emptyText: { fontSize: 16, color: '#fff', fontWeight: '600', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#888', marginTop: 4 },
});
