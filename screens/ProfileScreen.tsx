import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { SpotifyUser, SpotifyPlaylist, formatNumber } from '../services/spotifyApi';

interface ProfileScreenProps {
  user: SpotifyUser | null;
  playlists: SpotifyPlaylist[];
  onLogout: () => void;
}

export default function ProfileScreen({ user, playlists, onLogout }: ProfileScreenProps) {
  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất không?',
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      {/* Profile Header */}
      <LinearGradient
        colors={[Colors.neonPurple + '40', Colors.background]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.avatarWrapper}>
          {user?.images?.[0]?.url ? (
            <Image source={{ uri: user.images[0].url }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={Colors.gradientPink as [string, string]}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarInitial}>
                {user?.display_name?.[0]?.toUpperCase() || '?'}
              </Text>
            </LinearGradient>
          )}
          <LinearGradient
            colors={Colors.gradientPink as [string, string]}
            style={styles.avatarRing}
          />
        </View>

        <Text style={styles.displayName}>{user?.display_name || 'Người dùng'}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        {/* Badges row */}
        <View style={styles.badgeRow}>
          {user?.product === 'premium' && (
            <LinearGradient
              colors={Colors.gradientGold as [string, string]}
              style={styles.badge}
            >
              <Text style={styles.badgeText}>⭐ Premium</Text>
            </LinearGradient>
          )}
          <View style={styles.badgeAlt}>
            <Text style={styles.badgeText}>🌍 {user?.country}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(user?.followers?.total || 0)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{playlists.length}</Text>
            <Text style={styles.statLabel}>Playlist</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Playlists */}
      {playlists.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎵 Playlist của tôi</Text>
          {playlists.map((p) => (
            <View key={p.id} style={styles.playlistItem}>
              {p.images?.[0]?.url ? (
                <Image source={{ uri: p.images[0].url }} style={styles.playlistImg} />
              ) : (
                <LinearGradient
                  colors={Colors.gradientCyan as [string, string]}
                  style={styles.playlistImg}
                >
                  <Text style={{ fontSize: 20 }}>🎵</Text>
                </LinearGradient>
              )}
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName} numberOfLines={1}>
                  {p?.name || 'Playlist'}
                </Text>
                <Text style={styles.playlistCount}>{p?.tracks?.total || 0} bài hát</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ Về Ứng Dụng</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>🎵 Spotify Wrapped Teen</Text>
          <Text style={styles.infoSub}>Phiên bản 1.0.0</Text>
          <Text style={styles.infoDesc}>
            Khám phá thống kê âm nhạc cá nhân của bạn — anytime, not just December! 🎉
          </Text>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.logoutSection}>
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.8}>
          <LinearGradient
            colors={[Colors.neonPink + '30', Colors.neonPink + '10']}
            style={styles.logoutBtn}
          >
            <Text style={styles.logoutText}>🚪 Đăng Xuất</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 70,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 8,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: '800',
  },
  avatarRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 51,
    opacity: 0.5,
  },
  displayName: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  email: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeAlt: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginTop: 16,
    marginHorizontal: 40,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  playlistImg: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  playlistCount: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  infoSub: {
    color: Colors.neonGreen,
    fontSize: 13,
    fontWeight: '600',
  },
  infoDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  logoutSection: {
    paddingHorizontal: 16,
  },
  logoutBtn: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neonPink + '40',
  },
  logoutText: {
    color: Colors.neonPink,
    fontSize: 16,
    fontWeight: '700',
  },
});
