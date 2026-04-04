import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  Animated, PanResponder, StyleSheet, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { SLEEP_TIMER_OPTIONS } from '../lib/constants';

const { height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const SleepTimerSheet: React.FC<Props> = ({ visible, onClose }) => {
  const { sleepMinutes, setSleepTimer, cancelSleepTimer } = usePlayer();

  // Live countdown display
  const [remainingText, setRemainingText] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // We track when the timer was set to compute remaining time
  const timerSetAtRef = useRef<number | null>(null);
  const timerDurationRef = useRef<number | null>(null);

  useEffect(() => {
    if (sleepMinutes !== null) {
      // Record when timer was set
      if (timerDurationRef.current !== sleepMinutes) {
        timerSetAtRef.current = Date.now();
        timerDurationRef.current = sleepMinutes;
      }
      // Start countdown
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (timerSetAtRef.current === null || timerDurationRef.current === null) return;
        const elapsed = (Date.now() - timerSetAtRef.current) / 1000;
        const totalSecs = timerDurationRef.current * 60;
        const remaining = Math.max(0, totalSecs - elapsed);
        const m = Math.floor(remaining / 60);
        const s = Math.floor(remaining % 60);
        setRemainingText(`${m}:${s.toString().padStart(2, '0')}`);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      timerSetAtRef.current = null;
      timerDurationRef.current = null;
      setRemainingText('');
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [sleepMinutes]);

  // Bottom sheet animation
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
      duration: 220,
      useNativeDriver: true,
    }).start(onClose);
  }, [slideY, onClose]);

  const dragPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => { if (g.dy > 0) slideY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80) handleClose();
        else Animated.spring(slideY, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const handleSelect = useCallback((minutes: number) => {
    timerSetAtRef.current = Date.now();
    timerDurationRef.current = minutes;
    setSleepTimer(minutes);
    handleClose();
  }, [setSleepTimer, handleClose]);

  const handleCancel = useCallback(() => {
    cancelSleepTimer();
    timerSetAtRef.current = null;
    timerDurationRef.current = null;
    handleClose();
  }, [cancelSleepTimer, handleClose]);

  const formatOption = (min: number) => {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h} hr` : `${h}h ${m}m`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={handleShow}
      onRequestClose={handleClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>
        {/* Drag handle */}
        <View style={styles.dragArea} {...dragPan.panHandlers}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="moon" size={20} color="#a78bfa" />
            <Text style={styles.headerTitle}>Sleep Timer</Text>
          </View>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        {/* Active timer display */}
        {sleepMinutes !== null && remainingText !== '' && (
          <View style={styles.activeTimer}>
            <View style={styles.activeTimerInner}>
              <Ionicons name="timer-outline" size={22} color="#a78bfa" />
              <View style={styles.activeTimerText}>
                <Text style={styles.activeTimerLabel}>Music stops in</Text>
                <Text style={styles.activeTimerCountdown}>{remainingText}</Text>
              </View>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Options grid */}
        <Text style={styles.sectionLabel}>
          {sleepMinutes !== null ? 'CHANGE TIMER' : 'STOP AFTER'}
        </Text>

        <View style={styles.grid}>
          {SLEEP_TIMER_OPTIONS.map((min) => {
            const isActive = sleepMinutes === min;
            return (
              <TouchableOpacity
                key={min}
                style={[styles.option, isActive && styles.optionActive]}
                onPress={() => handleSelect(min)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionValue, isActive && styles.optionValueActive]}>
                  {min < 60 ? min : Math.floor(min / 60)}
                </Text>
                <Text style={[styles.optionUnit, isActive && styles.optionUnitActive]}>
                  {min < 60 ? 'min' : min % 60 === 0 ? 'hr' : `h ${min % 60}m`}
                </Text>
                {isActive && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* End of song option */}
        <TouchableOpacity
          style={styles.endOfSongBtn}
          onPress={() => handleSelect(999)}
          activeOpacity={0.7}
        >
          <Ionicons name="musical-note-outline" size={18} color="rgba(255,255,255,0.5)" />
          <Text style={styles.endOfSongText}>Stop after current song</Text>
          {sleepMinutes === 999 && (
            <Ionicons name="checkmark-circle" size={18} color="#1DB954" />
          )}
        </TouchableOpacity>

        {/* Cancel if active */}
        {sleepMinutes !== null && (
          <TouchableOpacity
            style={styles.cancelFullBtn}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
            <Text style={styles.cancelFullText}>Turn off sleep timer</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 36,
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  activeTimer: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(167,139,250,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
    padding: 14,
  },
  activeTimerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeTimerText: {
    flex: 1,
  },
  activeTimerLabel: {
    fontSize: 11,
    color: 'rgba(167,139,250,0.7)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeTimerCountdown: {
    fontSize: 28,
    fontWeight: '800',
    color: '#a78bfa',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  option: {
    width: '30%',
    aspectRatio: 1.1,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    position: 'relative',
  },
  optionActive: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderColor: '#a78bfa',
  },
  optionValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  optionValueActive: {
    color: '#a78bfa',
  },
  optionUnit: {
    fontSize: 11,
    color: '#555',
    fontWeight: '600',
    marginTop: 2,
  },
  optionUnitActive: {
    color: 'rgba(167,139,250,0.8)',
  },
  activeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#a78bfa',
  },
  endOfSongBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  endOfSongText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  cancelFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
  },
  cancelFullText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
});
