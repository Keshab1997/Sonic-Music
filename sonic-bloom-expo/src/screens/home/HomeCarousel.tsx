import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../../data/playlist';
import { CachedImage } from '../../components/CachedImage';
import { lightHaptic } from '../../lib/haptics';

const { width } = Dimensions.get('window');

interface HomeCarouselProps {
  songs: Track[];
  carouselIndex: number;
  onCarouselChange: (index: number) => void;
  onPlay: (song: Track, songs: Track[], index: number) => void;
}

export const HomeCarousel: React.FC<HomeCarouselProps> = ({ songs, carouselIndex, onCarouselChange, onPlay }) => {
  const carouselSongs = songs.slice(0, 5);
  if (carouselSongs.length === 0) return null;

  return (
    <View style={styles.carousel}>
      {carouselSongs.map((song, i) => (
        <View
          key={i}
          style={[styles.carouselSlide, { opacity: carouselIndex === i ? 1 : 0 }]}
        >
          <CachedImage
            source={{ uri: song.cover }}
            style={styles.carouselImage}
            defaultSource={require('../../../assets/icon.png')}
          />
          <View style={styles.carouselOverlayDark} />
          <View style={styles.carouselContent}>
            <Text style={styles.carouselLabel}>
              {i === 0 ? 'Featured' : `#${i + 1} Trending`}
            </Text>
            <Text style={styles.carouselTitle} numberOfLines={1}>{song.title}</Text>
            <Text style={styles.carouselArtist} numberOfLines={1}>{song.artist}</Text>
            <TouchableOpacity
              style={styles.carouselPlayBtn}
              onPress={() => { onPlay(song, carouselSongs, i); lightHaptic(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.carouselPlayText}>▶ Play</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {/* Left Arrow */}
      <TouchableOpacity
        style={[styles.carouselArrow, { left: 8 }]}
        onPress={() => { onCarouselChange((carouselIndex - 1 + carouselSongs.length) % carouselSongs.length); lightHaptic(); }}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={18} color="#fff" />
      </TouchableOpacity>
      {/* Right Arrow */}
      <TouchableOpacity
        style={[styles.carouselArrow, { right: 8 }]}
        onPress={() => { onCarouselChange((carouselIndex + 1) % carouselSongs.length); lightHaptic(); }}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-forward" size={18} color="#fff" />
      </TouchableOpacity>
      {/* Dot Indicators */}
      <View style={styles.carouselDots}>
        {carouselSongs.map((_, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.carouselDot,
              { width: carouselIndex === i ? 16 : 6, backgroundColor: carouselIndex === i ? '#1DB954' : '#555' }
            ]}
            onPress={() => { onCarouselChange(i); lightHaptic(); }}
            activeOpacity={0.7}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  carousel: { height: 220, position: 'relative' },
  carouselSlide: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  carouselImage: { width: '100%', height: 220 },
  carouselOverlayDark: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', padding: 16 },
  carouselContent: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  carouselLabel: { fontSize: 10, color: '#1DB954', marginBottom: 4 },
  carouselTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  carouselArtist: { fontSize: 12, color: '#aaa', marginTop: 2 },
  carouselPlayBtn: { backgroundColor: '#1DB954', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start', marginTop: 8 },
  carouselPlayText: { fontSize: 12, color: '#000', fontWeight: 'bold' },
  carouselArrow: { position: 'absolute', top: '50%', marginTop: -14, width: 28, height: 28, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  carouselDots: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  carouselDot: { height: 6, borderRadius: 3 },
});
