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

  // 1. Load cache on mount
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

  // ── React Query Hooks ──
  const {
    profileQuery,
    tracksQuery,
    artistsQuery,
    playlistsQuery,
    recentQuery,
  } = useSpotifyQueries(isAuthenticated, timeRange);

  const user = profileQuery.data || null;
  const rawTopTracks = tracksQuery.data || [];
  const rawTopArtists = artistsQuery.data || [];
  const playlists = playlistsQuery.data || [];
  const recentlyPlayed = recentQuery.data || [];

  const {
    stats: firebaseStats,
    currentPlaying,
    trackPlays,
    artistPlays,
    history,
    attachPlaycount,
    attachArtistStats
  } = useFirebaseStats(user?.id);

  // ── Top Tracks ────────────────────────────────────────────────
  const topTracks = useMemo(() => {
    const now = Date.now();

    // Nhánh 1_day / 1_week: đếm từ history, KHÔNG cộng thêm currentPlaying
    // vì bài đang phát đã được Firebase tracker ghi vào history rồi → tránh đếm 2 lần
    if ((timeRange === '1_day' || timeRange === '1_week') && history.length > 0) {
      const msLimit = timeRange === '1_day'
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

      const counts: Record<string, number> = {};

      history.forEach(item => {
        if (now - item.played_at < msLimit) {
          counts[item.track_id] = (counts[item.track_id] || 0) + 1;
        }
      });

      return Object.keys(counts).map(id => {
        const spotifyMeta = rawTopTracks.find(t => t.id === id);
        const fbTrack = trackPlays[id];

        const trackName = fbTrack?.name || spotifyMeta?.name || 'Unknown Track';
        const artistName = fbTrack?.artist || (spotifyMeta?.artists ? spotifyMeta.artists[0].name : 'Unknown Artist');
        const imageUrl = fbTrack?.album_image || spotifyMeta?.album?.images[0]?.url || '';

        return {
          ...spotifyMeta,
          id,
          name: trackName,
          artist: artistName,
          album: {
            images: [{ url: imageUrl }]
          },
          album_image: imageUrl,
          playcount: counts[id],
          artists: spotifyMeta?.artists || [{ name: artistName }],
          external_urls: spotifyMeta?.external_urls || { spotify: `https://open.spotify.com/track/${id}` }
        } as any;
      }).sort((a, b) => b.playcount - a.playcount);
    }

    // Nhánh default (4 tuần, 6 tháng, Tất cả): Ưu tiên danh sách gốc từ Spotify API
    // (Bảo toàn thứ tự xếp hạng chính xác của Spotify tương ứng với timeRange)
    return rawTopTracks.map(spotifyMeta => {
      const fbTrack = trackPlays[spotifyMeta.id];
      const imageUrl = fbTrack?.album_image || spotifyMeta?.album?.images?.[0]?.url || '';
      const artistName = fbTrack?.artist || (spotifyMeta?.artists ? spotifyMeta.artists[0].name : 'Unknown Artist');

      return {
        ...spotifyMeta,
        id: spotifyMeta.id,
        name: spotifyMeta.name,
        artist: artistName,
        album: {
          images: [{ url: imageUrl }]
        },
        album_image: imageUrl,
        playcount: fbTrack?.play_count || 0, // Vẫn hiển thị số lượt nghe nếu Firebase đã lưu
        last_played: fbTrack?.last_played || 0,
        artists: spotifyMeta?.artists || [{ name: artistName }],
        external_urls: spotifyMeta?.external_urls || { spotify: `https://open.spotify.com/track/${spotifyMeta.id}` }
      } as any;
    });
  }, [trackPlays, rawTopTracks, history, timeRange]);

  // ── Top Artists ───────────────────────────────────────────────
  const topArtists = useMemo(() => {
    const now = Date.now();

    // Build lookup map: normalized lowercase name -> { fbArtist object with id }
    // For 1 day/week range which matches by name, not ID
    const artistNameMap: Record<string, any> = {};
    Object.entries(artistPlays).forEach(([id, a]: [string, any]) => {
      if (a.name) {
        const key = a.name.toLowerCase().trim();
        artistNameMap[key] = { ...a, id: a.id || id };
      }
    });

    if ((timeRange === '1_day' || timeRange === '1_week') && history.length > 0) {
      const msLimit = timeRange === '1_day'
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

      const counts: Record<string, { count: number; name: string }> = {};

      history.forEach(item => {
        if (now - item.played_at < msLimit) {
          const fbTrack = trackPlays[item.track_id];
          if (fbTrack && fbTrack.artist) {
            const names = fbTrack.artist.split(',').map((n: string) => n.trim());
            names.forEach((aName: string) => {
              if (!counts[aName]) counts[aName] = { count: 0, name: aName };
              counts[aName].count++;
            });
          }
        }
      });

      return Object.values(counts).map(item => {
        const key = item.name.toLowerCase().trim();
        const fbArtist = artistNameMap[key]; // dùng normalized map
        const spotifyMeta = rawTopArtists.find(a => a.name.toLowerCase().trim() === key);

        const imageUrl =
          spotifyMeta?.images?.[0]?.url ||
          fbArtist?.image_url ||
          '';

        const artistId = spotifyMeta?.id || fbArtist?.id || '';

        return {
          ...spotifyMeta,
          id: artistId,
          name: item.name,
          playcount: item.count,
          images: imageUrl ? [{ url: imageUrl }] : [],
          external_urls: spotifyMeta?.external_urls || {
            spotify: artistId
              ? `https://open.spotify.com/artist/${artistId}`
              : `https://open.spotify.com/search/${encodeURIComponent(item.name)}`
          }
        } as any;
      }).sort((a, b) => b.playcount - a.playcount);
    }

    // Nhánh default (short/medium/long term): Ưu tiên danh sách gốc từ Spotify API
    // (Bảo toàn thứ tự xếp hạng chính xác của Spotify tương ứng với từng timeRange)
    return rawTopArtists.map(spotifyMeta => {
      const fbArtist = artistPlays[spotifyMeta.id] || artistNameMap[spotifyMeta.name.toLowerCase().trim()];

      const imageUrl =
        spotifyMeta?.images?.[0]?.url ||
        fbArtist?.image_url ||
        '';

      return {
        ...spotifyMeta,
        id: spotifyMeta.id,
        name: spotifyMeta.name,
        playcount: fbArtist?.play_count || 0, // Hiện số lượt nghe nếu Firebase có lưu
        images: imageUrl ? [{ url: imageUrl }] : [],
        genres: spotifyMeta?.genres || [],
        external_urls: spotifyMeta?.external_urls || {
          spotify: `https://open.spotify.com/artist/${spotifyMeta.id}`
        }
      } as any;
    });
  }, [artistPlays, trackPlays, rawTopArtists, history, timeRange]);

  // 2. Save to cache when data updates
  useEffect(() => {
    const saveCache = async () => {
      if (topTracks.length > 0) {
        const newCache = { ...cachedTracks, [timeRange]: topTracks };
        await AsyncStorage.setItem('cache_top_tracks', JSON.stringify(newCache));
      }
    };
    saveCache();
  }, [topTracks, timeRange]);

  useEffect(() => {
    const saveCache = async () => {
      if (topArtists.length > 0) {
        const newCache = { ...cachedArtists, [timeRange]: topArtists };
        await AsyncStorage.setItem('cache_top_artists', JSON.stringify(newCache));
      }
    };
    saveCache();
  }, [topArtists, timeRange]);

  const genres = useMemo(() => extractGenres(rawTopArtists), [rawTopArtists]);

  const loading = profileQuery.isLoading || tracksQuery.isLoading || artistsQuery.isLoading;
  const refreshing = tracksQuery.isRefetching || artistsQuery.isRefetching;
  const error = (profileQuery.error || tracksQuery.error || artistsQuery.error) as any;

  // Final: dùng data mới nếu có, không thì fallback cache
  const finalTopTracks = topTracks.length > 0 ? topTracks : (cachedTracks[timeRange] || []);
  const finalTopArtists = topArtists.length > 0 ? topArtists : (cachedArtists[timeRange] || []);

  const refresh = useCallback(() => {
    tracksQuery.refetch();
    artistsQuery.refetch();
    playlistsQuery.refetch();
    recentQuery.refetch();
  }, [tracksQuery, artistsQuery, playlistsQuery, recentQuery]);

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