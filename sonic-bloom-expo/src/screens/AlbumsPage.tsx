import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { CachedImage } from '../components/CachedImage';
import { API_BASE } from '../data/constants';

interface Album {
  id: string;
  name: string;
  cover: string;
  artist: string;
  year: number;
  songCount: number;
}

export const AlbumsPage: React.FC = () => {
  const navigation = useNavigation();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search/albums?query=latest&page=1&limit=50`);
      if (res.ok) {
        const data = await res.json();
        const results = data.data?.results || [];
        const albumList: Album[] = results.map((album: any) => ({
          id: album.id || album.albumid || String(Math.random()),
          name: album.name || album.album || 'Unknown Album',
          cover: album.image || album.cover || '',
          artist: album.artist || 'Unknown Artist',
          year: album.year || new Date().getFullYear(),
          songCount: album.song_count || 0,
        }));
        setAlbums(albumList);
      }
    } catch (e) {
      console.error('Failed to fetch albums:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlbums = searchQuery.trim()
    ? albums.filter(a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : albums;

  const handleAlbumPress = (album: Album) => {
    (navigation as any).navigate('AlbumDetail', { 
      albumId: album.id, 
      albumName: album.name, 
      albumCover: album.cover,
      albumArtist: album.artist 
    });
  };

  const renderItem = ({ item }: { item: Album }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleAlbumPress(item)}
      activeOpacity={0.7}
    >
      <CachedImage
        source={{ uri: item.cover || 'https://via.placeholder.com/150' }}
        style={styles.cover}
        contentFit="cover"
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardArtist} numberOfLines={1}>{item.artist}</Text>
        <Text style={styles.cardYear}>{item.year} • {item.songCount} songs</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#555" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Albums</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Albums</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#555" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search albums..."
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredAlbums}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="disc-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>No albums found</Text>
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
  cover: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#2a2a2a' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, color: '#fff', fontWeight: '600', marginBottom: 4 },
  cardArtist: { fontSize: 13, color: '#888', marginBottom: 2 },
  cardYear: { fontSize: 12, color: '#666' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#888', marginTop: 12 },
});
