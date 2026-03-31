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
    attachPlaycount,
    attachArtistStats
  } = useFirebaseStats(user?.id);

  // ── Enriched Data ─────────────────────────────────────────────
  
  // Logic lọc và sắp xếp Top Tracks từ Firebase
  const topTracks = useMemo(() => {
    const allTracks = Object.keys(trackPlays).map(id => {
      const fbTrack = trackPlays[id];
      // Tìm metadata từ Spotify nếu có (để lấy popularity, album details đầy đủ hơn)
      const spotifyMeta = rawTopTracks.find(t => t.id === id);
      
      return {
        ...spotifyMeta, // Metadata từ Spotify (nếu có)
        id,
        name: fbTrack.name || spotifyMeta?.name || 'Unknown Track',
        artist: fbTrack.artist || (spotifyMeta?.artists ? spotifyMeta.artists[0].name : 'Unknown Artist'),
        album: spotifyMeta?.album || { images: [{ url: fbTrack.album_image || '' }] },
        album_image: fbTrack.album_image || spotifyMeta?.album?.images[0]?.url,
        playcount: fbTrack.play_count || 0,
        last_played: fbTrack.last_played || 0,
        artists: spotifyMeta?.artists || [{ name: fbTrack.artist || 'Unknown Artist' }]
      } as any;
    });

    let filtered = allTracks;
    const now = Date.now();

    if (timeRange === '1_day') {
      filtered = allTracks.filter(t => t.last_played && now - t.last_played < 24 * 60 * 60 * 1000);
    } else if (timeRange === '1_week') {
      filtered = allTracks.filter(t => t.last_played && now - t.last_played < 7 * 24 * 60 * 60 * 1000);
    }

    return filtered.sort((a, b) => (b.playcount as number) - (a.playcount as number));
  }, [trackPlays, rawTopTracks, timeRange]);

  // Logic lọc và sắp xếp Top Artists từ Firebase
  const topArtists = useMemo(() => {
    const allArtists = Object.keys(artistPlays).map(id => {
      const fbArtist = artistPlays[id];
      const spotifyMeta = rawTopArtists.find(a => a.id === id);

      // Tìm last_played của artist dựa trên bài hát gần nhất của họ
      const artistTracks = Object.values(trackPlays).filter(t => t.artist?.includes(fbArtist.name || ''));
      const lastPlayed = artistTracks.reduce((max, t) => Math.max(max, t.last_played || 0), 0);
      
      return {
        ...spotifyMeta,
        id,
        name: fbArtist.name || spotifyMeta?.name || 'Unknown Artist',
        playcount: fbArtist.play_count || 0,
        last_played: lastPlayed,
        images: spotifyMeta?.images || [],
        genres: spotifyMeta?.genres || []
      } as any;
    });

    let filtered = allArtists;
    const now = Date.now();

    if (timeRange === '1_day') {
      filtered = allArtists.filter(a => a.last_played && now - a.last_played < 24 * 60 * 60 * 1000);
    } else if (timeRange === '1_week') {
      filtered = allArtists.filter(a => a.last_played && now - a.last_played < 7 * 24 * 60 * 60 * 1000);
    }

    return filtered.sort((a, b) => (b.playcount as number) - (a.playcount as number));
  }, [artistPlays, trackPlays, rawTopArtists, timeRange]);

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
