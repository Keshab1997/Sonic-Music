import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePlayer } from '../context/PlayerContext';
import { CachedImage } from '../components/CachedImage';
import { mediumHaptic } from '../lib/haptics';

export const QueueScreen: React.FC = () => {
  const navigation = useNavigation();
  const { queue, currentTrack, playTrackList, removeFromQueue, clearQueue } = usePlayer();

  const currentIndex = queue.findIndex(track => track.id === currentTrack?.id);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Queue</Text>
          {queue.length > 0 && (
            <View style={styles.queueCountBadge}>
              <Text style={styles.queueCountText}>{queue.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            clearQueue();
            mediumHaptic();
          }}
          style={styles.clearBtn}
          activeOpacity={0.7}
          disabled={queue.length === 0}
        >
          <Text style={[styles.clearBtnText, queue.length === 0 && styles.clearBtnDisabled]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Now Playing */}
        {currentTrack && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Now Playing</Text>
            <View style={styles.nowPlayingCard}>
              <CachedImage
                source={{ uri: currentTrack.cover || '' }}
                style={styles.nowPlayingImage}
                defaultSource={require('../../assets/icon.png')}
              />
              <View style={styles.nowPlayingInfo}>
                <Text style={styles.nowPlayingTitle} numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                <Text style={styles.nowPlayingArtist} numberOfLines={1}>
                  {currentTrack.artist}
                </Text>
              </View>
              <Ionicons name="musical-notes" size={24} color="#1DB954" />
            </View>
          </View>
        )}

        {/* Next in Queue */}
        {queue.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Next in Queue ({queue.length} {queue.length === 1 ? 'song' : 'songs'})
              </Text>
              <TouchableOpacity
                onPress={() => {
                  // Play entire queue as new playlist
                  const queueCopy = [...queue];
                  clearQueue();
                  playTrackList(queueCopy, 0);
                  mediumHaptic();
                }}
                style={styles.playAllBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="play" size={16} color="#1DB954" />
                <Text style={styles.playAllText}>Play All</Text>
              </TouchableOpacity>
            </View>
            {queue.map((track, index) => {
              const isCurrentTrack = track.id === currentTrack?.id;
              if (isCurrentTrack) return null;

              return (
                <TouchableOpacity
                  key={`${track.id}-${index}`}
                  style={styles.queueItem}
                  onPress={() => {
                    // Play from this position in queue
                    const queueCopy = [...queue];
                    clearQueue();
                    playTrackList(queueCopy, index);
                    mediumHaptic();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.queueItemLeft}>
                    <Text style={styles.queueIndex}>{index + 1}</Text>
                    <CachedImage
                      source={{ uri: track.cover || '' }}
                      style={styles.queueImage}
                      defaultSource={require('../../assets/icon.png')}
                    />
                    <View style={styles.queueInfo}>
                      <Text style={styles.queueTitle} numberOfLines={1}>
                        {track.title}
                      </Text>
                      <Text style={styles.queueArtist} numberOfLines={1}>
                        {track.artist}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      removeFromQueue(index);
                      mediumHaptic();
                    }}
                    style={styles.removeBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={24} color="#888" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {queue.length === 0 && !currentTrack && (
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>Queue is empty</Text>
            <Text style={styles.emptySubText}>Add songs to start playing</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backBtn: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  queueCountBadge: { backgroundColor: '#1DB954', borderRadius: 12, minWidth: 24, height: 24, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' },
  queueCountText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  clearBtn: { padding: 4 },
  clearBtnText: { fontSize: 14, color: '#1DB954', fontWeight: '600' },
  clearBtnDisabled: { color: '#444' },
  scrollContent: { paddingBottom: 100 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#888', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  playAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#1DB954' },
  playAllText: { fontSize: 12, color: '#1DB954', fontWeight: '600' },
  nowPlayingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1DB954',
  },
  nowPlayingImage: { width: 56, height: 56, borderRadius: 8 },
  nowPlayingInfo: { flex: 1 },
  nowPlayingTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  nowPlayingArtist: { fontSize: 13, color: '#888', marginTop: 2 },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  queueItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  queueIndex: { fontSize: 14, color: '#555', width: 24, textAlign: 'center' },
  queueImage: { width: 48, height: 48, borderRadius: 6 },
  queueInfo: { flex: 1 },
  queueTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  queueArtist: { fontSize: 12, color: '#888', marginTop: 2 },
  removeBtn: { padding: 8 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#fff', marginTop: 16 },
  emptySubText: { fontSize: 14, color: '#888', marginTop: 4 },
});