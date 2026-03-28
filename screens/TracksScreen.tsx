import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  StatusBar,
} from 'react-native';
import { Colors } from '../constants/colors';
import { SpotifyTrack, TimeRange } from '../services/spotifyApi';
import { TrackCard } from '../components/TrackCard';
import { TrackSkeleton } from '../components/LoadingShimmer';
import { TimeFilter, SectionHeader } from '../components/UIComponents';
import { LinearGradient } from 'expo-linear-gradient';

interface TracksScreenProps {
  tracks: SpotifyTrack[];
  timeRange: TimeRange;
  setTimeRange: (r: TimeRange) => void;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

export default function TracksScreen({
  tracks,
  timeRange,
  setTimeRange,
  loading,
  refreshing,
  onRefresh,
}: TracksScreenProps) {
  const timeLabel = {
    short_term: '4 tuần qua',
    medium_term: '6 tháng qua',
    long_term: 'mọi thời đại',
  }[timeRange];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header gradient */}
      <LinearGradient
        colors={['#1A0820', Colors.background]}
        style={styles.header}
      >
        <SectionHeader
          emoji="🎵"
          title="Top Bài Hát"
          subtitle={`50 bài hát yêu thích ${timeLabel}`}
        />
        <TimeFilter current={timeRange} onChange={setTimeRange} />
      </LinearGradient>

      {loading ? (
        <View>
          {Array.from({ length: 10 }).map((_, i) => (
            <TrackSkeleton key={i} />
          ))}
        </View>
      ) : tracks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎵</Text>
          <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
          <Text style={styles.emptyHint}>Hãy nghe nhạc Spotify thêm nhé!</Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TrackCard track={item} rank={index + 1} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.neonPink}
            />
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
    paddingTop: 56,
    paddingBottom: 8,
  },
  listContent: {
    paddingBottom: 100,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyHint: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});
