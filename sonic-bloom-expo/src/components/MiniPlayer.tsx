import React, { useState, useCallback, memo } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { useLikedSongsContext } from '../context/LikedSongsContext';
import { useDownloadsContext } from '../context/DownloadsContext';
import { FullScreenPlayer } from './FullScreenPlayer';
import { QueueManager } from './QueueManager';
import { CachedImage } from './CachedImage';
import { lightHaptic } from '../lib/haptics';

interface MiniPlayerProps {
  onExpand?: () => void;
  onClose?: () => void;
}

const MiniButton = memo(({ icon, color, onPress }: { icon: string; color: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.miniBtn} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={icon as any} size={icon === 'pause' || icon === 'play' ? 26 : 20} color={color} />
  </TouchableOpacity>
));

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onExpand, onClose }) => {
  const { currentTrack, isPlaying, togglePlay, next, prev, progress, duration, queue, tracks, currentIndex } = usePlayer();
  const { isLiked, toggleLike } = useLikedSongsContext();
  const { downloadTrack, isDownloaded, isDownloading, getDownloadProgress } = useDownloadsContext();
  const [fsVisible, setFsVisible] = useState(false);
  const [playlistVisible, setPlaylistVisible] = useState(false);

  const handleExpand = useCallback(() => { onExpand?.(); setFsVisible(true); lightHaptic(); }, [onExpand]);
  const handleClose = useCallback(() => { onClose?.(); setFsVisible(false); }, [onClose]);
  
  const handleToggleLike = useCallback(() => {
    if (currentTrack) { toggleLike(currentTrack); lightHaptic(); }
  }, [currentTrack, toggleLike]);

  const handleDownload = useCallback(() => {
    if (currentTrack && currentTrack.src) {
      downloadTrack(currentTrack);
      lightHaptic();
    }
  }, [currentTrack, downloadTrack]);

  const handlePrev = useCallback(() => { prev(); lightHaptic(); }, [prev]);
  const handleTogglePlay = useCallback(() => { togglePlay(); lightHaptic(); }, [togglePlay]);
  const handleNext = useCallback(() => { next(); lightHaptic(); }, [next]);

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const trackId = currentTrack?.id ? String(currentTrack.id) : '';
  const liked = trackId ? isLiked(trackId) : false;
  const downloaded = isDownloaded(trackId || currentTrack.src);
  const downloading = isDownloading(trackId || currentTrack.src);

  return (
    <>
      <TouchableOpacity style={styles.miniPlayer} activeOpacity={0.9} onPress={handleExpand}>
        <View style={styles.miniProgressTrack}>
          <View style={[styles.miniProgressFill, { width: `${progressPercent}%` }]} />
        </View>
        <CachedImage source={{ uri: currentTrack.cover }} style={styles.miniCover} defaultSource={require('../../assets/icon.png')} />
        <View style={styles.miniInfo}>
          <Text style={styles.miniTitle} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={styles.miniArtist} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>
        <TouchableOpacity style={styles.miniBtn} onPress={handleDownload} activeOpacity={0.7}>
          <Ionicons name={downloaded ? "checkmark-circle" : downloading ? "cloud-download-outline" : "download-outline"} size={20} color={downloaded ? "#1DB954" : "#fff"} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.miniBtn} onPress={handleToggleLike} activeOpacity={0.7}>
          <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? "#1DB954" : "#fff"} />
        </TouchableOpacity>
        <MiniButton icon="play-skip-back" color="#fff" onPress={handlePrev} />
        <MiniButton icon={isPlaying ? "pause" : "play"} color="#1DB954" onPress={handleTogglePlay} />
        <MiniButton icon="play-skip-forward" color="#fff" onPress={handleNext} />
        <TouchableOpacity style={styles.miniBtn} onPress={() => setPlaylistVisible(true)} activeOpacity={0.7}>
          <View>
            <Ionicons name="list" size={22} color="#fff" />
            {tracks.length > 0 && (
              <View style={styles.queueBadgeMini}>
                <Text style={styles.queueBadgeTextMini}>{tracks.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
      <FullScreenPlayer visible={fsVisible} onClose={() => setFsVisible(false)} />
      <QueueManager visible={playlistVisible} onClose={() => setPlaylistVisible(false)} showPlaylist={true} />
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
  queueBadgeMini: { position: 'absolute', top: -2, right: -4, backgroundColor: '#1DB954', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  queueBadgeTextMini: { fontSize: 9, fontWeight: 'bold', color: '#000' },
});
