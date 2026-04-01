import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    Linking,
    Dimensions,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { SpotifyTrack, formatNumber, formatRealMinutesListened, openInSpotify } from '../services/spotifyApi';
import {
    getAudioFeatures,
    getTrackDetail,
    AudioFeatures,
    TrackDetail,
    formatKey,
    formatBPM,
    formatDurationMs,
} from '../services/spotifyApiExtended';

const { width, height } = Dimensions.get('window');

interface TrackDetailScreenProps {
    track: SpotifyTrack;
    rank: number;
    onClose: () => void;
    // Firebase data
    playcount?: number;
    totalListenedMs?: number;
}



// ── Popularity arc ───────────────────────────────────────────────
function PopularityRing({ score }: { score: number }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: score, duration: 900, delay: 200, useNativeDriver: false }).start();
    }, [score]);

    const color =
        score >= 80 ? Colors.gold :
            score >= 50 ? Colors.neonCyan :
                Colors.textMuted;

    return (
        <View style={ringStyles.wrapper}>
            <View style={ringStyles.ring}>
                <Text style={[ringStyles.score, { color }]}>{score}</Text>
                <Text style={ringStyles.max}>/100</Text>
            </View>
            <Text style={ringStyles.label}>POPULARITY</Text>
        </View>
    );
}

const ringStyles = StyleSheet.create({
    wrapper: { alignItems: 'center', gap: 6 },
    ring: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 2,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    score: { fontSize: 20, fontWeight: '800' },
    max: { color: Colors.textMuted, fontSize: 9, marginTop: -2 },
    label: { color: Colors.textMuted, fontSize: 9, letterSpacing: 2, fontWeight: '700' },
});

