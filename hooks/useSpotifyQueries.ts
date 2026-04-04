import { useQuery } from '@tanstack/react-query';
import {
  getMe,
  getMyPlaylists,
  getRecentlyPlayed,
  TimeRange,
} from '../services/spotifyApi';

export const spotifyKeys = {
  all: ['spotify'] as const,
  profile: () => [...spotifyKeys.all, 'profile'] as const,
  topTracks: (range: TimeRange) => [...spotifyKeys.all, 'topTracks', range] as const,
  topArtists: (range: TimeRange) => [...spotifyKeys.all, 'topArtists', range] as const,
  playlists: () => [...spotifyKeys.all, 'playlists'] as const,
  recentlyPlayed: () => [...spotifyKeys.all, 'recent'] as const,
};

export function useSpotifyQueries(isAuthenticated: boolean, _timeRange: TimeRange) {
  const profileQuery = useQuery({
    queryKey: spotifyKeys.profile(),
    queryFn: getMe,
    enabled: isAuthenticated,
    staleTime: Infinity, // Profile ít thay đổi
  });

  const playlistsQuery = useQuery({
    queryKey: spotifyKeys.playlists(),
    queryFn: () => getMyPlaylists(20),
    enabled: isAuthenticated,
  });

  const recentQuery = useQuery({
    queryKey: spotifyKeys.recentlyPlayed(),
    queryFn: () => getRecentlyPlayed(50),
    enabled: isAuthenticated,
  });

  return {
    profileQuery,
    playlistsQuery,
    recentQuery,
  };
}
