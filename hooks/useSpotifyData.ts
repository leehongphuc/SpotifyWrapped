import { useState, useEffect, useCallback } from 'react';
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
}

export function useSpotifyData(isAuthenticated: boolean): SpotifyData {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [topArtists, setTopArtists] = useState<SpotifyArtist[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayed[]>([]);
  const [genres, setGenres] = useState<{ genre: string; count: number }[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('short_term');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setTopTracks(tracks);
      setTopArtists(artists);
      setPlaylists(playlistData);
      setRecentlyPlayed(recent);
      setGenres(extractGenres(artists));
    } catch (e: any) {
      console.error('SpotifyData fetch error:', e);
      setError('Không tải được dữ liệu. Kiểm tra kết nối Internet.');
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
  };
}
