import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFollowedArtists } from '../hooks/useFollowedArtists';
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
  const { artists, loading: loadingFollowed, followArtist, unfollowArtist, isFollowing } = useFollowedArtists();
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'browse' | 'following'>('browse');

  useEffect(() => {
    if (searchQuery.trim()) {
      searchArtists(searchQuery);
    }
  }, [searchQuery]);

  const searchArtists = async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(query)}&page=1&limit=30`);
      if (res.ok) {
        const data = await res.json();
        const results = data.data?.results || [];
        const artistMap = new Map<string, Artist>();
        results.forEach((song: any) => {
          // Extract artist name from primaryArtists or artists array
          let artistName = song.primaryArtists || '';
          if (!artistName && song.artists && song.artists.length > 0) {
            artistName = song.artists.map((a: any) => a.name).join(', ');
          }
          if (!artistName) artistName = 'Unknown';
          
          // Get artist image from song's image as fallback
          let artistImage = '';
          if (song.artists && song.artists.length > 0 && song.artists[0].image) {
            const images = song.artists[0].image;
            artistImage = images.find((img: any) => img.quality === '500x500')?.link ||
                          images[images.length - 1]?.link || '';
          }
          // Fallback to song image if no artist image
          if (!artistImage && song.image) {
            const songImages = song.image;
            artistImage = songImages.find((img: any) => img.quality === '500x500')?.link ||
                          songImages[songImages.length - 1]?.link || '';
          }
          
          if (!artistMap.has(artistName)) {
            artistMap.set(artistName, {
              id: artistName,
              name: artistName,
              image: artistImage,
              songCount: 1,
            });
          } else {
            const existing = artistMap.get(artistName)!;
            existing.songCount++;
          }
        });
        setSearchResults(Array.from(artistMap.values()));
      }
    } catch (e) {
      console.error('Failed to search artists:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (artist: Artist) => {
    if (isFollowing(artist.id)) {
      await unfollowArtist(artist.id);
    } else {
      await followArtist(artist.id, artist.name, artist.image);
    }
  };

  const handleArtistPress = (artist: Artist) => {
    (navigation as any).navigate('ArtistDetail', { artistName: artist.name, artistImage: artist.image });
  };

  const renderBrowseItem = ({ item }: { item: Artist }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleArtistPress(item)}
      activeOpacity={0.7}
    >
      <CachedImage source={{ uri: typeof item.image === 'string' && item.image.startsWith('http') ? item.image : 'https://via.placeholder.com/150' }} style={styles.avatar} contentFit="cover" />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>Artist</Text>
      </View>
      <TouchableOpacity
        style={[styles.followBtn, isFollowing(item.id) && styles.followingBtn]}
        onPress={() => handleFollowToggle(item)}
        activeOpacity={0.7}
      >
        <Ionicons name={isFollowing(item.id) ? 'checkmark' : 'add'} size={20} color={isFollowing(item.id) ? '#8b5cf6' : '#fff'} />
        <Text style={[styles.followText, isFollowing(item.id) && styles.followingText]}>
          {isFollowing(item.id) ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFollowingItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleArtistPress({ id: item.artistId, name: item.name, image: item.image || '', songCount: 0 })}
      activeOpacity={0.7}
    >
      <CachedImage source={{ uri: typeof item.image === 'string' && item.image.startsWith('http') ? item.image : 'https://via.placeholder.com/150' }} style={styles.avatar} contentFit="cover" />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>Followed</Text>
      </View>
      <TouchableOpacity
        style={styles.unfollowBtn}
        onPress={() => unfollowArtist(item.artistId)}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={20} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const displayList = activeTab === 'following' ? artists : searchResults;

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

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>Browse</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
            Following ({artists.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading || loadingFollowed ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          data={displayList as Artist[]}
          keyExtractor={(item) => item.id || (item as any).artistId}
          renderItem={activeTab === 'following' ? renderFollowingItem : renderBrowseItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>
                {activeTab === 'following' ? 'No followed artists' : 'No artists found'}
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
  activeTab: { backgroundColor: '#8b5cf6' },
  tabText: { fontSize: 14, color: '#888', fontWeight: '600' },
  activeTabText: { color: '#fff' },
  listContent: { paddingBottom: 140, paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#1a1a1a', borderRadius: 16, marginBottom: 12, gap: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#2a2a2a' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, color: '#fff', fontWeight: '600', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#888' },
  followBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#8b5cf6', gap: 4 },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#8b5cf6' },
  followText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  followingText: { color: '#8b5cf6' },
  unfollowBtn: { padding: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#888', marginTop: 12 },
});
