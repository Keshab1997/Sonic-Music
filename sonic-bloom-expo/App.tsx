import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlayerProvider } from "./src/context/PlayerContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { DownloadsProvider } from './src/context/DownloadsContext';
import { LikedSongsProvider } from './src/context/LikedSongsContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { DownloadsPage } from './src/screens/DownloadsPage';
import { LikedSongsPage } from './src/screens/LikedSongsPage';
import { PlaylistsPage } from './src/screens/PlaylistsPage';
import { ArtistsPage } from './src/screens/ArtistsPage';
import { AlbumsPage } from './src/screens/AlbumsPage';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { ArtistDetailScreen } from './src/screens/ArtistDetailScreen';
import { AlbumDetailScreen } from './src/screens/AlbumDetailScreen';
import { QueueScreen } from './src/screens/QueueScreen';
import { MiniPlayer } from './src/components/MiniPlayer';
import { SplashScreen } from './src/components/SplashScreen';

const queryClient = new QueryClient();
const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

// Tab Navigator
const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#0a0a0a',
        borderTopColor: '#1a1a1a',
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 8,
        paddingTop: 6,
      },
      tabBarActiveTintColor: '#1DB954',
      tabBarInactiveTintColor: '#555',
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
        if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';
        else if (route.name === 'Queue') iconName = focused ? 'list' : 'list-outline';
        else if (route.name === 'Downloads') iconName = focused ? 'download' : 'download-outline';
        else if (route.name === 'Library') iconName = focused ? 'library' : 'library-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '600',
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Search" component={SearchScreen} />
    <Tab.Screen name="Queue" component={QueueScreen} />
    <Tab.Screen name="Downloads" component={DownloadsPage} />
    <Tab.Screen name="Library" component={LibraryScreen} />
  </Tab.Navigator>
);

// Main App Navigator (with MiniPlayer)
const MainNavigator = () => (
  <View style={styles.container}>
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={TabNavigator} />
      <RootStack.Screen name="ArtistDetail" component={ArtistDetailScreen} />
      <RootStack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
      <RootStack.Screen name="LikedSongs" component={LikedSongsPage} />
      <RootStack.Screen name="Downloads" component={DownloadsPage} />
      <RootStack.Screen name="Playlists" component={PlaylistsPage} />
      <RootStack.Screen name="Artists" component={ArtistsPage} />
      <RootStack.Screen name="Albums" component={AlbumsPage} />
      <RootStack.Screen name="Profile" component={ProfileScreen} />
    </RootStack.Navigator>
    <MiniPlayer />
  </View>
);

// Root Navigator with Auth Check
const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {/* Main app accessible without login */}
        <RootStack.Screen name="Main" component={MainNavigator} />
        {!user && (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

// App Root
export default function App() {
  const [splashFinished, setSplashFinished] = useState(false);

  const handleSplashFinish = () => {
    setSplashFinished(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlayerProvider>
          <DownloadsProvider>
            <LikedSongsProvider>
              <SafeAreaView style={styles.safeArea}>
                {!splashFinished && <SplashScreen onFinish={handleSplashFinish} />}
                <RootNavigator />
                <StatusBar style="light" />
              </SafeAreaView>
            </LikedSongsProvider>
          </DownloadsProvider>
        </PlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  safeArea: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
});
