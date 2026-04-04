import React, { useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  Animated, PanResponder, StyleSheet, Dimensions, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer, AudioQuality } from '../context/PlayerContext';
import { QUALITY_OPTIONS, PLAYBACK_SPEED_OPTIONS } from '../lib/constants';

const { height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

const QUALITY_INFO: Record<AudioQuality, { label: string; desc: string; color: string }> = {
  '96kbps':  { label: '96',  desc: 'Data saver',    color: '#f59e0b' },
  '160kbps': { label: '160', desc: 'Standard',      color: '#1DB954' },
  '320kbps': { label: '320', desc: 'High quality',  color: '#3b82f6' },
};

export const PlaybackSettingsSheet: React.FC<Props> = ({ visible, onClose }) => {
  const { quality, setQuality, playbackSpeed, setPlaybackSpeed } = usePlayer();

  const slideY = useRef(new Animated.Value(height)).current;

  const handleShow = useCallback(() => {
    Animated.spring(slideY, {
      toValue: 0, useNativeDriver: true, tension: 65, friction: 11,
    }).start();
  }, [slideY]);

  const handleClose = useCallback(() => {
    Animated.timing(slideY, {
      toValue: height, duration: 220, useNativeDriver: true,
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

  const speedLabel = (s: number) => s === 1 ? 'Normal' : `${s}x`;

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
            <Ionicons name="settings-outline" size={20} color="#60a5fa" />
            <Text style={styles.headerTitle}>Playback Settings</Text>
          </View>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* ── Audio Quality ── */}
          <Text style={styles.sectionLabel}>AUDIO QUALITY</Text>
          <View style={styles.qualityGrid}>
            {QUALITY_OPTIONS.map(({ value }) => {
              const info = QUALITY_INFO[value];
              const isActive = quality === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.qualityCard, isActive && { borderColor: info.color, backgroundColor: `${info.color}18` }]}
                  onPress={() => setQuality(value)}
                  activeOpacity={0.7}
                >
                  {isActive && <View style={[styles.qualityActiveDot, { backgroundColor: info.color }]} />}
                  <Text style={[styles.qualityValue, isActive && { color: info.color }]}>
                    {info.label}
                  </Text>
                  <Text style={styles.qualityUnit}>kbps</Text>
                  <Text style={[styles.qualityDesc, isActive && { color: info.color, opacity: 0.8 }]}>
                    {info.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quality note */}
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={14} color="#555" />
            <Text style={styles.noteText}>
              Higher quality uses more data. Changes apply to next song.
            </Text>
          </View>

          {/* ── Playback Speed ── */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>PLAYBACK SPEED</Text>

          {/* Speed display */}
          <View style={styles.speedDisplay}>
            <TouchableOpacity
              style={styles.speedArrow}
              onPress={() => {
                const idx = PLAYBACK_SPEED_OPTIONS.indexOf(playbackSpeed);
                if (idx > 0) setPlaybackSpeed(PLAYBACK_SPEED_OPTIONS[idx - 1]);
              }}
              activeOpacity={0.7}
              disabled={playbackSpeed <= PLAYBACK_SPEED_OPTIONS[0]}
            >
              <Ionicons
                name="remove"
                size={22}
                color={playbackSpeed <= PLAYBACK_SPEED_OPTIONS[0] ? '#333' : '#fff'}
              />
            </TouchableOpacity>

            <View style={styles.speedCenter}>
              <Text style={styles.speedValue}>{playbackSpeed}x</Text>
              <Text style={styles.speedLabel}>{speedLabel(playbackSpeed)}</Text>
            </View>

            <TouchableOpacity
              style={styles.speedArrow}
              onPress={() => {
                const idx = PLAYBACK_SPEED_OPTIONS.indexOf(playbackSpeed);
                if (idx < PLAYBACK_SPEED_OPTIONS.length - 1) setPlaybackSpeed(PLAYBACK_SPEED_OPTIONS[idx + 1]);
              }}
              activeOpacity={0.7}
              disabled={playbackSpeed >= PLAYBACK_SPEED_OPTIONS[PLAYBACK_SPEED_OPTIONS.length - 1]}
            >
              <Ionicons
                name="add"
                size={22}
                color={playbackSpeed >= PLAYBACK_SPEED_OPTIONS[PLAYBACK_SPEED_OPTIONS.length - 1] ? '#333' : '#fff'}
              />
            </TouchableOpacity>
          </View>

          {/* Speed chips */}
          <View style={styles.speedChips}>
            {PLAYBACK_SPEED_OPTIONS.map((s) => {
              const isActive = playbackSpeed === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.speedChip, isActive && styles.speedChipActive]}
                  onPress={() => setPlaybackSpeed(s)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.speedChipText, isActive && styles.speedChipTextActive]}>
                    {s}x
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reset to normal */}
          {playbackSpeed !== 1 && (
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => setPlaybackSpeed(1)}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={16} color="#60a5fa" />
              <Text style={styles.resetText}>Reset to normal speed</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
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
    maxHeight: height * 0.75,
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 1.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Quality
  qualityGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  qualityCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    position: 'relative',
  },
  qualityActiveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  qualityValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  qualityUnit: {
    fontSize: 11,
    color: '#555',
    fontWeight: '600',
    marginTop: 1,
  },
  qualityDesc: {
    fontSize: 11,
    color: '#555',
    fontWeight: '600',
    marginTop: 6,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    color: '#444',
    lineHeight: 16,
  },

  // Speed
  speedDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  speedArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  speedCenter: {
    flex: 1,
    alignItems: 'center',
  },
  speedValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#60a5fa',
    fontVariant: ['tabular-nums'],
  },
  speedLabel: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
    marginTop: 2,
  },
  speedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speedChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  speedChipActive: {
    backgroundColor: 'rgba(96,165,250,0.15)',
    borderColor: '#60a5fa',
  },
  speedChipText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '700',
  },
  speedChipTextActive: {
    color: '#60a5fa',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(96,165,250,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.15)',
  },
  resetText: {
    fontSize: 14,
    color: '#60a5fa',
    fontWeight: '600',
  },
});
