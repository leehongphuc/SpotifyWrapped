import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://api.spotify.com/v1';

// Tạo axios instance
const spotifyAxios = axios.create({
  baseURL: BASE_URL,
});

// Interceptor — gắn token vào mọi request
spotifyAxios.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('spotify_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Types ───────────────────────────────────────────────────────
export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
  followers: { total: number };
  country: string;
  product: string; // 'free' | 'premium'
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
    release_date: string;
  };
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
  popularity: number;
  followers: { total: number };
  external_urls: { spotify: string };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: { total: number };
}

export interface RecentlyPlayed {
  track: SpotifyTrack;
  played_at: string;
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

// ─── API Functions ────────────────────────────────────────────────

/** Lấy thông tin user đang đăng nhập */
export async function getMe(): Promise<SpotifyUser> {
  const res = await spotifyAxios.get<SpotifyUser>('/me');
  return res.data;
}

/** Lấy top tracks (50 bài) */
export async function getTopTracks(
  timeRange: TimeRange = 'short_term',
  limit = 50
): Promise<SpotifyTrack[]> {
  const res = await spotifyAxios.get<{ items: SpotifyTrack[] }>(
    '/me/top/tracks',
    { params: { time_range: timeRange, limit } }
  );
  return res.data.items;
}

/** Lấy top artists (50 nghệ sĩ) */
export async function getTopArtists(
  timeRange: TimeRange = 'short_term',
  limit = 50
): Promise<SpotifyArtist[]> {
  const res = await spotifyAxios.get<{ items: SpotifyArtist[] }>(
    '/me/top/artists',
    { params: { time_range: timeRange, limit } }
  );
  return res.data.items;
}

/** Lấy danh sách playlist */
export async function getMyPlaylists(limit = 20): Promise<SpotifyPlaylist[]> {
  const res = await spotifyAxios.get<{ items: SpotifyPlaylist[] }>(
    '/me/playlists',
    { params: { limit } }
  );
  return res.data.items;
}

/** Lấy bài hát đã nghe gần đây */
export async function getRecentlyPlayed(limit = 50): Promise<RecentlyPlayed[]> {
  const res = await spotifyAxios.get<{ items: RecentlyPlayed[] }>(
    '/me/player/recently-played',
    { params: { limit } }
  );
  return res.data.items;
}

/** Phân tích thể loại nhạc từ top artists */
export function extractGenres(artists: SpotifyArtist[]): { genre: string; count: number }[] {
  const genreMap: Record<string, number> = {};
  artists.forEach((artist) => {
    artist.genres.forEach((genre) => {
      genreMap[genre] = (genreMap[genre] || 0) + 1;
    });
  });
  return Object.entries(genreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([genre, count]) => ({ genre, count }));
}

/** Tính tổng thời gian nghe nhạc (ms) */
export function calcTotalDuration(tracks: SpotifyTrack[]): number {
  return tracks.reduce((acc, t) => acc + t.duration_ms, 0);
}

/** Format ms → "X phút" */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}g ${mins}p`;
}

/** Format số lớn → "1.2K", "1.5M" */
export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default spotifyAxios;
