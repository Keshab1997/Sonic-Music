import React, { useRef, useCallback, useState, useMemo, memo, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, Modal,
  Dimensions, PanResponder, Animated, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { useDownloadsContext } from '../context/DownloadsContext';
import { lightHaptic, mediumHaptic } from '../lib/haptics';
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

// Progress bar with working drag
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
      progressBarRef.current?.measure((x, y, w, h, px, py) => {
        const relX = Math.max(0, Math.min(e.nativeEvent.pageX - px, w));
        setSeekValue((relX / w) * duration);
      });
    },
    onPanResponderMove: (e) => {
      progressBarRef.current?.measure((x, y, w, h, px, py) => {
        const relX = Math.max(0, Math.min(e.nativeEvent.pageX - px, w));
        setSeekValue((relX / w) * duration);
      });
    },
    onPanResponderRelease: (e) => {
      progressBarRef.current?.measure((x, y, w, h, px, py) => {
        const relX = Math.max(0, Math.min(e.nativeEvent.pageX - px, w));
        const newTime = (relX / w) * duration;
        onSeek(newTime);
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

// Volume slider with working drag
const VolumeSlider = memo(({ volume, onVolumeChange }: { volume: number; onVolumeChange: (v: number) => void }) => {
  const volumeBarRef = useRef<View>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [tempVolume, setTempVolume] = useState(volume);
  
  const displayVolume = adjusting ? tempVolume : volume;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      setAdjusting(true);
      volumeBarRef.current?.measure((x, y, w, h, px, py) => {
        const relX = Math.max(0, Math.min(e.nativeEvent.pageX - px, w));
        setTempVolume(relX / w);
      });
    },
    onPanResponderMove: (e) => {
      volumeBarRef.current?.measure((x, y, w, h, px, py) => {
        const relX = Math.max(0, Math.min(e.nativeEvent.pageX - px, w));
        setTempVolume(relX / w);
      });
    },
    onPanResponderRelease: (e) => {
      volumeBarRef.current?.measure((x, y, w, h, px, py) => {
        const relX = Math.max(0, Math.min(e.nativeEvent.pageX - px, w));
        const newVol = relX / w;
        onVolumeChange(newVol);
        setAdjusting(false);
      });
    },
  }), [onVolumeChange]);

  return (
    <View style={styles.volumeRow}>
      <TouchableOpacity onPress={() => onVolumeChange(0)} activeOpacity={0.7}>
        <Ionicons name={displayVolume === 0 ? "volume-mute" : "volume-low"} size={20} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
      <View 
        ref={volumeBarRef}
        style={styles.volumeTrack}
        {...panResponder.panHandlers}
      >
        <View style={[styles.volumeFill, { width: `${displayVolume * 100}%` }]} />
        <View style={[styles.volumeThumb, { left: `${displayVolume * 100}%` }]} />
      </View>
      <TouchableOpacity onPress={() => onVolumeChange(1)} activeOpacity={0.7}>
        <Ionicons name="volume-high" size={20} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </View>
  );
});

