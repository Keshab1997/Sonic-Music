import React, { useRef, useCallback, useState, memo, useEffect } from 'react';
import {
  View, Text, Image, Modal,
  Dimensions, PanResponder, Animated, StyleSheet, ActivityIndicator, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { usePlayer } from '../context/PlayerContext';
import { useDownloadsContext } from '../context/DownloadsContext';
import { QueueManager } from './QueueManager';
import { SleepTimerSheet } from './SleepTimerSheet';
import { PlaybackSettingsSheet } from './PlaybackSettingsSheet';
import { EqualizerPanel } from './EqualizerPanel';

const { width, height } = Dimensions.get('window');

const formatTime = (s: number) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const ProgressBar = memo(({ progress, duration, onSeek }: { progress: number; duration: number; onSeek: (t: number) => void }) => {
  const progressBarRef = useRef<View>(null);
  const [seeking, setSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  
  const displayProgress = seeking ? seekValue : progress;
  const progressPercent = duration > 0 ? (displayProgress / duration) * 100 : 0;

  const handleTouch = useCallback((pageX: number, isEnd: boolean) => {
    progressBarRef.current?.measure((x, y, w, h, px, py) => {
      const relX = Math.max(0, Math.min(pageX - px, w));
      const newTime = (relX / w) * duration;
      if (isEnd) {
        onSeek(newTime);
        setSeeking(false);
      } else {
        setSeekValue(newTime);
        if (!seeking) setSeeking(true);
      }
    });
  }, [duration, onSeek, seeking]);

  return (
    <View style={styles.progressSection}>
      <Pressable
        ref={progressBarRef}
        style={styles.progressTrack}
        onTouchStart={(e) => handleTouch(e.nativeEvent.pageX, false)}
        onTouchMove={(e) => handleTouch(e.nativeEvent.pageX, false)}
        onTouchEnd={(e) => handleTouch(e.nativeEvent.pageX, true)}
      >
        <View style={styles.progressBg} />
        <LinearGradient
          colors={['#1DB954', '#1ed760']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${progressPercent}%` }]}
        />
        <View style={[styles.progressThumb, { left: `${progressPercent}%` }]} />
      </Pressable>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(displayProgress)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}, (prev, next) => Math.abs(prev.progress - next.progress) < 1 && prev.duration === next.duration);

const VolumeSlider = memo(({ volume, onVolumeChange }: { volume: number; onVolumeChange: (v: number) => void }) => {
  const volumeBarRef = useRef<View>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [tempVolume, setTempVolume] = useState(volume);
  
  const displayVolume = adjusting ? tempVolume : volume;

  const handleTouch = useCallback((pageX: number, isEnd: boolean) => {
    volumeBarRef.current?.measure((x, y, w, h, px, py) => {
      const relX = Math.max(0, Math.min(pageX - px, w));
      const newVol = relX / w;
      if (isEnd) {
        onVolumeChange(newVol);
        setAdjusting(false);
      } else {
        setTempVolume(newVol);
        if (!adjusting) setAdjusting(true);
      }
    });
  }, [onVolumeChange, adjusting]);

  return (
    <View style={styles.volumeRow}>
      <Pressable onPress={() => onVolumeChange(0)} style={styles.volumeIcon}>
        <Ionicons name={displayVolume === 0 ? "volume-mute" : "volume-low"} size={22} color="rgba(255,255,255,0.7)" />
      </Pressable>
      <Pressable 
        ref={volumeBarRef}
        style={styles.volumeTrack}
        onTouchStart={(e) => handleTouch(e.nativeEvent.pageX, false)}
        onTouchMove={(e) => handleTouch(e.nativeEvent.pageX, false)}
        onTouchEnd={(e) => handleTouch(e.nativeEvent.pageX, true)}
      >
        <View style={styles.volumeBg} />
        <LinearGradient
          colors={['#fff', '#f0f0f0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.volumeFill, { width: `${displayVolume * 100}%` }]}
        />
        <View style={[styles.volumeThumb, { left: `${displayVolume * 100}%` }]} />
      </Pressable>
      <Pressable onPress={() => onVolumeChange(1)} style={styles.volumeIcon}>
        <Ionicons name="volume-high" size={22} color="rgba(255,255,255,0.7)" />
      </Pressable>
    </View>
  );
}, (prev, next) => Math.abs(prev.volume - next.volume) < 0.05);

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const FullScreenPlayer: React.FC<Props> = ({ visible, onClose }) => {
  const {
    currentTrack, isPlaying, progress, duration,
    shuffle, repeat, togglePlay, next, prev, seek,
    toggleShuffle, toggleRepeat, volume, setVolume,
    isCurrentTrackLiked, likeCurrentTrack, unlikeCurrentTrack,
    queue, sleepMinutes, playbackSpeed, quality,
  } = usePlayer();

  const [queueVisible, setQueueVisible] = useState(false);
  const [sleepVisible, setSleepVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [eqVisible, setEqVisible] = useState(false);
  const { isDownloaded, isDownloading, downloadTrack } = useDownloadsContext();

  const translateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100) {
          Animated.timing(translateY, { toValue: height, duration: 200, useNativeDriver: true }).start(onClose);
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.02, duration: 1000, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [isPlaying, scaleAnim]);

  if (!currentTrack) return null;

  const trackId = String(currentTrack.id);
  const isLiked = isCurrentTrackLiked;
  const downloaded = isDownloaded(trackId);
  const downloading = isDownloading(trackId);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.container, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
        <Image source={{ uri: currentTrack.cover }} style={styles.bgImage} blurRadius={80} />
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
          style={styles.bgGradient}
        />

        <BlurView intensity={20} tint="dark" style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>NOW PLAYING</Text>
            <View style={styles.headerDot} />
          </View>
          <Pressable onPress={() => setQueueVisible(true)} style={styles.headerBtn}>
            <Ionicons name="list" size={24} color="rgba(255,255,255,0.9)" />
            {queue.length > 0 && (
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>{queue.length > 9 ? '9+' : queue.length}</Text>
              </View>
            )}
          </Pressable>
        </BlurView>

        <View style={styles.artContainer}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <View style={styles.artShadow} />
            <Image
              source={{ uri: currentTrack.cover }}
              style={styles.albumArt}
              resizeMode="cover"
            />
            {isPlaying && (
              <View style={styles.playingIndicator}>
                <View style={styles.playingBar} />
                <View style={styles.playingBar} />
                <View style={styles.playingBar} />
                <View style={styles.playingBar} />
              </View>
            )}
          </Animated.View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoText}>
            <Text style={styles.trackTitle} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.trackArtist} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
          <View style={styles.infoActions}>
            <Pressable
              onPress={() => {
                if (!downloaded && !downloading) downloadTrack(currentTrack);
              }}
              style={styles.actionBtn}
              disabled={downloaded || downloading}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#1DB954" />
              ) : downloaded ? (
                <Ionicons name="checkmark-circle" size={26} color="#1DB954" />
              ) : (
                <Ionicons name="download-outline" size={26} color="rgba(255,255,255,0.6)" />
              )}
            </Pressable>
            <Pressable onPress={() => isLiked ? unlikeCurrentTrack() : likeCurrentTrack()} style={styles.actionBtn}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={28}
                color={isLiked ? '#ef4444' : 'rgba(255,255,255,0.6)'}
              />
            </Pressable>
          </View>
        </View>

        <ProgressBar progress={progress} duration={duration} onSeek={seek} />

        <View style={styles.controls}>
          <Pressable onPress={toggleShuffle} style={styles.controlBtn}>
            <Ionicons name="shuffle" size={24} color={shuffle ? '#1DB954' : 'rgba(255,255,255,0.5)'} />
          </Pressable>

          <Pressable onPress={prev} style={styles.controlBtn}>
            <Ionicons name="play-skip-back" size={36} color="#fff" />
          </Pressable>

          <Pressable onPress={togglePlay} style={styles.playBtn}>
            <LinearGradient
              colors={['#fff', '#f5f5f5']}
              style={styles.playBtnGradient}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#000" style={isPlaying ? undefined : { marginLeft: 4 }} />
            </LinearGradient>
          </Pressable>

          <Pressable onPress={next} style={styles.controlBtn}>
            <Ionicons name="play-skip-forward" size={36} color="#fff" />
          </Pressable>

          <Pressable onPress={toggleRepeat} style={styles.controlBtn}>
            <Ionicons
              name="repeat"
              size={24}
              color={repeat !== 'off' ? '#1DB954' : 'rgba(255,255,255,0.5)'}
            />
            {repeat === 'one' && <View style={styles.repeatOneDot} />}
          </Pressable>
        </View>

        <VolumeSlider volume={volume} onVolumeChange={setVolume} />

        <BlurView intensity={20} tint="dark" style={styles.toolbar}>
          <Pressable
            style={[styles.toolbarBtn, sleepMinutes !== null && styles.toolbarBtnActive]}
            onPress={() => setSleepVisible(true)}
          >
            <Ionicons name="moon" size={18} color={sleepMinutes !== null ? '#a78bfa' : 'rgba(255,255,255,0.5)'} />
            <Text style={[styles.toolbarLabel, sleepMinutes !== null && styles.toolbarLabelActive]}>
              Sleep
            </Text>
          </Pressable>

          <Pressable
            style={[styles.toolbarBtn, playbackSpeed !== 1 && styles.toolbarBtnBlue]}
            onPress={() => setSettingsVisible(true)}
          >
            <Ionicons name="speedometer-outline" size={18} color={playbackSpeed !== 1 ? '#60a5fa' : 'rgba(255,255,255,0.5)'} />
            <Text style={[styles.toolbarLabel, playbackSpeed !== 1 && styles.toolbarLabelBlue]}>
              {playbackSpeed}x
            </Text>
          </Pressable>

          <Pressable style={styles.toolbarBtn} onPress={() => setSettingsVisible(true)}>
            <Ionicons name="musical-note-outline" size={18} color="rgba(255,255,255,0.5)" />
            <Text style={styles.toolbarLabel}>{quality.replace('kbps', '')}</Text>
          </Pressable>

          <Pressable style={styles.toolbarBtn} onPress={() => setEqVisible(true)}>
            <Ionicons name="options-outline" size={18} color="rgba(255,255,255,0.5)" />
            <Text style={styles.toolbarLabel}>EQ</Text>
          </Pressable>
        </BlurView>

        <View style={styles.dragHandle} />

        <QueueManager visible={queueVisible} onClose={() => setQueueVisible(false)} />
        <SleepTimerSheet visible={sleepVisible} onClose={() => setSleepVisible(false)} />
        <PlaybackSettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
        <EqualizerPanel visible={eqVisible} onClose={() => setEqVisible(false)} />
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bgGradient: { ...StyleSheet.absoluteFillObject },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerBtn: { padding: 8 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 2 },
  headerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#1DB954' },
  queueBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#1DB954', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#1DB954', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4 },
  queueBadgeText: { fontSize: 10, color: '#000', fontWeight: '800' },
  artContainer: { alignItems: 'center', paddingVertical: 40, flex: 1, justifyContent: 'center' },
  artShadow: { position: 'absolute', width: width - 60, height: width - 60, borderRadius: 24, backgroundColor: '#1DB954', opacity: 0.15, top: 20, left: 0, right: 0, marginHorizontal: 'auto' },
  albumArt: { width: width - 60, height: width - 60, borderRadius: 24, backgroundColor: '#1a1a1a', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.6, shadowRadius: 30, elevation: 20 },
  playingIndicator: { position: 'absolute', bottom: 20, right: 20, flexDirection: 'row', alignItems: 'flex-end', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  playingBar: { width: 3, height: 16, backgroundColor: '#1DB954', borderRadius: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, marginBottom: 24 },
  infoText: { flex: 1 },
  trackTitle: { fontSize: 26, color: '#fff', fontWeight: '800', letterSpacing: -0.5 },
  trackArtist: { fontSize: 16, color: 'rgba(255,255,255,0.65)', marginTop: 6, fontWeight: '500' },
  infoActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionBtn: { padding: 8 },
  progressSection: { paddingHorizontal: 28, marginBottom: 20 },
  progressTrack: { height: 44, justifyContent: 'center', position: 'relative' },
  progressBg: { position: 'absolute', left: 0, right: 0, height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3 },
  progressFill: { position: 'absolute', left: 0, height: 6, borderRadius: 3 },
  progressThumb: { position: 'absolute', top: 19, width: 16, height: 16, backgroundColor: '#fff', borderRadius: 8, marginLeft: -8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 28, paddingHorizontal: 20 },
  controlBtn: { padding: 12 },
  playBtn: { width: 76, height: 76, borderRadius: 38 },
  playBtnGradient: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', shadowColor: '#fff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12 },
  repeatOneDot: { position: 'absolute', top: 8, right: 8, width: 5, height: 5, backgroundColor: '#1DB954', borderRadius: 3 },
  volumeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, gap: 16, marginBottom: 20 },
  volumeIcon: { padding: 4 },
  volumeTrack: { flex: 1, height: 44, justifyContent: 'center', position: 'relative' },
  volumeBg: { position: 'absolute', left: 0, right: 0, height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3 },
  volumeFill: { position: 'absolute', left: 0, height: 6, borderRadius: 3 },
  volumeThumb: { position: 'absolute', top: 19, width: 16, height: 16, backgroundColor: '#fff', borderRadius: 8, marginLeft: -8, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, paddingVertical: 16, marginHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  toolbarBtnActive: { backgroundColor: 'rgba(167,139,250,0.2)' },
  toolbarBtnBlue: { backgroundColor: 'rgba(96,165,250,0.2)' },
  toolbarLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  toolbarLabelActive: { color: '#a78bfa' },
  toolbarLabelBlue: { color: '#60a5fa' },
  dragHandle: { width: 50, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, alignSelf: 'center', marginTop: 16, marginBottom: 20 },
});
