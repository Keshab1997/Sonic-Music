import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { FullScreenPlayer } from './FullScreenPlayer';
import { CachedImage } from './CachedImage';

interface MiniPlayerProps {
  onExpand?: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand }) => {
  const { currentTrack, isPlaying, togglePlay, next, prev, progress, duration } = usePlayer();
  const [fsVisible, setFsVisible] = useState(false);

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      <TouchableOpacity
        style={styles.miniPlayer}
        activeOpacity={0.9}
        onPress={() => { onExpand?.(); setFsVisible(true); }}
      >
        {/* Progress bar at top of mini player */}
        <View style={styles.miniProgressTrack}>
          <View style={[styles.miniProgressFill, { width: `${progressPercent}%` }]} />
        </View>

        <CachedImage
          source={{ uri: currentTrack.cover }}
          style={styles.miniCover}
          defaultSource={require('../../assets/icon.png')}
        />
        <View style={styles.miniInfo}>
          <Text style={styles.miniTitle} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.miniArtist} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>
        <TouchableOpacity style={styles.miniBtn} onPress={(e) => { e.stopPropagation(); prev(); }} activeOpacity={0.7}>
          <Ionicons name="play-skip-back" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.miniBtn} onPress={(e) => { e.stopPropagation(); togglePlay(); }} activeOpacity={0.7}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={26} color="#1DB954" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.miniBtn} onPress={(e) => { e.stopPropagation(); next(); }} activeOpacity={0.7}>
          <Ionicons name="play-skip-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>

      <FullScreenPlayer
        visible={fsVisible}
        onClose={() => setFsVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  miniPlayer: { position: 'absolute', bottom: 60, left: 0, right: 0, zIndex: 999, backgroundColor: '#1a1a1a', borderTopWidth: 1, borderTopColor: '#2a2a2a', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  miniProgressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  miniProgressFill: { height: '100%', backgroundColor: '#1DB954' },
  miniCover: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#2a2a2a' },
  miniInfo: { flex: 1, marginLeft: 10 },
  miniTitle: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  miniArtist: { fontSize: 11, color: '#888' },
  miniBtn: { padding: 8 },
});
