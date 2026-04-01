import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Colors } from '../constants/colors';
import { SpotifyArtist, TimeRange } from '../services/spotifyApi';
import { ArtistCard } from '../components/ArtistCard';
import { TrackSkeleton } from '../components/LoadingShimmer';
import { TimeFilter } from '../components/UIComponents';

interface ArtistsScreenProps {
  artists: SpotifyArtist[];
  timeRange: TimeRange;
  setTimeRange: (r: TimeRange) => void;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

export default function ArtistsScreen({
  artists, timeRange, setTimeRange,
  loading, refreshing, onRefresh,
}: ArtistsScreenProps) {
  const timeLabel = {
    '1_day': '24 Hours',
    '1_week': '7 Days',
    short_term: '4 Weeks',
    medium_term: '6 Months',
    long_term: 'All Time',
  }[timeRange];

  const ListHeader = () => (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>YOUR MUSIC</Text>
      <Text style={styles.title}>Top Artists</Text>
      <Text style={styles.subtitle}>{artists.length} nghệ sĩ · {timeLabel}</Text>
      <View style={styles.rule} />
      <TimeFilter current={timeRange} onChange={setTimeRange} />
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyGlyph}>♩</Text>
      <Text style={styles.emptyTitle}>Chưa có dữ liệu</Text>
      <Text style={styles.emptySub}>Nghe nhạc nhiều hơn nhé</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {loading && artists.length === 0 ? (
        <>
          <ListHeader />
          {Array.from({ length: 8 }).map((_, i) => <TrackSkeleton key={i} />)}
        </>
      ) : (
        <FlatList
          data={artists}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ArtistCard artist={item} rank={index + 1} />
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
  listContent: {
    paddingBottom: 110,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyGlyph: {
    color: Colors.textMuted,
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  emptySub: {
    color: Colors.textMuted,
    fontSize: 13,
  },
});