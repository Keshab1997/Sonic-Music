import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../../data/playlist';
import { SongCard } from '../../components/SongCard';
import { SectionHeader, SectionSkeleton } from '../../components/SectionHeader';
import { YT_QUICK_PICKS, QUICK_PICKS } from '../../data/constants';

const { width } = Dimensions.get('window');

interface HomeContentProps {
  suspense: Track[];
  ytTrending: Track[];
  loadingSuspense: boolean;
  loadingYtTrending: boolean;
  loadingQuickPick: string | null;
  loadingYtPick: string | null;
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: (track: Track, allTracks: Track[], index: number) => void;
  onAddToQueue: (track: Track) => void;
  onViewAll: (title: string, query: string, offset: number, isYoutube?: boolean) => void;
  onQuickPick: (query: string, offset: number) => void;
  onYtQuickPick: (query: string, offset: number) => void;
}

export const HomeContent: React.FC<HomeContentProps> = ({
  suspense, ytTrending, loadingSuspense, loadingYtTrending,
  loadingQuickPick, loadingYtPick, currentTrack, isPlaying,
  onPlay, onAddToQueue, onViewAll, onQuickPick, onYtQuickPick
}) => {
  return (
    <>
      {/* Divider: Content */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>🎙️ Content</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Sunday Suspense */}
      {(suspense.length > 0 || loadingSuspense) && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithBadge}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerEmoji}>🎙️</Text>
              <View>
                <Text style={styles.headerTitle}>Sunday Suspense Vibes</Text>
                {suspense.length > 0 && (
                  <Text style={styles.countText}>{suspense.length} episodes</Text>
                )}
              </View>
              <View style={styles.ytBadge}>
                <Text style={styles.ytBadgeText}>YT</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => onViewAll("Sunday Suspense", "Sunday Suspense Mirchi Bangla", 11000, true)} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All ›</Text>
            </TouchableOpacity>
          </View>
          {loadingSuspense ? (
            <SectionSkeleton count={4} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {suspense.map((track, i) => (
                <SongCard
                  key={track.id}
                  track={track}
                  index={i}
                  allTracks={suspense}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  onPlay={onPlay}
                  onAddToQueue={onAddToQueue}
                  badge="▶ YT"
                  badgeColor="#dc2626"
                />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Divider: Quick Picks */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>⚡ Quick Picks</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Quick Picks */}
      <View style={styles.section}>
        <SectionHeader title="Quick Picks" emoji="⚡" />
        <View style={styles.quickPickGrid}>
          {QUICK_PICKS.map((pick) => (
            <TouchableOpacity
              key={pick.title}
              style={[styles.quickPickBtn, { opacity: loadingQuickPick === pick.query ? 0.6 : 1 }]}
              onPress={() => onQuickPick(pick.query, 35000 + QUICK_PICKS.indexOf(pick) * 100)}
              disabled={loadingQuickPick === pick.query}
              activeOpacity={0.8}
            >
              <View style={styles.quickPickIcon}>
                {loadingQuickPick === pick.query ? (
                  <ActivityIndicator size="small" color="#1DB954" />
                ) : (
                  <Ionicons name="musical-notes" size={18} color="#1DB954" />
                )}
              </View>
              <View style={styles.quickPickInfo}>
                <Text style={styles.quickPickTitle} numberOfLines={1}>{pick.title}</Text>
                <Text style={styles.quickPickDesc} numberOfLines={1}>{pick.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Divider: YouTube */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>▶ YouTube</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* YouTube Trending */}
      {(ytTrending.length > 0 || loadingYtTrending) && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithBadge}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerEmoji}>▶️</Text>
              <View>
                <Text style={styles.headerTitle}>YouTube Trending</Text>
                {ytTrending.length > 0 && (
                  <Text style={styles.countText}>{ytTrending.length} videos</Text>
                )}
              </View>
              <View style={styles.ytBadge}>
                <Text style={styles.ytBadgeText}>YT</Text>
              </View>
            </View>
          </View>
          {loadingYtTrending ? (
            <SectionSkeleton count={4} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {ytTrending.map((track, i) => (
                <SongCard
                  key={track.id}
                  track={track}
                  index={i}
                  allTracks={ytTrending}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  onPlay={onPlay}
                  onAddToQueue={onAddToQueue}
                  badge="▶ YT"
                  badgeColor="#dc2626"
                />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* YouTube Quick Picks */}
      <View style={styles.section}>
        <SectionHeader title="YouTube Quick Picks" emoji="🎬" />
        <View style={styles.quickPickGrid}>
          {YT_QUICK_PICKS.map((pick) => (
            <TouchableOpacity
              key={pick.title}
              style={[styles.ytQuickPickBtn, { opacity: loadingYtPick === pick.query ? 0.6 : 1 }]}
              onPress={() => onYtQuickPick(pick.query, 65000 + YT_QUICK_PICKS.indexOf(pick) * 100)}
              disabled={loadingYtPick === pick.query}
              activeOpacity={0.8}
            >
              <View style={styles.ytQuickPickIcon}>
                {loadingYtPick === pick.query ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <Ionicons name="logo-youtube" size={18} color="#dc2626" />
                )}
              </View>
              <View style={styles.quickPickInfo}>
                <Text style={styles.quickPickTitle} numberOfLines={1}>{pick.title}</Text>
                <Text style={styles.quickPickDesc} numberOfLines={1}>{pick.desc}</Text>
              </View>
              <Text style={styles.ytBadgeText}>YT</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 28, marginBottom: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#222' },
  dividerText: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginHorizontal: 10, textTransform: 'uppercase' },
  sectionHeaderWithBadge: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, marginTop: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerEmoji: { fontSize: 18, marginRight: 6 },
  headerTitle: { fontSize: 17, color: '#fff', fontWeight: 'bold' },
  countText: { fontSize: 11, color: '#1DB954', marginTop: 1, fontWeight: '600' },
  viewAllText: { fontSize: 12, color: '#1DB954' },
  ytBadge: { backgroundColor: '#dc2626', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  ytBadgeText: { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  quickPickGrid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickPickBtn: { width: (width - 48) / 2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2a2a2a', flexDirection: 'row', alignItems: 'center' },
  ytQuickPickBtn: { width: (width - 48) / 2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2a2a2a', flexDirection: 'row', alignItems: 'center' },
  quickPickIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(29,185,84,0.15)', justifyContent: 'center', alignItems: 'center' },
  ytQuickPickIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(220,38,38,0.15)', justifyContent: 'center', alignItems: 'center' },
  quickPickInfo: { flex: 1, marginLeft: 10 },
  quickPickTitle: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  quickPickDesc: { fontSize: 10, color: '#666', marginTop: 2 },
});
