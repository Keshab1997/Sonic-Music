import React, { useRef, useCallback, useState, useMemo, memo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  Dimensions, PanResponder, Animated, StyleSheet,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '../context/PlayerContext';
import { QueueManager } from './QueueManager';
import { SleepTimerSheet } from './SleepTimerSheet';
import { PlaybackSettingsSheet } from './PlaybackSettingsSheet';
import { EqualizerPanel } from './EqualizerPanel';
import { CachedImage } from './CachedImage';
import { OptimizedControls } from './OptimizedControls';

const { width, height } = Dimensions.get('window');

const formatTime = (s: number) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

// Memoized progress bar with improved seek
const ProgressBar = memo(({ progress, duration, onSeek }: { progress: number; duration: number; onSeek: (t: number) => void }) => {
  const progressBarRef = useRef<View>(null);
  const [seeking, setSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [showTimeTooltip, setShowTimeTooltip] = useState(false);
  const displayProgress = seeking ? seekValue : progress;
  const progressPercent = duration > 0 ? (displayProgress / duration) * 100 : 0;

  const handleSeek = useCallback((pageX: number) => {
    progressBarRef.current?.measure((_, __, barWidth, ____, barX) => {
      const relX = Math.max(0, Math.min(pageX - barX, barWidth));
      const time = (relX / barWidth) * duration;
      setSeekValue(time);
    });
  }, [duration]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (e) => {
      setSeeking(true);
      setShowTimeTooltip(true);
      Vibration.vibrate(10);
      handleSeek(e.nativeEvent.pageX);
    },
    onPanResponderMove: (_, g) => {
      handleSeek(g.moveX);
    },
    onPanResponderRelease: (_, g) => {
      progressBarRef.current?.measure((_, __, barWidth, ____, barX) => {
        const relX = Math.max(0, Math.min(g.moveX - barX, barWidth));
        const time = (relX / barWidth) * duration;
        onSeek(time);
      });
      setSeeking(false);
      setTimeout(() => setShowTimeTooltip(false), 500);
    },
  }), [handleSeek, duration, onSeek]);

  return (
    <View style={styles.progressSection}>
      {showTimeTooltip && (
        <View style={[styles.timeTooltip, { left: `${Math.min(progressPercent, 95)}%` }]}>
          <Text style={styles.timeTooltipText}>{formatTime(displayProgress)}</Text>
        </View>
      )}
      <View
        ref={progressBarRef}
        style={styles.progressTrack}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={['#1DB954', '#1ed760']}
          style={[styles.progressFill, { width: `${progressPercent}%` }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <View style={[styles.progressThumb, { left: `${progressPercent}%` }]}>
          <View style={styles.progressThumbInner} />
        </View>
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(displayProgress)}</Text>
        <Text style={styles.timeText}>-{formatTime(Math.max(0, duration - displayProgress))}</Text>
      </View>
    </View>
  );
}, (prev, next) => {
  // Only re-render if progress changes by more than 1 second or duration changes
  return Math.floor(prev.progress) === Math.floor(next.progress) && 
    Math.floor(prev.duration) === Math.floor(next.duration);
});

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Memoized button components for better performance
const PlayButton = memo(({ isPlaying, onPress }: { isPlaying: boolean; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.playBtn}>
    <LinearGradient colors={['#1DB954', '#1ed760']} style={styles.playBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#fff" style={isPlaying ? undefined : { marginLeft: 3 }} />
    </LinearGradient>
  </TouchableOpacity>
));

const SkipButton = memo(({ direction, onPress }: { direction: 'back' | 'forward'; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={styles.trackBtn}>
    <Ionicons name={direction === 'back' ? 'play-skip-back' : 'play-skip-forward'} size={28} color="#fff" />
  </TouchableOpacity>
));

export const FullScreenPlayer: React.FC<Props> = memo(({ visible, onClose }) => {
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
  const [volumeSeeking, setVolumeSeeking] = useState(false);
  const [volumeSeekValue, setVolumeSeekValue] = useState(0);

  // Swipe down to close
  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onMoveShouldSetPanResponderCapture: (_, g) => g.dy > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80) {
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

  // Memoized sub-components to avoid re-renders
  const HeaderSection = useMemo(() => {
    // Format queue count properly
    const queueCount = queue.length > 99 ? '99+' : String(queue.length);
    
    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} delayPressIn={0}>
          <Ionicons name="chevron-down" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>NOW PLAYING</Text>
        <TouchableOpacity onPress={() => setQueueVisible(true)} style={styles.headerBtn} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} delayPressIn={0}>
          <View>
            <Ionicons name="list" size={22} color="rgba(255,255,255,0.7)" />
            {queue.length > 0 && (
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>{queueCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  }, [onClose, queue.length]);

  const ArtSection = useMemo(() => (
    <View style={styles.artContainer}>
      <CachedImage
        source={{ uri: currentTrack.cover }}
        style={[styles.albumArt, { transform: [{ scale: isPlaying ? 1 : 0.92 }] }]}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    </View>
  ), [currentTrack.cover, isPlaying]);

  const TrackInfo = useMemo(() => (
    <View style={styles.infoRow}>
      <View style={styles.infoText}>
        <Text style={styles.trackTitle} numberOfLines={1}>{currentTrack.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{currentTrack.artist}</Text>
      </View>
      <TouchableOpacity
        onPress={() => isCurrentTrackLiked ? unlikeCurrentTrack() : likeCurrentTrack()}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        delayPressIn={0}
        style={styles.likeBtn}
      >
        <Ionicons
          name={isCurrentTrackLiked ? 'heart' : 'heart-outline'}
          size={26}
          color={isCurrentTrackLiked ? '#ef4444' : 'rgba(255,255,255,0.5)'}
        />
      </TouchableOpacity>
    </View>
  ), [currentTrack.title, currentTrack.artist, isCurrentTrackLiked, likeCurrentTrack, unlikeCurrentTrack]);

  const handlePrev = useCallback(() => { prev(); Vibration.vibrate(20); }, [prev]);
  const handleNext = useCallback(() => { next(); Vibration.vibrate(20); }, [next]);

  // Use optimized controls component
  const ControlsSection = (
    <OptimizedControls
      isPlaying={isPlaying}
      shuffle={shuffle}
      repeat={repeat}
      onTogglePlay={togglePlay}
      onNext={next}
      onPrev={prev}
      onToggleShuffle={toggleShuffle}
      onToggleRepeat={toggleRepeat}
    />
  );

  // Volume refs and handlers (outside useMemo to follow Rules of Hooks)
  const volumeBarRef = useRef<View>(null);
  const displayVolume = volumeSeeking ? volumeSeekValue : volume;

  const handleVolumeSeek = useCallback((pageX: number) => {
    volumeBarRef.current?.measure((_, __, barWidth, ____, barX) => {
      const relX = Math.max(0, Math.min(pageX - barX, barWidth));
      const newVolume = relX / barWidth;
      if (volumeSeeking) {
        setVolumeSeekValue(newVolume);
      } else {
        setVolume(newVolume);
      }
    });
  }, [setVolume, volumeSeeking]);

  const volumePanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (e) => {
      setVolumeSeeking(true);
      volumeBarRef.current?.measure((_, __, barWidth, ____, barX) => {
        const relX = Math.max(0, Math.min(e.nativeEvent.pageX - barX, barWidth));
        const newVolume = relX / barWidth;
        setVolumeSeekValue(newVolume);
        setVolume(newVolume);
      });
    },
    onPanResponderMove: (_, g) => {
      volumeBarRef.current?.measure((_, __, barWidth, ____, barX) => {
        const relX = Math.max(0, Math.min(g.moveX - barX, barWidth));
        setVolumeSeekValue(relX / barWidth);
      });
    },
    onPanResponderRelease: () => {
      setVolume(volumeSeekValue);
      setVolumeSeeking(false);
    },
  }), [setVolume, volumeSeekValue]);

  const handleVolumeMute = useCallback(() => setVolume(0), [setVolume]);
  const handleVolumeMax = useCallback(() => setVolume(1), [setVolume]);

  const VolumeSection = (
    <View style={styles.volumeContainer}>
      <TouchableOpacity onPress={handleVolumeMute} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} delayPressIn={0} style={styles.volumeIconBtn}>
        <Ionicons name={displayVolume === 0 ? 'volume-mute' : displayVolume < 0.5 ? 'volume-low' : 'volume-high'} size={20} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
      <View ref={volumeBarRef} style={styles.volumeTrackNew} {...volumePanResponder.panHandlers}>
        <LinearGradient colors={['#1DB954', '#1ed760']} style={[styles.volumeFillNew, { width: `${displayVolume * 100}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        <View style={[styles.volumeThumbNew, { left: `${displayVolume * 100}%` }]}>
          <View style={styles.volumeThumbInner} />
        </View>
      </View>
      <TouchableOpacity onPress={handleVolumeMax} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} delayPressIn={0} style={styles.volumeIconBtn}>
        <Ionicons name="volume-high" size={20} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </View>
  );

  const handleOpenSleep = useCallback(() => setSleepVisible(true), []);
  const handleOpenSettings = useCallback(() => setSettingsVisible(true), []);
  const handleOpenEq = useCallback(() => setEqVisible(true), []);

  const ToolbarSection = (
    <View style={styles.toolbar}>
      <TouchableOpacity style={[styles.toolbarBtn, sleepMinutes !== null && styles.toolbarBtnActive]} onPress={handleOpenSleep} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} delayPressIn={0}>
        <Ionicons name="moon" size={16} color={sleepMinutes !== null ? '#a78bfa' : 'rgba(255,255,255,0.4)'} />
        <Text style={[styles.toolbarLabel, sleepMinutes !== null && styles.toolbarLabelActive]}>
          {sleepMinutes !== null ? 'Sleep On' : 'Sleep'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.toolbarBtn, playbackSpeed !== 1 && styles.toolbarBtnBlue]} onPress={handleOpenSettings} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} delayPressIn={0}>
        <Ionicons name="speedometer-outline" size={16} color={playbackSpeed !== 1 ? '#60a5fa' : 'rgba(255,255,255,0.4)'} />
        <Text style={[styles.toolbarLabel, playbackSpeed !== 1 && styles.toolbarLabelBlue]}>{playbackSpeed}x</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.toolbarBtn} onPress={handleOpenSettings} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} delayPressIn={0}>
        <Ionicons name="musical-note-outline" size={16} color="rgba(255,255,255,0.4)" />
        <Text style={styles.toolbarLabel}>{quality.replace('kbps', '')} kbps</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.toolbarBtn} onPress={handleOpenEq} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} delayPressIn={0}>
        <Ionicons name="options-outline" size={16} color="rgba(255,255,255,0.4)" />
        <Text style={styles.toolbarLabel}>EQ</Text>
      </TouchableOpacity>
    </View>
  );

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
        <CachedImage source={{ uri: currentTrack.cover }} style={styles.bgImage} contentFit="cover" />
        <View style={styles.bgOverlay} />

        {HeaderSection}
        {ArtSection}
        {TrackInfo}

        {/* Progress Bar - memoized */}
        <ProgressBar progress={progress} duration={duration} onSeek={seek} />

        {ControlsSection}
        {VolumeSection}
        {ToolbarSection}

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
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { padding: 8 },
  headerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 2 },
  queueBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#1DB954', borderRadius: 10, minWidth: 18, height: 18, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center' },
  queueBadgeText: { fontSize: 9, color: '#000', fontWeight: '700', textAlign: 'center' },
  artContainer: { alignItems: 'center', paddingVertical: 24 },
  albumArt: { width: width - 80, height: width - 80, borderRadius: 16, backgroundColor: '#1a1a1a', shadowColor: '#1DB954', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  infoText: { flex: 1 },
  trackTitle: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  trackArtist: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  likeBtn: { padding: 8 },
  
  // Progress Section
  progressSection: { paddingHorizontal: 24, marginBottom: 16, position: 'relative' },
  timeTooltip: { position: 'absolute', top: -30, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, transform: [{ translateX: -20 }], zIndex: 10 },
  timeTooltipText: { fontSize: 12, fontWeight: '600', color: '#000' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, position: 'relative' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  progressThumb: { position: 'absolute', top: -5, width: 18, height: 18, backgroundColor: '#fff', borderRadius: 9, marginLeft: -9, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
  progressThumbInner: { width: 8, height: 8, backgroundColor: '#1DB954', borderRadius: 4, position: 'absolute', top: 5, left: 5 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  
  // Controls
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 },
  controlBtn: { padding: 12, borderRadius: 24 },
  controlBtnActive: { backgroundColor: 'rgba(29,185,84,0.1)' },
  trackBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  playBtn: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', shadowColor: '#1DB954', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  playBtnGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  repeatOneDot: { position: 'absolute', top: 6, right: 6, width: 6, height: 6, backgroundColor: '#1DB954', borderRadius: 3 },
  
  // Volume
  volumeContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 12, marginBottom: 8 },
  volumeIconBtn: { padding: 8 },
  volumeTrackNew: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, position: 'relative' },
  volumeFillNew: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  volumeThumbNew: { position: 'absolute', top: -5, width: 18, height: 18, backgroundColor: '#fff', borderRadius: 9, marginLeft: -9, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
  volumeThumbInner: { width: 8, height: 8, backgroundColor: '#1DB954', borderRadius: 4, position: 'absolute', top: 5, left: 5 },
  
  // Toolbar
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 12, marginTop: 8 },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  toolbarBtnActive: { backgroundColor: 'rgba(167,139,250,0.15)' },
  toolbarBtnBlue: { backgroundColor: 'rgba(96,165,250,0.15)' },
  toolbarLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  toolbarLabelActive: { color: '#a78bfa' },
  toolbarLabelBlue: { color: '#60a5fa' },
  dragHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginTop: 16 },
});
