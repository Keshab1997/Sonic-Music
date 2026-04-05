import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylists } from '../hooks/usePlaylists';
import { CachedImage } from '../components/CachedImage';

export const PlaylistsPage: React.FC = () => {
  const { playTrackList } = usePlayer();
  const { playlists, loading, createPlaylist, deletePlaylist } = usePlaylists();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }
    const result = await createPlaylist(newPlaylistName.trim());
    if (result) {
      setNewPlaylistName('');
      setShowCreateModal(false);
    } else {
      Alert.alert('Error', 'Failed to create playlist');
    }
  };

  const handleDeletePlaylist = (id: string) => {
    Alert.alert(
      'Delete Playlist',
      'Are you sure you want to delete this playlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(id) },
      ]
    );
  };

  const handlePlay = (playlist: any, index: number) => {
    if (playlist.tracks.length === 0) return;
    playTrackList(playlist.tracks, index);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => handlePlay(item, 0)}
    >
      <LinearGradient
        colors={['#8b5cf6', '#a78bfa']}
        style={styles.cardIcon}
      >
        <Ionicons name="musical-notes" size={28} color="#fff" />
      </LinearGradient>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.trackCount} songs</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDeletePlaylist(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Playlists</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </View>
    );
  }

  if (playlists.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Playlists</Text>
        </View>
        <View style={styles.emptyContainer}>
          <LinearGradient colors={['#8b5cf6', '#a78bfa']} style={styles.emptyIcon}>
            <Ionicons name="musical-notes-outline" size={64} color="#fff" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No Playlists</Text>
          <Text style={styles.emptyText}>Create your first playlist</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#8b5cf6', '#a78bfa']} style={styles.createBtnGradient}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createBtnText}>Create Playlist</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Playlists</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={28} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Playlist</Text>
            <TextInput
              style={styles.input}
              placeholder="Playlist name"
              placeholderTextColor="#555"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowCreateModal(false); setNewPlaylistName(''); }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleCreatePlaylist}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { fontSize: 32, color: '#fff', fontWeight: '900' },
  addButton: { padding: 4 },
  listContent: { paddingBottom: 140, paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#1a1a1a', borderRadius: 16, marginBottom: 12, gap: 16 },
  cardIcon: { width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, color: '#fff', fontWeight: '600', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#888' },
  deleteBtn: { padding: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 24, color: '#fff', fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#888', marginBottom: 32, textAlign: 'center' },
  createBtn: { borderRadius: 24, overflow: 'hidden' },
  createBtnGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, gap: 8 },
  createBtnText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  modalOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320 },
  modalTitle: { fontSize: 20, color: '#fff', fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#2a2a2a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#fff', fontSize: 16, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontSize: 16, color: '#888', fontWeight: '600' },
  confirmBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  confirmText: { fontSize: 16, color: '#fff', fontWeight: '600', textAlign: 'center', paddingVertical: 12 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
