import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface OptimizedControlsProps {
  isPlaying: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
}

export const OptimizedControls = memo<OptimizedControlsProps>(({
  isPlaying,
  shuffle,
  repeat,
  onTogglePlay,
  onNext,
  onPrev,
  onToggleShuffle,
  onToggleRepeat,
}) => {
  const handlePrev = () => { onPrev(); Vibration.vibrate(20); };
  const handleNext = () => { onNext(); Vibration.vibrate(20); };

  return (
    <View style={styles.controls}>
      <TouchableOpacity onPress={onToggleShuffle} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} delayPressIn={0} style={[styles.controlBtn, shuffle && styles.controlBtnActive]}>
        <Ionicons name="shuffle" size={22} color={shuffle ? '#1DB954' : 'rgba(255,255,255,0.5)'} />
      </TouchableOpacity>

      <TouchableOpacity onPress={handlePrev} activeOpacity={0.6} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} delayPressIn={0} style={styles.trackBtn}>
        <Ionicons name="play-skip-back" size={28} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity onPress={onTogglePlay} activeOpacity={0.85} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} delayPressIn={0} style={styles.playBtn}>
        <LinearGradient colors={['#1DB954', '#1ed760']} style={styles.playBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#fff" style={isPlaying ? undefined : { marginLeft: 3 }} />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleNext} activeOpacity={0.6} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} delayPressIn={0} style={styles.trackBtn}>
        <Ionicons name="play-skip-forward" size={28} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity onPress={onToggleRepeat} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} delayPressIn={0} style={[styles.controlBtn, repeat !== 'off' && styles.controlBtnActive]}>
        <Ionicons name="repeat" size={22} color={repeat !== 'off' ? '#1DB954' : 'rgba(255,255,255,0.5)'} />
        {repeat === 'one' && <View style={styles.repeatOneDot} />}
      </TouchableOpacity>
    </View>
  );
}, (prev, next) => {
  // Custom comparison - only re-render if these specific props change
  return prev.isPlaying === next.isPlaying &&
    prev.shuffle === next.shuffle &&
    prev.repeat === next.repeat;
});

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 },
  controlBtn: { padding: 12, borderRadius: 24 },
  controlBtnActive: { backgroundColor: 'rgba(29,185,84,0.1)' },
  trackBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  playBtn: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', shadowColor: '#1DB954', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  playBtnGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  repeatOneDot: { position: 'absolute', top: 6, right: 6, width: 6, height: 6, backgroundColor: '#1DB954', borderRadius: 3 },
});
