import React from 'react';
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

export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  visible,
  title,
  tracks,
  loading,
  onClose,
  onPlayTrack,
  onAddToQueue,
}) => {
  const { currentTrack } = usePlayer();

  const renderItem = ({ item, index }: { item: Track; index: number }) => {
    const isPlaying = currentTrack?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.sheetRow, isPlaying && styles.sheetRowPlaying]}
        onPress={() => onPlayTrack(item, index)}
        activeOpacity={0.7}
      >
        <CachedImage
          source={{ uri: item.cover }}
          style={styles.sheetCover}
          defaultSource={require('../../assets/icon.png')}
        />
        <View style={styles.sheetInfo}>
          <Text
            style={[styles.sheetTitle, isPlaying && styles.sheetTitlePlaying]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.sheetArtist} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.sheetAddBtn}
          onPress={() => onAddToQueue(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color="#1DB954" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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
            <Text style={styles.sheetTitleHeader}>{title}</Text>
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
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheetContainer: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: 40 },
  dragHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  sheetTitleHeader: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
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
