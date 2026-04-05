import React, { memo, useCallback } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../data/playlist';
import { CachedImage } from './CachedImage';

interface SongCardProps {
  track: Track;
  index: number;
  allTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: (track: Track, allTracks: Track[], index: number) => void;
  onAddToQueue: (track: Track) => void;
  badge?: string;
  badgeColor?: string;
  cardWidth?: number;
}

export const SongCard: React.FC<SongCardProps> = memo(({
  track, index, allTracks, currentTrack, isPlaying, onPlay, onAddToQueue, badge, badgeColor, cardWidth = 120
}) => {
  const isCurrentTrack = currentTrack?.id === track.id;
  
  const handlePress = useCallback(() => {
    onPlay(track, allTracks, index);
  }, [track, allTracks, index, onPlay]);

  const handleAddToQueue = useCallback(() => {
    onAddToQueue(track);
  }, [track, onAddToQueue]);

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardImageContainer}>
        <CachedImage
          source={{ uri: track.cover }}
          style={[styles.cardImage, { width: cardWidth, height: cardWidth }]}
          defaultSource={require('../../assets/icon.png')}
        />
        {isCurrentTrack && isPlaying && (
          <View style={styles.cardOverlay}>
            <Ionicons name="pause" size={28} color="#fff" />
          </View>
        )}
        {badge && (
          <View style={[styles.cardBadge, { backgroundColor: badgeColor || 'rgba(0,0,0,0.7)' }]}>
            <Text style={styles.cardBadgeText}>{badge}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.cardQueueBtn}
          onPress={handleAddToQueue}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={[styles.cardTitle, { color: isCurrentTrack ? '#1DB954' : '#fff' }]} numberOfLines={1}>{track.title}</Text>
      <Text style={styles.cardArtist} numberOfLines={1}>{track.artist}</Text>
    </TouchableOpacity>
  );
}, (prev, next) => {
  // Only re-render if track changes or playing state changes for this specific track
  const prevIsPlaying = prev.currentTrack?.id === prev.track.id && prev.isPlaying;
  const nextIsPlaying = next.currentTrack?.id === next.track.id && next.isPlaying;
  return prev.track.id === next.track.id && prevIsPlaying === nextIsPlaying;
});

const styles = StyleSheet.create({
  card: { marginRight: 12 },
  cardImageContainer: { position: 'relative' },
  cardImage: { borderRadius: 10, backgroundColor: '#1a1a1a' },
  cardOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  cardBadge: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  cardBadgeText: { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  cardQueueBtn: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 12, fontWeight: 'bold', marginTop: 6 },
  cardArtist: { fontSize: 11, color: '#888', marginTop: 2 },
});
