import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SectionHeaderProps {
  title: string;
  emoji?: string;
  count?: number;
  onViewAll?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, emoji, count, onViewAll, onRefresh, refreshing }) => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <View>
        <Text style={styles.title}>{title}</Text>
        {count !== undefined && count > 0 && (
          <Text style={styles.count}>{count} {count === 1 ? 'song' : 'songs'}</Text>
        )}
      </View>
    </View>
    {onViewAll && (
      <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
        <Text style={styles.viewAllText}>View All ›</Text>
      </TouchableOpacity>
    )}
    {onRefresh && !onViewAll && (
      <TouchableOpacity onPress={onRefresh} activeOpacity={0.7}>
        <Ionicons name="refresh" size={18} color={refreshing ? '#1DB954' : '#888'} />
      </TouchableOpacity>
    )}
  </View>
);

interface SectionSkeletonProps {
  count?: number;
  cardWidth?: number;
}

export const SectionSkeleton: React.FC<SectionSkeletonProps> = ({ count = 4, cardWidth = 120 }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={{ width: cardWidth, marginRight: 12 }}>
        <View style={{ width: cardWidth, height: cardWidth, borderRadius: 10, backgroundColor: '#1a1a1a' }} />
        <View style={{ height: 10, backgroundColor: '#1a1a1a', borderRadius: 4, marginTop: 6, width: '80%' }} />
        <View style={{ height: 8, backgroundColor: '#1a1a1a', borderRadius: 4, marginTop: 4, width: '60%' }} />
      </View>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, marginTop: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  emoji: { fontSize: 18, marginRight: 6 },
  title: { fontSize: 17, color: '#fff', fontWeight: 'bold' },
  count: { fontSize: 11, color: '#1DB954', marginTop: 1, fontWeight: '600' },
  viewAllText: { fontSize: 12, color: '#1DB954' },
});
