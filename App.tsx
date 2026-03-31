import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useSpotifyAuth } from './hooks/useSpotifyAuth';
import { useSpotifyData } from './hooks/useSpotifyData';
import { Colors } from './constants/colors';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import TracksScreen from './screens/TracksScreen';
import ArtistsScreen from './screens/ArtistsScreen';
import StatsScreen from './screens/StatsScreen';
import ProfileScreen from './screens/ProfileScreen';

type Tab = 'home' | 'tracks' | 'artists' | 'stats' | 'profile';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', icon: '⌂', label: 'Home' },
  { key: 'tracks', icon: '♪', label: 'Tracks' },
  { key: 'artists', icon: '★', label: 'Artists' },
  { key: 'stats', icon: '≡', label: 'Stats' },
  { key: 'profile', icon: '👤', label: 'Profile' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const { token, loading: authLoading, error: authError, isAuthenticated, login, logout } = useSpotifyAuth();

  const {
    user,
    topTracks,
    topArtists,
    playlists,
    genres,
    timeRange,
    setTimeRange,
    loading: dataLoading,
    refreshing,
    refresh,
    firebaseStats,
    currentPlaying,
  } = useSpotifyData(isAuthenticated);

  // ── Splash / Auth loading ──────────────────────────────────────
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

  // ── Not logged in → Login screen ──────────────────────────────
  if (!isAuthenticated) {
    return (
      <LoginScreen onLogin={login} loading={authLoading} error={authError} />
    );
  }

  // ── Main App ──────────────────────────────────────────────────
  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            user={user}
            topTracks={topTracks}
            topArtists={topArtists}
            firebaseStats={firebaseStats}
            currentPlaying={currentPlaying}
            loading={dataLoading}
            refreshing={refreshing}
            onRefresh={refresh}
          />
        );
      case 'tracks':
        return (
          <TracksScreen
            tracks={topTracks}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            loading={dataLoading}
            refreshing={refreshing}
            onRefresh={refresh}
          />
        );
      case 'artists':
        return (
          <ArtistsScreen
            artists={topArtists}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            loading={dataLoading}
            refreshing={refreshing}
            onRefresh={refresh}
          />
        );
      case 'stats':
        return (
          <StatsScreen
            tracks={topTracks}
            artists={topArtists}
            genres={genres}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            loading={dataLoading}
            refreshing={refreshing}
            onRefresh={refresh}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            user={user}
            playlists={playlists}
            onLogout={logout}
          />
        );
    }
  };

  return (
    <View style={styles.appContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Main Content */}
      <View style={styles.content}>{renderScreen()}</View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBarWrapper}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  // Splash
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  splashLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashEmoji: {
    color: Colors.gold,
    fontSize: 28,
  },
  splashTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
  },

  // App
  appContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },

  // Tab Bar
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tabBar: {
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 12,
    paddingHorizontal: 8,
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
    width: 24,
    height: 2,
    backgroundColor: Colors.gold,
    borderRadius: 1,
  },
  tabIcon: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  tabIconActive: {
    color: Colors.gold,
  },
  tabLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: Colors.gold,
  },
});
