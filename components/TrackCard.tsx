import React, { useRef, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, Animated, Modal, Linking,
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
  const artistNames = track?.artists?.map((a) => a.name).join(', ') || '—';

  const rankLabel = rank < 10 ? `0${rank}` : `${rank}`;
  const rankColor = rank === 1 ? Colors.gold : rank === 2 ? Colors.silver : rank === 3 ? Colors.bronze : Colors.textMuted;

  return (
    <Animated.View style={{ opacity }}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => { onPress?.(); setModalVisible(true); }}
        style={[styles.container, compact && styles.containerCompact]}
      >
        <Text style={[styles.rank, { color: rankColor }]}>{rankLabel}</Text>

        {albumImage ? (
          <Image source={{ uri: albumImage }} style={compact ? styles.imgCompact : styles.img} />
        ) : (
          <View style={[compact ? styles.imgCompact : styles.img, styles.imgFallback]}>
            <Text style={{ color: Colors.textMuted, fontSize: 18 }}>♪</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{track?.name || '—'}</Text>
          <Text style={styles.artist} numberOfLines={1}>{artistNames}</Text>
          {!compact && (
            <Text style={styles.plays}>{formatNumber(track?.playcount || 0)} lượt nghe</Text>
          )}
        </View>

        {!compact && rank <= 3 && <View style={[styles.topIndicator, { backgroundColor: rankColor }]} />}
      </TouchableOpacity>

      {/* Detail Bottom Sheet Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            
            {albumImage ? (
              <Image source={{ uri: albumImage }} style={styles.modalImg} />
            ) : (
              <View style={[styles.modalImg, styles.imgFallback]}>
                <Text style={{ color: Colors.textMuted, fontSize: 40 }}>♪</Text>
              </View>
            )}

            <Text style={styles.modalName} numberOfLines={2}>{track?.name}</Text>
            <Text style={styles.modalArtistTxt}>{artistNames}</Text>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatNumber(track?.playcount || 0)}</Text>
                <Text style={styles.statLabel}>LƯỢT NGHE</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDuration(track?.duration_ms * (track?.playcount || 1))}</Text>
                <Text style={styles.statLabel}>THỜI GIAN</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.spotifyBtn} 
              onPress={() => Linking.openURL(track.external_urls?.spotify || 'https://spotify.com')}
            >
              <LinearGradient colors={['#1DB954', '#17A349']} style={styles.spotifyBtnBg}>
                <Text style={styles.spotifyBtnText}>Nghe trên Spotify</Text>
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
    backgroundColor: 'transparent',
    position: 'relative',
  },
  containerCompact: {
    paddingVertical: 8,
    borderBottomWidth: 0,
    backgroundColor: Colors.surface,
    marginHorizontal: 24,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rank: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    width: 22,
    textAlign: 'right',
  },
  img: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },
  imgCompact: {
    width: 44,
    height: 44,
    borderRadius: 4,
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
  artist: {
    color: Colors.textMuted,
    fontSize: 11,
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

  /* Bottom Modal Sheet */
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
    borderRadius: 8,
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
  modalArtistTxt: {
    color: Colors.textMuted,
    fontSize: 13,
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
