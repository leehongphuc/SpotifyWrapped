import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Colors } from '../constants/colors';
import {
  SpotifyTrack,
  SpotifyArtist,
  TimeRange,
  calcTotalDuration,
  formatDuration,
  formatNumber,
} from '../services/spotifyApi';
import { GenreChart } from '../components/GenreChart';
import { TimeFilter, SectionHeader } from '../components/UIComponents';
import { LoadingShimmer } from '../components/LoadingShimmer';

const { width } = Dimensions.get('window');

interface StatsScreenProps {
  tracks: SpotifyTrack[];
  artists: SpotifyArtist[];
  genres: { genre: string; count: number }[];
  timeRange: TimeRange;
  setTimeRange: (r: TimeRange) => void;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

export default function StatsScreen({
  tracks,
  artists,
  genres,
  timeRange,
  setTimeRange,
  loading,
  refreshing,
  onRefresh,
}: StatsScreenProps) {
  const totalDuration = calcTotalDuration(tracks);
  const uniqueGenres = genres.length;
  const topGenre = genres[0]?.genre || '—';

  const timeLabel = {
    short_term: '4 tuần qua',
    medium_term: '6 tháng qua',
    long_term: 'mọi thời đại',
  }[timeRange];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.neonYellow}
        />
      }
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <SectionHeader
          emoji="📊"
          title="Phân Tích"
          subtitle={`Thống kê âm nhạc ${timeLabel}`}
        />
        <TimeFilter current={timeRange} onChange={setTimeRange} />
      </View>

      {/* Quick Stats Row */}
      <View style={styles.quickStats}>
        {[
          { label: 'Tổng thời gian', value: formatDuration(totalDuration), color: Colors.neonPink },
          { label: 'Thể loại', value: `${uniqueGenres}`, color: Colors.neonPurple },
          { label: 'Top thể loại', value: topGenre, color: Colors.neonCyan, small: true },
        ].map((s, i) => (
          <View key={i} style={styles.quickStat}>
            <Text style={[styles.quickValue, { color: s.color }, s.small && styles.quickValueSmall]}>
              {s.value}
            </Text>
            <Text style={styles.quickLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Genre Pie Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎭 Thể Loại Nhạc Yêu Thích</Text>
        {loading ? (
          <LoadingShimmer height={200} style={styles.chartLoading} />
        ) : (
          <GenreChart genres={genres} />
        )}
      </View>

      {/* Artist Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌍 Thông Tin Nghệ Sĩ</Text>
        <View style={styles.artistStats}>
          <View style={styles.artistStatCard}>
            <Text style={styles.artistStatValue}>{artists.length}</Text>
            <Text style={styles.artistStatLabel}>Nghệ sĩ theo dõi</Text>
          </View>
          <View style={styles.artistStatCard}>
            <Text style={styles.artistStatValue}>
              {artists[0] ? formatNumber(artists[0]?.followers?.total || 0) : '—'}
            </Text>
            <Text style={styles.artistStatLabel}>Followers nghệ sĩ số 1</Text>
          </View>
        </View>
      </View>

      {/* Listening Personality */}
      {tracks.length > 0 && (
        <View style={styles.personalityCard}>
          <Text style={styles.personalityTitle}>🧠 Tính Cách Âm Nhạc</Text>
          <Text style={styles.personalityText}>
            🎨 Bạn có gu âm nhạc độc đáo và cá tính!
          </Text>
          <Text style={styles.personalityDetail}>
            Thể loại chủ yếu: {topGenre} · {uniqueGenres} thể loại khác nhau
          </Text>
        </View>
      )}

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
    paddingTop: 56,
    paddingBottom: 8,
  },
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  quickStat: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 4,
  },
  quickValue: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  quickValueSmall: {
    fontSize: 11,
  },
  quickLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  barSection: {
    paddingHorizontal: 0,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  chartLoading: {
    marginHorizontal: 16,
    borderRadius: 16,
  },
  barChart: {
    borderRadius: 16,
    marginHorizontal: 16,
  },
  artistStats: {
    flexDirection: 'row',
    gap: 10,
  },
  artistStatCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 4,
  },
  artistStatValue: {
    color: Colors.neonCyan,
    fontSize: 18,
    fontWeight: '800',
  },
  artistStatLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  personalityCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: Colors.card,
    gap: 8,
  },
  personalityTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  personalityText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  personalityDetail: {
    color: Colors.textMuted,
    fontSize: 12,
    textTransform: 'capitalize',
  },
});
