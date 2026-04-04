import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';

const { height } = Dimensions.get('window');

const EQ_PRESETS = [
  { name: 'Flat', key: 'flat' },
  { name: 'Rock', key: 'rock' },
  { name: 'Pop', key: 'pop' },
  { name: 'Bass', key: 'bass' },
  { name: 'Vocal', key: 'vocal' },
  { name: 'Treble', key: 'treble' },
  { name: 'Electronic', key: 'electronic' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const EqualizerPanel: React.FC<Props> = ({ visible, onClose }) => {
  const { eqBass, eqMid, eqTreble, setEqBass, setEqMid, setEqTreble, applyEqPreset } = usePlayer();

  const SliderRow: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => {
    const percent = ((value + 10) / 20) * 100;
    return (
      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <View style={styles.sliderContainer}>
          <TouchableOpacity style={styles.sliderBtn} onPress={() => onChange(Math.max(-10, value - 1))} activeOpacity={0.7}>
            <Ionicons name="remove" size={16} color="#fff" />
          </TouchableOpacity>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${percent}%` }]} />
            <View style={[styles.sliderThumb, { left: `${percent}%` }]} />
          </View>
          <TouchableOpacity style={styles.sliderBtn} onPress={() => onChange(Math.min(10, value + 1))} activeOpacity={0.7}>
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.sliderValue}>{value > 0 ? '+' : ''}{value}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.panel} activeOpacity={1} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Equalizer</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* EQ Disclaimer */}
          <View style={styles.disclaimerContainer}>
            <Ionicons name="information-circle" size={16} color="#f59e0b" />
            <Text style={styles.disclaimerText}>EQ is a visual placeholder. Audio EQ requires react-native-track-player.</Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Presets */}
            <View style={styles.presetsContainer}>
              <Text style={styles.presetsLabel}>Presets</Text>
              <View style={styles.presetsGrid}>
                {EQ_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.key}
                    style={styles.presetBtn}
                    onPress={() => applyEqPreset(preset.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetText}>{preset.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sliders */}
            <SliderRow label="Bass" value={eqBass} onChange={setEqBass} />
            <SliderRow label="Mid" value={eqMid} onChange={setEqMid} />
            <SliderRow label="Treble" value={eqTreble} onChange={setEqTreble} />
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  panel: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, maxHeight: height * 0.6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  disclaimerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 8, backgroundColor: 'rgba(245,158,11,0.1)', marginHorizontal: 20, marginTop: 12, borderRadius: 8 },
  disclaimerText: { fontSize: 11, color: '#f59e0b', flex: 1, lineHeight: 16 },
  content: { padding: 20 },
  presetsContainer: { marginBottom: 24 },
  presetsLabel: { fontSize: 14, color: '#888', marginBottom: 10 },
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: { backgroundColor: '#333', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  presetText: { fontSize: 12, color: '#fff' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 10 },
  sliderLabel: { fontSize: 14, color: '#fff', width: 50 },
  sliderContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderBtn: { width: 28, height: 28, backgroundColor: '#333', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  sliderTrack: { flex: 1, height: 4, backgroundColor: '#333', borderRadius: 2, position: 'relative' },
  sliderFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#1DB954', borderRadius: 2 },
  sliderThumb: { position: 'absolute', top: -6, width: 16, height: 16, backgroundColor: '#fff', borderRadius: 8, marginLeft: -8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  sliderValue: { fontSize: 14, color: '#1DB954', width: 30, textAlign: 'right' },
});
