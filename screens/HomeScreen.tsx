import React, { useRef, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  Animated, RefreshControl,
} from 'react-native';
import { Colors } from '../constants/colors';
import { SpotifyUser, SpotifyTrack, SpotifyArtist } from '../services/spotifyApi';
import { FirebaseStats, CurrentPlaying } from '../hooks/useFirebaseStats';
import { StatCard } from '../components/StatCard';
import { TrackCard } from '../components/TrackCard';
import { ArtistCard } from '../components/ArtistCard';
import { TrackSkeleton } from '../components/LoadingShimmer';

interface HomeScreenProps {
  user: SpotifyUser | null;
  topTracks: SpotifyTrack[];
  topArtists: SpotifyArtist[];
  firebaseStats: FirebaseStats | null;
  currentPlaying: CurrentPlaying | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onTrackPress?: (track: SpotifyTrack, rank: number) => void;
}

function AnimatedWave() {
  const BASE_HEIGHTS = [8, 14, 10, 18, 12, 16, 9, 13];
  const anims = useRef(BASE_HEIGHTS.map(h => new Animated.Value(h))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) => {
      const minH = BASE_HEIGHTS[i] * 0.2;
      const maxH = BASE_HEIGHTS[i];
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: minH,
            duration: 250 + i * 50,
            delay: i * 70,
            useNativeDriver: false, // height không dùng native driver được
          }),
          Animated.timing(anim, {
            toValue: maxH,
            duration: 250 + i * 50,
            useNativeDriver: false,
          }),
        ])
      );
    });

    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.waveRow}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[styles.waveBar, { height: anim as any }]}
        />
      ))}
    </View>
  );
}

export default function HomeScreen({
  user, topTracks, topArtists,
  firebaseStats, currentPlaying,
  loading, refreshing, onRefresh, onTrackPress,
}: HomeScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [user]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />
      }
    >
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.headerTop}>
          <View style={styles.greetBlock}>
            <Text style={styles.greetLabel}>{greeting()}</Text>
            <Text style={styles.greetName} numberOfLines={1}>
              {user?.display_name || 'Listener'}
            </Text>
          </View>
          {user?.images?.[0]?.url ? (
            <Image source={{ uri: user.images[0].url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {user?.display_name?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRule} />
      </Animated.View>

      {/* Now Playing */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>NOW PLAYING</Text>
        {currentPlaying ? (
          <View style={styles.nowPlayingCard}>
            {currentPlaying.album_image ? (
              <Image source={{ uri: currentPlaying.album_image }} style={styles.nowPlayingImg} />
            ) : (
              <View style={[styles.nowPlayingImg, styles.nowPlayingImgFallback]}>
                <Text style={{ color: Colors.textMuted, fontSize: 24 }}>♪</Text>
              </View>
            )}
            <View style={styles.nowPlayingInfo}>
              <Text style={styles.nowPlayingTrack} numberOfLines={1}>
                {currentPlaying.track_name}
              </Text>
              <Text style={styles.nowPlayingArtist} numberOfLines={1}>
                {currentPlaying.artist_name}
              </Text>
              <AnimatedWave />
            </View>
          </View>
        ) : (
          <View style={styles.nowPlayingEmpty}>
            <Text style={styles.nowPlayingEmptyText}>Không có bài hát đang phát</Text>
            <Text style={styles.nowPlayingEmptySub}>Mở Spotify để bắt đầu theo dõi</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>THỐNG KÊ</Text>
        <View style={styles.statRow}>
          <StatCard
            emoji="▶"
            value={`${firebaseStats?.total_plays ?? 0}`}
            label="Lượt nghe"
            gradientColors={[Colors.gold, Colors.goldDim]}
            delay={0}
          />
          <StatCard
            emoji="◷"
            value={`${firebaseStats?.total_minutes ?? 0}`}
            label="Phút nghe"
            gradientColors={['#1E1E1E', '#2A2A2A']}
            delay={100}
          />
        </View>
      </View>

      {/* Top Tracks */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>TOP TRACKS · TUẦN NÀY</Text>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <TrackSkeleton key={i} />)
          : topTracks.slice(0, 5).map((track, i) => (
            <TrackCard
              key={track.id}
              track={track}
              rank={i + 1}
              compact
              onPress={() => onTrackPress?.(track, i + 1)}
            />
          ))}
      </View>

      {/* Top Artists */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>TOP ARTISTS · TUẦN NÀY</Text>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <TrackSkeleton key={i} />)
          : topArtists.slice(0, 3).map((artist, i) => (
            <ArtistCard key={artist.id} artist={artist} rank={i + 1} />
          ))}
      </View>

      {/* Highlight */}
      {topTracks.length > 0 && (
        <View style={[styles.section, { paddingBottom: 8 }]}>
          <Text style={styles.sectionLabel}>HIGHLIGHT</Text>
          <View style={styles.factCard}>
            <View style={styles.factGoldBar} />
            <View style={styles.factBody}>
              <Text style={styles.factText}>
                "{topTracks[0]?.name}" là bản nhạc gắn liền với bạn nhất giai đoạn này.
              </Text>
              <Text style={styles.factSub}>
                {topArtists[0]?.name} · Nghệ sĩ hàng đầu của bạn
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  greetBlock: { gap: 2 },
  greetLabel: { color: Colors.textMuted, fontSize: 12, letterSpacing: 2, fontWeight: '500', textTransform: 'uppercase' },
  greetName: { color: Colors.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: Colors.border },
  avatarFallback: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: Colors.gold, fontSize: 18, fontWeight: '700' },
  headerRule: { height: 1, backgroundColor: Colors.border },
  section: { paddingHorizontal: 24, paddingTop: 28 },
  sectionLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 3, fontWeight: '700', marginBottom: 14 },
  nowPlayingCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 4,
    padding: 16, gap: 16, borderWidth: 1, borderColor: Colors.border,
  },
  nowPlayingImg: { width: 58, height: 58, borderRadius: 2 },
  nowPlayingImgFallback: { backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  nowPlayingInfo: { flex: 1, gap: 4 },
  nowPlayingTrack: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  nowPlayingArtist: { color: Colors.textSecondary, fontSize: 12 },
  waveRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 6 },
  waveBar: { width: 2, borderRadius: 1, backgroundColor: Colors.gold, opacity: 0.7 },
  nowPlayingEmpty: {
    backgroundColor: Colors.surface, borderRadius: 4,
    borderWidth: 1, borderColor: Colors.border, padding: 20, gap: 4,
  },
  nowPlayingEmptyText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  nowPlayingEmptySub: { color: Colors.textMuted, fontSize: 12 },
  statRow: { flexDirection: 'row', gap: 12 },
  factCard: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: 4, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  factGoldBar: { width: 3, backgroundColor: Colors.gold },
  factBody: { flex: 1, padding: 16, gap: 6 },
  factText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600', lineHeight: 20, fontStyle: 'italic' },
  factSub: { color: Colors.gold, fontSize: 11, letterSpacing: 0.5, fontWeight: '600' },
});