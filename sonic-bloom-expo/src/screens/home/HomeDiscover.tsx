import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MOODS, LABELS, ERAS, HINDI_ARTISTS, BENGALI_ARTISTS } from '../../data/constants';
import { SectionHeader } from '../../components/SectionHeader';
import { CachedImage } from '../../components/CachedImage';
import { lightHaptic } from '../../lib/haptics';

const { width } = Dimensions.get('window');

interface HomeDiscoverProps {
  loadingLabel: string | null;
  onMoodPress: (title: string, query: string, offset: number) => void;
  onLabelPlay: (label: { name: string; query: string; color: string }) => void;
  onArtistPress: (title: string, query: string, offset: number) => void;
  onEraPress: (title: string, query: string, offset: number) => void;
}

export const HomeDiscover: React.FC<HomeDiscoverProps> = ({
  loadingLabel, onMoodPress, onLabelPlay, onArtistPress, onEraPress
}) => {
  return (
    <>
      {/* Divider: Discover */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>🎭 Discover</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Browse by Mood */}
      <View style={styles.section}>
        <SectionHeader title="Browse by Mood" emoji="🎭" />
        <View style={styles.moodGrid}>
          {MOODS.map((mood) => (
            <TouchableOpacity
              key={mood.name}
              style={[styles.moodBtn, { backgroundColor: mood.color }]}
              onPress={() => { onMoodPress(mood.name, mood.query, 40000 + MOODS.indexOf(mood) * 100); lightHaptic(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={styles.moodName}>{mood.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Top Music Labels */}
      <View style={styles.section}>
        <SectionHeader title="Top Music Labels" emoji="🏢" />
        <View style={styles.labelGrid}>
          {LABELS.map((label) => (
            <TouchableOpacity
              key={label.name}
              style={[styles.labelBtn, { backgroundColor: label.color, opacity: loadingLabel === label.name ? 0.6 : 1 }]}
              onPress={() => { onLabelPlay(label); lightHaptic(); }}
              disabled={loadingLabel === label.name}
              activeOpacity={0.8}
            >
              <Text style={styles.labelName}>{label.name}</Text>
              {loadingLabel === label.name ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="play" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Divider: Regional */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>🎵 Regional</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Hindi Artists */}
      <View style={styles.section}>
        <SectionHeader
          title="Hindi Artists"
          emoji="🎤"
          onViewAll={() => onArtistPress("Hindi Artists", "hindi top artists songs", 50000)}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistScroll}>
          {HINDI_ARTISTS.map((artist) => (
            <TouchableOpacity
              key={artist.name}
              style={styles.artistItem}
              onPress={() => { onArtistPress(artist.name, artist.query, 50000 + HINDI_ARTISTS.indexOf(artist) * 100); lightHaptic(); }}
              activeOpacity={0.7}
            >
              <View style={styles.artistImageWrap}>
                <CachedImage
                  source={{ uri: artist.image }}
                  style={styles.artistImage}
                  defaultSource={require('../../../assets/icon.png')}
                />
              </View>
              <Text style={styles.artistName} numberOfLines={2}>{artist.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bengali Artists */}
      <View style={styles.section}>
        <SectionHeader title="Bengali Artists" emoji="🎵" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistScroll}>
          {BENGALI_ARTISTS.map((artist) => (
            <TouchableOpacity
              key={artist.name}
              style={styles.artistItem}
              onPress={() => { onArtistPress(artist.name, artist.query, 55000 + BENGALI_ARTISTS.indexOf(artist) * 100); lightHaptic(); }}
              activeOpacity={0.7}
            >
              <View style={styles.artistImageWrap}>
                <CachedImage
                  source={{ uri: artist.image }}
                  style={styles.artistImage}
                  defaultSource={require('../../../assets/icon.png')}
                />
              </View>
              <Text style={styles.artistName} numberOfLines={2}>{artist.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Divider: Time Machine */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>🕰️ Time Machine</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Time Machine */}
      <View style={styles.section}>
        <SectionHeader title="Time Machine" emoji="🕰️" />
        <View style={styles.eraGrid}>
          {ERAS.map((era) => (
            <TouchableOpacity
              key={era.name}
              style={[styles.eraBtn, { backgroundColor: era.color }]}
              onPress={() => onEraPress(era.name + "s Hits", era.query, 45000 + ERAS.indexOf(era) * 100)}
              activeOpacity={0.8}
            >
              <Text style={styles.eraName}>{era.name}</Text>
              <Text style={styles.eraSubtitle}>{era.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  divider: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 28, marginBottom: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#222' },
  dividerText: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginHorizontal: 10, textTransform: 'uppercase' },
  moodGrid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodBtn: { width: (width - 48) / 2, height: 64, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  moodEmoji: { fontSize: 24 },
  moodName: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
  labelGrid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  labelBtn: { width: (width - 48) / 2, height: 56, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  labelName: { fontSize: 15, color: '#fff', fontWeight: 'bold' },
  artistScroll: { paddingHorizontal: 16, paddingBottom: 8 },
  artistItem: { width: 72, alignItems: 'center', marginRight: 16 },
  artistImageWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#333' },
  artistImage: { width: 64, height: 64, borderRadius: 32 },
  artistName: { fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 6 },
  eraGrid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  eraBtn: { width: (width - 48) / 2, height: 72, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eraName: { fontSize: 22, color: '#fff', fontWeight: '900' },
  eraSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
});
