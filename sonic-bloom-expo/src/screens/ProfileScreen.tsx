import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Image, TextInput, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useDownloadsContext } from '../context/DownloadsContext';

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const { downloads } = useDownloadsContext();
  const navigation = useNavigation();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.user_metadata?.avatar_url || null
  );
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [audioQuality, setAudioQuality] = useState('High');
  const [qualityModalVisible, setQualityModalVisible] = useState(false);

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

      // Get file extension
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      } as any);

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('profiles')
        .upload(filePath, formData, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
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

  const handleEditProfile = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      if (error) throw error;
      Alert.alert('Success', 'Profile updated!');
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      Alert.alert('Success', 'Password changed successfully!');
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
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
          
          <Pressable style={styles.settingItem} onPress={() => setEditModalVisible(true)}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="person-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.settingText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </Pressable>

          <Pressable style={styles.settingItem} onPress={() => setPasswordModalVisible(true)}>
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
          
          <Pressable style={styles.settingItem} onPress={() => setQualityModalVisible(true)}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="musical-notes-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.settingText}>Audio Quality</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{audioQuality}</Text>
              <Ionicons name="chevron-forward" size={18} color="#555" />
            </View>
          </Pressable>

          <Pressable style={styles.settingItem} onPress={() => navigation.navigate('Downloads' as never)}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="download-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.settingText}>Downloads</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{downloads.length}</Text>
              <Ionicons name="chevron-forward" size={18} color="#555" />
            </View>
          </Pressable>

          <Pressable style={styles.settingItem} onPress={() => Alert.alert('Notifications', 'Notification settings coming soon')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="notifications-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </Pressable>

          <Pressable style={styles.settingItem} onPress={() => Alert.alert('Privacy', 'Privacy settings coming soon')}>
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
          
          <Pressable style={styles.settingItem} onPress={() => Alert.alert(
            '🎵 Sonic Bloom',
            `Version 1.0.0\n\nA premium music streaming experience with offline downloads and advanced audio features.\n\n✨ Features:\n• Music Search\n• Offline Downloads\n• Audio Equalizer\n• Crossfade & Sleep Timer\n• Queue Management\n• Playback Speed Control\n\n👨‍💻 Created by Keshab Sarkar\n\n© ${new Date().getFullYear()} Sonic Bloom. All rights reserved.`,
            [{ text: 'Close', style: 'cancel' }]
          )}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="information-circle-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.settingText}>About Sonic Bloom</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </Pressable>

          <Pressable style={styles.settingItem} onPress={() => Alert.alert(
            'Terms & Privacy',
            '📜 Terms of Service\n\nBy using Sonic Bloom, you agree to:\n• Use the app for personal, non-commercial purposes\n• Respect copyright and intellectual property rights\n• Not attempt to reverse engineer or modify the app\n\n🔒 Privacy Policy\n\nWe value your privacy:\n• Your data is stored securely with Supabase\n• We don\'t sell or share your personal information\n• Profile pictures are stored in secure cloud storage\n• Downloads are stored locally on your device\n• You can delete your account and data anytime\n\nFor questions: contact@sonicbloom.app',
            [{ text: 'Close', style: 'cancel' }]
          )}>
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
        <Text style={styles.version}>Sonic Bloom v1.0.0 • © {new Date().getFullYear()}</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#666"
              value={fullName}
              onChangeText={setFullName}
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalBtnCancel} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalBtnSave} onPress={handleEditProfile}>
                <LinearGradient colors={['#1DB954', '#1ed760']} style={styles.modalBtnGradient}>
                  <Text style={styles.modalBtnSaveText}>Save</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={passwordModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#666"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalBtnCancel} onPress={() => setPasswordModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalBtnSave} onPress={handleChangePassword}>
                <LinearGradient colors={['#1DB954', '#1ed760']} style={styles.modalBtnGradient}>
                  <Text style={styles.modalBtnSaveText}>Change</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Audio Quality Modal */}
      <Modal visible={qualityModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Audio Quality</Text>
            {['Low (96 kbps)', 'Medium (160 kbps)', 'High (320 kbps)'].map((quality) => (
              <Pressable
                key={quality}
                style={styles.qualityOption}
                onPress={() => {
                  setAudioQuality(quality.split(' ')[0]);
                  setQualityModalVisible(false);
                }}
              >
                <Text style={styles.qualityText}>{quality}</Text>
                {audioQuality === quality.split(' ')[0] && (
                  <Ionicons name="checkmark-circle" size={24} color="#1DB954" />
                )}
              </Pressable>
            ))}
            <Pressable style={styles.modalBtnCancel} onPress={() => setQualityModalVisible(false)}>
              <Text style={styles.modalBtnCancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#0a0a0a', borderRadius: 12, padding: 16, fontSize: 16, color: '#fff', marginBottom: 16, borderWidth: 1, borderColor: '#2a2a2a' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtnCancel: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, alignItems: 'center' },
  modalBtnCancelText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  modalBtnSave: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  modalBtnGradient: { padding: 16, alignItems: 'center' },
  modalBtnSaveText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  qualityOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#0a0a0a', borderRadius: 12, marginBottom: 12 },
  qualityText: { fontSize: 16, color: '#fff', fontWeight: '500' },
});
