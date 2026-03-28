import { useState, useEffect, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

// ─── Spotify OAuth2 Config ─────────────────────────────────────
// !! Thay YOUR_SPOTIFY_CLIENT_ID bằng Client ID của bạn !!
const CLIENT_ID = 'd80501e40c4d45adb2b11a05f0f36102';

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'playlist-read-private',
].join(' ');

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

// ─── Storage Keys ─────────────────────────────────────────────
const TOKEN_KEY = 'spotify_access_token';
const REFRESH_KEY = 'spotify_refresh_token';
const EXPIRY_KEY = 'spotify_token_expiry';

// ─── Hook ─────────────────────────────────────────────────────
export function useSpotifyAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect URI (tự động theo scheme trong app.json)
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'spotifywrapped',
    path: 'callback',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: SCOPES.split(' '),
      redirectUri,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    discovery
  );

  // Khởi động — kiểm tra token đã lưu
  useEffect(() => {
    checkStoredToken();
  }, []);

  // Xử lý kết quả OAuth
  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      exchangeCodeForToken(code, request?.codeVerifier ?? '');
    } else if (response?.type === 'error') {
      setError('Đăng nhập thất bại. Vui lòng thử lại.');
      setLoading(false);
    }
  }, [response]);

  /** Kiểm tra và load token đã lưu */
  async function checkStoredToken() {
    try {
      const [storedToken, expiry] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(EXPIRY_KEY),
      ]);

      if (storedToken && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime - 60000) {
          // Token còn hạn
          setToken(storedToken);
          setLoading(false);
          return;
        } else {
          // Token hết hạn — thử refresh
          await tryRefreshToken();
          return;
        }
      }
    } catch (e) {
      console.error('Error checking stored token:', e);
    }
    setLoading(false);
  }

  /** Đổi code → access token */
  async function exchangeCodeForToken(code: string, codeVerifier: string) {
    try {
      setLoading(true);
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier,
      });

      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      const data = await res.json();

      if (data.access_token) {
        await saveToken(data.access_token, data.refresh_token, data.expires_in);
        setToken(data.access_token);
        setError(null);
      } else {
        setError('Không lấy được token từ Spotify.');
      }
    } catch (e) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  /** Refresh token khi hết hạn */
  async function tryRefreshToken() {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
      if (!refreshToken) {
        setLoading(false);
        return;
      }

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

      if (data.access_token) {
        await saveToken(
          data.access_token,
          data.refresh_token ?? refreshToken,
          data.expires_in
        );
        setToken(data.access_token);
      }
    } catch (e) {
      console.error('Refresh token error:', e);
    } finally {
      setLoading(false);
    }
  }

  /** Lưu token vào AsyncStorage */
  async function saveToken(
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ) {
    const expiryTime = Date.now() + expiresIn * 1000;
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, accessToken),
      AsyncStorage.setItem(REFRESH_KEY, refreshToken),
      AsyncStorage.setItem(EXPIRY_KEY, expiryTime.toString()),
    ]);
  }

  /** Đăng xuất */
  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_KEY),
      AsyncStorage.removeItem(EXPIRY_KEY),
    ]);
    setToken(null);
  }, []);

  /** Bắt đầu đăng nhập */
  const login = useCallback(async () => {
    setError(null);
    await promptAsync();
  }, [promptAsync]);

  return {
    token,
    loading,
    error,
    isAuthenticated: !!token,
    login,
    logout,
    request,
  };
}
