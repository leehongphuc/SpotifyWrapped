import React from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, StatusBar,
} from 'react-native';
import { Colors } from '../constants/colors';
import { SpotifyTrack, TimeRange } from '../services/spotifyApi';
import { TrackCard } from '../components/TrackCard';
import { TrackSkeleton } from '../components/LoadingShimmer';
import { TimeFilter } from '../components/UIComponents';

interface TracksScreenProps {
  tracks: SpotifyTrack[];
  timeRange: TimeRange;
  setTimeRange: (r: TimeRange) => void;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onTrackPress?: (track: SpotifyTrack, rank: number) => void;
}

export default function TracksScreen({
  tracks, timeRange, setTimeRange,
  loading, refreshing, onRefresh, onTrackPress,
}: TracksScreenProps) {
  const timeLabel = {
    '1_day': 'Hôm nay',
    '1_week': 'Tuần này',
    short_term: '4 Weeks',
    medium_term: '6 Months',
    long_term: 'All Time',
  }[timeRange];

  const ListHeader = () => (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>YOUR MUSIC</Text>
      <Text style={styles.title}>Top Tracks</Text>
      <Text style={styles.subtitle}>{tracks.length} bài hát · {timeLabel}</Text>
      <View style={styles.rule} />
      <TimeFilter current={timeRange} onChange={setTimeRange} />
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyGlyph}>♪</Text>
      <Text style={styles.emptyTitle}>Chưa có dữ liệu</Text>
      <Text style={styles.emptySub}>Hãy nghe nhạc Spotify thêm nhé</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {loading && tracks.length === 0 ? (
        <>
          <ListHeader />
          {Array.from({ length: 8 }).map((_, i) => <TrackSkeleton key={i} />)}
        </>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TrackCard
              track={item}
              rank={index + 1}
              onPress={() => onTrackPress?.(item, index + 1)}
            />
          )}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<ListEmpty />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 4,
  },
  eyebrow: { color: Colors.gold, fontSize: 10, letterSpacing: 4, fontWeight: '700', marginBottom: 4 },
  title: { color: Colors.textPrimary, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Colors.textMuted, fontSize: 13, marginBottom: 20 },
  rule: { height: 1, backgroundColor: Colors.border, marginBottom: 16 },
  listContent: { paddingBottom: 110 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyGlyph: { color: Colors.textMuted, fontSize: 40, marginBottom: 8 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '700' },
  emptySub: { color: Colors.textMuted, fontSize: 13 },
});