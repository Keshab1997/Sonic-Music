import React, { useRef, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity, Modal,
  FlatList, Animated, PanResponder, StyleSheet, ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { Track } from '../data/playlist';

const { height } = Dimensions.get('window');

const formatTime = (s: number) => {
  if (!s || isNaN(s)) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  showPlaylist?: boolean;
}

// Single swipeable queue row
const QueueRow: React.FC<{
  track: Track;
  index: number;
  onRemove: (index: number) => void;
  onPlay: (track: Track) => void;
}> = ({ track, index, onRemove, onPlay }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const rowOpacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -80) {
          // Swipe left to remove
          Animated.parallel([
            Animated.timing(translateX, { toValue: -400, duration: 200, useNativeDriver: true }),
            Animated.timing(rowOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => onRemove(index));
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.rowWrap, { transform: [{ translateX }], opacity: rowOpacity }]}
      {...panResponder.panHandlers}
    >
      {/* Red delete hint behind row */}
      <View style={styles.deleteHint}>
        <Ionicons name="trash-outline" size={20} color="#fff" />
        <Text style={styles.deleteHintText}>Remove</Text>
      </View>

      <TouchableOpacity style={styles.row} onPress={() => onPlay(track)} activeOpacity={0.7}>
        <Image
          source={{ uri: track.cover }}
          style={styles.cover}
        />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
        </View>
        {track.duration > 0 && (
          <Text style={styles.duration}>{formatTime(track.duration)}</Text>
        )}
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => onRemove(index)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.35)" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const QueueManager: React.FC<Props> = ({ visible, onClose, showPlaylist = false }) => {
  const {
    queue, currentTrack, removeFromQueue, clearQueue,
    playTrack, shuffleQueue, tracks, currentIndex, playTrackList,
  } = usePlayer();

  // Bottom sheet slide animation
  const slideY = useRef(new Animated.Value(height)).current;

  const handleShow = useCallback(() => {
    Animated.spring(slideY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [slideY]);

  const handleClose = useCallback(() => {
    Animated.timing(slideY, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(onClose);
  }, [slideY, onClose]);

  // Drag handle pan responder
  const dragPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80) {
          handleClose();
        } else {
          Animated.spring(slideY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // Show playlist or queue based on prop
  const displayList = showPlaylist ? tracks : queue;
  const totalCount = displayList.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={handleShow}
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>
        {/* Drag handle */}
        <View style={styles.dragArea} {...dragPan.panHandlers}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{showPlaylist ? 'Current Playlist' : 'Up Next'}</Text>
            <Text style={styles.headerSub}>
              {totalCount === 0 ? (showPlaylist ? 'No tracks' : 'Queue is empty') : `${totalCount} track${totalCount !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {!showPlaylist && queue.length > 0 && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={shuffleQueue}
                activeOpacity={0.7}
              >
                <Ionicons name="shuffle" size={18} color="#1DB954" />
              </TouchableOpacity>
            )}
            {!showPlaylist && queue.length > 0 && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.clearBtn]}
                onPress={clearQueue}
                activeOpacity={0.7}
              >
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Currently Playing */}
          {currentTrack && (
            <View style={styles.nowPlayingSection}>
              <Text style={styles.sectionLabel}>NOW PLAYING</Text>
              <View style={styles.nowPlayingRow}>
                <View style={styles.nowPlayingIndicator} />
                <Image source={{ uri: currentTrack.cover }} style={styles.nowPlayingCover} />
                <View style={styles.nowPlayingInfo}>
                  <Text style={styles.nowPlayingTitle} numberOfLines={1}>{currentTrack.title}</Text>
                  <Text style={styles.nowPlayingArtist} numberOfLines={1}>{currentTrack.artist}</Text>
                </View>
                <Ionicons name="musical-notes" size={16} color="#1DB954" />
              </View>
            </View>
          )}

          {/* Queue/Playlist Section */}
          {displayList.length > 0 && (
            <View style={styles.queueSection}>
              <Text style={styles.sectionLabel}>{showPlaylist ? 'TRACKS' : 'YOUR QUEUE'}</Text>
              {displayList.map((t, i) => {
                const isCurrentTrack = showPlaylist && currentTrack?.id === t.id;
                return (
                  <TouchableOpacity
                    key={`${showPlaylist ? 'playlist' : 'queue'}-${t.id}-${i}`}
                    style={[styles.playlistRow, isCurrentTrack && styles.currentTrackRow]}
                    onPress={() => {
                      if (showPlaylist) {
                        playTrackList(tracks, i);
                      } else {
                        playTrack(t);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.trackNumber, isCurrentTrack && styles.currentTrackNumber]}>
                      {isCurrentTrack ? '♪' : i + 1}
                    </Text>
                    <Image source={{ uri: t.cover }} style={styles.cover} />
                    <View style={styles.info}>
                      <Text style={[styles.title, isCurrentTrack && styles.currentTrackTitle]} numberOfLines={1}>
                        {t.title}
                      </Text>
                      <Text style={styles.artist} numberOfLines={1}>{t.artist}</Text>
                    </View>
                    {t.duration > 0 && (
                      <Text style={styles.duration}>{formatTime(t.duration)}</Text>
                    )}
                    {!showPlaylist && (
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          removeFromQueue(i);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close" size={18} color="rgba(255,255,255,0.35)" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Empty State */}
          {totalCount === 0 && (
            <View style={styles.empty}>
              <Ionicons name="list-outline" size={48} color="#333" />
              <Text style={styles.emptyTitle}>{showPlaylist ? 'No tracks playing' : 'Queue is empty'}</Text>
              <Text style={styles.emptySub}>{showPlaylist ? 'Play some music to see tracks here' : 'Add songs using the + button'}</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.75,
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  dragArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  headerSub: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(29,185,84,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    width: 'auto',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  clearText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlayingSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  nowPlayingIndicator: {
    width: 3,
    height: 40,
    backgroundColor: '#1DB954',
    borderRadius: 2,
  },
  nowPlayingCover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1DB954',
  },
  nowPlayingArtist: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  rowWrap: {
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  deleteHint: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
  },
  deleteHintText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  currentTrackRow: {
    backgroundColor: 'rgba(29,185,84,0.1)',
  },
  trackNumber: {
    fontSize: 14,
    color: '#666',
    width: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  currentTrackNumber: {
    color: '#1DB954',
    fontSize: 16,
  },
  currentTrackTitle: {
    color: '#1DB954',
  },
  cover: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  artist: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  duration: {
    fontSize: 11,
    color: '#444',
    fontVariant: ['tabular-nums'],
  },
  removeBtn: {
    padding: 4,
  },
  queueSection: {
    paddingHorizontal: 16,
  },
  playlistSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  emptySub: {
    fontSize: 13,
    color: '#2a2a2a',
  },
});