interface Props {
  visible: boolean;
  onClose: () => void;
}

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
  const { isDownloaded, isDownloading, downloadTrack } = useDownloadsContext();

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
  
  // Memoized handlers with haptics
  const handleTogglePlay = useCallback(() => { togglePlay(); lightHaptic(); }, [togglePlay]);
  const handleNext = useCallback(() => { next(); mediumHaptic(); }, [next]);
  const handlePrev = useCallback(() => { prev(); mediumHaptic(); }, [prev]);
  const handleToggleShuffle = useCallback(() => { toggleShuffle(); lightHaptic(); }, [toggleShuffle]);
  const handleToggleRepeat = useCallback(() => { toggleRepeat(); lightHaptic(); }, [toggleRepeat]);
  
  const handleLike = useCallback(() => {
    if (isCurrentTrackLiked) unlikeCurrentTrack();
    else likeCurrentTrack();
    lightHaptic();
  }, [isCurrentTrackLiked, likeCurrentTrack, unlikeCurrentTrack]);
  
  const handleDownload = useCallback(() => {
    if (!currentTrack || isDownloaded(String(currentTrack.id)) || isDownloading(String(currentTrack.id))) return;
    downloadTrack(currentTrack);
    lightHaptic();
  }, [currentTrack, isDownloaded, isDownloading, downloadTrack]);
  
  // Seek forward/backward 10 seconds
  const handleSeekForward = useCallback(() => {
    const newTime = Math.min(duration, progress + 10);
    seek(newTime);
    lightHaptic();
  }, [progress, duration, seek]);
  
  const handleSeekBackward = useCallback(() => {
    const newTime = Math.max(0, progress - 10);
    seek(newTime);
    lightHaptic();
  }, [progress, seek]);

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
        {/* Background */}
        <Image source={{ uri: currentTrack.cover }} style={styles.bgImage} blurRadius={50} />
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
            style={[styles.albumArt, { transform: [{ scale: isPlaying ? 1 : 0.94 }] }]}
            resizeMode="cover"
          />
        </View>

        {/* Track Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoText}>
            <Text style={styles.trackTitle} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.trackArtist} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
          <View style={styles.infoActions}>
            <TouchableOpacity
              onPress={handleDownload}
              activeOpacity={0.7}
              style={styles.downloadBtn}
              disabled={isDownloaded(String(currentTrack.id)) || isDownloading(String(currentTrack.id))}
            >
              {isDownloading(String(currentTrack.id)) ? (
                <ActivityIndicator size="small" color="#1DB954" />
              ) : isDownloaded(String(currentTrack.id)) ? (
                <Ionicons name="checkmark-circle" size={24} color="#1DB954" />
              ) : (
                <Ionicons name="download-outline" size={24} color="rgba(255,255,255,0.5)" />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLike} activeOpacity={0.7} style={styles.likeBtn}>
              <Ionicons
                name={isCurrentTrackLiked ? 'heart' : 'heart-outline'}
                size={26}
                color={isCurrentTrackLiked ? '#ef4444' : 'rgba(255,255,255,0.5)'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar */}
        <ProgressBar progress={progress} duration={duration} onSeek={seek} />
        
        {/* Seek Buttons */}
        <View style={styles.seekButtons}>
          <TouchableOpacity onPress={handleSeekBackward} activeOpacity={0.7} style={styles.seekBtn}>
            <Ionicons name="play-back" size={20} color="rgba(255,255,255,0.7)" />
            <Text style={styles.seekText}>-10s</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSeekForward} activeOpacity={0.7} style={styles.seekBtn}>
            <Text style={styles.seekText}>+10s</Text>
            <Ionicons name="play-forward" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handleToggleShuffle} activeOpacity={0.7} style={styles.controlBtn}>
            <Ionicons name="shuffle" size={22} color={shuffle ? '#1DB954' : 'rgba(255,255,255,0.4)'} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePrev} activeOpacity={0.7} style={styles.controlBtn}>
            <Ionicons name="play-skip-back" size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleTogglePlay} activeOpacity={0.85} style={styles.playBtn}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#000" style={isPlaying ? undefined : { marginLeft: 3 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} activeOpacity={0.7} style={styles.controlBtn}>
            <Ionicons name="play-skip-forward" size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleToggleRepeat} activeOpacity={0.7} style={styles.controlBtn}>
            <Ionicons
              name="repeat"
              size={22}
              color={repeat !== 'off' ? '#1DB954' : 'rgba(255,255,255,0.4)'}
            />
            {repeat === 'one' && <View style={styles.repeatOneDot} />}
          </TouchableOpacity>
        </View>

        {/* Volume Slider */}
        <VolumeSlider volume={volume} onVolumeChange={setVolume} />

        {/* Toolbar */}
        <View style={styles.toolbar}>
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

          <TouchableOpacity style={styles.toolbarBtn} onPress={() => setSettingsVisible(true)} activeOpacity={0.7}>
            <Ionicons name="musical-note-outline" size={16} color="rgba(255,255,255,0.4)" />
            <Text style={styles.toolbarLabel}>{quality.replace('kbps', '')} kbps</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolbarBtn} onPress={() => setEqVisible(true)} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={16} color="rgba(255,255,255,0.4)" />
            <Text style={styles.toolbarLabel}>EQ</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dragHandle} />

        <QueueManager visible={queueVisible} onClose={() => setQueueVisible(false)} />
        <SleepTimerSheet visible={sleepVisible} onClose={() => setSleepVisible(false)} />
        <PlaybackSettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
        <EqualizerPanel visible={eqVisible} onClose={() => setEqVisible(false)} />
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 50 },
  headerBtn: { padding: 8 },
  headerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 2 },
  queueBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#1DB954', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  queueBadgeText: { fontSize: 9, color: '#000', fontWeight: '700' },
  artContainer: { alignItems: 'center', paddingVertical: 32, flex: 1, justifyContent: 'center' },
  albumArt: { width: width - 80, height: width - 80, borderRadius: 16, backgroundColor: '#1a1a1a', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  infoText: { flex: 1 },
  trackTitle: { fontSize: 22, color: '#fff', fontWeight: 'bold' },
  trackArtist: { fontSize: 15, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  infoActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  downloadBtn: { padding: 8 },
  likeBtn: { padding: 8 },
  progressSection: { paddingHorizontal: 24, marginBottom: 8 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, position: 'relative' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#1DB954', borderRadius: 3 },
  progressThumb: { position: 'absolute', top: -5, width: 16, height: 16, backgroundColor: '#fff', borderRadius: 8, marginLeft: -8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  seekButtons: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 40, marginBottom: 16 },
  seekBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 16 },
  seekText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 24 },
  controlBtn: { padding: 8 },
  playBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  repeatOneDot: { position: 'absolute', top: 4, right: 4, width: 4, height: 4, backgroundColor: '#1DB954', borderRadius: 2 },
  volumeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 12, marginBottom: 16 },
  volumeTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, position: 'relative' },
  volumeFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#fff', borderRadius: 3 },
  volumeThumb: { position: 'absolute', top: -3, width: 12, height: 12, backgroundColor: '#fff', borderRadius: 6, marginLeft: -6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 12 },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  toolbarBtnActive: { backgroundColor: 'rgba(167,139,250,0.15)' },
  toolbarBtnBlue: { backgroundColor: 'rgba(96,165,250,0.15)' },
  toolbarLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  toolbarLabelActive: { color: '#a78bfa' },
  toolbarLabelBlue: { color: '#60a5fa' },
  dragHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 16 },
});
