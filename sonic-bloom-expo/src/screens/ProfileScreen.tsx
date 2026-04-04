import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.user_metadata?.avatar_url || null
  );

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos to upload a profile picture.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your camera to take a photo.');
        return;
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);

      // Convert image to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create file name
      const fileExt = uri.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

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
          <Pressable onPress={showImageOptions} style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={['#1DB954', '#1ed760']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.cameraBtn}>
              {uploading ? (
                <View style={styles.uploadingIndicator} />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </View>
          </Pressable>
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
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', shadowColor: '#1DB954', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  avatarImage: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1a1a1a' },
  avatarText: { fontSize: 40, fontWeight: '800', color: '#fff' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: '#1DB954', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#0a0a0a', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  uploadingIndicator: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent', transform: [{ rotate: '0deg' }] },
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
