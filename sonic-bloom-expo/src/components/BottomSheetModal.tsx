import React, { memo, useCallback } from 'react';
import { Modal, Pressable, View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../data/playlist';
import { usePlayer } from '../context/PlayerContext';
import { CachedImage } from './CachedImage';

interface BottomSheetModalProps {
  visible: boolean;
  title: string;
  tracks: Track[];
  loading: boolean;
  onClose: () => void;
  onPlayTrack: (track: Track, index: number) => void;
  onAddToQueue: (track: Track) => void;
}

// Memoized track item for better performance
const TrackItem = memo<{
  item: Track;
  index: number;
  isPlaying: boolean;
  onPress: (track: Track, index: number) => void;
  onAddToQueue: (track: Track) => void;
}>(({ item, index, isPlaying, onPress, onAddToQueue }) => {
  const handlePress = useCallback(() => onPress(item, index), [item, index, onPress]);
  const handleAddToQueue = useCallback(() => onAddToQueue(item), [item, onAddToQueue]);

  return (
    <TouchableOpacity
      style={[styles.sheetRow, isPlaying && styles.sheetRowPlaying]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <CachedImage
        source={{ uri: item.cover }}
        style={styles.sheetCover}
        defaultSource={require('../../assets/icon.png')}
      />
      <View style={styles.sheetInfo}>
        <Text style={[styles.sheetTitle, isPlaying && styles.sheetTitlePlaying]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.sheetArtist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      <TouchableOpacity style={styles.sheetAddBtn} onPress={handleAddToQueue} activeOpacity={0.7}>
        <Ionicons name="add" size={22} color="#1DB954" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}, (prev, next) => {
  return prev.item.id === next.item.id && prev.isPlaying === next.isPlaying;
});

export const BottomSheetModal: React.FC<BottomSheetModalProps> = memo(({
  visible,
  title,
  tracks,
  loading,
  onClose,
  onPlayTrack,
  onAddToQueue,
}) => {
  const { currentTrack } = usePlayer();

  const renderItem = useCallback(({ item, index }: { item: Track; index: number }) => {
    const isPlaying = currentTrack?.id === item.id;
    return (
      <TrackItem
        item={item}
        index={index}
        isPlaying={isPlaying}
        onPress={onPlayTrack}
        onAddToQueue={onAddToQueue}
      />
    );
  }, [currentTrack?.id, onPlayTrack, onAddToQueue]);

  const keyExtractor = useCallback((item: Track) => String(item.id), []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 72,
    offset: 72 * index,
    index,
  }), []);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={() => {}}>
          <View style={styles.dragHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.sheetTitleHeader}>{title}</Text>
              {tracks.length > 0 && (
                <Text style={styles.trackCount}>{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1DB954" />
            </View>
          ) : tracks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No songs found</Text>
            </View>
          ) : (
            <FlatList
              data={tracks}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              getItemLayout={getItemLayout}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              windowSize={10}
              initialNumToRender={15}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheetContainer: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: 40 },
  dragHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerLeft: { flex: 1 },
  sheetTitleHeader: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  trackCount: { fontSize: 12, color: '#1DB954', marginTop: 2, fontWeight: '600' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 14 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  sheetRowPlaying: { backgroundColor: '#0d1f0d' },
  sheetCover: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#2a2a2a' },
  sheetInfo: { flex: 1, marginLeft: 12 },
  sheetTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  sheetTitlePlaying: { color: '#1DB954' },
  sheetArtist: { fontSize: 12, color: '#888', marginTop: 2 },
  sheetAddBtn: { padding: 6 },
});
