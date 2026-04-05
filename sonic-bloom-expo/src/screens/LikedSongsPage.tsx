import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '../context/PlayerContext';
import { useLikedSongsContext } from '../context/LikedSongsContext';
import { CachedImage } from '../components/CachedImage';

export const LikedSongsPage: React.FC = () => {
  const { likedSongs, toggleLike, clearAll } = useLikedSongsContext();
  const { playTrackList, currentTrack, isPlaying } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Liked Songs',
      'Are you sure you want to remove all liked songs? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => clearAll() },
      ]
    );
  };

  const handlePlay = (index: number) => {
    const tracks = filteredLikedSongs.map(s => s.track).filter(t => t && t.id);
    if (tracks.length === 0) return;
    playTrackList(tracks, index);
  };

  const handleUnlike = (trackId: string) => {
    const song = likedSongs.find(s => s.track && s.track.id && String(s.track.id) === String(trackId));
    if (song && song.track) {
      toggleLike(song.track);
    }
  };

  const filteredLikedSongs = useMemo(() => {
    if (!searchQuery.trim()) return likedSongs.filter(s => s.track && s.track.id);
    const query = searchQuery.toLowerCase();
    return likedSongs.filter(s => s.track && s.track.id && (
      s.track.title.toLowerCase().includes(query) ||
      s.track.artist.toLowerCase().includes(query) ||
      s.track.album?.toLowerCase().includes(query)
    ));
  }, [likedSongs, searchQuery]);

  const renderItem = ({ item, index }: { item: { track: any; likedAt: number }; index: number }) => {
    if (!item.track || !item.track.id) return null;
    const isCurrentTrack = currentTrack?.id === item.track.id;
    return (
      <TouchableOpacity
        style={[styles.row, isCurrentTrack && styles.rowActive]}
        onPress={() => handlePlay(index)}
        activeOpacity={0.7}
      >
        <CachedImage
          source={{ uri: item.track.cover }}
          style={styles.cover}
          defaultSource={require('../../assets/icon.png')}
        />
        <View style={styles.info}>
          <Text style={[styles.title, isCurrentTrack && styles.titleActive]} numberOfLines={1}>
            {item.track.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>{item.track.artist}</Text>
        </View>
        <TouchableOpacity
          style={styles.likeBtn}
          onPress={() => handleUnlike(String(item.track.id))}
          activeOpacity={0.7}
        >
          <Ionicons name="heart" size={22} color="#1DB954" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (likedSongs.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <LinearGradient
            colors={['#1DB954', '#1ed760']}
            style={styles.emptyIcon}
          >
            <Ionicons name="heart-outline" size={64} color="#fff" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No Liked Songs</Text>
          <Text style={styles.emptyText}>Songs you like will appear here</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1DB954', '#0a0a0a']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Ionicons name="heart" size={48} color="#fff" />
          <Text style={styles.headerTitle}>Liked Songs</Text>
          <Text style={styles.headerCount}>{likedSongs.length} songs</Text>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#555" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search liked songs..."
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.playAllBtn}
          onPress={() => handlePlay(0)}
          activeOpacity={0.7}
        >
          <LinearGradient colors={['#1DB954', '#1ed760']} style={styles.playAllGradient}>
            <Ionicons name="play" size={20} color="#000" />
            <Text style={styles.playAllText}>Play All</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll} activeOpacity={0.7}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Liked Songs List */}
      <FlatList
        data={filteredLikedSongs}
        keyExtractor={(item) => item.track?.id ? String(item.track.id) : Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          searchQuery ? (
            <View style={styles.emptySearch}>
              <Ionicons name="search-outline" size={48} color="#333" />
              <Text style={styles.emptySearchText}>No results for "{searchQuery}"</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24, shadowColor: '#1DB954', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  emptyTitle: { fontSize: 24, color: '#fff', fontWeight: '800', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center' },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 },
  headerContent: { alignItems: 'center' },
  headerTitle: { fontSize: 32, color: '#fff', fontWeight: '900', marginTop: 16 },
  headerCount: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 16, marginBottom: 12, gap: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  actions: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 12 },
  playAllBtn: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  playAllGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  playAllText: { fontSize: 14, color: '#000', fontWeight: '700' },
  clearBtn: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#1a1a1a', borderRadius: 24, justifyContent: 'center' },
  clearText: { fontSize: 14, color: '#ef4444', fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 140 },
  emptySearch: { alignItems: 'center', paddingVertical: 40 },
  emptySearchText: { color: '#888', fontSize: 14, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  rowActive: { backgroundColor: '#0d1f0d', borderRadius: 8, paddingHorizontal: 8 },
  cover: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#1a1a1a' },
  info: { flex: 1 },
  title: { fontSize: 14, color: '#fff', fontWeight: '600' },
  titleActive: { color: '#1DB954' },
  artist: { fontSize: 12, color: '#888', marginTop: 2 },
  likeBtn: { padding: 8 },
});
