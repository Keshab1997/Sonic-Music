import React, { useRef, useCallback, useState, useMemo, memo } from 'react';
import {
  View, Text, Image, TouchableOpacity, Modal,
  Dimensions, PanResponder, Animated, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
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

// Memoized progress bar to avoid re-rendering the whole screen
const ProgressBar = memo(({ progress, duration, onSeek }: { progress: number; duration: number; onSeek: (t: number) => void }) => {
  const progressBarRef = useRef<View>(null);
  const [seeking, setSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const displayProgress = seeking ? seekValue : progress;
  const progressPercent = duration > 0 ? (displayProgress / duration) * 100 : 0;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      setSeeking(true);
      progressBarRef.current?.measure((_, __, ___, ____, barX) => {
        const relX = Math.max(0, Math.min(e.nativeEvent.pageX - barX, width - 48));
        setSeekValue((relX / (width - 48)) * duration);
      });
    },
    onPanResponderMove: (e) => {
      progressBarRef.current?.measure((_, __, ___, ____, barX) => {
        const relX = Math.max(0, Math.min(e.nativeEvent.pageX - barX, width - 48));
        setSeekValue((relX / (width - 48)) * duration);
      });
    },
    onPanResponderRelease: (e) => {
      progressBarRef.current?.measure((_, __, ___, ____, barX) => {
        const relX = Math.max(0, Math.min(e.nativeEvent.pageX - barX, width - 48));
        onSeek((relX / (width - 48)) * duration);
        setSeeking(false);
      });
    },
  }), [duration, onSeek]);

  return (
    <View style={styles.progressSection}>
      <View
        ref={progressBarRef}
        style={styles.progressTrack}
        {...panResponder.panHandlers}
      >
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        <View style={[styles.progressThumb, { left: `${progressPercent}%` }]} />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(displayProgress)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
});

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

  // Swipe down to close
  const translateY = useRef(new Animated.Value(0)).current;
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

  const handleModalShow = useCallback(() => {
    translateY.setValue(0);
  }, [translateY]);

  if (!currentTrack) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onShow={handleModalShow}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.container, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
        {/* Background - no blur for performance */}
        <Image source={{ uri: currentTrack.cover }} style={styles.bgImage} />
        <View style={styles.bgOverlay} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerLabel}>NOW PLAYING</Text>
          <TouchableOpacity onPress={() => setQueueVisible(true)} style={styles.headerBtn} activeOpacity={0.7}>
            <View>
              <Ionicons name="list" size={22} color="rgba(255,255,255,0.7)" />
              {queue.length > 0 && (
                <View style={styles.queueBadge}>
                  <Text style={styles.queueBadgeText}>{queue.length > 9 ? '9+' : queue.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Album Art */}
        <View style={styles.artContainer}>
          <Image
            source={{ uri: currentTrack.cover }}
            style={[styles.albumArt, { transform: [{ scale: isPlaying ? 1 : 0.92 }] }]}
          />
        </View>

        {/* Track Info + Like */}
        <View style={styles.infoRow}>
          <View style={styles.infoText}>
            <Text style={styles.trackTitle} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.trackArtist} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
          <TouchableOpacity
            onPress={() => isCurrentTrackLiked ? unlikeCurrentTrack() : likeCurrentTrack()}
            activeOpacity={0.7}
            style={styles.likeBtn}
          >
            <Ionicons
              name={isCurrentTrackLiked ? 'heart' : 'heart-outline'}
              size={26}
              color={isCurrentTrackLiked ? '#ef4444' : 'rgba(255,255,255,0.5)'}
            />
          </TouchableOpacity>
        </View>

        {/* Progress Bar - memoized */}
        <ProgressBar progress={progress} duration={duration} onSeek={seek} />

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={toggleShuffle} activeOpacity={0.7} style={styles.controlBtn}>
            <Ionicons name="shuffle" size={22} color={shuffle ? '#1DB954' : 'rgba(255,255,255,0.4)'} />
          </TouchableOpacity>

          <TouchableOpacity onPress={prev} activeOpacity={0.7} style={styles.controlBtn}>
            <Ionicons name="play-skip-back" size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlay} activeOpacity={0.85} style={styles.playBtn}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#000" style={isPlaying ? undefined : { marginLeft: 3 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={next} activeOpacity={0.7} style={styles.controlBtn}>
            <Ionicons name="play-skip-forward" size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleRepeat} activeOpacity={0.7} style={styles.controlBtn}>
            <Ionicons
              name="repeat"
              size={22}
              color={repeat !== 'off' ? '#1DB954' : 'rgba(255,255,255,0.4)'}
            />
            {repeat === 'one' && (
              <View style={styles.repeatOneDot} />
            )}
          </TouchableOpacity>
        </View>

        {/* Volume */}
        <View style={styles.volumeRow}>
          <Ionicons name="volume-low" size={18} color="rgba(255,255,255,0.4)" />
          <View style={styles.volumeTrack}>
            <View style={[styles.volumeFill, { width: `${volume * 100}%` }]} />
            <View style={[styles.volumeThumb, { left: `${volume * 100}%` }]} />
          </View>
          <Ionicons name="volume-high" size={18} color="rgba(255,255,255,0.4)" />
        </View>

        {/* Volume tap zones */}
        <View style={styles.volumeTapRow}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setVolume(Math.max(0, volume - 0.1))} activeOpacity={0.5} />
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setVolume(Math.min(1, volume + 0.1))} activeOpacity={0.5} />
        </View>

        {/* Toolbar: Sleep + Settings */}
        <View style={styles.toolbar}>
          {/* Sleep Timer */}
          <TouchableOpacity
            style={[styles.toolbarBtn, sleepMinutes !== null && styles.toolbarBtnActive]}
            onPress={() => setSleepVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="moon" size={16} color={sleepMinutes !== null ? '#a78bfa' : 'rgba(255,255,255,0.4)'} />
            <Text style={[styles.toolbarLabel, sleepMinutes !== null && styles.toolbarLabelActive]}>
              {sleepMinutes !== null ? 'Sleep On' : 'Sleep'}
            </Text>
          </TouchableOpacity>

          {/* Playback Speed */}
          <TouchableOpacity
            style={[styles.toolbarBtn, playbackSpeed !== 1 && styles.toolbarBtnBlue]}
            onPress={() => setSettingsVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="speedometer-outline" size={16} color={playbackSpeed !== 1 ? '#60a5fa' : 'rgba(255,255,255,0.4)'} />
            <Text style={[styles.toolbarLabel, playbackSpeed !== 1 && styles.toolbarLabelBlue]}>
              {playbackSpeed}x
            </Text>
          </TouchableOpacity>

          {/* Audio Quality */}
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => setSettingsVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="musical-note-outline" size={16} color="rgba(255,255,255,0.4)" />
            <Text style={styles.toolbarLabel}>{quality.replace('kbps', '')} kbps</Text>
          </TouchableOpacity>

          {/* Equalizer */}
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => setEqVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={16} color="rgba(255,255,255,0.4)" />
            <Text style={styles.toolbarLabel}>EQ</Text>
          </TouchableOpacity>
        </View>

        {/* Drag indicator */}
        <View style={styles.dragHandle} />

        {/* Queue Manager */}
        <QueueManager visible={queueVisible} onClose={() => setQueueVisible(false)} />

        {/* Sleep Timer */}
        <SleepTimerSheet visible={sleepVisible} onClose={() => setSleepVisible(false)} />

        {/* Playback Settings */}
        <PlaybackSettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

        {/* Equalizer */}
        <EqualizerPanel visible={eqVisible} onClose={() => setEqVisible(false)} />
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { padding: 8 },
  headerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 2 },
  queueBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#1DB954', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  queueBadgeText: { fontSize: 9, color: '#000', fontWeight: '700' },
  artContainer: { alignItems: 'center', paddingVertical: 24 },
  albumArt: { width: width - 80, height: width - 80, borderRadius: 12, backgroundColor: '#1a1a1a' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  infoText: { flex: 1 },
  trackTitle: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  trackArtist: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  likeBtn: { padding: 8 },
  progressSection: { paddingHorizontal: 24, marginBottom: 16 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, position: 'relative' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#1DB954', borderRadius: 2 },
  progressThumb: { position: 'absolute', top: -6, width: 16, height: 16, backgroundColor: '#fff', borderRadius: 8, marginLeft: -8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 20 },
  controlBtn: { padding: 8 },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  repeatOneDot: { position: 'absolute', top: 4, right: 4, width: 4, height: 4, backgroundColor: '#1DB954', borderRadius: 2 },
  volumeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 12, marginBottom: 4 },
  volumeTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, position: 'relative' },
  volumeFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#fff', borderRadius: 2 },
  volumeThumb: { position: 'absolute', top: -4, width: 12, height: 12, backgroundColor: '#fff', borderRadius: 6, marginLeft: -6 },
  volumeTapRow: { flexDirection: 'row', height: 24, marginHorizontal: 24 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 12, marginTop: 8 },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  toolbarBtnActive: { backgroundColor: 'rgba(167,139,250,0.15)' },
  toolbarBtnBlue: { backgroundColor: 'rgba(96,165,250,0.15)' },
  toolbarLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  toolbarLabelActive: { color: '#a78bfa' },
  toolbarLabelBlue: { color: '#60a5fa' },
  dragHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginTop: 16 },
});
