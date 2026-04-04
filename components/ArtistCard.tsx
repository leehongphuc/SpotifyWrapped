import React, { useRef, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, Animated, Modal, Linking,
} from 'react-native';
import { Colors } from '../constants/colors';
import { SpotifyArtist, formatNumber, openInSpotify } from '../services/spotifyApi';
import { LinearGradient } from 'expo-linear-gradient';

interface ArtistCardProps {
  artist: SpotifyArtist;
  rank: number;
  onPress?: () => void;
}

export function ArtistCard({ artist, rank, onPress }: ArtistCardProps) {
  const [modalVisible, setModalVisible] = React.useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 350,
      delay: Math.min(rank * 40, 400),
      useNativeDriver: true,
    }).start();
  }, []);

  const artistImage = artist?.images?.[0]?.url || '';
  const topGenre = artist?.genres?.[0] || '';
  const rankLabel = rank.toString();
  const rankColor =
    rank === 1 ? Colors.gold :
      rank === 2 ? Colors.silver :
        rank === 3 ? Colors.bronze :
          Colors.textMuted;
  const rankDiff = artist.rankDiff;

  // FIX: Nếu không có ID → fallback search Spotify theo tên nghệ sĩ
  const handleOpenSpotify = () => {
    const artistId = artist?.id || '';
    const fallback =
      artist?.external_urls?.spotify ||
      `https://open.spotify.com/search/${encodeURIComponent(artist?.name || '')}`;
    openInSpotify('artist', artistId, fallback);
  };

  return (
    <Animated.View style={{ opacity }}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => { onPress?.(); setModalVisible(true); }}
        style={styles.container}
      >
        <View style={styles.rankContainer}>
          {rankDiff !== undefined && rankDiff > 0 && <Text style={[styles.trendIcon, styles.trendUp]}>▲</Text>}
          {rankDiff !== undefined && rankDiff === 0 && <Text style={[styles.trendIcon, styles.trendFlat]}>●</Text>}
          <Text style={[styles.rank, { color: rankColor }]}>{rankLabel}</Text>
          {rankDiff !== undefined && rankDiff < 0 && <Text style={[styles.trendIcon, styles.trendDown]}>▼</Text>}
        </View>

        {artistImage ? (
          <Image source={{ uri: artistImage }} style={styles.img} />
        ) : (
          <View style={[styles.img, styles.imgFallback]}>
            <Text style={{ color: Colors.textMuted, fontSize: 18 }}>♩</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{artist?.name || '—'}</Text>
          {topGenre ? (
            <Text style={styles.genre} numberOfLines={1}>{topGenre}</Text>
          ) : null}
          <Text style={styles.plays}>{formatNumber(artist?.playcount || 0)} lần nghe</Text>
        </View>

        {rank <= 3 && <View style={[styles.topIndicator, { backgroundColor: rankColor }]} />}
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />

            {artistImage ? (
              <Image source={{ uri: artistImage }} style={styles.modalImg} />
            ) : (
              <View style={[styles.modalImg, styles.imgFallback]}>
                <Text style={{ color: Colors.textMuted, fontSize: 40 }}>♩</Text>
              </View>
            )}

            <Text style={styles.modalName} numberOfLines={2}>{artist?.name}</Text>
            {topGenre ? (
              <Text style={styles.modalGenre}>{topGenre}</Text>
            ) : null}

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatNumber(artist?.playcount || 0)}</Text>
                <Text style={styles.statLabel}>LƯỢT NGHE</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{(artist as any).tracks_count || 1}</Text>
                <Text style={styles.statLabel}>BÀI GHI NHẬN</Text>
              </View>
            </View>

            {/* FIX: Dùng handleOpenSpotify để guard ID undefined */}
            <TouchableOpacity
              style={styles.spotifyBtn}
              onPress={handleOpenSpotify}
            >
              <LinearGradient colors={['#1DB954', '#17A349']} style={styles.spotifyBtnBg}>
                <Text style={styles.spotifyBtnText}>Mở trong Spotify</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    position: 'relative',
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
  img: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  imgFallback: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  name: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  genre: {
    color: Colors.textMuted,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  plays: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  topIndicator: {
    position: 'absolute',
    left: 0,
    top: '25%',
    bottom: '25%',
    width: 2,
    borderRadius: 1,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  modalHandle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  modalImg: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalName: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalGenre: {
    color: Colors.textMuted,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  statRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    width: '100%',
    marginVertical: 8,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: Colors.card,
    gap: 4,
  },
  statValue: {
    color: Colors.gold,
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  spotifyBtn: {
    alignSelf: 'stretch',
    borderRadius: 4,
    overflow: 'hidden',
  },
  spotifyBtnBg: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  spotifyBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});