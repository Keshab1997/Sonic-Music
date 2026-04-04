import React, { useRef, useCallback, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, FlatList,
  Animated, PanResponder, StyleSheet, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { Track } from '../data/playlist';

const { width } = Dimensions.get('window');

const formatTime = (s: number) => {
  if (!s) return '';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

const LikedRow: React.FC<{
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onUnlike: () => void;
  onAddToQueue: () => void;
}> = ({ track, isCurrent, isPlaying, onPlay, onUnlike, onAddToQueue }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -80) {
          Animated.parallel([
            Animated.timing(translateX, { toValue: -width, duration: 200, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(onUnlike);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View style={[styles.rowWrap, { transform: [{ translateX }], opacity }]} {...pan.panHandlers}>
      <View style={styles.unlikeHint}>
        <Ionicons name="heart-dislike-outline" size={18} color="#fff" />
        <Text style={styles.unlikeHintText}>Unlike</Text>
      </View>
      <TouchableOpacity
        style={[styles.row, isCurrent && styles.rowActive]}
        onPress={onPlay}
        activeOpacity={0.7}
      >
        <View style={styles.coverWrap}>
          <Image source={{ uri: track.cover }} style={styles.cover} />
          {isCurrent && (
            <View style={styles.coverOverlay}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, isCurrent && styles.titleActive]} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
        </View>
        {track.duration > 0 && (
          <Text style={styles.duration}>{formatTime(track.duration)}</Text>
        )}
        <TouchableOpacity
          style={styles.queueBtn}
          onPress={onAddToQueue}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={20} color="#555" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const LikedSongsScreen: React.FC = () => {
  const { currentTrack, isPlaying, playTrackList, addToQueue } = usePlayer();
  const { likedTracks, unlikeTrack } = useLikedSongs();
  const [sortNewest, setSortNewest] = useState(true);

  const sorted = sortNewest ? likedTracks : [...likedTracks].reverse();

  const handlePlayAll = useCallback(() => {
    if (sorted.length > 0) playTrackList(sorted, 0);
  }, [sorted, playTrackList]);

  const handleShuffle = useCallback(() => {
    if (sorted.length === 0) return;
    playTrackList([...sorted].sort(() => Math.random() - 0.5), 0);
  }, [sorted, playTrackList]);

  const totalMins = Math.floor(likedTracks.reduce((a, t) => a + (t.duration || 0), 0) / 60);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {likedTracks.length > 0 ? (
          <View style={styles.mosaic}>
            {likedTracks.slice(0, 4).map((t, i) => (
              <Image key={i} source={{ uri: t.cover }} style={styles.mosaicImg} />
            ))}
            {likedTracks.length < 4 &&
              Array.from({ length: 4 - likedTracks.length }).map((_, i) => (
                <View key={`e${i}`} style={[styles.mosaicImg, { backgroundColor: '#1a1a1a' }]} />
              ))}
          </View>
        ) : (
          <View style={styles.emptyMosaic}>
            <Ionicons name="heart" size={48} color="#ef4444" />
          </View>
        )}

        <Text style={styles.headerTitle}>Liked Songs</Text>
        <Text style={styles.headerMeta}>
          {likedTracks.length} song{likedTracks.length !== 1 ? 's' : ''}
          {totalMins > 0 ? ` • ${totalMins} min` : ''}
        </Text>

        {likedTracks.length > 0 && (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.playAllBtn} onPress={handlePlayAll} activeOpacity={0.8}>
              <Ionicons name="play" size={18} color="#000" style={{ marginLeft: 2 }} />
              <Text style={styles.playAllText}>Play All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shuffleBtn} onPress={handleShuffle} activeOpacity={0.8}>
              <Ionicons name="shuffle" size={18} color="#1DB954" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Sort */}
      {likedTracks.length > 1 && (
        <View style={styles.sortRow}>
          {[true, false].map((val) => (
            <TouchableOpacity
              key={String(val)}
              style={[styles.sortChip, sortNewest === val && styles.sortChipActive]}
              onPress={() => setSortNewest(val)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sortChipText, sortNewest === val && styles.sortChipTextActive]}>
                {val ? 'Newest first' : 'Oldest first'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {likedTracks.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={64} color="#222" />
          <Text style={styles.emptyTitle}>No liked songs yet</Text>
          <Text style={styles.emptySub}>Tap ♥ on any song to save it here</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <LikedRow
              track={item}
              isCurrent={currentTrack?.id === item.id}
              isPlaying={isPlaying}
              onPlay={() => playTrackList(sorted, index)}
              onUnlike={() => unlikeTrack(String(item.id))}
              onAddToQueue={() => addToQueue(item)}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  mosaic: {
    width: 100, height: 100, borderRadius: 16,
    overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14,
  },
  mosaicImg: { width: 50, height: 50 },
  emptyMosaic: {
    width: 100, height: 100, borderRadius: 16,
    backgroundColor: '#1a0a0a', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, borderWidth: 1, borderColor: '#2a1a1a',
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4 },
  headerMeta: { fontSize: 13, color: '#555', marginBottom: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1DB954', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  playAllText: { fontSize: 15, fontWeight: '700', color: '#000' },
  shuffleBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(29,185,84,0.12)', borderWidth: 1,
    borderColor: 'rgba(29,185,84,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  sortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  sortChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
  },
  sortChipActive: { backgroundColor: 'rgba(29,185,84,0.12)', borderColor: 'rgba(29,185,84,0.3)' },
  sortChipText: { fontSize: 12, color: '#555', fontWeight: '600' },
  sortChipTextActive: { color: '#1DB954' },
  list: { paddingTop: 8, paddingBottom: 140 },
  rowWrap: {
    position: 'relative', marginHorizontal: 12,
    marginBottom: 2, borderRadius: 10, overflow: 'hidden',
  },
  unlikeHint: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 90,
    backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5, borderRadius: 10,
  },
  unlikeHintText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 12,
  },
  rowActive: { backgroundColor: '#0d1a0d' },
  coverWrap: { position: 'relative' },
  cover: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#1a1a1a' },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: '#fff' },
  titleActive: { color: '#1DB954' },
  artist: { fontSize: 12, color: '#555', marginTop: 2 },
  duration: { fontSize: 11, color: '#444', fontVariant: ['tabular-nums'] },
  queueBtn: { padding: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  emptySub: { fontSize: 13, color: '#2a2a2a', textAlign: 'center', paddingHorizontal: 40 },
});
