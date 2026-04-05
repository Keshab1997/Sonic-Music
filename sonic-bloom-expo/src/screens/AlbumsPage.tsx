import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSavedAlbums } from '../hooks/useSavedAlbums';
import { CachedImage } from '../components/CachedImage';
import { API_BASE } from '../data/constants';

interface Album {
  id: string;
  name: string;
  cover: string;
  artist: string;
  year: number;
  songCount: number;
  albumId?: string;
}

export const AlbumsPage: React.FC = () => {
  const navigation = useNavigation();
  const { albums, loading: loadingSaved, saveAlbum, unsaveAlbum, isSaved } = useSavedAlbums();
  const [searchResults, setSearchResults] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'browse' | 'saved'>('browse');

  useEffect(() => {
    if (searchQuery.trim()) {
      searchAlbums(searchQuery);
    }
  }, [searchQuery]);

  const searchAlbums = async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search/albums?query=${encodeURIComponent(query)}&page=1&limit=30`);
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
        setSearchResults(albumList);
      }
    } catch (e) {
      console.error('Failed to search albums:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToggle = async (album: Album) => {
    if (isSaved(album.id)) {
      await unsaveAlbum(album.id);
    } else {
      await saveAlbum(album.id, album.name, album.artist, album.cover, album.year);
    }
  };

  const handleAlbumPress = (album: Album) => {
    (navigation as any).navigate('AlbumDetail', { 
      albumId: album.id, 
      albumName: album.name, 
      albumCover: album.cover,
      albumArtist: album.artist 
    });
  };

  const renderBrowseItem = ({ item }: { item: Album }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleAlbumPress(item)}
      activeOpacity={0.7}
    >
      <CachedImage source={{ uri: typeof item.cover === 'string' && item.cover.startsWith('http') ? item.cover : 'https://via.placeholder.com/150' }} style={styles.cover} contentFit="cover" />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardArtist} numberOfLines={1}>{item.artist}</Text>
        <Text style={styles.cardYear}>{item.year} • {item.songCount} songs</Text>
      </View>
      <TouchableOpacity
        style={[styles.saveBtn, isSaved(item.id) && styles.savedBtn]}
        onPress={(e) => { e.stopPropagation(); handleSaveToggle(item); }}
        activeOpacity={0.7}
      >
        <Ionicons name={isSaved(item.id) ? 'bookmark' : 'bookmark-outline'} size={20} color={isSaved(item.id) ? '#f59e0b' : '#fff'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSavedItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleAlbumPress({ id: item.albumId, name: item.name, cover: item.cover || '', artist: item.artist, year: item.year || 0, songCount: 0 })}
      activeOpacity={0.7}
    >
      <CachedImage source={{ uri: typeof item.cover === 'string' && item.cover.startsWith('http') ? item.cover : 'https://via.placeholder.com/150' }} style={styles.cover} contentFit="cover" />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardArtist} numberOfLines={1}>{item.artist}</Text>
        <Text style={styles.cardYear}>Saved</Text>
      </View>
      <TouchableOpacity
        style={styles.unsaveBtn}
        onPress={(e) => { e.stopPropagation(); unsaveAlbum(item.albumId); }}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={20} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const displayList = activeTab === 'saved' ? albums : searchResults;

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

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>Browse</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
          onPress={() => setActiveTab('saved')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>
            Saved ({albums.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading || loadingSaved ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      ) : (
        <FlatList
          data={displayList as Album[]}
          keyExtractor={(item) => item.id || (item as any).albumId}
          renderItem={activeTab === 'saved' ? renderSavedItem : renderBrowseItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="disc-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>
                {activeTab === 'saved' ? 'No saved albums' : 'No albums found'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { fontSize: 32, color: '#fff', fontWeight: '900' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1a1a1a', borderRadius: 12, gap: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 12 },
  tab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a1a1a' },
  activeTab: { backgroundColor: '#f59e0b' },
  tabText: { fontSize: 14, color: '#888', fontWeight: '600' },
  activeTabText: { color: '#fff' },
  listContent: { paddingBottom: 140, paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#1a1a1a', borderRadius: 16, marginBottom: 12, gap: 16 },
  cover: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#2a2a2a' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, color: '#fff', fontWeight: '600', marginBottom: 4 },
  cardArtist: { fontSize: 13, color: '#888', marginBottom: 2 },
  cardYear: { fontSize: 12, color: '#666' },
  saveBtn: { padding: 8 },
  savedBtn: { backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 20 },
  unsaveBtn: { padding: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#888', marginTop: 12 },
});
