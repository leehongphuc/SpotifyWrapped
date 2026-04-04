import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFirebaseStats, FirebaseStats, CurrentPlaying } from './useFirebaseStats';
import {
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
  // Dùng ref để cache tránh gây re-render/infinite loop
  const cachedTracksRef = useRef<Record<string, SpotifyTrack[]>>({});
  const cachedArtistsRef = useRef<Record<string, SpotifyArtist[]>>({});
  const [cacheVersion, setCacheVersion] = useState(0); // trigger re-read khi cache load xong

  // Load cache on mount
  useEffect(() => {
    const loadCache = async () => {
      try {
        const t = await AsyncStorage.getItem('cache_top_tracks');
        const a = await AsyncStorage.getItem('cache_top_artists');
        if (t) cachedTracksRef.current = JSON.parse(t);
        if (a) cachedArtistsRef.current = JSON.parse(a);
        setCacheVersion(v => v + 1); // trigger re-render để dùng cache
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.getTime();

    const weekStart = new Date(today);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    weekStart.setDate(diff);
    const startOfWeek = weekStart.getTime();

    const msLimit: Record<TimeRange, number> = {
      '1_day': 0, // Dùng mốc thời gian (startOfToday) thay vì trừ lùi
      '1_week': 0, // Dùng mốc thời gian (startOfWeek) thay vì trừ lùi
      'short_term': 28 * 24 * 60 * 60 * 1000,  // ~4 tuần (cuốn chiếu)
      'medium_term': 180 * 24 * 60 * 60 * 1000, // ~6 tháng
      'long_term': Infinity,                   // Tất cả
    };

    const limit = msLimit[timeRange];

    // Đếm số lần nghe từ history trong khoảng thời gian
    const counts: Record<string, number> = {};
    const listenedMs: Record<string, number> = {};
    const todayCounts: Record<string, number> = {}; // Dùng để tính baseline 00h

    history.forEach(item => {
      let isValid = false;
      if (timeRange === '1_day') {
        isValid = item.played_at >= startOfToday;
      } else if (timeRange === '1_week') {
        isValid = item.played_at >= startOfWeek;
      } else if (limit === Infinity || now - item.played_at < limit) {
        isValid = true;
      }

      if (isValid) {
        counts[item.track_id] = (counts[item.track_id] || 0) + 1;
        listenedMs[item.track_id] =
          (listenedMs[item.track_id] || 0) + (item.listened_ms || 0);
      }

      if (item.played_at >= startOfToday) {
        todayCounts[item.track_id] = (todayCounts[item.track_id] || 0) + 1;
      }
    });

    // Tính baseline (All-time rank tại mốc 00:00 hôm nay)
    const allTimeTrackRankMap: Record<string, number> = {};
    Object.entries(trackPlays)
      .map(([id, t]: any) => ({
        id,
        baselineCount: (t.play_count || 0) - (todayCounts[id] || 0),
      }))
      .sort((a, b) => b.baselineCount - a.baselineCount)
      .forEach((item, index) => {
        allTimeTrackRankMap[item.id] = index + 1;
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

    const currentList = Object.keys(counts)
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

    // Tính xu hướng cho Tracks (ngoại trừ Hôm nay)
    if (timeRange !== '1_day') {
      currentList.forEach((track, index) => {
        const currentRank = index + 1;
        const baselineRank = allTimeTrackRankMap[track.id];
        if (baselineRank) {
          track.rankDiff = baselineRank - currentRank;
        }
      });
    }

    return currentList;
  }, [trackPlays, history, timeRange]);

  // ── Top Artists: 100% từ Firebase ────────────────────────────
  const topArtists = useMemo(() => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.getTime();

    const weekStart = new Date(today);
    const dayOfWeek = weekStart.getDay();
    const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    weekStart.setDate(diff);
    const startOfWeek = weekStart.getTime();

    const msLimit: Record<TimeRange, number> = {
      '1_day': 0,
      '1_week': 0,
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

    // Đếm lượt nghe + số bài riêng biệt từ history
    const counts: Record<string, { count: number; name: string; trackIds: Set<string> }> = {};
    const todayArtistCounts: Record<string, number> = {}; // MỚI

    history.forEach(item => {
      let isValid = false;
      if (timeRange === '1_day') {
        isValid = item.played_at >= startOfToday;
      } else if (timeRange === '1_week') {
        isValid = item.played_at >= startOfWeek;
      } else if (limit === Infinity || now - item.played_at < limit) {
        isValid = true;
      }

      const fbTrack = trackPlays[item.track_id];
      const artistStr = fbTrack?.artist || item.artist_name || '';
      if (!artistStr) return;

      const artistsArr = artistStr.split(',').map((n: string) => n.trim()).filter(Boolean);

      if (isValid) {
        artistsArr.forEach((aName: string) => {
          if (!counts[aName]) counts[aName] = { count: 0, name: aName, trackIds: new Set() };
          counts[aName].count++;
          counts[aName].trackIds.add(item.track_id); // đếm bài riêng biệt
        });
      }

      if (item.played_at >= startOfToday) {
        artistsArr.forEach((aName: string) => {
          const key = aName.toLowerCase();
          todayArtistCounts[key] = (todayArtistCounts[key] || 0) + 1;
        });
      }
    });

    // Tính baseline (All-time rank tại mốc 00:00 hôm nay) cho Artists
    const allTimeArtistRankMap: Record<string, number> = {};
    Object.entries(artistPlays)
      .map(([id, a]: any) => {
        const key = (a.name || '').toLowerCase().trim();
        const todayCount = todayArtistCounts[key] || 0;
        return {
          id,
          nameKey: key,
          baselineCount: (a.play_count || 0) - todayCount,
        };
      })
      .sort((a, b) => b.baselineCount - a.baselineCount)
      .forEach((item, index) => {
        allTimeArtistRankMap[item.id] = index + 1;
        if (item.nameKey) {
          allTimeArtistRankMap[item.nameKey] = index + 1;
        }
      });

    // Nếu không có history → fallback toàn bộ artistPlays
    if (Object.keys(counts).length === 0) {
      // Tính tracks_count từ trackPlays cho fallback
      const artistTrackCount: Record<string, Set<string>> = {};
      Object.entries(trackPlays).forEach(([trackId, fbTrack]: [string, any]) => {
        const artistStr = fbTrack?.artist || '';
        artistStr.split(',').map((n: string) => n.trim()).forEach((aName: string) => {
          if (!aName) return;
          const key = aName.toLowerCase().trim();
          if (!artistTrackCount[key]) artistTrackCount[key] = new Set();
          artistTrackCount[key].add(trackId);
        });
      });

      return Object.entries(artistPlays)
        .map(([id, a]: [string, any]) => {
          const key = (a.name || '').toLowerCase().trim();
          return {
            id: a.id || id,
            name: a.name || 'Unknown Artist',
            playcount: a.play_count || 0,
            tracks_count: artistTrackCount[key]?.size || 1,
            images: a.image_url ? [{ url: a.image_url }] : [],
            genres: [],
            external_urls: {
              spotify: `https://open.spotify.com/artist/${a.id || id}`,
            },
          } as any;
        })
        .sort((a, b) => b.playcount - a.playcount);
    }

    const currentList = Object.values(counts)
      .map(item => {
        const key = item.name.toLowerCase().trim();
        const fbArtist = artistNameMap[key];
        const artistId = fbArtist?.id || '';
        const imageUrl = fbArtist?.image_url || '';

        return {
          id: artistId,
          name: item.name,
          playcount: item.count,
          tracks_count: item.trackIds.size, // ✅ số bài riêng biệt đã nghe
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

    if (timeRange !== '1_day') {
      currentList.forEach((artist, index) => {
        const currentRank = index + 1;
        // Search mapping key
        const key = artist.name.toLowerCase().trim();
        const baselineRank = allTimeArtistRankMap[artist.id] || allTimeArtistRankMap[key];
        if (baselineRank) {
          artist.rankDiff = baselineRank - currentRank;
        }
      });
    }

    return currentList;
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

  // Save cache — dùng ref để không gây dependency cycle
  useEffect(() => {
    if (topTracks.length > 0) {
      cachedTracksRef.current = { ...cachedTracksRef.current, [timeRange]: topTracks };
      AsyncStorage.setItem('cache_top_tracks', JSON.stringify(cachedTracksRef.current)).catch(() => {});
    }
  }, [topTracks, timeRange]);

  useEffect(() => {
    if (topArtists.length > 0) {
      cachedArtistsRef.current = { ...cachedArtistsRef.current, [timeRange]: topArtists };
      AsyncStorage.setItem('cache_top_artists', JSON.stringify(cachedArtistsRef.current)).catch(() => {});
    }
  }, [topArtists, timeRange]);

  const loading = profileQuery.isLoading;
  const refreshing = profileQuery.isFetching;
  const error = profileQuery.error as any;

  const finalTopTracks =
    topTracks.length > 0 ? topTracks : cachedTracksRef.current[timeRange] || [];
  const finalTopArtists =
    topArtists.length > 0 ? topArtists : cachedArtistsRef.current[timeRange] || [];

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