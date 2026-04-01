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

  // ── Enriched Data ─────────────────────────────────────────────
  
  // Logic lọc và sắp xếp Top Tracks từ Firebase
  const topTracks = useMemo(() => {
    const now = Date.now();
    
    // Nếu là 1 ngày hoặc 1 tuần, ưu tiên dùng dữ liệu từ History cho chính xác
    if ((timeRange === '1_day' || timeRange === '1_week') && (history.length > 0 || currentPlaying)) {
      const msLimit = timeRange === '1_day' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      
      const counts: Record<string, number> = {};
      const metaMap: Record<string, any> = {};

      history.forEach(item => {
        if (now - item.played_at < msLimit) {
          counts[item.track_id] = (counts[item.track_id] || 0) + 1;
          if (!metaMap[item.track_id]) metaMap[item.track_id] = item;
        }
      });

      // MỚI: Cộng thêm bài đang phát hiện tại
      if (currentPlaying && currentPlaying.track_id) {
        counts[currentPlaying.track_id] = (counts[currentPlaying.track_id] || 0) + 1;
      }

      return Object.keys(counts).map(id => {
        const spotifyMeta = rawTopTracks.find(t => t.id === id);
        const fbTrack = trackPlays[id]; // Lấy metadata từ node tracks của Firebase
        
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
          artists: spotifyMeta?.artists || [{ name: artistName }]
        } as any;
      }).sort((a, b) => b.playcount - a.playcount);
    }

    // Trường hợp mặc định (4 tuần, 6 tháng, Tất cả): Dùng tổng play_count
    const allTracks = Object.keys(trackPlays).map(id => {
      const fbTrack = trackPlays[id];
      const spotifyMeta = rawTopTracks.find(t => t.id === id);
      
      const imageUrl = fbTrack.album_image || spotifyMeta?.album?.images[0]?.url || '';
      
      return {
        ...spotifyMeta,
        id,
        name: fbTrack.name || spotifyMeta?.name || 'Unknown Track',
        artist: fbTrack.artist || (spotifyMeta?.artists ? spotifyMeta.artists[0].name : 'Unknown Artist'),
        album: {
           images: [{ url: imageUrl }]
        },
        album_image: imageUrl,
        playcount: fbTrack.play_count || 0,
        last_played: fbTrack.last_played || 0,
        artists: spotifyMeta?.artists || [{ name: fbTrack.artist || 'Unknown Artist' }]
      } as any;
    });

    return allTracks.sort((a, b) => (b.playcount as number) - (a.playcount as number));
  }, [trackPlays, rawTopTracks, history, timeRange]);

  // Logic lọc và sắp xếp Top Artists từ Firebase
  const topArtists = useMemo(() => {
    const now = Date.now();

    if ((timeRange === '1_day' || timeRange === '1_week') && (history.length > 0 || currentPlaying)) {
      const msLimit = timeRange === '1_day' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      
      const counts: Record<string, { count: number, name: string }> = {};

      history.forEach(item => {
        if (now - item.played_at < msLimit) {
          // Lấy metadata nghệ sĩ từ node tracks dựa trên track_id trong history
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

      // MỚI: Cộng thêm nghệ sĩ đang phát hiện tại
      if (currentPlaying && currentPlaying.artist_name) {
        const names = currentPlaying.artist_name.split(',').map((n: string) => n.trim());
        names.forEach((aName: string) => {
          if (!counts[aName]) counts[aName] = { count: 0, name: aName };
          counts[aName].count++;
        });
      }

      return Object.values(counts).map(item => {
        // Tìm thông tin nghệ sĩ chính xác từ Firebase node artistPlays nếu có
        const fbArtist = Object.values(artistPlays).find(a => a.name === item.name);
        const spotifyMeta = rawTopArtists.find(a => a.name === item.name);
        
        return {
          ...spotifyMeta,
          name: item.name,
          playcount: item.count,
          images: spotifyMeta?.images || (fbArtist?.image_url ? [{ url: fbArtist.image_url }] : [])
        } as any;
      }).sort((a, b) => b.playcount - a.playcount);
    }

    const allArtists = Object.keys(artistPlays).map(id => {
      const fbArtist = artistPlays[id];
      const spotifyMeta = rawTopArtists.find(a => a.id === id);
      return {
        ...spotifyMeta,
        id,
        name: fbArtist.name || spotifyMeta?.name || 'Unknown Artist',
        playcount: fbArtist.play_count || 0,
        images: spotifyMeta?.images || (fbArtist.image_url ? [{ url: fbArtist.image_url }] : []),
        genres: spotifyMeta?.genres || []
      } as any;
    });

    return allArtists.sort((a, b) => (b.playcount as number) - (a.playcount as number));
  }, [artistPlays, trackPlays, rawTopArtists, history, currentPlaying, timeRange]);

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

  // Final exposed data: Use enriched data if available, otherwise fallback to cache
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
