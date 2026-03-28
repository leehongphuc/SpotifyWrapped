import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
        <LinearGradient
          colors={Colors.gradientCard as [string, string]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
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
                <Text style={styles.metaText}>⏱ {duration}</Text>
                <View style={styles.popularityBadge}>
                  <View
                    style={[
                      styles.popularityBar,
                      { width: `${track?.popularity || 0}%` as any },
                    ]}
                  />
                </View>
                <Text style={styles.metaText}>{track?.popularity || 0}%</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  containerCompact: {
    marginHorizontal: 8,
    marginVertical: 3,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
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
    gap: 3,
  },
  trackName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  artistName: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  popularityBadge: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  popularityBar: {
    height: '100%',
    backgroundColor: Colors.neonGreen,
    borderRadius: 2,
  },
});
