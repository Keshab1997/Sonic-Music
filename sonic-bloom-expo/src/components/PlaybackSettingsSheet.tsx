import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { AudioQuality } from '../service/AudioService';

const { height } = Dimensions.get('window');

const QUALITY_OPTIONS: { label: string; value: AudioQuality }[] = [
  { label: 'Low (96kbps)', value: '96kbps' },
  { label: 'Normal (160kbps)', value: '160kbps' },
  { label: 'High (320kbps)', value: '320kbps' },
];

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const PlaybackSettingsSheet: React.FC<Props> = ({ visible, onClose }) => {
  const { quality, setQuality, playbackSpeed, setPlaybackSpeed, crossfade, setCrossfade } = usePlayer();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.panel} activeOpacity={1} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Playback Settings</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Audio Quality */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Audio Quality</Text>
              {QUALITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionBtn, quality === opt.value && styles.optionBtnActive]}
                  onPress={() => setQuality(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, quality === opt.value && styles.optionTextActive]}>
                    {opt.label}
                  </Text>
                  {quality === opt.value && (
                    <Ionicons name="checkmark-circle" size={20} color="#1DB954" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Playback Speed */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Playback Speed</Text>
              <View style={styles.speedGrid}>
                {SPEED_OPTIONS.map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    style={[styles.speedBtn, playbackSpeed === speed && styles.speedBtnActive]}
                    onPress={() => setPlaybackSpeed(speed)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.speedText, playbackSpeed === speed && styles.speedTextActive]}>
                      {speed}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Crossfade */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Crossfade</Text>
              <View style={styles.crossfadeRow}>
                <TouchableOpacity
                  style={styles.crossfadeBtn}
                  onPress={() => setCrossfade(Math.max(0, crossfade - 1))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={18} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.crossfadeValue}>{crossfade}s</Text>
                <TouchableOpacity
                  style={styles.crossfadeBtn}
                  onPress={() => setCrossfade(Math.min(12, crossfade + 1))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  panel: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, maxHeight: height * 0.7 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  content: { padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, color: '#888', marginBottom: 12 },
  optionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#222' },
  optionBtnActive: { borderBottomColor: '#1DB954' },
  optionText: { fontSize: 15, color: '#fff' },
  optionTextActive: { color: '#1DB954', fontWeight: '600' },
  speedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  speedBtn: { backgroundColor: '#333', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  speedBtnActive: { backgroundColor: '#1DB954' },
  speedText: { fontSize: 14, color: '#fff' },
  speedTextActive: { color: '#000', fontWeight: '600' },
  crossfadeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  crossfadeBtn: { width: 36, height: 36, backgroundColor: '#333', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  crossfadeValue: { fontSize: 16, color: '#fff', width: 50, textAlign: 'center' },
});
