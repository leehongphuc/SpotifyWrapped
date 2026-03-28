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

const TABS: { key: Tab; emoji: string; label: string }[] = [
  { key: 'home', emoji: '🏠', label: 'Trang Chủ' },
  { key: 'tracks', emoji: '🎵', label: 'Bài Hát' },
  { key: 'artists', emoji: '🎤', label: 'Nghệ Sĩ' },
  { key: 'stats', emoji: '📊', label: 'Thống Kê' },
  { key: 'profile', emoji: '👤', label: 'Hồ Sơ' },
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
  } = useSpotifyData(isAuthenticated);

  // ── Splash / Auth loading ──────────────────────────────────────
  if (authLoading) {
    return (
      <View style={styles.splashContainer}>
        <LinearGradient
          colors={['#0D0D1A', '#1A0E2E', '#0D0D1A']}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={Colors.gradientPink as [string, string]}
          style={styles.splashLogo}
        >
          <Text style={styles.splashEmoji}>🎵</Text>
        </LinearGradient>
        <Text style={styles.splashTitle}>Spotify Wrapped</Text>
        <Text style={styles.splashSub}>Đang tải...</Text>
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
        <LinearGradient
          colors={['transparent', Colors.background]}
          style={styles.tabBarGlow}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[Colors.surface, Colors.background + 'F0']}
          style={styles.tabBar}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                {isActive && (
                  <LinearGradient
                    colors={Colors.gradientPink as [string, string]}
                    style={styles.tabActiveIndicator}
                  />
                )}
                <Text style={[styles.tabEmoji, isActive && styles.tabEmojiActive]}>
                  {tab.emoji}
                </Text>
                <Text
                  style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </LinearGradient>
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
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashEmoji: {
    fontSize: 48,
  },
  splashTitle: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
  },
  splashSub: {
    color: Colors.textMuted,
    fontSize: 14,
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
  },
  tabBarGlow: {
    height: 20,
    marginBottom: -1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    position: 'relative',
    paddingVertical: 2,
  },
  tabActiveIndicator: {
    position: 'absolute',
    top: -10,
    width: 32,
    height: 3,
    borderRadius: 2,
  },
  tabEmoji: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabEmojiActive: {
    opacity: 1,
    fontSize: 22,
  },
  tabLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: Colors.neonPink,
    fontWeight: '700',
  },
});
