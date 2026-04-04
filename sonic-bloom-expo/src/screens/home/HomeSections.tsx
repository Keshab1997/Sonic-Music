import React from 'react';
import { View, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Text } from 'react-native';
import { Track } from '../../data/playlist';
import { SongCard } from '../../components/SongCard';
import { SectionHeader, SectionSkeleton } from '../../components/SectionHeader';

const { width } = Dimensions.get('window');
const CARD_W = 120;

interface HomeSectionsProps {
  trending: Track[];
  newReleases: Track[];
  recentlyPlayed: Track[];
  loadingTrending: boolean;
  loadingNewReleases: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: (track: Track, allTracks: Track[], index: number) => void;
  onAddToQueue: (track: Track) => void;
  onViewAll: (title: string, query: string, offset: number, isYoutube?: boolean, langFilter?: string) => void;
  onClearRecentlyPlayed: () => void;
}

export const HomeSections: React.FC<HomeSectionsProps> = ({
  trending, newReleases, recentlyPlayed, loadingTrending, loadingNewReleases,
  currentTrack, isPlaying, onPlay, onAddToQueue, onViewAll, onClearRecentlyPlayed
}) => {
  return (
    <>
      {/* Trending Now */}
      <View style={styles.section}>
        <SectionHeader
          title="Trending Now"
          emoji="🔥"
          count={trending.length}
          onViewAll={() => onViewAll("Trending Now", "latest bollywood hits", 1000)}
        />
        {loadingTrending ? (
          <SectionSkeleton count={4} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {trending.map((track, i) => (
              <SongCard
                key={track.id}
                track={track}
                index={i}
                allTracks={trending}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlay={onPlay}
                onAddToQueue={onAddToQueue}
                badge={`#${i + 1}`}
                badgeColor="rgba(0,0,0,0.7)"
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* New Releases */}
      <View style={styles.section}>
        <SectionHeader
          title="New Releases"
          emoji="🎵"
          count={newReleases.length}
          onViewAll={() => onViewAll("New Releases", "new hindi songs 2025", 2000)}
        />
        {loadingNewReleases ? (
          <SectionSkeleton count={4} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {newReleases.map((track, i) => (
              <SongCard
                key={track.id}
                track={track}
                index={i}
                allTracks={newReleases}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlay={onPlay}
                onAddToQueue={onAddToQueue}
                badge="NEW"
                badgeColor="#16a34a"
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Recently Played" emoji="🕐" count={recentlyPlayed.length} />
          <View style={styles.clearBtnContainer}>
            <TouchableOpacity onPress={onClearRecentlyPlayed} activeOpacity={0.7}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {recentlyPlayed.map((track, i) => (
              <SongCard
                key={track.id}
                track={track}
                index={i}
                allTracks={recentlyPlayed}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlay={onPlay}
                onAddToQueue={onAddToQueue}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 8 },
  clearBtnContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginRight: 16, marginTop: -8, marginBottom: 8 },
  clearBtnText: { fontSize: 12, color: '#ef4444' },
});
