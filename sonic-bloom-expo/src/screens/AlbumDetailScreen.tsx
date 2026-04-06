import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Dimensions, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Track } from '../data/playlist';
import { usePlayer } from '../context/PlayerContext';
import { useDownloadsContext } from '../context/DownloadsContext';
import { CachedImage } from '../components/CachedImage';
import { Toast } from '../components/Toast';
import { lightHaptic, mediumHaptic } from '../lib/haptics';
import { API_BASE } from '../data/constants';

const { width } = Dimensions.get('window');

interface RouteParams {
  albumId: string;
  albumName: string;
  albumCover?: string;
  albumArtist?: string;
}

export const AlbumDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { albumId, albumName, albumCover, albumArtist } = (route.params as any) as RouteParams;

  const [songs, setSongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentTrack, isPlaying, playTrackList, addToQueue } = usePlayer();
  const { isDownloaded, isDownloading, downloadTrack, getDownloadProgress } = useDownloadsContext();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error'; visible: boolean }>({ message: '', type: 'success', visible: false });

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  }, []);

  useEffect(() => {
    fetchAlbumSongs();
  }, [albumId]);

  const fetchAlbumSongs = async () => {
    setLoading(true);
    try {
      // Try albums endpoint first
      const res = await fetch(`${API_BASE}/albums?id=${albumId}`);
      if (res.ok) {
        const data = await res.json();
        const results = data.data?.songs || [];
        if (results.length > 0) {
          const tracks: Track[] = results
            .map((s: any, i: number) => {
              if (!s.downloadUrl?.length) return null;
              const url160 = s.downloadUrl.find((d: any) => d.quality === "160kbps")?.link;
              const url96 = s.downloadUrl.find((d: any) => d.quality === "96kbps")?.link;
              const url320 = s.downloadUrl.find((d: any) => d.quality === "320kbps")?.link;
              const bestUrl = url160 || url96 || s.downloadUrl[0]?.link || "";
              return {
                id: 75000 + i,
                title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown",
                artist: s.primaryArtists || "Unknown",
                album: albumName,
                cover: s.image?.find((img: any) => img.quality === "500x500")?.link || s.image?.[s.image.length - 1]?.link || albumCover || "",
                src: bestUrl,
                duration: parseInt(String(s.duration)) || 0,
                type: "audio" as const,
                songId: s.id,
                audioUrls: {
                  ...(url96 ? { "96kbps": url96 } : {}),
                  ...(url160 ? { "160kbps": url160 } : {}),
                  ...(url320 ? { "320kbps": url320 } : {}),
                },
              };
            })
            .filter((t: Track | null): t is Track => t !== null);
          setSongs(tracks);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to fetch album songs:', e);
    }

    // Fallback: search for album name
    try {
      const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(albumName)}&page=1&limit=50`);
      if (res.ok) {
        const data = await res.json();
        const results = data.data?.results || [];
        const tracks: Track[] = results
          .map((s: any, i: number) => {
            if (!s.downloadUrl?.length) return null;
            const url160 = s.downloadUrl.find((d: any) => d.quality === "160kbps")?.link;
            const url96 = s.downloadUrl.find((d: any) => d.quality === "96kbps")?.link;
            const bestUrl = url160 || url96 || s.downloadUrl[0]?.link || "";
            return {
              id: 75000 + i,
              title: s.name?.replace(/"/g, '"').replace(/&/g, "&") || "Unknown",
              artist: s.primaryArtists || "Unknown",
              album: albumName,
              cover: s.image?.find((img: any) => img.quality === "500x500")?.link || albumCover || "",
              src: bestUrl,
              duration: parseInt(String(s.duration)) || 0,
              type: "audio" as const,
              songId: s.id,
            };
          })
          .filter((t: Track | null): t is Track => t !== null);
        setSongs(tracks);
      }
    } catch (e) {
      console.error('Failed to search album songs:', e);
    }
    setLoading(false);
  };

  const handlePlay = (index: number) => {
    playTrackList(songs, index);
    mediumHaptic();
  };

  const renderItem = ({ item, index }: { item: Track; index: number }) => {
    const isCurrentTrack = currentTrack?.id === item.id;
    const downloaded = isDownloaded(String(item.songId || item.id));
    const downloading = isDownloading(String(item.songId || item.id));
    const progress = getDownloadProgress(String(item.songId || item.id));
    return (
      <TouchableOpacity
        style={[styles.songRow, isCurrentTrack && styles.songRowActive]}
        onPress={() => handlePlay(index)}
        activeOpacity={0.7}
      >
        <CachedImage
          source={{ uri: item.cover }}
          style={styles.songImage}
          defaultSource={require('../../assets/icon.png')}
        />
        <View style={styles.songInfo}>
          <Text style={[styles.songTitle, isCurrentTrack && styles.songTitleActive]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
          {downloading && (
            <View style={styles.downloadProgress}>
              <View style={styles.downloadProgressTrack}>
                <View style={[styles.downloadProgressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.downloadProgressText}>{progress}%</Text>
            </View>
          )}
          {downloaded && (
            <Text style={styles.downloadedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#1DB954" /> Downloaded
            </Text>
          )}
        </View>
        <View style={styles.songActions}>
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => {
              if (downloaded) {
                showToast('Already downloaded', 'info');
                return;
              }
              downloadTrack(item);
              showToast('Downloading...', 'info');
            }}
            disabled={downloading}
            activeOpacity={0.7}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#1DB954" />
            ) : downloaded ? (
              <Ionicons name="checkmark-circle" size={20} color="#1DB954" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#888" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => addToQueue(item)} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={24} color="#1DB954" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Album</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      ) : (
        <>
          {/* Album Header */}
          <View style={styles.albumHeader}>
            {albumCover && (
              <CachedImage
                source={{ uri: albumCover }}
                style={styles.albumImage}
                defaultSource={require('../../assets/icon.png')}
              />
            )}
            <Text style={styles.albumName}>{albumName}</Text>
            {albumArtist && <Text style={styles.albumArtist}>{albumArtist}</Text>}
            <Text style={styles.songCount}>{songs.length} songs</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => {
                  let count = 0;
                  songs.forEach(track => {
                    if (!isDownloaded(String(track.songId || track.id))) {
                      downloadTrack(track);
                      count++;
                    }
                  });
                  if (count > 0) {
                    showToast(`Downloading ${count} songs`, 'info');
                  } else {
                    showToast('All songs already downloaded', 'info');
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="download" size={18} color="#1DB954" />
                <Text style={styles.headerBtnText}>Download All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => {
                  songs.forEach(track => addToQueue(track));
                  showToast(`Added ${songs.length} songs to queue`, 'success');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="list" size={18} color="#1DB954" />
                <Text style={styles.headerBtnText}>Add All to Queue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.playAllBtn}
                onPress={() => {
                  handlePlay(0);
                  showToast(`Playing ${songs.length} songs`, 'success');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="play" size={20} color="#000" />
                <Text style={styles.playAllText}>Play All</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Songs List */}
          <FlatList
            data={songs}
            keyExtractor={(item) => `album_${item.songId || item.id}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* Toast Notification */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold', flex: 1, textAlign: 'center' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  albumHeader: { alignItems: 'center', paddingVertical: 24 },
  albumImage: { width: 160, height: 160, borderRadius: 12, backgroundColor: '#1a1a1a', marginBottom: 16 },
  albumName: { fontSize: 22, color: '#fff', fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 16 },
  albumArtist: { fontSize: 14, color: '#888', marginTop: 4 },
  songCount: { fontSize: 14, color: '#888', marginTop: 4 },
  playAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1DB954', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24, marginTop: 16 },
  playAllText: { fontSize: 14, color: '#000', fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 140 },
  songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  songRowActive: { backgroundColor: '#0d1f0d', borderRadius: 8, paddingHorizontal: 8 },
  songImage: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#1a1a1a' },
  songInfo: { flex: 1, minWidth: 0 },
  songTitle: { fontSize: 14, color: '#fff', fontWeight: '600' },
  songTitleActive: { color: '#1DB954' },
  songArtist: { fontSize: 12, color: '#888', marginTop: 2 },
  songActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  downloadBtn: { padding: 6 },
  addBtn: { padding: 6 },
  downloadProgress: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  downloadProgressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(29,185,84,0.2)', borderRadius: 2 },
  downloadProgressFill: { height: '100%', backgroundColor: '#1DB954', borderRadius: 2 },
  downloadProgressText: { fontSize: 10, color: '#1DB954', width: 30 },
  downloadedBadge: { fontSize: 10, color: '#1DB954', marginTop: 2 },
  headerButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 16 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1a1a1a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#1DB954' },
  headerBtnText: { fontSize: 12, color: '#1DB954', fontWeight: '600' },
});
