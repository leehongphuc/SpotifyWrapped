import { useState, useEffect, useCallback, useMemo } from 'react';
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
    if ((timeRange === '1_day' || timeRange === '1_week') && history.length > 0) {
      const msLimit = timeRange === '1_day' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      
      const counts: Record<string, number> = {};
      const metaMap: Record<string, any> = {};

      history.forEach(item => {
        if (now - item.played_at < msLimit) {
          counts[item.track_id] = (counts[item.track_id] || 0) + 1;
          if (!metaMap[item.track_id]) metaMap[item.track_id] = item;
        }
      });

      return Object.keys(counts).map(id => {
        const spotifyMeta = rawTopTracks.find(t => t.id === id);
        const fbMeta = metaMap[id];
        const imageUrl = fbMeta.album_image || spotifyMeta?.album?.images[0]?.url || '';

        return {
          ...spotifyMeta,
          id,
          name: fbMeta.track_name,
          artist: fbMeta.artist_name,
          album: {
            images: [{ url: imageUrl }]
          },
          album_image: imageUrl,
          playcount: counts[id],
          artists: spotifyMeta?.artists || [{ name: fbMeta.artist_name }]
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

    if ((timeRange === '1_day' || timeRange === '1_week') && history.length > 0) {
      const msLimit = timeRange === '1_day' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      
      const counts: Record<string, { count: number, name: string }> = {};

      history.forEach(item => {
        if (now - item.played_at < msLimit) {
          // Lấy ID nghệ sĩ từ mảng (Giả sử log history có lưu ID nghệ sĩ hoặc chúng ta map từ trackId)
          // Đơn giản nhất là đếm theo tên nghệ sĩ nếu log history không có artist_id
          const aName = item.artist_name.split(',')[0].trim();
          if (!counts[aName]) counts[aName] = { count: 0, name: aName };
          counts[aName].count++;
        }
      });

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
  }, [artistPlays, trackPlays, rawTopArtists, history, timeRange]);

  const genres = useMemo(() => extractGenres(rawTopArtists), [rawTopArtists]);

  const loading = profileQuery.isLoading || tracksQuery.isLoading || artistsQuery.isLoading;
  const refreshing = tracksQuery.isRefetching || artistsQuery.isRefetching;
  const error = (profileQuery.error || tracksQuery.error || artistsQuery.error) as any;

  const refresh = useCallback(() => {
    tracksQuery.refetch();
    artistsQuery.refetch();
    playlistsQuery.refetch();
    recentQuery.refetch();
  }, [tracksQuery, artistsQuery, playlistsQuery, recentQuery]);

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
