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
import { Colors } from '../constants/colors';
import { SpotifyUser, SpotifyPlaylist, formatNumber } from '../services/spotifyApi';

interface ProfileScreenProps {
  user: SpotifyUser | null;
  playlists: SpotifyPlaylist[];
  onLogout: () => void;
}

export default function ProfileScreen({ user, playlists, onLogout }: ProfileScreenProps) {
  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất không?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: onLogout },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>PROFILE</Text>
        <View style={styles.profileRow}>
          {user?.images?.[0]?.url ? (
            <Image source={{ uri: user.images[0].url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {user?.display_name?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.displayName} numberOfLines={1}>
              {user?.display_name || 'Người dùng'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
            <View style={styles.badgeRow}>
              {user?.product === 'premium' && (
                <View style={styles.badgeGold}>
                  <Text style={styles.badgeGoldText}>PREMIUM</Text>
                </View>
              )}
              {user?.country && (
                <View style={styles.badgeMuted}>
                  <Text style={styles.badgeMutedText}>{user.country}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.rule} />
      </View>

      {/* Playlists */}
      {playlists.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PLAYLISTS</Text>
          {playlists.map((p) => (
            <View key={p.id} style={styles.playlistRow}>
              {p.images?.[0]?.url ? (
                <Image source={{ uri: p.images[0].url }} style={styles.playlistImg} />
              ) : (
                <View style={styles.playlistImgFallback}>
                  <Text style={{ color: Colors.textMuted }}>♪</Text>
                </View>
              )}
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName} numberOfLines={1}>{p?.name}</Text>
                <Text style={styles.playlistCount}>{p?.tracks?.total ?? 0} tracks</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.aboutCard}>
          <View style={styles.aboutGoldBar} />
          <View style={styles.aboutBody}>
            <Text style={styles.aboutTitle}>Spotify Wrapped</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutDesc}>
              Khám phá thống kê âm nhạc cá nhân của bạn — anytime, not just December.
            </Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.75} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* Header */
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 0,
    gap: 16,
  },
  eyebrow: {
    color: Colors.gold,
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: '700',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: Colors.gold,
    fontSize: 28,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  displayName: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  email: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  badgeGold: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Colors.goldDim,
  },
  badgeGoldText: {
    color: Colors.gold,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  badgeMuted: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeMutedText: {
    color: Colors.textMuted,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '600',
  },
  rule: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 8,
  },

  /* Section */
  section: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '700',
    marginBottom: 14,
  },

  /* Playlists */
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  playlistImg: {
    width: 44,
    height: 44,
    borderRadius: 2,
  },
  playlistImgFallback: {
    width: 44,
    height: 44,
    borderRadius: 2,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: { flex: 1 },
  playlistName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  playlistCount: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  /* About */
  aboutCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  aboutGoldBar: {
    width: 3,
    backgroundColor: Colors.gold,
  },
  aboutBody: {
    flex: 1,
    padding: 16,
    gap: 4,
  },
  aboutTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  aboutVersion: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  aboutDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  /* Logout */
  logoutBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
});