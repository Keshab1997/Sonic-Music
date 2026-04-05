import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { CachedImage } from '../components/CachedImage';
import { API_BASE } from '../data/constants';

interface Artist {
  id: string;
  name: string;
  image: string;
  songCount: number;
}

export const ArtistsPage: React.FC = () => {
  const navigation = useNavigation();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    setLoading(true);
    try {
      // Fetch popular artists from the API
      const res = await fetch(`${API_BASE}/search/songs?query=top artists&page=1&limit=50`);
      if (res.ok) {
        const data = await res.json();
        const results = data.data?.results || [];
        // Extract unique artists
        const artistMap = new Map<string, Artist>();
        results.forEach((song: any) => {
          const artistName = song.artist || 'Unknown';
          if (!artistMap.has(artistName)) {
            artistMap.set(artistName, {
              id: artistName,
              name: artistName,
              image: song.image || '',
              songCount: 1,
            });
          } else {
            const existing = artistMap.get(artistName)!;
            existing.songCount++;
          }
        });
        setArtists(Array.from(artistMap.values()).slice(0, 30));
      }
    } catch (e) {
      console.error('Failed to fetch artists:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredArtists = searchQuery.trim()
    ? artists.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : artists;

  const handleArtistPress = (artist: Artist) => {
    (navigation as any).navigate('ArtistDetail', { artistName: artist.name, artistImage: artist.image });
  };

  const renderItem = ({ item }: { item: Artist }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleArtistPress(item)}
      activeOpacity={0.7}
    >
      <CachedImage
        source={{ uri: item.image || 'https://via.placeholder.com/150' }}
        style={styles.avatar}
        contentFit="cover"
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>Artist</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#555" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Artists</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Artists</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#555" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search artists..."
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredArtists}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="person-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>No artists found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { fontSize: 32, color: '#fff', fontWeight: '900' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1a1a1a', borderRadius: 12, gap: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16 },
  listContent: { paddingBottom: 140, paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#1a1a1a', borderRadius: 16, marginBottom: 12, gap: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#2a2a2a' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, color: '#fff', fontWeight: '600', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#888' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#888', marginTop: 12 },
});
