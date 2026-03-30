import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Linking,
} from 'react-native';
import { Colors } from '../constants/colors';
import { SpotifyTrack, formatNumber, formatDuration } from '../services/spotifyApi';
import { LinearGradient } from 'expo-linear-gradient';

interface TrackCardProps {
  track: SpotifyTrack;
  rank: number;
  onPress?: () => void;
  compact?: boolean;
}

export function TrackCard({ track, rank, onPress, compact = false }: TrackCardProps) {
  const [modalVisible, setModalVisible] = React.useState(false);
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

  const rankColor =
    rank === 1 ? Colors.gold : rank === 2 ? Colors.silver : rank === 3 ? Colors.bronze : Colors.textMuted;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (onPress) onPress();
          setModalVisible(true);
        }}
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
                <Text style={styles.metaText}>
                  🎧 {formatNumber(track?.playcount || 0)} lần nghe
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Track Detail Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeText}>✖</Text>
            </TouchableOpacity>

            <Image source={{ uri: albumImage }} style={styles.modalImage} />
            <Text style={styles.modalTitle} numberOfLines={2}>{track?.name || 'Vô danh'}</Text>
            <Text style={styles.modalArtist}>{artistNames}</Text>

            <View style={styles.statBox}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>LƯỢT NGHE</Text>
                <Text style={styles.statValue}>{formatNumber(track?.playcount || 0)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>THỜI GIAN</Text>
                <Text style={styles.statValue}>{formatDuration(track.duration_ms * (track.playcount || 1))}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.spotifyBtn} 
              onPress={() => Linking.openURL(track.external_urls?.spotify || 'https://spotify.com')}
            >
              <LinearGradient
                colors={['#1DB954', '#1AA34A']}
                style={styles.spotifyBtnBg}
              >
                <Text style={styles.spotifyBtnText}>Nghe trên Spotify</Text>
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  closeText: {
    color: Colors.textMuted,
    fontSize: 20,
    fontWeight: '900',
  },
  modalImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: 10,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalArtist: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  statBox: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 1,
  },
  statValue: {
    color: Colors.neonPink,
    fontSize: 18,
    fontWeight: '900',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  spotifyBtn: {
    width: '100%',
    borderRadius: 100,
    overflow: 'hidden',
  },
  spotifyBtnBg: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  spotifyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
