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
        <View style={styles.container}>
          {/* Rank */}
          <Text style={[styles.rankText, { color: rankColor }]}>
            {rank}
          </Text>

          {/* Artist Photo */}
          <View style={styles.imageWrapper}>
            <Image source={{ uri: artistImage }} style={styles.image} />
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {artist?.name || 'Vô danh'}
            </Text>
            <Text style={styles.followers}>
              {followers} Người theo dõi
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 8,
    gap: 16,
  },
  rankText: {
    fontSize: 18,
    fontWeight: '800',
    width: 24,
    textAlign: 'center',
  },
  imageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  followers: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
