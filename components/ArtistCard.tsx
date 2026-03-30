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
import { SpotifyArtist, formatNumber } from '../services/spotifyApi';
import { LinearGradient } from 'expo-linear-gradient';

interface ArtistCardProps {
  artist: SpotifyArtist;
  rank: number;
  onPress?: () => void;
}

export function ArtistCard({ artist, rank, onPress }: ArtistCardProps) {
  const [modalVisible, setModalVisible] = React.useState(false);
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

  const isTop3 = rank <= 3;
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
      >
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
              🎧 {formatNumber(artist?.playcount || 0)} lần nghe
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Artist Detail Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeText}>✖</Text>
            </TouchableOpacity>

            <Image source={{ uri: artistImage }} style={styles.modalImage} />
            <Text style={styles.modalTitle} numberOfLines={2}>{artist?.name || 'Vô danh'}</Text>
            <Text style={styles.modalArtist}>Nhạc {topGenre}</Text>

            <View style={styles.statBox}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>LƯỢT NGHE</Text>
                <Text style={styles.statValue}>{formatNumber(artist?.playcount || 0)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>BÀI HÁT GHI NHẬN</Text>
                <Text style={styles.statValue}>{(artist as any).tracks_count || 1}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.spotifyBtn} 
              onPress={() => Linking.openURL(artist.external_urls?.spotify || 'https://spotify.com')}
            >
              <LinearGradient
                colors={['#1DB954', '#1AA34A']}
                style={styles.spotifyBtnBg}
              >
                <Text style={styles.spotifyBtnText}>Mở trong Spotify</Text>
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
    borderRadius: 100,
    marginBottom: 20,
    marginTop: 10,
    borderWidth: 4,
    borderColor: Colors.border,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
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
    textTransform: 'capitalize',
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
    color: Colors.neonCyan,
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
