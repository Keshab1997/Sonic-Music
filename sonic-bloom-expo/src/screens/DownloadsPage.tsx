import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { useDownloadsContext } from '../context/DownloadsContext';

export const DownloadsPage: React.FC = () => {
  const { downloads, deleteTrack, deleteAll } = useDownloadsContext();
  const { playTrackList, currentTrack, isPlaying, addToQueue } = usePlayer();

  const handleDelete = (trackId: string) => {
    Alert.alert(
      'Delete Download',
      'Are you sure you want to delete this downloaded song?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTrack(trackId) },
      ]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All Downloads',
      'Are you sure you want to delete all downloaded songs? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete All', style: 'destructive', onPress: () => deleteAll() },
      ]
    );
  };

  const handlePlay = (index: number) => {
    const tracks = downloads.map(d => d.track);
    playTrackList(tracks, index);
  };

  const renderItem = ({ item, index }: { item: { track: any; localUri: string }; index: number }) => {
    const isCurrentTrack = currentTrack?.id === item.track.id;
    return (
      <TouchableOpacity
        style={[styles.row, isCurrentTrack && styles.rowActive]}
        onPress={() => handlePlay(index)}
        activeOpacity={0.7}
      >
        <Image
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
        <Text style={styles.headerTitle}>Downloads</Text>
        <Text style={styles.headerCount}>{downloads.length} songs</Text>
        <TouchableOpacity onPress={handleDeleteAll} activeOpacity={0.7}>
          <Text style={styles.deleteAllText}>Delete All</Text>
        </TouchableOpacity>
      </View>

      {/* Play All Button */}
      <TouchableOpacity
        style={styles.playAllBtn}
        onPress={() => handlePlay(0)}
        activeOpacity={0.7}
      >
        <Ionicons name="play" size={20} color="#fff" />
        <Text style={styles.playAllText}>Play All</Text>
      </TouchableOpacity>

      {/* Downloads List */}
      <FlatList
        data={downloads}
        keyExtractor={(item) => String(item.track.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, color: '#fff', fontWeight: 'bold', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#888', marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  headerTitle: { fontSize: 24, color: '#fff', fontWeight: 'bold' },
  headerCount: { fontSize: 14, color: '#888' },
  deleteAllText: { fontSize: 14, color: '#ef4444', fontWeight: '600' },
  playAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1DB954', marginHorizontal: 16, paddingVertical: 12, borderRadius: 24, marginBottom: 8 },
  playAllText: { fontSize: 14, color: '#000', fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 140 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  rowActive: { backgroundColor: '#0d1f0d', borderRadius: 8, paddingHorizontal: 8 },
  cover: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#1a1a1a' },
  info: { flex: 1 },
  title: { fontSize: 14, color: '#fff', fontWeight: '600' },
  titleActive: { color: '#1DB954' },
  artist: { fontSize: 12, color: '#888', marginTop: 2 },
  deleteBtn: { padding: 8 },
});
