import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();

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
          <LinearGradient
            colors={['#1DB954', '#1ed760']}
            style={styles.emptyLogo}
          >
            <Ionicons name="person" size={60} color="#fff" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Not Signed In</Text>
          <Text style={styles.emptySubtitle}>Sign in to sync your music across devices</Text>
          <Pressable onPress={() => navigation.navigate('Login' as never)} style={styles.emptyBtn}>
            <LinearGradient
              colors={['#1DB954', '#1ed760']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyBtnGradient}
            >
              <Text style={styles.emptyBtnText}>Sign In</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <LinearGradient
            colors={['#1DB954', '#1ed760']}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </LinearGradient>
          <Text style={styles.email}>{user.email}</Text>
          {user.user_metadata?.full_name && (
            <Text style={styles.fullName}>{user.user_metadata.full_name}</Text>
          )}
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="person-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.settingText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </Pressable>

          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="key-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.settingText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </Pressable>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="musical-notes-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.settingText}>Audio Quality</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>High</Text>
              <Ionicons name="chevron-forward" size={18} color="#555" />
            </View>
          </Pressable>

          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="download-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.settingText}>Downloads</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </Pressable>

          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="notifications-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </Pressable>

          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.settingText}>Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </Pressable>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="information-circle-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.settingText}>About Sonic Bloom</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </Pressable>

          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="document-text-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.settingText}>Terms & Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </Pressable>
        </View>

        {/* Sign Out Button */}
        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {/* App Version */}
        <Text style={styles.version}>Sonic Bloom v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollContent: { paddingBottom: 140 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyLogo: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24, shadowColor: '#1DB954', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  emptyTitle: { fontSize: 28, color: '#fff', fontWeight: '800', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 32 },
  emptyBtn: { borderRadius: 16, overflow: 'hidden', width: '100%' },
  emptyBtnGradient: { height: 56, justifyContent: 'center', alignItems: 'center' },
  emptyBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  profileHeader: { alignItems: 'center', paddingVertical: 40, paddingTop: 60 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#1DB954', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  avatarText: { fontSize: 40, fontWeight: '800', color: '#fff' },
  email: { fontSize: 18, color: '#fff', fontWeight: '600', marginBottom: 4 },
  fullName: { fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 12 },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(29,185,84,0.1)', justifyContent: 'center', alignItems: 'center' },
  settingText: { fontSize: 16, color: '#fff', fontWeight: '500' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingValue: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginTop: 32, paddingVertical: 16, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  signOutText: { fontSize: 16, color: '#ef4444', fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 13, color: '#555', marginTop: 24, marginBottom: 16 },
});
