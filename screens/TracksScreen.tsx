import React, { useState, useEffect, useRef } from 'react';
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
  // Khi timeRange thay đổi → hiển thị skeleton ngắn để reset animation
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevTimeRange = useRef(timeRange);

  useEffect(() => {
    if (prevTimeRange.current !== timeRange) {
      prevTimeRange.current = timeRange;
      setIsTransitioning(true);
      // Chờ 1 frame để unmount list cũ, sau đó mount list mới với animation sạch
      const t = setTimeout(() => setIsTransitioning(false), 50);
      return () => clearTimeout(t);
    }
  }, [timeRange]);

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

  const showSkeleton = loading && tracks.length === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {showSkeleton || isTransitioning ? (
        <>
          <ListHeader />
          {Array.from({ length: 8 }).map((_, i) => <TrackSkeleton key={i} />)}
        </>
      ) : (
        <FlatList
          // key prop = timeRange → force full remount khi đổi filter
          // giúp tất cả TrackCard mount mới và chạy animation từ đầu, không bị "nhảy vị trí"
          key={timeRange}
          data={tracks}
          keyExtractor={(item, index) => item.id || `track-${index}`}
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