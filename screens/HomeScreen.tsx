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
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { SpotifyUser, SpotifyTrack, SpotifyArtist, calcTotalDuration, formatDuration, formatNumber } from '../services/spotifyApi';
import { StatCard } from '../components/StatCard';
import { TrackCard } from '../components/TrackCard';
import { ArtistCard } from '../components/ArtistCard';
import { TrackSkeleton } from '../components/LoadingShimmer';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  user: SpotifyUser | null;
  topTracks: SpotifyTrack[];
  topArtists: SpotifyArtist[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

export default function HomeScreen({
  user,
  topTracks,
  topArtists,
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

  const totalDuration = calcTotalDuration(topTracks);
  const uniqueArtists = new Set(topTracks.flatMap((t) => t.artists.map((a) => a.id))).size;
  const avgPopularity =
    topTracks.length > 0
      ? Math.round(topTracks.reduce((s, t) => s + t.popularity, 0) / topTracks.length)
      : 0;

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
      <LinearGradient
        colors={['#1A0E2E', Colors.background]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Blur accent */}
        <View style={styles.headerBlob} />

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
              <LinearGradient
                colors={Colors.gradientPink as [string, string]}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarInitial}>
                  {user?.display_name?.[0]?.toUpperCase() || '?'}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.display_name || 'Người dùng'}
              </Text>
            </View>
            {user?.product === 'premium' && (
              <LinearGradient
                colors={Colors.gradientGold as [string, string]}
                style={styles.premiumBadge}
              >
                <Text style={styles.premiumText}>⭐ Premium</Text>
              </LinearGradient>
            )}
          </View>
        </Animated.View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Stat Cards */}
        <Text style={styles.sectionTitle}>📈 Thống kê nhanh</Text>
        <View style={styles.statGrid}>
          <StatCard
            emoji="⏱"
            value={formatDuration(totalDuration)}
            label="Tổng thời gian nghe"
            gradientColors={[Colors.neonPink, Colors.neonPurple]}
            delay={100}
          />
          <StatCard
            emoji="🎵"
            value={`${topTracks.length}`}
            label="Bài hát yêu thích"
            gradientColors={[Colors.neonCyan, '#3B82F6']}
            delay={200}
          />
        </View>
        <View style={styles.statGrid}>
          <StatCard
            emoji="🎤"
            value={`${uniqueArtists}`}
            label="Nghệ sĩ độc đáo"
            gradientColors={[Colors.neonGreen, '#158a3e']}
            delay={300}
          />
          <StatCard
            emoji="🔥"
            value={`${avgPopularity}%`}
            label="Độ phổ biến trung bình"
            gradientColors={[Colors.neonYellow, Colors.bronze]}
            delay={400}
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
          <LinearGradient
            colors={[Colors.neonPurple + '20', Colors.neonPink + '20']}
            style={styles.funCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.funTitle}>💡 Fun Fact</Text>
            <Text style={styles.funText}>
              Bài hát #1 của bạn là{' '}
              <Text style={styles.funHighlight}>"{topTracks[0]?.name}"</Text>.
              {'\n'}Nghệ sĩ yêu thích nhất:{' '}
              <Text style={styles.funHighlight}>{topArtists[0]?.name}</Text>! 🎉
            </Text>
          </LinearGradient>
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
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  statGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  funCard: {
    margin: 16,
    marginTop: 24,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.neonPurple + '30',
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
