import React, { useRef, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, Animated,
} from 'react-native';
import { Colors } from '../constants/colors';
import { SpotifyTrack, formatNumber } from '../services/spotifyApi';

interface TrackCardProps {
  track: SpotifyTrack;
  rank: number;
  onPress?: () => void;
  compact?: boolean;
}

export function TrackCard({ track, rank, onPress, compact = false }: TrackCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 350,
      delay: Math.min(rank * 40, 400),
      useNativeDriver: true,
    }).start();
  }, []);

  const albumImage = track?.album?.images?.[0]?.url || '';
  const artistNames = track?.artists?.map(a => a.name).join(', ') || '—';
  const rankLabel = rank.toString();
  const rankColor =
    rank === 1 ? Colors.gold :
      rank === 2 ? Colors.silver :
        rank === 3 ? Colors.bronze :
          Colors.textMuted;
  const rankDiff = track.rankDiff;

  return (
    <Animated.View style={{ opacity }}>
      <TouchableOpacity
        activeOpacity={0.72}
        onPress={onPress}
        style={styles.container}
      >
        {rank <= 3 && <View style={[styles.topIndicator, { backgroundColor: rankColor }]} />}

        <View style={styles.rankContainer}>
          {rankDiff !== undefined && rankDiff > 0 && <Text style={[styles.trendIcon, styles.trendUp]}>▲</Text>}
          {rankDiff !== undefined && rankDiff === 0 && <Text style={[styles.trendIcon, styles.trendFlat]}>●</Text>}
          <Text style={[styles.rank, { color: rankColor }]}>{rankLabel}</Text>
          {rankDiff !== undefined && rankDiff < 0 && <Text style={[styles.trendIcon, styles.trendDown]}>▼</Text>}
        </View>

        {albumImage ? (
          <Image source={{ uri: albumImage }} style={compact ? styles.imgCompact : styles.img} />
        ) : (
          <View style={[compact ? styles.imgCompact : styles.img, styles.imgFallback]}>
            <Text style={{ color: Colors.textMuted, fontSize: 16 }}>♪</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.trackName} numberOfLines={1}>{track?.name || '—'}</Text>
          <Text style={styles.artist} numberOfLines={1}>{artistNames}</Text>
          {!compact && track?.playcount ? (
            <Text style={styles.playcount}>{formatNumber(track.playcount)} lần nghe</Text>
          ) : null}
        </View>

        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 11,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    position: 'relative',
  },
  topIndicator: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 2,
    borderRadius: 1,
  },
  rankContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  rank: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  trendIcon: {
    fontSize: 7,
    position: 'absolute',
    left: 10,
  },
  trendUp: {
    color: '#1DB954', // Spotify Green
    top: -10,
  },
  trendDown: {
    color: '#E91429', // Red
    bottom: -10,
  },
  trendFlat: {
    color: '#3B82F6', // Blue dot
    fontSize: 5,
    top: -8,
  },
  img: { width: 52, height: 52, borderRadius: 2 },
  imgCompact: { width: 42, height: 42, borderRadius: 2 },
  imgFallback: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 3 },
  trackName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  artist: { color: Colors.textSecondary, fontSize: 12 },
  playcount: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  chevron: { color: Colors.textMuted, fontSize: 20, fontWeight: '300', marginRight: -4 },
});