import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CLIENT_ID, TOKEN_KEY, REFRESH_KEY, EXPIRY_KEY } from '../constants/spotify';

const BASE_URL = 'https://api.spotify.com/v1';

// Tạo axios instance
const spotifyAxios = axios.create({
  baseURL: BASE_URL,
});

// Interceptor — gắn token vào mọi request
spotifyAxios.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Queue để đồng bộ hóa Refresh Token ──────────────────────────
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

// ─── Response Interceptor — tự động refresh khi 401 ──────────────
spotifyAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const originalRequest = config;

    // Nếu là lỗi 401 (Hết hạn token) và chưa thử lại lần nào
    if (response?.status === 401 && !originalRequest._retry) {
      
      // Trường hợp 1: Nếu có một yêu cầu khác đang đi Refresh Token rồi
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(spotifyAxios(originalRequest));
          });
        });
      }

      // Trường hợp 2: Đây là yêu cầu đầu tiên phát hiện cần Refresh
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);

        if (!refreshToken) throw new Error('No refresh token available');

        const body = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: CLIENT_ID,
        });

        const res = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });

        const data = await res.json();

        if (!data.access_token) {
          throw new Error('Refresh failed - no access token in response');
        }

        // Lưu token mới vào bộ nhớ
        const expiryTime = Date.now() + data.expires_in * 1000;
        await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
        await AsyncStorage.setItem(EXPIRY_KEY, expiryTime.toString());
        if (data.refresh_token) {
          await AsyncStorage.setItem(REFRESH_KEY, data.refresh_token);
        }

        // Thông báo cho các request đang xếp hàng
        onRefreshed(data.access_token);

        // Chạy lại chính cái request gốc này
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return spotifyAxios(originalRequest);

      } catch (refreshError) {
        // Refresh thất bại (ví dụ Refresh Token cũng hết hạn) -> Xóa sạch để đăng xuất
        await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, EXPIRY_KEY]);
        console.error('CRITICAL: Refresh token failed, logged out.', refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

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
  playcount?: number; // Last.fm
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
  popularity: number;
  followers: { total: number };
  external_urls: { spotify: string };
  playcount?: number; // Last.fm
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
  artists?.forEach((artist) => {
    artist?.genres?.forEach((genre) => {
      genreMap[genre] = (genreMap[genre] || 0) + 1;
    });
  });
  return Object.entries(genreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([genre, count]) => ({ genre, count }));
}

/** Tính tổng thời gian phát nhạc 50 bài gần nhất bằng (Lặp x Thời Lượng) (ms) */
export function calcTotalDuration(tracks: SpotifyTrack[]): number {
  return tracks.reduce((acc, t) => acc + (t.duration_ms * (t.playcount || 1)), 0);
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
