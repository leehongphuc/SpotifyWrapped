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
import { TimeFilter } from '../components/UIComponents';
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
    '1_day': 'Hôm nay',
    '1_week': 'Tuần này',
    short_term: '4 Weeks',
    medium_term: '6 Months',
    long_term: 'All Time',
  }[timeRange];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />
      }
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR MUSIC</Text>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Insight · {timeLabel}</Text>
        <View style={styles.rule} />
        <TimeFilter current={timeRange} onChange={setTimeRange} />
      </View>

      {/* Quick Stats Row */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>OVERVIEW</Text>
        <View style={styles.quickStats}>
          {[
            { label: 'Time Spent', value: formatDuration(totalDuration) },
            { label: 'Genres', value: `${uniqueGenres}` },
            { label: 'Top Genre', value: topGenre, small: true },
          ].map((s, i) => (
            <View key={i} style={styles.quickStat}>
              <Text style={[styles.quickValue, s.small && styles.quickValueSmall]} numberOfLines={1}>
                {s.value}
              </Text>
              <Text style={styles.quickLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Genre Pie Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>GENRE DNA</Text>
        {loading ? (
          <LoadingShimmer height={180} style={styles.chartLoading} />
        ) : (
          <View style={styles.chartContainer}>
            <GenreChart genres={genres} />
          </View>
        )}
      </View>

      {/* Artist Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>LIFETIME ARTISTS</Text>
        <View style={styles.artistStats}>
          <View style={styles.artistStatCard}>
            <Text style={styles.artistStatValue}>{artists.length}</Text>
            <Text style={styles.artistStatLabel}>Vòng Lặp Theo Dõi</Text>
          </View>
          <View style={styles.artistStatCard}>
            <Text style={styles.artistStatValue} numberOfLines={1}>
              {artists[0] ? formatNumber(artists[0]?.followers?.total || 0) : '—'}
            </Text>
            <Text style={styles.artistStatLabel}>Followers Nghệ Sĩ Nhất</Text>
          </View>
        </View>
      </View>

      {/* Listening Personality */}
      {tracks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PERSONALITY</Text>
          <View style={styles.factCard}>
            <View style={styles.factGoldBar} />
            <View style={styles.factBody}>
              <Text style={styles.factText}>
                Bạn có gu âm nhạc độc đáo với hệ sinh thái {uniqueGenres} thể loại.
              </Text>
              <Text style={styles.factSub}>
                {topGenre} · Dòng nhạc cốt lõi
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 4,
  },
  eyebrow: {
    color: Colors.gold,
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    marginBottom: 20,
  },
  rule: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
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
  quickStats: {
    flexDirection: 'row',
    gap: 8,
  },
  quickStat: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 4,
  },
  quickValue: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  quickValueSmall: {
    fontSize: 11,
    paddingTop: 4,
    textTransform: 'capitalize',
  },
  quickLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartLoading: {
    borderRadius: 4,
  },
  artistStats: {
    flexDirection: 'row',
    gap: 12,
  },
  artistStatCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 6,
  },
  artistStatValue: {
    color: Colors.gold,
    fontSize: 18,
    fontWeight: '700',
  },
  artistStatLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  factCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  factGoldBar: {
    width: 3,
    backgroundColor: Colors.gold,
  },
  factBody: {
    flex: 1,
    padding: 16,
    gap: 2,
  },
  factText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  factSub: {
    color: Colors.gold,
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
