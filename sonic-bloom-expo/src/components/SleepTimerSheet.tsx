import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';

const { height } = Dimensions.get('window');

const TIMER_OPTIONS = [
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: '90 min', minutes: 90 },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const SleepTimerSheet: React.FC<Props> = ({ visible, onClose }) => {
  const { sleepMinutes, setSleepTimer, cancelSleepTimer } = usePlayer();
  const isActive = sleepMinutes !== null;

  const handleSelect = (minutes: number) => {
    setSleepTimer(minutes);
    onClose();
  };

  const handleCancel = () => {
    cancelSleepTimer();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.panel} activeOpacity={1} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Sleep Timer</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {isActive && (
            <View style={styles.activeContainer}>
              <Ionicons name="moon" size={24} color="#1DB954" />
              <Text style={styles.activeText}>
                Sleep timer active — {sleepMinutes} minutes remaining
              </Text>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel Timer</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
            {TIMER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.minutes}
                style={[styles.optionBtn, isActive && option.minutes === sleepMinutes && styles.optionBtnActive]}
                onPress={() => handleSelect(option.minutes)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, isActive && option.minutes === sleepMinutes && styles.optionTextActive]}>
                  {option.label}
                </Text>
                <Ionicons
                  name={isActive && option.minutes === sleepMinutes ? 'checkmark-circle' : 'chevron-forward'}
                  size={20}
                  color={isActive && option.minutes === sleepMinutes ? '#1DB954' : '#555'}
                />
              </TouchableOpacity>
            ))}
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
  activeContainer: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  activeText: { fontSize: 14, color: '#1DB954', textAlign: 'center' },
  cancelBtn: { backgroundColor: '#333', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  cancelBtnText: { fontSize: 14, color: '#ef4444', fontWeight: '600' },
  optionsContainer: { maxHeight: 300 },
  optionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  optionBtnActive: { backgroundColor: 'rgba(29,185,84,0.1)' },
  optionText: { fontSize: 16, color: '#fff' },
  optionTextActive: { color: '#1DB954', fontWeight: '600' },
});
