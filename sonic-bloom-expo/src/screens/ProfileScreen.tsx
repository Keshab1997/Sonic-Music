import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="person-circle-outline" size={80} color="#1DB954" />
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Sign in to sync your music</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#fff" />
          </View>
          <Text style={styles.email}>{user.email}</Text>
          {user.user_metadata?.full_name && (
            <Text style={styles.fullName}>{user.user_metadata.full_name}</Text>
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="musical-notes-outline" size={22} color="#888" />
            <Text style={styles.settingText}>Audio Quality</Text>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="download-outline" size={22} color="#888" />
            <Text style={styles.settingText}>Downloads</Text>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="notifications-outline" size={22} color="#888" />
            <Text style={styles.settingText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#888" />
            <Text style={styles.settingText}>Privacy</Text>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="information-circle-outline" size={22} color="#888" />
            <Text style={styles.settingText}>About</Text>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.version}>Sonic Bloom v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollContent: { paddingBottom: 140 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, color: '#fff', fontWeight: 'bold', marginTop: 16 },
  subtitle: { fontSize: 14, color: '#555', marginTop: 8 },
  profileHeader: { alignItems: 'center', paddingVertical: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1DB954', justifyContent: 'center', alignItems: 'center' },
  email: { fontSize: 16, color: '#fff', marginTop: 12 },
  fullName: { fontSize: 14, color: '#888', marginTop: 4 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', gap: 14 },
  settingText: { flex: 1, fontSize: 15, color: '#fff' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 32, paddingVertical: 14, backgroundColor: '#1a1a1a', borderRadius: 12, gap: 10 },
  signOutText: { fontSize: 16, color: '#ef4444', fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 12, color: '#555', marginTop: 24, marginBottom: 16 },
});
