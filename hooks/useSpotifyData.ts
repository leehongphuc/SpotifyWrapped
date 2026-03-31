import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirebaseStats, FirebaseStats, CurrentPlaying } from './useFirebaseStats';
import {
  getMe,
  getTopTracks,
  getTopArtists,
  getMyPlaylists,
  getRecentlyPlayed,
  extractGenres,
  SpotifyUser,
  SpotifyTrack,
  SpotifyArtist,
  SpotifyPlaylist,
  RecentlyPlayed,
  TimeRange,
} from '../services/spotifyApi';

interface SpotifyData {
  user: SpotifyUser | null;
  topTracks: SpotifyTrack[];
  topArtists: SpotifyArtist[];
  playlists: SpotifyPlaylist[];
  recentlyPlayed: RecentlyPlayed[];
  genres: { genre: string; count: number }[];
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
  firebaseStats: FirebaseStats | null;
  currentPlaying: CurrentPlaying | null;
  trackPlays: Record<string, any>;
}

export function useSpotifyData(isAuthenticated: boolean): SpotifyData {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [rawTopTracks, setRawTopTracks] = useState<SpotifyTrack[]>([]);
  const [rawTopArtists, setRawTopArtists] = useState<SpotifyArtist[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayed[]>([]);
  const [genres, setGenres] = useState<{ genre: string; count: number }[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('short_term');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { 
    stats: firebaseStats, 
    currentPlaying, 
    trackPlays, 
    artistPlays,
    attachPlaycount, 
    attachArtistStats 
  } = useFirebaseStats(user?.id);

  // ── Enriched Data ─────────────────────────────────────────────
  // Sử dụng useMemo để tự động cập nhật khi trackPlays hoặc raw data thay đổi
  const topTracks = useMemo(() => {
    return attachPlaycount(rawTopTracks);
  }, [rawTopTracks, trackPlays, attachPlaycount]);

  const topArtists = useMemo(() => {
    return attachArtistStats(rawTopArtists);
  }, [rawTopArtists, trackPlays, artistPlays, attachArtistStats]);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) return;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [userData, tracks, artists, playlistData, recent] = await Promise.all([
        getMe(),
        getTopTracks(timeRange, 50),
        getTopArtists(timeRange, 50),
        getMyPlaylists(20),
        getRecentlyPlayed(50),
      ]);

      setUser(userData);
      setRawTopTracks(tracks);
      setRawTopArtists(artists);
      setPlaylists(playlistData);
      setRecentlyPlayed(recent);
      setGenres(extractGenres(artists));
    } catch (e: any) {
      console.error('SpotifyData fetch error:', e);
      if (e?.response?.status === 429) {
        const retryAfter = e?.response?.headers?.['retry-after'] || 60;
        setError(`Rate limit. Thử lại sau ${retryAfter} giây.`);
        
        // Tự động retry sau thời gian chờ
        setTimeout(() => fetchData(false), retryAfter * 1000);
      } else {
        const msg = e.response?.data?.error?.message || e.message || 'Unknown error';
        setError(msg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, timeRange]);

  // Tải dữ liệu khi đã đăng nhập hoặc khi đổi timeRange
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, timeRange]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return {
    user,
    topTracks,
    topArtists,
    playlists,
    recentlyPlayed,
    genres,
    timeRange,
    setTimeRange,
    loading,
    refreshing,
    error,
    refresh,
    firebaseStats,
    currentPlaying,
    trackPlays,
  };
}
