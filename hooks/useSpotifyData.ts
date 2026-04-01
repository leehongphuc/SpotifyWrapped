import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFirebaseStats, FirebaseStats, CurrentPlaying } from './useFirebaseStats';
import {
  extractGenres,
  SpotifyUser,
  SpotifyTrack,
  SpotifyArtist,
  SpotifyPlaylist,
  RecentlyPlayed,
  TimeRange,
} from '../services/spotifyApi';
import { useSpotifyQueries } from './useSpotifyQueries';

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
  const [timeRange, setTimeRange] = useState<TimeRange>('short_term');
  const [cachedTracks, setCachedTracks] = useState<Record<string, SpotifyTrack[]>>({});
  const [cachedArtists, setCachedArtists] = useState<Record<string, SpotifyArtist[]>>({});

  // Load cache on mount
  useEffect(() => {
    const loadCache = async () => {
      try {
        const t = await AsyncStorage.getItem('cache_top_tracks');
        const a = await AsyncStorage.getItem('cache_top_artists');
        if (t) setCachedTracks(JSON.parse(t));
        if (a) setCachedArtists(JSON.parse(a));
      } catch (e) {
        console.warn('Failed to load cache:', e);
      }
    };
    loadCache();
  }, []);

  // Chỉ lấy profile + playlists từ Spotify API (không lấy tracks/artists)
  const { profileQuery, playlistsQuery, recentQuery } = useSpotifyQueries(
    isAuthenticated,
    timeRange
  );

  const user = profileQuery.data || null;
  const playlists = playlistsQuery.data || [];
  const recentlyPlayed = recentQuery.data || [];

  const {
    stats: firebaseStats,
    currentPlaying,
    trackPlays,
    artistPlays,
    history,
  } = useFirebaseStats(user?.id);

  // ── Top Tracks: 100% từ Firebase ─────────────────────────────
  const topTracks = useMemo(() => {
    const now = Date.now();

    const msLimit: Record<TimeRange, number> = {
      '1_day': 1 * 24 * 60 * 60 * 1000,
      '1_week': 7 * 24 * 60 * 60 * 1000,
      'short_term': 28 * 24 * 60 * 60 * 1000,  // ~4 tuần
      'medium_term': 180 * 24 * 60 * 60 * 1000, // ~6 tháng
      'long_term': Infinity,                   // Tất cả
    };

    const limit = msLimit[timeRange];

    // Đếm số lần nghe từ history trong khoảng thời gian
    const counts: Record<string, number> = {};
    const listenedMs: Record<string, number> = {};

    history.forEach(item => {
      if (limit === Infinity || now - item.played_at < limit) {
        counts[item.track_id] = (counts[item.track_id] || 0) + 1;
        listenedMs[item.track_id] =
          (listenedMs[item.track_id] || 0) + (item.listened_ms || 0);
      }
    });

    // Nếu không có history → fallback toàn bộ trackPlays sort theo play_count
    if (Object.keys(counts).length === 0) {
      return Object.entries(trackPlays)
        .map(([id, fbTrack]) => ({
          id,
          name: fbTrack.name || 'Unknown Track',
          artist: fbTrack.artist || 'Unknown Artist',
          album: { images: [{ url: fbTrack.album_image || '' }] },
          album_image: fbTrack.album_image || '',
          playcount: fbTrack.play_count || 0,
          total_listened_ms: fbTrack.total_listened_ms || 0,
          last_played: fbTrack.last_played || 0,
          artists: [{ name: fbTrack.artist || 'Unknown Artist' }],
          external_urls: { spotify: `https://open.spotify.com/track/${id}` },
        } as any))
        .sort((a, b) => b.playcount - a.playcount);
    }

    return Object.keys(counts)
      .map(id => {
        const fbTrack = trackPlays[id];
        return {
          id,
          name: fbTrack?.name || 'Unknown Track',
          artist: fbTrack?.artist || 'Unknown Artist',
          album: { images: [{ url: fbTrack?.album_image || '' }] },
          album_image: fbTrack?.album_image || '',
          playcount: counts[id],
          total_listened_ms: listenedMs[id] || fbTrack?.total_listened_ms || 0,
          last_played: fbTrack?.last_played || 0,
          artists: [{ name: fbTrack?.artist || 'Unknown Artist' }],
          external_urls: { spotify: `https://open.spotify.com/track/${id}` },
        } as any;
      })
      .sort((a, b) => b.playcount - a.playcount);
  }, [trackPlays, history, timeRange]);

  // ── Top Artists: 100% từ Firebase ────────────────────────────
  const topArtists = useMemo(() => {
    const now = Date.now();

    const msLimit: Record<TimeRange, number> = {
      '1_day': 1 * 24 * 60 * 60 * 1000,
      '1_week': 7 * 24 * 60 * 60 * 1000,
      'short_term': 28 * 24 * 60 * 60 * 1000,
      'medium_term': 180 * 24 * 60 * 60 * 1000,
      'long_term': Infinity,
    };

    const limit = msLimit[timeRange];

    // Build name → artistPlays lookup (normalize)
    const artistNameMap: Record<string, any> = {};
    Object.entries(artistPlays).forEach(([id, a]: [string, any]) => {
      if (a.name) {
        artistNameMap[a.name.toLowerCase().trim()] = { ...a, id: a.id || id };
      }
    });

    // Đếm lượt nghe từ history
    const counts: Record<string, { count: number; name: string }> = {};

    history.forEach(item => {
      if (limit === Infinity || now - item.played_at < limit) {
        const fbTrack = trackPlays[item.track_id];
        const artistStr =
          fbTrack?.artist || item.artist_name || '';
        if (!artistStr) return;

        artistStr.split(',').map((n: string) => n.trim()).forEach((aName: string) => {
          if (!aName) return;
          if (!counts[aName]) counts[aName] = { count: 0, name: aName };
          counts[aName].count++;
        });
      }
    });

    // Nếu không có history → fallback toàn bộ artistPlays sort theo play_count
    if (Object.keys(counts).length === 0) {
      return Object.entries(artistPlays)
        .map(([id, a]: [string, any]) => ({
          id: a.id || id,
          name: a.name || 'Unknown Artist',
          playcount: a.play_count || 0,
          images: a.image_url ? [{ url: a.image_url }] : [],
          genres: [],
          external_urls: {
            spotify: `https://open.spotify.com/artist/${a.id || id}`,
          },
        } as any))
        .sort((a, b) => b.playcount - a.playcount);
    }

    return Object.values(counts)
      .map(item => {
        const key = item.name.toLowerCase().trim();
        const fbArtist = artistNameMap[key];
        const artistId = fbArtist?.id || '';
        const imageUrl = fbArtist?.image_url || '';

        return {
          id: artistId,
          name: item.name,
          playcount: item.count,
          images: imageUrl ? [{ url: imageUrl }] : [],
          genres: [],
          external_urls: {
            spotify: artistId
              ? `https://open.spotify.com/artist/${artistId}`
              : `https://open.spotify.com/search/${encodeURIComponent(item.name)}`,
          },
        } as any;
      })
      .sort((a, b) => b.playcount - a.playcount);
  }, [artistPlays, trackPlays, history, timeRange]);

  // Genres vẫn dùng artistPlays từ Firebase
  const genres = useMemo(() => {
    const genreMap: Record<string, number> = {};
    Object.values(artistPlays).forEach((a: any) => {
      (a.genres || []).forEach((g: string) => {
        genreMap[g] = (genreMap[g] || 0) + 1;
      });
    });
    return Object.entries(genreMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([genre, count]) => ({ genre, count }));
  }, [artistPlays]);

  // Save cache
  useEffect(() => {
    if (topTracks.length > 0) {
      const newCache = { ...cachedTracks, [timeRange]: topTracks };
      AsyncStorage.setItem('cache_top_tracks', JSON.stringify(newCache)).catch(() => { });
    }
  }, [topTracks, timeRange]);

  useEffect(() => {
    if (topArtists.length > 0) {
      const newCache = { ...cachedArtists, [timeRange]: topArtists };
      AsyncStorage.setItem('cache_top_artists', JSON.stringify(newCache)).catch(() => { });
    }
  }, [topArtists, timeRange]);

  const loading = profileQuery.isLoading;
  const refreshing = profileQuery.isFetching;
  const error = profileQuery.error as any;

  const finalTopTracks =
    topTracks.length > 0 ? topTracks : cachedTracks[timeRange] || [];
  const finalTopArtists =
    topArtists.length > 0 ? topArtists : cachedArtists[timeRange] || [];

  const refresh = useCallback(() => {
    profileQuery.refetch();
    playlistsQuery.refetch();
    recentQuery.refetch();
  }, [profileQuery, playlistsQuery, recentQuery]);

  return {
    user,
    topTracks: finalTopTracks,
    topArtists: finalTopArtists,
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