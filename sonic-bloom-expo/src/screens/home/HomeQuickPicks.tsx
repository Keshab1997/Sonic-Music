import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../../data/playlist';
import { TIME_GREETINGS, getTimeOfDay, formatDuration, getSongOfDayIndex } from '../../data/constants';
import { SectionHeader } from '../../components/SectionHeader';
import { CachedImage } from '../../components/CachedImage';
import { lightHaptic } from '../../lib/haptics';

const { width } = Dimensions.get('window');

interface HomeQuickPicksProps {
  trending: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  loadingQuickPick: string | null;
  onTimePlay: (query: string) => void;
  onSongPlay: (song: Track) => void;
}

export const HomeQuickPicks: React.FC<HomeQuickPicksProps> = ({
  trending, currentTrack, isPlaying, loadingQuickPick, onTimePlay, onSongPlay
}) => {
  const timeData = TIME_GREETINGS[getTimeOfDay()];
  const songOfDay = trending.length > 0 ? trending[getSongOfDayIndex(trending.length)] : null;

  return (
    <View style={styles.container}>
      {/* Time Greeting */}
      <View style={styles.greeting}>
        <View style={styles.greetingHeader}>
          <Text style={styles.greetingEmoji}>{timeData.emoji}</Text>
          <View>
            <Text style={styles.greetingTitle}>{timeData.title}</Text>
            <Text style={styles.greetingSubtitle}>{timeData.subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.quickPlayCard}
          onPress={() => { onTimePlay(timeData.query); lightHaptic(); }}
          activeOpacity={0.7}
        >
          <View>
            <Text style={styles.quickPlayTitle}>✨ {timeData.title} Mix</Text>
            <Text style={styles.quickPlayDesc}>Curated for this time of day</Text>
          </View>
          <View style={styles.quickPlayBtn}>
            {loadingQuickPick === timeData.query ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Ionicons name="play" size={18} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Song of the Day */}
      {songOfDay && (
        <View style={styles.sotd}>
          <SectionHeader title="Song of the Day" emoji="⭐" />
          <TouchableOpacity
            style={styles.sotdCard}
            onPress={() => { onSongPlay(songOfDay); lightHaptic(); }}
            activeOpacity={0.7}
          >
            <CachedImage
              source={{ uri: songOfDay.cover }}
              style={styles.sotdImage}
              defaultSource={require('../../../assets/icon.png')}
            />
            <View style={styles.sotdInfo}>
              <Text style={styles.sotdTitle} numberOfLines={1}>{songOfDay.title}</Text>
              <Text style={styles.sotdArtist} numberOfLines={1}>{songOfDay.artist}</Text>
              {songOfDay.duration > 0 && (
                <Text style={styles.sotdDuration}>{formatDuration(songOfDay.duration)}</Text>
              )}
            </View>
            <Ionicons
              name={currentTrack?.id === songOfDay.id && isPlaying ? 'pause-circle' : 'play-circle'}
              size={40}
              color="#f59e0b"
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, marginTop: 16 },
  greeting: {},
  greetingHeader: { flexDirection: 'row', alignItems: 'center' },
  greetingEmoji: { fontSize: 24, marginRight: 8 },
  greetingTitle: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  greetingSubtitle: { fontSize: 12, color: '#888' },
  quickPlayCard: { backgroundColor: '#111', borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 1, borderColor: 'rgba(29,185,84,0.22)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickPlayTitle: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
  quickPlayDesc: { fontSize: 11, color: '#888', marginTop: 2 },
  quickPlayBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1DB954', justifyContent: 'center', alignItems: 'center' },
  sotd: { marginTop: 20 },
  sotdCard: { backgroundColor: '#1a1200', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', flexDirection: 'row', alignItems: 'center' },
  sotdImage: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#1a1a1a' },
  sotdInfo: { flex: 1, marginLeft: 12 },
  sotdTitle: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
  sotdArtist: { fontSize: 12, color: '#888', marginTop: 2 },
  sotdDuration: { fontSize: 10, color: '#f59e0b', marginTop: 2 },
});
