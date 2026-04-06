import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { useDownloadsContext } from '../context/DownloadsContext';
import { useDownloads } from '../hooks/useDownloads';
import { CachedImage } from '../components/CachedImage';
import { lightHaptic, mediumHaptic } from '../lib/haptics';

export const DownloadsPage: React.FC = () => {
  const { downloads, deleteTrack, deleteAll } = useDownloadsContext();
  const { getTotalDownloadSize, formatBytes } = useDownloads();
  const { playTrackList, currentTrack, isPlaying, addToQueue } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [totalSize, setTotalSize] = useState('0 Bytes');

  // Calculate total download size
  useEffect(() => {
    const calculateSize = async () => {
      const size = await getTotalDownloadSize();
      setTotalSize(formatBytes(size));
    };
    if (downloads.length > 0) {
      calculateSize();
    } else {
      setTotalSize('0 Bytes');
    }
  }, [downloads.length, getTotalDownloadSize, formatBytes]);

  const handleDelete = (trackId: string) => {
    Alert.alert(
      'Delete Download',
      'Are you sure you want to delete this downloaded song?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteTrack(trackId); mediumHaptic(); } },
      ]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All Downloads',
      'Are you sure you want to delete all downloaded songs? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete All', style: 'destructive', onPress: () => { deleteAll(); mediumHaptic(); } },
      ]
    );
  };

  const handlePlay = (index: number) => {
    const tracks = downloads.map(d => d.track);
    playTrackList(tracks, index);
    mediumHaptic();
  };

  const renderItem = ({ item, index }: { item: { track: any; localUri: string }; index: number }) => {
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
          style={styles.deleteBtn}
          onPress={() => handleDelete(String(item.track.id))}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Filter downloads based on search query
  const filteredDownloads = useMemo(() => {
    if (!searchQuery.trim()) return downloads;
    const query = searchQuery.toLowerCase();
    return downloads.filter(d =>
      d.track.title.toLowerCase().includes(query) ||
      d.track.artist.toLowerCase().includes(query) ||
      d.track.album.toLowerCase().includes(query)
    );
  }, [downloads, searchQuery]);

  if (downloads.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="download-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>No Downloads</Text>
          <Text style={styles.emptyText}>Download songs to listen offline</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Downloads</Text>
          <View style={styles.headerInfo}>
            <View style={styles.infoBadge}>
              <Ionicons name="musical-notes" size={12} color="#1DB954" />
              <Text style={styles.headerCount}>{downloads.length} songs</Text>
            </View>
            <View style={styles.infoBadge}>
              <Ionicons name="folder" size={12} color="#60a5fa" />
              <Text style={styles.headerSize}>{totalSize}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => { handleDeleteAll(); lightHaptic(); }} activeOpacity={0.7}>
          <Text style={styles.deleteAllText}>Delete All</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#555" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search downloaded songs..."
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); lightHaptic(); }} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {/* Play All Button */}
      <TouchableOpacity
        style={styles.playAllBtn}
        onPress={() => { handlePlay(0); mediumHaptic(); }}
        activeOpacity={0.7}
      >
        <Ionicons name="play" size={20} color="#fff" />
        <Text style={styles.playAllText}>Play All</Text>
      </TouchableOpacity>

      {/* Downloads List */}
      <FlatList
        data={filteredDownloads}
        keyExtractor={(item) => String(item.track.id)}
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
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, color: '#fff', fontWeight: 'bold', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#888', marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 24, color: '#fff', fontWeight: 'bold', marginBottom: 8 },
  headerInfo: { flexDirection: 'row', gap: 12 },
  infoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a1a1a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  headerCount: { fontSize: 12, color: '#1DB954', fontWeight: '600' },
  headerSize: { fontSize: 12, color: '#60a5fa', fontWeight: '600' },
  deleteAllText: { fontSize: 14, color: '#ef4444', fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 16, marginBottom: 8, gap: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  playAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1DB954', marginHorizontal: 16, paddingVertical: 12, borderRadius: 24, marginBottom: 8 },
  playAllText: { fontSize: 14, color: '#000', fontWeight: '600' },
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
  deleteBtn: { padding: 8 },
});
