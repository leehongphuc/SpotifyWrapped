import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Colors } from '../constants/colors';
import { SpotifyTrack, formatDuration } from '../services/spotifyApi';

interface TrackCardProps {
  track: SpotifyTrack;
  rank: number;
  onPress?: () => void;
  compact?: boolean;
}

export function TrackCard({ track, rank, onPress, compact = false }: TrackCardProps) {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: rank * 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: rank * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const albumImage =
    track?.album?.images?.[0]?.url || 'https://via.placeholder.com/60';
  const artistNames = track?.artists?.map((a) => a.name).join(', ') || 'Vô danh';
  const duration = formatDuration(track?.duration_ms || 0);

  const rankColor =
    rank === 1 ? Colors.gold : rank === 2 ? Colors.silver : rank === 3 ? Colors.bronze : Colors.textMuted;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[styles.container, compact && styles.containerCompact]}
      >
        <View style={styles.cardContent}>
          {/* Rank Badge */}
          <View style={styles.rankBadge}>
            <Text style={[styles.rankText, { color: rankColor }]}>
              {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
            </Text>
          </View>

          {/* Album Cover */}
          <Image source={{ uri: albumImage }} style={compact ? styles.imageCompact : styles.image} />

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.trackName} numberOfLines={1}>
              {track?.name || 'Vô danh'}
            </Text>
            <Text style={styles.artistName} numberOfLines={1}>
              {artistNames}
            </Text>
            {!compact && (
              <View style={styles.meta}>
                <Text style={styles.metaText}>{duration}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.card,
    overflow: 'hidden',
  },
  containerCompact: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 14,
  },
  rankBadge: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  imageCompact: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  trackName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  artistName: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  meta: {
    marginTop: 6,
  },
  metaText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
});
