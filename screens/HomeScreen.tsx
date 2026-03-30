import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Colors } from '../constants/colors';
import { SpotifyUser, SpotifyTrack, SpotifyArtist } from '../services/spotifyApi';
import { FirebaseStats, CurrentPlaying } from '../hooks/useFirebaseStats';
import { StatCard } from '../components/StatCard';
import { TrackCard } from '../components/TrackCard';
import { ArtistCard } from '../components/ArtistCard';
import { TrackSkeleton } from '../components/LoadingShimmer';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  user: SpotifyUser | null;
  topTracks: SpotifyTrack[];
  topArtists: SpotifyArtist[];
  firebaseStats: FirebaseStats | null;
  currentPlaying: CurrentPlaying | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

export default function HomeScreen({
  user,
  topTracks,
  topArtists,
  firebaseStats,
  currentPlaying,
  loading,
  refreshing,
  onRefresh,
}: HomeScreenProps) {
  const headerY = useRef(new Animated.Value(-60)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerY, { toValue: 0, tension: 40, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [user]);

  const uniqueArtists = new Set(topTracks.flatMap((t) => t.artists.map((a) => a.id))).size;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Chào buổi sáng';
    if (hour < 17) return '☀️ Chào buổi chiều';
    return '🌙 Chào buổi tối';
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.neonPink}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Animated.View
          style={[
            styles.headerContent,
            { transform: [{ translateY: headerY }], opacity: headerOpacity },
          ]}
        >
          <View style={styles.userRow}>
            {user?.images?.[0]?.url ? (
              <Image source={{ uri: user.images[0].url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {user?.display_name?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.display_name || 'Người dùng'}
              </Text>
            </View>
            {user?.product === 'premium' && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>⭐ Premium</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>▶️ Đang phát (Realtime Bot)</Text>
        {currentPlaying ? (
          <View style={styles.playingCard}>
            {currentPlaying.album_image ? (
              <Image source={{ uri: currentPlaying.album_image }} style={styles.playingImage} />
            ) : (
              <View style={styles.playingImagePlaceholder}><Text>💿</Text></View>
            )}
            <View style={styles.playingInfo}>
              <Text style={styles.playingTitle} numberOfLines={1}>{currentPlaying.track_name}</Text>
              <Text style={styles.playingArtist} numberOfLines={1}>{currentPlaying.artist_name}</Text>
              <View style={styles.playingWaves}>
                 <Text style={{color: Colors.neonPink}}>ılıılıılıılıılıılı</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.playingCard}>
            <Text style={styles.playingTitle}>Không có bài hát nào đang phát.</Text>
            <Text style={styles.playingArtist}>Mở Spotify để bot ghi nhận nhé!</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📈 Thống kê Bot Ghi Nhận</Text>
        <View style={styles.statGrid}>
          <StatCard
            emoji="🎧"
            value={`${firebaseStats?.total_plays || 0}`}
            label="Tổng Lượt Nghe"
            gradientColors={[Colors.neonPink, Colors.neonPurple]}
            delay={100}
          />
          <StatCard
            emoji="⏱"
            value={`${firebaseStats?.total_minutes || 0} p`}
            label="Tổng Phút Nghe"
            gradientColors={[Colors.neonCyan, '#3B82F6']}
            delay={200}
          />
        </View>

        {/* Top 5 Tracks Preview */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          🎵 Top Bài Hát Tuần Này
        </Text>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <TrackSkeleton key={i} />)
          : topTracks.slice(0, 5).map((track, i) => (
              <TrackCard
                key={track.id}
                track={track}
                rank={i + 1}
                compact
              />
            ))}

        {/* Top 3 Artists Preview */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          🎤 Top Nghệ Sĩ Tuần Này
        </Text>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <TrackSkeleton key={i} />)
          : topArtists.slice(0, 3).map((artist, i) => (
              <ArtistCard key={artist.id} artist={artist} rank={i + 1} />
            ))}

        {/* Fun Fact */}
        {topTracks.length > 0 && (
          <View style={styles.funCard}>
            <Text style={styles.funTitle}>💡 Fun Fact</Text>
            <Text style={styles.funText}>
              Bản hit gắn liền với bạn là{' '}
              <Text style={styles.funHighlight}>"{topTracks[0]?.name}"</Text>.
              {'\n'}Bạn đã cày list nhạc của{' '}
              <Text style={styles.funHighlight}>{topArtists[0]?.name}</Text> rất nhiều! 🎉
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerBlob: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.neonPink + '15',
  },
  headerContent: {},
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.neonPink,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neonPink,
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  userName: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  premiumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: Colors.gold,
  },
  premiumText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    paddingTop: 8,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  playingCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playingImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  playingImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingInfo: {
    flex: 1,
    gap: 4,
  },
  playingTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  playingArtist: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  playingWaves: {
    marginTop: 4,
  },
  funCard: {
    margin: 16,
    marginTop: 24,
    padding: 24,
    borderRadius: 16,
    backgroundColor: Colors.card,
  },
  funTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  funText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  funHighlight: {
    color: Colors.neonPink,
    fontWeight: '700',
  },
});
