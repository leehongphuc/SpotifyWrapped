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
import { SpotifyArtist, formatNumber } from '../services/spotifyApi';

interface ArtistCardProps {
  artist: SpotifyArtist;
  rank: number;
  onPress?: () => void;
}

export function ArtistCard({ artist, rank, onPress }: ArtistCardProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: rank * 60,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        delay: rank * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const artistImage =
    artist?.images?.[0]?.url || 'https://via.placeholder.com/80';
  const topGenre = artist?.genres?.[0] || 'Nhạc';
  const followers = formatNumber(artist?.followers?.total || 0);

  const isTop3 = rank <= 3;
  const rankColor =
    rank === 1 ? Colors.gold : rank === 2 ? Colors.silver : rank === 3 ? Colors.bronze : Colors.textMuted;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <LinearGradient
          colors={Colors.gradientCard as [string, string]}
          style={[styles.container, isTop3 && styles.containerTop3]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Rank */}
          <Text style={[styles.rankText, { color: rankColor }]}>
            {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
          </Text>

          {/* Artist Photo */}
          <View style={[styles.imageWrapper, isTop3 && styles.imageWrapperTop3]}>
            <Image source={{ uri: artistImage }} style={styles.image} />
            {isTop3 && (
              <LinearGradient
                colors={[Colors.neonPink + '40', Colors.neonPurple + '40']}
                style={StyleSheet.absoluteFillObject}
              />
            )}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {artist?.name || 'Vô danh'}
            </Text>
            <Text style={styles.genre} numberOfLines={1}>
              {topGenre}
            </Text>
            <View style={styles.footerRow}>
              <Text style={styles.followers}>👥 {followers}</Text>
              <View style={styles.popularityDot}>
                <View
                  style={[
                    styles.popularityFill,
                    { width: `${artist?.popularity || 0}%` as any },
                  ]}
                />
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  containerTop3: {
    borderColor: Colors.neonPink + '50',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  imageWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  imageWrapperTop3: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.neonPink,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  genre: {
    color: Colors.neonPurple,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  followers: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  popularityDot: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  popularityFill: {
    height: '100%',
    backgroundColor: Colors.neonCyan,
    borderRadius: 2,
  },
});