// ── Main Screen ──────────────────────────────────────────────────
export default function TrackDetailScreen({ 
    track, rank, onClose, playcount = 0, totalListenedMs = 0 
}: TrackDetailScreenProps) {
    const [detail, setDetail] = useState<TrackDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(true);

    const slideAnim = useRef(new Animated.Value(height)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Slide in on mount
    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: height, duration: 280, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => onClose());
    };

    // Fetch detail
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingDetail(true);
            const d = await getTrackDetail(track.id);
            if (!cancelled) {
                setDetail(d);
                setLoadingDetail(false);
            }
        })();
        return () => { cancelled = true; };
    }, [track.id]);

    const albumImage = track?.album?.images?.[0]?.url || '';
    const artistNames = track?.artists?.map(a => a.name).join(', ') || '—';
    const releaseYear = detail?.album?.release_date?.slice(0, 4) || '';
    const durationMs = detail?.duration_ms || track.duration_ms || 0;
    
    // Sử dụng thời gian nghe thực tế từ Firebase
    const minutesListened = formatRealMinutesListened(totalListenedMs || track.total_listened_ms || 0);

    const rankColor =
        rank === 1 ? Colors.gold :
            rank === 2 ? Colors.silver :
                rank === 3 ? Colors.bronze :
                    Colors.textMuted;



    return (
        <>
            {/* Dimmed backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} pointerEvents="none" />

            {/* Slide-up sheet */}
            <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                <StatusBar barStyle="light-content" />

                {/* ── Top bar ── */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={handleClose} style={styles.backBtn} activeOpacity={0.7}>
                        <Text style={styles.backIcon}>‹</Text>
                    </TouchableOpacity>
                    <Text style={styles.topBarTitle} numberOfLines={1}>{track.name}</Text>
                    <TouchableOpacity
                        style={styles.spotifyIconBtn}
                        onPress={() => openInSpotify('track', track.id, track.external_urls?.spotify || 'https://spotify.com')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.spotifyIconText}>↗</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* ── Hero ── */}
                    <View style={styles.hero}>
                        {albumImage ? (
                            <Image source={{ uri: albumImage }} style={styles.albumArt} />
                        ) : (
                            <View style={[styles.albumArt, styles.albumArtFallback]}>
                                <Text style={{ color: Colors.textMuted, fontSize: 48 }}>♪</Text>
                            </View>
                        )}

                        {/* Rank badge */}
                        <View style={[styles.rankBadge, { borderColor: rankColor }]}>
                            <Text style={[styles.rankBadgeText, { color: rankColor }]}>
                                #{rank < 10 ? `0${rank}` : rank}
                            </Text>
                        </View>
                    </View>

                    {/* ── Title block ── */}
                    <View style={styles.titleBlock}>
                        <Text style={styles.trackName}>{track.name}</Text>
                        <Text style={styles.artistName}>{artistNames}</Text>
                        {detail?.album && (
                            <Text style={styles.albumName}>
                                {detail.album.name}{releaseYear ? ` · ${releaseYear}` : ''}
                            </Text>
                        )}
                    </View>

                    {/* ── Key stats row ── */}
                    <View style={styles.statsGrid}>

                        {/* Popularity */}
                        {detail && <PopularityRing score={detail.popularity} />}

                        {/* Duration */}
                        <View style={styles.statBlock}>
                            <Text style={styles.statValue}>{formatDurationMs(durationMs)}</Text>
                            <Text style={styles.statLabel}>DURATION</Text>
                        </View>
                    </View>

                    {/* ── Listening stats ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>YOUR LISTENING</Text>
                        <View style={styles.listenRow}>
                            <View style={styles.listenCard}>
                                <Text style={styles.listenValue}>{formatNumber(playcount)}</Text>
                                <Text style={styles.listenLabel}>Lần nghe</Text>
                            </View>
                            <View style={[styles.listenCard, styles.listenCardMid]}>
                                <Text style={styles.listenValue}>{minutesListened}</Text>
                                <Text style={styles.listenLabel}>Thời gian nghe</Text>
                            </View>
                            <View style={styles.listenCard}>
                                <Text style={[styles.listenValue, { color: rankColor }]}>
                                    #{rank < 10 ? `0${rank}` : rank}
                                </Text>
                                <Text style={styles.listenLabel}>Xếp hạng</Text>
                            </View>
                        </View>
                    </View>



                    {/* ── Album info ── */}
                    {detail?.album && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>ALBUM</Text>
                            <View style={styles.albumRow}>
                                <Image source={{ uri: detail.album.images?.[0]?.url || '' }} style={styles.albumThumb} />
                                <View style={styles.albumInfo}>
                                    <Text style={styles.albumInfoName} numberOfLines={2}>{detail.album.name}</Text>
                                    <Text style={styles.albumInfoMeta}>
                                        {releaseYear}{detail.album.total_tracks ? ` · ${detail.album.total_tracks} tracks` : ''}
                                    </Text>
                                    {detail.explicit && (
                                        <View style={styles.explicitBadge}>
                                            <Text style={styles.explicitText}>E</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* ── Open Spotify CTA ── */}
                    <View style={styles.section}>
                        <TouchableOpacity
                            onPress={() => openInSpotify('track', track.id, track.external_urls?.spotify || 'https://spotify.com')}
                            activeOpacity={0.8}
                            style={styles.spotifyBtn}
                        >
                            <LinearGradient colors={['#1DB954', '#17A349']} style={styles.spotifyBtnBg}>
                                <Text style={styles.spotifyBtnText}>Nghe trên Spotify</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 60 }} />
                </ScrollView>
            </Animated.View>
        </>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 90,
    },
    sheet: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: Colors.background,
        zIndex: 100,
    },

    /* Top bar */
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 56,
        paddingBottom: 12,
        paddingHorizontal: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        color: Colors.textPrimary,
        fontSize: 32,
        fontWeight: '300',
        lineHeight: 34,
    },
    topBarTitle: {
        flex: 1,
        color: Colors.textPrimary,
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    spotifyIconBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 18,
    },
    spotifyIconText: {
        color: '#1DB954',
        fontSize: 16,
        fontWeight: '700',
    },

    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    /* Hero */
    hero: {
        alignItems: 'center',
        paddingTop: 32,
        paddingBottom: 8,
        position: 'relative',
    },
    albumArt: {
        width: width * 0.62,
        height: width * 0.62,
        borderRadius: 6,
    },
    albumArtFallback: {
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankBadge: {
        position: 'absolute',
        top: 32,
        right: 32,
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    rankBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },

    /* Title */
    titleBlock: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 8,
        gap: 4,
    },
    trackName: {
        color: Colors.textPrimary,
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    artistName: {
        color: Colors.textSecondary,
        fontSize: 16,
        fontWeight: '500',
    },
    albumName: {
        color: Colors.textMuted,
        fontSize: 12,
        marginTop: 2,
    },

    /* Stats grid */
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginHorizontal: 24,
        marginTop: 24,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    statBlock: {
        alignItems: 'center',
        gap: 6,
    },
    statValue: {
        color: Colors.textPrimary,
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    statLabel: {
        color: Colors.textMuted,
        fontSize: 9,
        letterSpacing: 2,
        fontWeight: '700',
    },

    /* Section */
    section: {
        paddingHorizontal: 24,
        paddingTop: 28,
    },
    sectionLabel: {
        color: Colors.textMuted,
        fontSize: 10,
        letterSpacing: 3,
        fontWeight: '700',
        marginBottom: 14,
    },

    /* Listening stats */
    listenRow: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 4,
        overflow: 'hidden',
    },
    listenCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        backgroundColor: Colors.surface,
        gap: 5,
    },
    listenCardMid: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: Colors.border,
    },
    listenValue: {
        color: Colors.gold,
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    listenLabel: {
        color: Colors.textMuted,
        fontSize: 9,
        letterSpacing: 1,
        fontWeight: '600',
        textAlign: 'center',
    },



    /* Album row */
    albumRow: {
        flexDirection: 'row',
        gap: 14,
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 14,
    },
    albumThumb: {
        width: 56,
        height: 56,
        borderRadius: 3,
    },
    albumInfo: { flex: 1, gap: 4 },
    albumInfoName: {
        color: Colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    albumInfoMeta: {
        color: Colors.textMuted,
        fontSize: 12,
    },
    explicitBadge: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: Colors.textMuted,
        borderRadius: 2,
        paddingHorizontal: 4,
        paddingVertical: 1,
        marginTop: 4,
    },
    explicitText: {
        color: Colors.textMuted,
        fontSize: 9,
        fontWeight: '700',
    },

    /* Spotify CTA */
    spotifyBtn: {
        borderRadius: 4,
        overflow: 'hidden',
    },
    spotifyBtnBg: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    spotifyBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
    },
});