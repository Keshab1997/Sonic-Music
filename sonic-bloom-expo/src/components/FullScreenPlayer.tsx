import React, { useRef, useCallback, useState } from 'react';
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

  // Seek bar drag
  const [seeking, setSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const progressBarRef = useRef<View>(null);
  const progressBarWidth = useRef(width - 48);

  const handleProgressTouch = useCallback((pageX: number, barX: number) => {
    const relX = Math.max(0, Math.min(pageX - barX, progressBarWidth.current));
    const ratio = relX / progressBarWidth.current;
    return ratio * duration;
  }, [duration]);

  const progressPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setSeeking(true);
        progressBarRef.current?.measure((_, __, ___, ____, pageX) => {
          const val = handleProgressTouch(e.nativeEvent.pageX, pageX);
          setSeekValue(val);
        });
      },
      onPanResponderMove: (e) => {
        progressBarRef.current?.measure((_, __, ___, ____, pageX) => {
          const val = handleProgressTouch(e.nativeEvent.pageX, pageX);
          setSeekValue(val);
        });
      },
      onPanResponderRelease: (e) => {
        progressBarRef.current?.measure((_, __, ___, ____, pageX) => {
          const val = handleProgressTouch(e.nativeEvent.pageX, pageX);
          seek(val);
          setSeeking(false);
        });
      },
    })
  ).current;

  if (!currentTrack) return null;

  const displayProgress = seeking ? seekValue : progress;
  const progressPercent = duration > 0 ? (displayProgress / duration) * 100 : 0;

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
        {/* Blurred Background */}
        <Image source={{ uri: currentTrack.cover }} style={styles.bgImage} blurRadius={25} />
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

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View
            ref={progressBarRef}
            style={styles.progressTrack}
            {...progressPanResponder.panHandlers}
            onLayout={(e) => { progressBarWidth.current = e.nativeEvent.layout.width; }}
          >
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            <View style={[styles.progressThumb, { left: `${progressPercent}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(displayProgress)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

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
              name={repeat === 'one' ? 'repeat' : 'repeat'}
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
            <TouchableOpacity
              style={[styles.volumeThumb, { left: `${volume * 100}%` }]}
              onPress={() => {}}
            />
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
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    letterSpacing: 2,
  },
  artContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  albumArt: {
    width: width - 80,
    height: width - 80,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
  },
  likeBtn: {
    padding: 8,
    marginLeft: 12,
  },
  progressSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    marginLeft: -7,
    top: -5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  controlBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  repeatOneDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1DB954',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 4,
  },
  volumeTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 2,
  },
  volumeThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginLeft: -6,
    top: -4,
  },
  volumeTapRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    height: 24,
    marginBottom: 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  queueBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  queueBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
    gap: 12,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  toolbarBtnActive: {
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderColor: 'rgba(167,139,250,0.3)',
  },
  toolbarLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  toolbarLabelActive: {
    color: '#a78bfa',
  },
  toolbarBtnBlue: {
    backgroundColor: 'rgba(96,165,250,0.12)',
    borderColor: 'rgba(96,165,250,0.3)',
  },
  toolbarLabelBlue: {
    color: '#60a5fa',
  },
});
