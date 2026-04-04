import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSpotifyAuth } from './hooks/useSpotifyAuth';
import { useSpotifyData } from './hooks/useSpotifyData';
import { Colors } from './constants/colors';
import { SpotifyTrack } from './services/spotifyApi';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import TracksScreen from './screens/TracksScreen';
import ArtistsScreen from './screens/ArtistsScreen';
import StatsScreen from './screens/StatsScreen';
import ProfileScreen from './screens/ProfileScreen';
import TrackDetailScreen from './screens/TrackDetailScreen';

type Tab = 'home' | 'tracks' | 'artists' | 'stats' | 'profile';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', icon: '⌂', label: 'Home' },
  { key: 'tracks', icon: '♪', label: 'Tracks' },
  { key: 'artists', icon: '★', label: 'Artists' },
  { key: 'stats', icon: '≡', label: 'Stats' },
  { key: 'profile', icon: '◯', label: 'Profile' },
];


// 👇 Tách component riêng để dùng được useSafeAreaInsets
function AppContent() {
  const insets = useSafeAreaInsets(); // 👈 lấy safe area
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [selectedTrackRank, setSelectedTrackRank] = useState<number>(1);

  const {
    token, loading: authLoading, error: authError,
    isAuthenticated, login, logout,
  } = useSpotifyAuth();

  const {
    user, topTracks, topArtists, playlists, genres,
    timeRange, setTimeRange,
    loading: dataLoading, refreshing, refresh,
    firebaseStats, currentPlaying,
    trackPlays,
    error: dataError,
  } = useSpotifyData(isAuthenticated);

  const openTrackDetail = (track: SpotifyTrack, rank: number) => {
    setSelectedTrack(track);
    setSelectedTrackRank(rank);
  };

  const closeTrackDetail = () => setSelectedTrack(null);

  if (authLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashLogo}>
          <Text style={styles.splashEmoji}>♪</Text>
        </View>
        <Text style={styles.splashTitle}>WRAPPED</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} loading={authLoading} error={authError} />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            user={user} topTracks={topTracks} topArtists={topArtists}
            firebaseStats={firebaseStats} currentPlaying={currentPlaying}
            loading={dataLoading} refreshing={refreshing}
            onRefresh={refresh} onTrackPress={openTrackDetail}
            timeRange={timeRange}
          />
        );
      case 'tracks':
        return (
          <TracksScreen
            tracks={topTracks} timeRange={timeRange} setTimeRange={setTimeRange}
            loading={dataLoading} refreshing={refreshing}
            onRefresh={refresh} onTrackPress={openTrackDetail}
          />
        );
      case 'artists':
        return (
          <ArtistsScreen
            artists={topArtists} timeRange={timeRange} setTimeRange={setTimeRange}
            loading={dataLoading} refreshing={refreshing} onRefresh={refresh}
          />
        );
      case 'stats':
        return (
          <StatsScreen
            tracks={topTracks} artists={topArtists} genres={genres}
            timeRange={timeRange} setTimeRange={setTimeRange}
            loading={dataLoading} refreshing={refreshing} onRefresh={refresh}
          />
        );
      case 'profile':
        return <ProfileScreen user={user} playlists={playlists} onLogout={logout} />;
    }
  };

  const selectedTrackPlaycount =
    selectedTrack && trackPlays
      ? (trackPlays[selectedTrack.id]?.play_count || selectedTrack.playcount || 0)
      : 0;

  const selectedTrackTotalListenedMs =
    selectedTrack && trackPlays
      ? (trackPlays[selectedTrack.id]?.total_listened_ms || selectedTrack.total_listened_ms || 0)
      : 0;

  // 👇 Tính tab bar height động theo insets
  const TAB_CONTENT_HEIGHT = 56; // paddingTop(12) + icon + label + paddingBottom(12)
  const tabBarHeight = TAB_CONTENT_HEIGHT + insets.bottom;

  return (
    <View style={styles.appContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />



      {/* Content cần biết tab bar cao bao nhiêu để không bị che */}
      <View style={[styles.content, { paddingBottom: tabBarHeight }]}>
        {renderScreen()}
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBarWrapper, { paddingBottom: insets.bottom }]}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                {isActive && <View style={styles.tabActiveIndicator} />}
                <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                  {tab.icon}
                </Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {selectedTrack && (
        <TrackDetailScreen
          track={selectedTrack}
          rank={selectedTrackRank}
          playcount={selectedTrackPlaycount}
          totalListenedMs={selectedTrackTotalListenedMs}
          onClose={closeTrackDetail}
        />
      )}
    </View>
  );
}

// 👇 Khởi tạo QueryClient & Persister
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 phút
      gcTime: 1000 * 60 * 60 * 24, // Giữ trong cache 24h
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

// 👇 Wrap toàn app trong SafeAreaProvider & PersistQueryClientProvider
export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  splashLogo: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 1, borderColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  splashEmoji: { color: Colors.gold, fontSize: 28 },
  splashTitle: {
    color: Colors.textPrimary,
    fontSize: 22, fontWeight: '800', letterSpacing: 8,
  },
  appContainer: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },

  tabBarWrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    // ❌ bỏ paddingBottom cố định ở đây — chuyển sang inline style
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 8,
    paddingBottom: 12, // padding nội dung tab, KHÔNG tính nav bar
    gap: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    paddingVertical: 2,
  },
  tabActiveIndicator: {
    position: 'absolute',
    top: -12,
    width: 24, height: 2,
    backgroundColor: Colors.gold,
    borderRadius: 1,
  },
  tabIcon: { fontSize: 18, color: Colors.textMuted },
  tabIconActive: { color: Colors.gold },
  tabLabel: {
    color: Colors.textMuted,
    fontSize: 9, fontWeight: '600',
    textAlign: 'center', letterSpacing: 0.5,
  },
  tabLabelActive: { color: Colors.gold },
});